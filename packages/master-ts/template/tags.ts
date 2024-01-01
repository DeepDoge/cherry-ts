import { Template } from "."
import { isArray } from "../internal/short"
import { isSignal } from "../signal"

export type Tags = {
    [K in keyof HTMLElementTagNameMap]: Template.Builder<HTMLElementTagNameMap[K]>
} & {
    [unknownTag: string]: Template.Builder<HTMLElement>
}
export let tags = new Proxy(
    {},
    {
        get:
            (_, tagName: string) =>
            (...[propsOrMembers, members]: Parameters<Template.Builder<HTMLElement>>) => {
                let props: Template.Props<HTMLElement> = {}
                members =
                    (isArray(propsOrMembers)
                        ? (propsOrMembers as never)
                        : ((props = (propsOrMembers as never) ?? {}), members)) ?? []

                const xml = `<${tagName} ${Object.entries(props)
                    .map(([k, v]) => `${k}="${propToString(k, v)}"`)
                    .join(" ")}>${members.map(memberToString).join("")}</${tagName}>`

                return xml
            },
    },
) as Tags

let propToString = (prop: string, value: unknown) =>
    typeof value !== "string" && prop.includes(":")
        ? mapToSomeIdOrsomething(value)
        : String(value)
let memberToString = (member: unknown) =>
    isSignal(member)
        ? createCustomSignalViewElementTagThingOrSomething(member)
        : String(member)
