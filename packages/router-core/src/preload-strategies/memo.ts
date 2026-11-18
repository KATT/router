/**
 * The key strategy factories memoize options by: their own enumerable
 * values, by sorted key, when each is a string, number, boolean or `null`.
 * `undefined` values are left out, and `null` or missing options are `{}`,
 * so `{ delay: undefined }`, `{}` and no options are the same. With any other
 * value (an object, function, symbol or bigint) there is no key, so each call
 * makes a new strategy.
 */
export function optionsKey(options?: object | null): string | undefined {
  const values: Array<unknown> = []
  for (const name of Object.keys(options ?? {}).sort()) {
    const value = (options as Record<string, unknown>)[name]
    const type = typeof value
    if (value === undefined) {
      continue
    }
    if (
      value !== null &&
      type !== 'string' &&
      type !== 'number' &&
      type !== 'boolean'
    ) {
      return undefined
    }
    // The type keeps `1` apart from `'1'`, and `null` from `NaN`
    values.push(name, type, String(value))
  }
  return JSON.stringify(values)
}

/**
 * Memoizes `make` by `optionsKey`: the same options give the same strategy.
 * `make` gets its own copy of the options.
 */
/* @__NO_SIDE_EFFECTS__ */
export function memoByOptions<TOptions extends object, TResult>(
  make: (options: TOptions) => TResult,
): (options?: TOptions) => TResult {
  const made = new Map<string, TResult>()
  return (options) => {
    const key = optionsKey(options)
    let result = key === undefined ? undefined : made.get(key)
    if (!result) {
      result = make({ ...options } as TOptions)
      if (key !== undefined) {
        made.set(key, result)
      }
    }
    return result
  }
}
