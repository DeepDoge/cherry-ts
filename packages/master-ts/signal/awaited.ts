import { Signal, SignalLike, signal, signalFrom } from "."

export let awaited: {
    <T>(promise: Promise<T> | SignalLike<Promise<T>>): Signal<T | null>
    <T, U>(promise: Promise<T> | SignalLike<Promise<T>>, until: U): Signal<T | U>
} = (
    promise: Promise<unknown> | SignalLike<Promise<unknown>>,
    until: unknown = null,
): Signal<unknown> =>
    signal(
        until,
        (set) =>
            signalFrom(promise).follow(
                (promise) => (set(until), promise.then((value) => set(value))),
                {
                    mode: "immediate",
                },
            ).unfollow,
    )
