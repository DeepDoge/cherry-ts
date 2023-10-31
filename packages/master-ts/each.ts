import type { Signal, SignalOrFn } from "master-ts/core.ts"
import { signal, signalFrom } from "master-ts/core.ts"

export let each = <T>(arr: SignalOrFn<T[]>) => ({
    key: (getKey: (value: T, index: number) => unknown) => ({
        as: <R>(as: (value: Signal<T>, index: Signal<number>) => R): Signal<R[]> => {
            const arrSignal = signalFrom(arr)
            const cache = new Map<unknown, [R, Signal.Mut<T>, Signal.Mut<number>]>()
            return signal<R[]>(
                undefined!,
                (set) =>
                    arrSignal.follow(
                        (arr) => {
                            const toRemove = new Set(cache.keys())
                            set(
                                arr.map((value, index) => {
                                    const key = getKey(value, index)
                                    if (cache.has(key)) {
                                        toRemove.delete(key)
                                        const [result, valueSignal, indexSignal] = cache.get(key)!
                                        valueSignal.ref = value
                                        valueSignal.ping()
                                        indexSignal.ref = index
                                        indexSignal.ping()
                                        return result
                                    }
                                    const valueSignal = signal(value)
                                    const indexSignal = signal(index)
                                    const result = as(valueSignal, indexSignal)
                                    cache.set(key, [result, valueSignal, indexSignal])
                                    return result
                                })
                            )
                            for (const key of toRemove) cache.delete(key)
                        },
                        { mode: "immediate" }
                    ).unfollow
            )
        }
    })
})
