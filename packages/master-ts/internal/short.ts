/** @deprecated */
export let isFunction = (value: any): value is Function => typeof value === "function"

/** @deprecated */
export let isArray = (value: unknown): value is unknown[] => Array.isArray(value)

/** @deprecated */
export let instanceOf = <T extends (abstract new (...args: any) => any)[]>(
    value: unknown,
    ...types: T
): value is InstanceType<T[number]> => types.some((type) => value instanceof type)
