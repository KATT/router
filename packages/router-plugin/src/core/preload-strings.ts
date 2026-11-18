import * as t from '@babel/types'
import * as babel from '@babel/core'
import { generateFromAst, parseAst } from '@tanstack/router-utils'
import type { GeneratorResult } from '@tanstack/router-utils'

/**
 * The package whose router APIs the plugin rewrites the options of, and that
 * exports the built-in strategies
 */
const ROUTER_PACKAGE = '@tanstack/react-router'

const ROUTER_PACKAGES: ReadonlySet<string> = new Set([ROUTER_PACKAGE])

/** Packages whose imports of a strategy the plugin reuses */
const STRATEGY_PACKAGES = new Set([ROUTER_PACKAGE, '@tanstack/router-core'])

/** Each string mode and the strategy it stands for */
const STRATEGIES = new Map([
  ['intent', 'intentPreload'],
  ['viewport', 'viewportPreload'],
  ['render', 'renderPreload'],
])

/** Router calls and the key of their options that takes a preload mode */
const CALL_OPTION_KEYS = new Map([
  ['createRouter', 'defaultPreload'],
  ['linkOptions', 'preload'],
  ['useLinkProps', 'preload'],
])

/** Router components and the prop that takes a preload mode */
const COMPONENT_PROP_KEYS = new Map([
  ['Link', 'preload'],
  ['RouterProvider', 'defaultPreload'],
])

/** A file can only have candidates when it imports the router package */
const routerImportPattern = /['"]@tanstack\/react-router['"]/

/**
 * A cheap check before parsing: the file imports the router, and mentions a
 * preload key and a string mode. Anchored, so each lookahead scans the file
 * once.
 */
export const preloadStringsCodeFilter =
  /^(?=[\s\S]*?['"]@tanstack\/react-router['"])(?=[\s\S]*?\b(?:preload|defaultPreload)\b)[\s\S]*?['"`](?:intent|viewport|render)['"`]/

/**
 * The files the plugin transforms: JavaScript and TypeScript modules, with
 * or without JSX, and split route chunks of them (`route.tsx?tsr-split=…`),
 * but not dependencies. The extension must come before any query, so eg.
 * `App.vue?vue&lang.ts` and `post.mdx` aren't transformed.
 */
export const preloadStringsIdFilter = {
  include: /^[^?]*\.[cm]?[jt]sx?(?:\?|$)/,
  exclude: /[\\/]node_modules[\\/]/,
}

/** An expression without the TypeScript and parentheses around it */
function unwrap(node: t.Node | null | undefined) {
  while (
    node &&
    (t.isTSAsExpression(node) ||
      t.isTSSatisfiesExpression(node) ||
      t.isTSNonNullExpression(node) ||
      t.isTSTypeAssertion(node) ||
      t.isParenthesizedExpression(node))
  ) {
    node = node.expression
  }
  return node
}

/** The value of a string literal or a template literal without expressions */
function getStaticString(node: t.Node | null | undefined) {
  if (t.isStringLiteral(node)) {
    return node.value
  }
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined
  }
  return undefined
}

/**
 * The string mode an expression is, if it's a literal one: `'intent'`,
 * `` `intent` ``, `'intent' as const`, `('intent')` and the like.
 */
function getLiteralMode(node: t.Node | null | undefined): string | undefined {
  const value = getStaticString(unwrap(node))
  return value !== undefined && STRATEGIES.has(value) ? value : undefined
}

/** The key of a property: `preload`, `'preload'` and `['preload']` alike */
function getKeyName(prop: t.ObjectProperty): string | undefined {
  if (!prop.computed && t.isIdentifier(prop.key)) {
    return prop.key.name
  }
  return getStaticString(prop.key)
}

/** An import declaration that brings values in, not only types */
function isValueImport(node: t.Node): node is t.ImportDeclaration {
  return t.isImportDeclaration(node) && (node.importKind ?? 'value') === 'value'
}

/**
 * What `name` is where `path` is, if it's a value import of a router package:
 * its name there, or `*` for the namespace.
 */
function getImportedName(
  path: babel.NodePath,
  name: string,
  packages: ReadonlySet<string> = ROUTER_PACKAGES,
): string | undefined {
  const binding = path.scope.getBinding(name)
  if (binding?.kind !== 'module') {
    return undefined
  }
  const specifier = binding.path.node
  const declaration = binding.path.parent
  if (!isValueImport(declaration) || !packages.has(declaration.source.value)) {
    return undefined
  }
  if (t.isImportNamespaceSpecifier(specifier)) {
    return '*'
  }
  if (
    !t.isImportSpecifier(specifier) ||
    (specifier.importKind ?? 'value') !== 'value'
  ) {
    return undefined
  }
  return t.isIdentifier(specifier.imported)
    ? specifier.imported.name
    : specifier.imported.value
}

/**
 * The router export a callee is: `createRouter` for `createRouter(…)` and
 * `Router.createRouter(…)` (a namespace import), if it's imported from the
 * router package.
 */
function getRouterExport(
  path: babel.NodePath,
  callee: t.Node,
): string | undefined {
  if (t.isIdentifier(callee)) {
    const imported = getImportedName(path, callee.name)
    return imported === '*' ? undefined : imported
  }
  if (
    t.isMemberExpression(callee) &&
    !callee.computed &&
    t.isIdentifier(callee.object) &&
    t.isIdentifier(callee.property) &&
    getImportedName(path, callee.object.name) === '*'
  ) {
    return callee.property.name
  }
  return undefined
}

/**
 * The prop of a JSX element that takes a preload mode: `preload` for a
 * `Link`, or a component that `createLink` makes in the same file, and
 * `defaultPreload` for a `RouterProvider`, all imported from the router
 * package. Host elements (`<video>`), member and namespaced names
 * (`<motion.video>`, `<Router.Link>`, `<svg:x>`) and other components (a
 * `MyLink` imported from elsewhere) have none.
 */
function getComponentPropKey(
  path: babel.NodePath<t.JSXOpeningElement>,
): string | undefined {
  const { name } = path.node
  if (!t.isJSXIdentifier(name) || /^[a-z]/.test(name.name)) {
    return undefined
  }
  const imported = getImportedName(path, name.name)
  if (imported) {
    return COMPONENT_PROP_KEYS.get(imported)
  }
  const binding = path.scope.getBinding(name.name)
  if (!binding?.constant || !binding.path.isVariableDeclarator()) {
    return undefined
  }
  const init = unwrap(binding.path.node.init)
  return t.isCallExpression(init) &&
    getRouterExport(binding.path, init.callee) === 'createLink'
    ? 'preload'
    : undefined
}

/** A literal string mode the plugin rewrites, and where it is */
interface Candidate {
  path: babel.NodePath
  mode: string
  /** Puts the strategy's call where the string was */
  replace: (call: t.CallExpression) => void
}

/**
 * Rewrites literal `preload` strings of the router's own APIs to the
 * strategies they stand for, so the app imports only the strategies it uses
 * and Links don't load them on demand:
 *
 * - `<Link preload="intent" />`, and the same on a component `createLink`
 *   makes in the file, becomes `<Link preload={intentPreload()} />`
 * - `defaultPreload: 'viewport'` in the options of `createRouter(…)`, and
 *   `<RouterProvider defaultPreload="viewport" />`, become
 *   `viewportPreload()`
 * - `preload: 'render'` in the options of `linkOptions(…)` (an object or an
 *   array of them) and `useLinkProps(…)` becomes `renderPreload()`
 *
 * These have to be imported from `@tanstack/react-router` (by name or as a
 * namespace). Anything else is left alone, eg. a loader's or a server
 * function's data, other objects, host elements (`<video preload="auto">`),
 * member names (`<motion.video>`) and components from elsewhere. So are
 * values that aren't literals of the three modes. The strategy comes from
 * the file's import of it (from `@tanstack/react-router` or
 * `@tanstack/router-core`), else the router namespace it imports, else a new
 * named import from `@tanstack/react-router`.
 *
 * Returns `null` when nothing changed, including for a file it can't parse
 * (the bundler reports the error).
 */
export function compilePreloadStrings(opts: {
  code: string
  filename: string
}): GeneratorResult | null {
  if (!routerImportPattern.test(opts.code)) {
    return null
  }
  let ast: ReturnType<typeof parseAst>
  try {
    ast = parseAst(opts)
  } catch {
    return null
  }

  const candidates: Array<Candidate> = []
  const addCandidate = (
    path: babel.NodePath,
    value: t.Node | null | undefined,
    replace: Candidate['replace'],
  ) => {
    const mode = getLiteralMode(value)
    if (mode) {
      candidates.push({
        path,
        mode,
        replace: (call) => replace(t.inherits(call, value)),
      })
    }
  }

  let programPath!: babel.NodePath<t.Program>
  babel.traverse(ast, {
    Program(path) {
      programPath = path
    },
    JSXOpeningElement(path) {
      const key = getComponentPropKey(path)
      if (!key) {
        return
      }
      for (const attribute of path.node.attributes) {
        if (
          !t.isJSXAttribute(attribute) ||
          !t.isJSXIdentifier(attribute.name, { name: key })
        ) {
          continue
        }
        const { value } = attribute
        addCandidate(
          path,
          t.isJSXExpressionContainer(value) ? value.expression : value,
          (call) => {
            attribute.value = t.jsxExpressionContainer(call)
          },
        )
      }
    },
    CallExpression(path) {
      const name = getRouterExport(path, path.node.callee)
      const key = name && CALL_OPTION_KEYS.get(name)
      if (!key) {
        return
      }
      const options = unwrap(path.node.arguments[0])
      const objects =
        name === 'linkOptions' && t.isArrayExpression(options)
          ? options.elements.map(unwrap)
          : [options]
      for (const object of objects) {
        if (!t.isObjectExpression(object)) {
          continue
        }
        for (const prop of object.properties) {
          if (t.isObjectProperty(prop) && getKeyName(prop) === key) {
            addCandidate(path, prop.value, (call) => {
              prop.value = call
            })
          }
        }
      }
    },
  })

  if (!candidates.length) {
    return null
  }

  const program = ast.program
  for (const [mode, name] of STRATEGIES) {
    const sites = candidates.filter((candidate) => candidate.mode === mode)
    if (sites.length) {
      referStrategy(name, sites)
    }
  }

  return generateFromAst(ast, {
    sourceMaps: true,
    // The route file itself, not a split chunk's id
    sourceFileName: opts.filename.replace(/\?.*$/, ''),
    filename: opts.filename,
  })

  /**
   * Puts the call of the strategy `name` at each site: by the file's import
   * of it, else by the router namespace the file imports, where those mean
   * the import there, else by a new import under a name no site binds.
   */
  function referStrategy(name: string, sites: Array<Candidate>) {
    const scope = programPath.scope
    const references: Array<[local: string, reference: t.Expression]> = []
    for (const node of program.body) {
      if (!isValueImport(node) || !STRATEGY_PACKAGES.has(node.source.value)) {
        continue
      }
      for (const { local } of node.specifiers) {
        const imported = getImportedName(
          programPath,
          local.name,
          STRATEGY_PACKAGES,
        )
        if (imported === name) {
          references.unshift([local.name, t.identifier(local.name)])
        } else if (imported === '*' && node.source.value === ROUTER_PACKAGE) {
          references.push([
            local.name,
            t.memberExpression(t.identifier(local.name), t.identifier(name)),
          ])
        }
      }
    }

    const unresolved: Array<Candidate> = []
    for (const site of sites) {
      const found = references.find(
        ([local]) =>
          site.path.scope.getBinding(local) === scope.getBinding(local),
      )
      if (found) {
        site.replace(t.callExpression(t.cloneNode(found[1]), []))
      } else {
        unresolved.push(site)
      }
    }
    if (!unresolved.length) {
      return
    }

    let local = name
    for (
      let suffix = 2;
      scope.hasBinding(local) ||
      scope.hasGlobal(local) ||
      unresolved.some((site) => site.path.scope.hasBinding(local));
      suffix++
    ) {
      local = `${name}${suffix}`
    }
    addImport(local, name)
    for (const site of unresolved) {
      site.replace(t.callExpression(t.identifier(local), []))
    }
  }

  /**
   * Into a named import of the router the file has, else after its imports:
   * a new import first would load the router before the file's other
   * imports, which changes the order of modules in the bundle.
   */
  function addImport(local: string, name: string) {
    const specifier = t.importSpecifier(t.identifier(local), t.identifier(name))
    const existing = program.body.find(
      (node): node is t.ImportDeclaration =>
        isValueImport(node) &&
        node.source.value === ROUTER_PACKAGE &&
        node.specifiers.some((other) => t.isImportSpecifier(other)),
    )
    if (existing) {
      existing.specifiers.push(specifier)
      return
    }
    let after = 0
    program.body.forEach((node, index) => {
      if (t.isImportDeclaration(node)) {
        after = index + 1
      }
    })
    program.body.splice(
      after,
      0,
      t.importDeclaration([specifier], t.stringLiteral(ROUTER_PACKAGE)),
    )
  }
}
