import { MasterAPI } from "./api"
import { html } from "./fragment"

export function defineMasterElement(tagName: string)
{
    const CustomMasterElement = class extends MasterElement { }
    customElements.define(tagName, CustomMasterElement)
    return (...params: ConstructorParameters<typeof CustomMasterElement>) => new CustomMasterElement(...params)
}

export abstract class MasterElement extends HTMLElement
{
    public static readonly globalFragment = document.createDocumentFragment()

    public readonly $: MasterAPI
    public readonly shadowRoot: ShadowRoot

    constructor()
    {
        super()
        this.shadowRoot = this.attachShadow({ mode: 'open' })
        this.shadowRoot.append(MasterElement.globalFragment.cloneNode(true))
        this.$ = new MasterAPI(this)
    }

    html<T extends unknown[]>(parts: TemplateStringsArray, ...values: T): Promise<any> extends T[number] ? Promise<typeof this> : typeof this
    {
        const fragment = html(parts, ...values)
        if (fragment instanceof Promise) return fragment.then(fragment => 
        {
            this.shadowRoot.append(fragment)
            return this
        }) as any
        this.shadowRoot.append(fragment)
        return this as any
    }
}