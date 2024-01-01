import type { Utils } from "../internal/utils"

export namespace DOMUtils {
    export type ChildNodeOf<TParentNode extends ParentNode> =
        | CharacterData
        | (TParentNode extends SVGElement
              ? SVGElement
              : TParentNode extends HTMLElement
                ? Element
                : TParentNode extends MathMLElement
                  ? MathMLElement
                  : Element)

    type ExtractPossibleAttributes<T extends Element> = Utils.WritablePart<{
        [K in keyof T as Exclude<T[K], string | boolean> extends never
            ? K extends string
                ? string extends K
                    ? never
                    : K extends Lowercase<K>
                      ? Utils.KebabCase<K>
                      : never
                : never
            : never]?: NonNullable<T[K] extends boolean ? "true" | "" : T[K]> | null
    }>

    export type ARIAAttributes = {
        [K in keyof ARIAMixin as Utils.KebabCase<K>]?: NonNullable<ARIAMixin[K]> | null
    }

    export type Attributes<T extends Element> = {
        [K in `data-` | string]?: unknown
    } & ExtractPossibleAttributes<T> &
        (T extends { className: string | null } ? { class?: string } : {})

    export type Styles<T extends ElementCSSInlineStyle> = {
        [K in keyof T["style"] as K extends string
            ? string extends K
                ? never
                : T["style"][K] extends string | null
                  ? Utils.KebabCase<K> extends `webkit-${string}`
                      ? never
                      : K
                  : never
            : never]: T["style"][K] | null
    } & {
        [unknown: string]: string | null
    }

    export type EventMap<T extends Element> = T extends HTMLElement
        ? HTMLElementEventMap
        : T extends SVGElement
          ? SVGElementEventMap
          : T extends MathMLElement
            ? MathMLElementEventMap
            : ElementEventMap

    export type ValueKey<
        T extends string | null | undefined = keyof InputTypeToValueKeyMap,
    > =
        | (T extends keyof InputTypeToValueKeyMap ? InputTypeToValueKeyMap[T] : never)
        | "value"
    export type InputTypeToValueKeyMap = {
        radio: "checked"
        checkbox: "checked"
        range: "valueAsNumber"
        number: "valueAsNumber"
        date: "valueAsDate"
        "datetime-local": "valueAsDate"
        month: "valueAsDate"
        time: "valueAsDate"
        week: "valueAsDate"
        file: "files"
        text: "value"
        color: "value"
        email: "value"
        password: "value"
        search: "value"
        tel: "value"
        url: "value"
    }
}
