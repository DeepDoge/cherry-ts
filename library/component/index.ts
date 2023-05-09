import type { MountableNode } from "../mountable"
import { mountableNodeAssert } from "../mountable"
import { randomId } from "../utils/id"

type TagName = `${string}-${string}${string[0]}`

export function defineComponent(tagName: TagName = `x-${randomId()}`) {
	class Component extends ComponentBase {
		public static $css: CSSStyleSheet | null = null

		constructor() {
			super()
			mountableNodeAssert(this)
		}

		public override set $html(nodes: Node[]) {
			while (this.$shadowRoot.firstChild) this.$shadowRoot.removeChild(this.$shadowRoot.firstChild)
			this.$shadowRoot.append(...nodes)
			this.$shadowRoot.adoptedStyleSheets = Component.$css ? [...ComponentBase.$globalCSS, Component.$css] : ComponentBase.$globalCSS
		}
	}

	customElements.define(tagName, Component)

	return Component as Omit<typeof Component, "new"> & { new (): InstanceType<typeof Component> & MountableNode }
}

export { ComponentBase as Component }
class ComponentBase extends HTMLElement {
	public static $globalCSS: CSSStyleSheet[] = []
	public $shadowRoot: ShadowRoot // needed to access shadowdom in chrome extensions, for some reason shadowRoot returns undefined in chrome extensions

	constructor() {
		super()
		this.$shadowRoot = this.attachShadow({ mode: "open" })
	}

	public set $html(nodes: Node[]) {
		while (this.$shadowRoot.firstChild) this.$shadowRoot.removeChild(this.$shadowRoot.firstChild)
		this.$shadowRoot.append(...nodes)
		this.$shadowRoot.adoptedStyleSheets = ComponentBase.$globalCSS
	}
}
