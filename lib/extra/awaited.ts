import type { Signal } from "../core"
import { signal } from "../core"

export let awaited: {
	<T>(promise: Promise<T>): Readonly<Signal<T | null>>
	<T, U>(promise: Promise<T>, until: U): Readonly<Signal<T | U>>
} = (promise: Promise<unknown>, until: unknown = null) => {
	const promiseSignal = signal(until)
	promise.then((value) => (promiseSignal.ref = value))
	return promiseSignal
}
