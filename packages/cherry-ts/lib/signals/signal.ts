import {
    FOLLOW,
    FOLLOW$,
    FOR_EACH,
    IMMEDIATE,
    UNFOLLOW,
    isFunction,
    weakMap,
    weakSet,
} from "../helpers"
import { Lifecycle, onConnected$ } from "../lifecyle"

export type SignalLikeOrValue<T> = SignalLike<T> | T
export type SignalLike<T> = Signal<T> | ((...args: unknown[]) => T)
export interface Signal<T> {
    readonly ref: T
    follow(follower: Signal.Follower<T>, options?: Signal.Follow.Options): Signal.Follow
    follow$<T extends Lifecycle.Connectable>(
        node: T,
        ...args: Parameters<this["follow"]>
    ): void
    ping(): void
}
export namespace Signal {
    export interface Mut<T> extends Signal<T> {
        ref: T
        asImmutable(): Signal<T>
    }

    export type Builder = <T>(initial: T, updater?: Updater<T>) => Signal.Mut<T>
    export type Updater<T> = (set: (value: T) => void) => (() => void) | void

    export type Follow = { unfollow: Unfollow }
    export type Unfollow = () => void
    export namespace Follow {
        export type Options = {
            mode?: "once" | "normal" | "immediate"
        }
    }
    export type Follower<T> = (value: T) => void
}

let signals = weakSet<Signal<unknown>>()

export let isSignal = (value: any): value is Signal<unknown> => signals.has(value)

export let isSignalLike = <T>(value: any): value is SignalLike<T> =>
    isSignal(value) || isFunction(value)

export let signalFrom = <T>(src: SignalLike<T>): Signal<T> =>
    isFunction(src) ? derive(src) : src

export let signal: Signal.Builder = (currentValue, updater) => {
    type T = typeof currentValue

    let followers = new Set<Signal.Follower<T>>()

    let ping: Signal<T>["ping"] = () =>
        followers[FOR_EACH]((follower) => follower(currentValue))
    let set = (value: T) => value !== currentValue && ((currentValue = value), ping())

    let cleanup: (() => void) | void
    let passive = () => cleanup && (cleanup(), (cleanup = void 0))
    let active = () => updater && !cleanup && (cleanup = updater(set))

    let self: Signal.Mut<T> = {
        set ref(value) {
            set(value)
        },
        get ref() {
            active(), setTimeout(() => followers.size || passive(), 5000)
            usedSignalsTail?.add(self)
            return currentValue
        },
        ping,
        [FOLLOW]: (follower, options = {}) => (
            active(),
            options.mode == IMMEDIATE && follower(currentValue),
            followers.add(follower),
            {
                [UNFOLLOW]() {
                    followers.delete(follower), followers.size || passive()
                },
            }
        ),
        [FOLLOW$]: (node, ...args) =>
            onConnected$(node, () => self[FOLLOW](...args)[UNFOLLOW]),
        asImmutable: () => self,
    }
    signals.add(self)
    return self
}

let usedSignalsTail: Set<Signal<unknown>> | undefined
let callAndCaptureUsedSignals = <T, TArgs extends unknown[]>(
    fn: (...args: TArgs) => T,
    usedSignals?: Set<Signal<unknown>>,
    ...args: TArgs
): T => {
    let userSignalsBefore = usedSignalsTail
    usedSignalsTail = usedSignals
    try {
        return fn(...args)
    } catch (error) {
        throw error
    } finally {
        usedSignalsTail = userSignalsBefore
    }
}

let deriveCache = weakMap<Function, Signal.Mut<unknown>>()
export let derive = <T>(
    fn: () => T,
    staticDependencies?: readonly Signal<unknown>[],
): Signal<T> => {
    let value = deriveCache.get(fn) as Signal.Mut<T> | undefined
    return staticDependencies
        ? signal<T>(fn(), (set) => {
              let follows = staticDependencies.map((dependency) =>
                  dependency.follow(() => set(fn())),
              )
              return () => follows.forEach((follow) => follow.unfollow())
          })
        : value ||
              (deriveCache.set(
                  fn,
                  (value = signal<T>(undefined!, (set) => {
                      let toUnfollow: Set<Signal<unknown>> | undefined
                      let follows = weakMap<Signal<unknown>, Signal.Follow>()
                      let unfollow = () =>
                          toUnfollow?.[FOR_EACH]((signal) =>
                              follows.get(signal)!.unfollow(),
                          )
                      let update = () => {
                          let toFollow = new Set<Signal<unknown>>()
                          set(callAndCaptureUsedSignals(fn, toFollow))
                          toFollow[FOR_EACH]((signal) => {
                              !follows.has(signal) &&
                                  follows.set(signal, signal.follow(update))
                              toUnfollow?.delete(signal)
                          })
                          unfollow()
                          toUnfollow = toFollow
                      }

                      update()

                      return unfollow
                  })),
              ),
              value)
}
