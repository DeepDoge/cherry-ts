import type { Signal, SignalOrFn } from "master-ts/lib/core.ts"
import { signal, signalFrom } from "master-ts/lib/core.ts"

export let defer = <T>(signalOrFunction: SignalOrFn<T>, timeout_ms = 250): Readonly<Signal<T>> => {
	const sourceSignal = signalFrom(signalOrFunction)
	let timeout = null as Timer | null
	let follow: Signal.Follow | null = null
	return signal(
		sourceSignal.ref,
		(set) => (
			(follow = sourceSignal.follow((value) => {
				timeout && clearTimeout(timeout)
				timeout = setTimeout(() => ((timeout = null), set(value)), timeout_ms)
			})),
			follow?.unfollow
		)
	)
}
