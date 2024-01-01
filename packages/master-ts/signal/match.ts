import { Signal } from "."
import type { Utils } from "../internal/utils"

export const TYPEOF = Symbol()
export type TYPEOF = typeof TYPEOF

export const INSTANCEOF = Symbol()
export type INSTANCEOF = typeof INSTANCEOF

type CanExhaust<TExhauster> = [TExhauster] extends [never]
    ? false
    : [
            Utils.NotEquals<TExhauster, boolean>,
            Utils.NotEquals<TExhauster, number>,
            Utils.NotEquals<TExhauster, bigint>,
            Utils.NotEquals<TExhauster, string>,
            Utils.NotEquals<TExhauster, symbol>,
        ][number] extends true
      ? TExhauster extends Utils.ReferanceType
          ? false
          : true
      : false

// Some inline type tests
false satisfies CanExhaust<never>
true satisfies CanExhaust<undefined>
true satisfies CanExhaust<null>
false satisfies CanExhaust<string>
false satisfies CanExhaust<number>
false satisfies CanExhaust<bigint>
false satisfies CanExhaust<boolean>
false satisfies CanExhaust<symbol>
false satisfies CanExhaust<() => void>
false satisfies CanExhaust<{}>
false satisfies CanExhaust<{ a: 1 }>
false satisfies CanExhaust<string & { a: 1; b: 2 }>
false satisfies CanExhaust<[1, 2, 3]>
true satisfies CanExhaust<"a">
true satisfies CanExhaust<1>
true satisfies CanExhaust<true>
true satisfies CanExhaust<1n>

// Exhaust with pattern lets use exhaust with the reference types and non-literal primitive types
// 	with pattern matching
type Exhaust<TType, TExhauster> = CanExhaust<TExhauster> extends true
    ? Exclude<TType, TExhauster>
    : TType
type ExhaustWithPattern<TType, TPattern> = TPattern extends Utils.PrimitiveType
    ? Exhaust<TType, TPattern>
    : Utils.NoNever<
          keyof TPattern extends INSTANCEOF | TYPEOF
              ? {
                    [K in keyof TPattern]: K extends INSTANCEOF
                        ? TPattern[K] extends { new (...args: any[]): infer T }
                            ? Exclude<TType, T>
                            : never
                        : K extends TYPEOF
                          ? TPattern[K] extends Utils.TypeString
                              ? Exclude<TType, Utils.TypeStringToType<TPattern[K]>>
                              : never
                          : never
                }[keyof TPattern]
              : keyof TPattern extends keyof TType
                ? TType & {
                      [K in keyof TPattern]: ExhaustWithPattern<TType[K], TPattern[K]>
                  }
                : never
      >

type PatternOf<TValue> =
    | (TValue extends Utils.PrimitiveType
          ? TValue
          : TValue extends object
            ?
                  | { [K in keyof TValue]?: PatternOf<TValue[K]> }
                  | {
                        [INSTANCEOF]: { new (...args: any[]): TValue }
                    }
            : TValue)
    | {
          [TYPEOF]: Utils.TypeToTypeString<TValue>
      }

type TypeOfPattern<TPattern> = TPattern extends object
    ? INSTANCEOF extends keyof TPattern
        ? TPattern[INSTANCEOF] extends { new (...args: any[]): infer T }
            ? T
            : never
        : TYPEOF extends keyof TPattern
          ? TPattern[TYPEOF] extends Utils.TypeString
              ? Utils.TypeStringToType<TPattern[TYPEOF]>
              : never
          : {
                [K in keyof TPattern]: TypeOfPattern<TPattern[K]>
            }
    : TPattern

type Narrow<TValue, TPattern> = TValue & Extract<TValue, TypeOfPattern<TPattern>>

let isObject = (value: any): value is object =>
    typeof value === "object" && value !== null

let matchPattern = <TValue, const TPattern extends PatternOf<TValue>>(
    value: TValue,
    pattern: TPattern,
): value is TValue & TPattern =>
    !isObject(pattern)
        ? (value as never) === (pattern as never)
        : TYPEOF in pattern
          ? pattern[TYPEOF] === typeof value
          : INSTANCEOF in pattern
            ? value instanceof (pattern as any)[INSTANCEOF]
            : !(Object.keys(pattern) as (keyof TPattern)[]).some(
                  (key) =>
                      !isObject(value) ||
                      !(key in value) ||
                      !matchPattern(value[key as keyof TValue], pattern[key] as never),
              )

type MatchBuilder<TValue, TReturns = never> = {
    case<const TPattern extends PatternOf<TValue>, TResult>(
        pattern: TPattern,
        then: (value: Signal<Narrow<TValue, TPattern>>) => TResult,
    ): MatchBuilder<ExhaustWithPattern<TValue, TPattern>, TReturns | TResult>
} & MatchBuilder.Default<TValue, TReturns>
namespace MatchBuilder {
    export type Default<TValue, TReturns> = [TValue] extends [never]
        ? {
              default(): Signal<TReturns>
          }
        : {
              default<TDefault>(
                  fallback: (value: Signal<TValue>) => TDefault,
              ): Signal<TReturns | TDefault>
          }
}

export let match: {
    <TValue>(valueSignalOrFn: SignalLike<TValue>): MatchBuilder<TValue>
} = <TValue>(
    valueSignalOrFn: SignalOrFn<TValue>,
    cases: {
        pattern: Utils.DeepOptional<TValue>
        then: (value: Signal<TValue>) => unknown
    }[] = [],
    valueSignal = signalFrom(valueSignalOrFn),
    self: MatchBuilder<TValue> = 0 as never,
): MatchBuilder<TValue> =>
    (self = {
        case: (
            pattern: Utils.DeepOptional<TValue>,
            then: (value: Signal<TValue>) => unknown,
        ) => (cases.push({ pattern, then }), self),
        default: (fallback?: (value: Signal<TValue>) => unknown) =>
            signal<unknown>(
                undefined,
                (set, currentIndex = -1) =>
                    valueSignal.follow(
                        (value) => {
                            if (
                                currentIndex >= 0 &&
                                matchPattern(value, cases[currentIndex]!.pattern as never)
                            )
                                return

                            for (let i = 0; i < cases.length; i++) {
                                if (i !== currentIndex) {
                                    let case_ = cases[i]!
                                    if (matchPattern(value, case_.pattern as never)) {
                                        currentIndex = i
                                        return set(case_.then(valueSignal))
                                    }
                                }
                            }
                            currentIndex = -1

                            return set(fallback?.(valueSignal))
                        },
                        { mode: "immediate" },
                    ).unfollow,
            ),
    } as never)
