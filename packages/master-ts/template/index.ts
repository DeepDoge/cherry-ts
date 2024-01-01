import type { Utils } from "../internal/utils"
import type { Signal, SignalLikeOrValue } from "../signal"
import { DOMUtils } from "./dom"

export namespace Template {
    export type MemberOf<T extends ParentNode> =
        | string
        | number
        | boolean
        | bigint
        | null
        | DOMUtils.ChildNodeOf<T>
        | readonly MemberOf<Extract<DOMUtils.ChildNodeOf<T>, ParentNode>>[]
        | readonly Exclude<DOMUtils.ChildNodeOf<T>, ParentNode>[]
        | (() => MemberOf<Extract<DOMUtils.ChildNodeOf<T>, ParentNode>>)
        | (() => Exclude<DOMUtils.ChildNodeOf<T>, ParentNode>)
        | Signal<MemberOf<Extract<DOMUtils.ChildNodeOf<T>, ParentNode>>>
        | Signal<Exclude<DOMUtils.ChildNodeOf<T>, ParentNode>>

    export type Builder<T extends ParentNode> = T extends Element
        ? {
              <
                  const TProps extends Props<T>,
                  const TMembers extends readonly MemberOf<T>[],
              >(
                  ...args:
                      | [props?: VerifyPropsGeneric<T, TProps>, members?: TMembers]
                      | [members?: TMembers]
              ): T
          }
        : {
              <const TMembers extends readonly MemberOf<T>[]>(members?: TMembers): T
          }

    export type Directives<T extends Element> = Readonly<
        Partial<
            { [K in `on:`]: never } & {
                [K in `on:${string}`]: { (event: Event & { target: T }): void } | Function
            } & {
                [K in keyof DOMUtils.EventMap<T> as K extends string
                    ? `on:${K}`
                    : never]:
                    | {
                          (event: DOMUtils.EventMap<T>[K] & { target: T }): void
                      }
                    | Function
            } & (T extends ElementCSSInlineStyle
                    ? {
                          [K in `style:`]: never
                      } & {
                          [K in `style:${string}`]: SignalLikeOrValue<string | null>
                      } & {
                          [K in keyof DOMUtils.Styles<T> as K extends string
                              ? `style:${Utils.KebabCase<K>}`
                              : never]: SignalLikeOrValue<NonNullable<
                              DOMUtils.Styles<T>[K]
                          > | null>
                      }
                    : {}) &
                (T extends { type: infer TType extends string; value: string | null }
                    ? {
                          [K in DOMUtils.ValueKey<TType> as K extends string
                              ? `bind:${K}`
                              : never]: K extends keyof T
                              ? Signal.Mut<NonNullable<T[K]> | null>
                              : never
                      }
                    : {}) &
                (T extends { className: string | null }
                    ? { [K in `class:`]: never } & {
                          [K in `class:${string}`]: SignalLikeOrValue<boolean | {}>
                      }
                    : {})
        >
    >

    export type Props<T extends Element> = Readonly<
        {
            [K in keyof DOMUtils.Attributes<T>]?: SignalLikeOrValue<
                DOMUtils.Attributes<T>[K]
            >
        } & Directives<T>
    >

    export type VerifyPropsGeneric<E extends Element, T extends Props<E>> = T &
        (Exclude<
            Extract<keyof Utils.OmitNonLiteral<T>, `${string}:${string}`>,
            keyof Utils.OmitNonLiteral<Directives<E>>
        > extends never
            ? {}
            : `Error: Invalid directive, ${Exclude<
                  Extract<keyof Utils.OmitNonLiteral<T>, `${string}:${string}`>,
                  keyof Utils.OmitNonLiteral<Directives<E>>
              >}`)
}
