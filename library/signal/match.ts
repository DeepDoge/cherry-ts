import type { SignalReadable } from "../signal/readable"
import type { Renderable } from "../template/renderable"
import type { Excludable } from "../utils/type"
import { createSwitch } from "./switch"

type Then<T> = (value: T) => unknown
type Match<TValue, TReturns = unknown> = {
	case<TCase extends TValue, TThen extends Then<TCase>>(
		value: TCase,
		then: TThen
	): Match<Excludable<TCase, Exclude<TValue, TCase>, TValue>, TReturns | ReturnType<TThen>>
	default<TDefault extends Then<TValue>>(fallback: TDefault): Match<never, TReturns | ReturnType<TDefault>>
} & (TValue extends never ? Renderable<TReturns> : {})

type MatchSignal<TValue, TReturns = never> = {
	case<TCase extends TValue, TThen extends Then<TCase>>(
		value: TCase,
		then: TThen
	): MatchSignal<Excludable<TCase, Exclude<TValue, TCase>, TValue>, TReturns | ReturnType<TThen>>
	default<TDefault extends Then<SignalReadable<TValue>>>(fallback: TDefault): MatchSignal<never, TReturns | ReturnType<TDefault>>
} & (TValue extends never ? Renderable<TReturns> : {})

export const createMatch: {
	<T>(value: SignalReadable<T>): MatchSignal<T>
	<T>(value: T): Match<T>
} = <T>(value: T | SignalReadable<T>) => {
	return createSwitch(value) as never
}