import * as t from '@babel/types'
import * as babel from '@babel/core'
import { generateFromAst, parseAst } from '@tanstack/router-utils'
import { getObjectPropertyKeyName, getUniqueProgramIdentifier } from './utils'
import type { GeneratorResult } from '@tanstack/router-utils'

/** The package that exports the built-in strategies */
const STRATEGIES_PACKAGE = '@tanstack/react-router'

/** Only files that import one of these are rewritten */
const ROUTER_PACKAGES = new Set([STRATEGIES_PACKAGE, '@tanstack/react-start'])

/** Each string mode and the strategy it stands for */
const STRATEGIES = new Map([
  ['intent', 'intentPreload'],
  ['viewport', 'viewportPreload'],
  ['render', 'renderPreload'],
])

/** Option keys whose literal string modes are rewritten */
const OPTION_KEYS = new Set(['preload', 'defaultPreload'])

/** A cheap check before parsing: the file mentions a string mode */
export const preloadStringsCodeFilter =
  /\b(?:preload|defaultPreload)\b[\s\S]*['"`](?:intent|viewport|render)['"`]/

/**
 * The string mode an expression is, if it's a literal one: `'intent'`,
 * `` `intent` ``, `'intent' as const`, `('intent')` and the like.
 */
function getLiteralMode(node: t.Node | null | undefined): string | undefined {
  while (
    node &&
    (t.isTSAsExpression(node) ||
      t.isTSSatisfiesExpression(node) ||
      t.isTSNonNullExpression(node) ||
      t.isParenthesizedExpression(node))
  ) {
    node = node.expression
  }
  let value: string | undefined
  if (t.isStringLiteral(node)) {
    value = node.value
  } else if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    value = node.quasis[0]?.value.cooked ?? undefined
  }
  return value !== undefined && STRATEGIES.has(value) ? value : undefined
}

/**
 * Rewrites literal `preload` strings to the strategies they stand for, so
 * the app imports only the strategies it uses and Links don't load them on
 * demand:
 *
 * - `<Link preload="intent" />` becomes `<Link preload={intentPreload()} />`
 * - `defaultPreload: 'viewport'` and `preload: 'render'` in any object become
 *   `defaultPreload: viewportPreload()` and `preload: renderPreload()`
 *
 * Only files that import from `@tanstack/react-router` or
 * `@tanstack/react-start` are rewritten, and only the three string modes.
 * Elements with a lowercase name (`<video preload="auto">`) and values that
 * aren't literals are left alone. Returns `null` when nothing changed.
 */
export function compilePreloadStrings(opts: {
  code: string
  filename: string
}): GeneratorResult | null {
  const ast = parseAst(opts)

  const importsRouter = ast.program.body.some(
    (node) =>
      t.isImportDeclaration(node) && ROUTER_PACKAGES.has(node.source.value),
  )
  if (!importsRouter) {
    return null
  }

  const used = new Map<string, t.Identifier>()
  // The call of a mode's strategy, or nothing when another binding shadows
  // its import where the value is: then the string stays as it is
  const strategyCall = (
    programPath: babel.NodePath<t.Program>,
    path: babel.NodePath,
    mode: string,
  ) => {
    const name = STRATEGIES.get(mode)!
    const local =
      used.get(name) ??
      findImportedStrategy(programPath.node, name) ??
      getUniqueProgramIdentifier(programPath, name)
    const binding = path.scope.getBinding(local.name)
    if (binding && binding.kind !== 'module') {
      return undefined
    }
    used.set(name, local)
    return t.callExpression(t.identifier(local.name), [])
  }

  babel.traverse(ast, {
    Program(programPath) {
      programPath.traverse({
        JSXAttribute(path) {
          const { name, value } = path.node
          if (!t.isJSXIdentifier(name, { name: 'preload' })) {
            return
          }
          // Host elements have their own `preload`, eg. `<video>`
          const element = (path.parent as t.JSXOpeningElement).name
          if (t.isJSXIdentifier(element) && /^[a-z]/.test(element.name)) {
            return
          }
          const mode = getLiteralMode(
            t.isJSXExpressionContainer(value) ? value.expression : value,
          )
          const call = mode && strategyCall(programPath, path, mode)
          if (call) {
            path.node.value = t.jsxExpressionContainer(call)
          }
        },
        ObjectProperty(path) {
          const keyName = getObjectPropertyKeyName(path.node)
          if (
            !keyName ||
            !OPTION_KEYS.has(keyName) ||
            !path.parentPath.isObjectExpression()
          ) {
            return
          }
          const mode = getLiteralMode(path.node.value)
          const call = mode && strategyCall(programPath, path, mode)
          if (call) {
            path.node.value = call
            path.node.shorthand = false
          }
        },
      })
    },
  })

  if (!used.size) {
    return null
  }

  const added = [...used].filter(
    ([name, local]) => !findImportedStrategy(ast.program, name, local),
  )
  if (added.length) {
    ast.program.body.unshift(
      t.importDeclaration(
        added.map(([name, local]) =>
          t.importSpecifier(t.identifier(local.name), t.identifier(name)),
        ),
        t.stringLiteral(STRATEGIES_PACKAGE),
      ),
    )
  }

  return generateFromAst(ast, {
    sourceMaps: true,
    sourceFileName: opts.filename,
    filename: opts.filename,
  })
}

/**
 * The local name of a strategy the file already imports as a value, if it
 * does (and, with `local`, only when it's that name).
 */
function findImportedStrategy(
  program: t.Program,
  name: string,
  local?: t.Identifier,
): t.Identifier | undefined {
  for (const node of program.body) {
    if (
      !t.isImportDeclaration(node) ||
      node.source.value !== STRATEGIES_PACKAGE ||
      node.importKind === 'type'
    ) {
      continue
    }
    for (const specifier of node.specifiers) {
      if (
        t.isImportSpecifier(specifier) &&
        specifier.importKind !== 'type' &&
        t.isIdentifier(specifier.imported, { name }) &&
        (!local || specifier.local.name === local.name)
      ) {
        return specifier.local
      }
    }
  }
  return undefined
}
