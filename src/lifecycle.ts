type Lifecycle = {
	mounted: boolean
	listeners: {
		mount: Function[]
		unmount: Function[]
	}
}
const mountables = new WeakMap<Node, Lifecycle>()
function mountableOf(node: Node) {
	let mountable = mountables.get(node)
	if (!mountable) {
		mountables.set(
			node,
			(mountable = {
				mounted: false,
				listeners: {
					mount: [],
					unmount: [],
				},
			})
		)
	}

	return mountable
}

const mutationObserver = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		Array.from(mutation.removedNodes).forEach(removedNode)
		Array.from(mutation.addedNodes).forEach((node) => addedNode(node))
	}
})
mutationObserver.observe(document, { childList: true, subtree: true })

const originalAttachShadow = Element.prototype.attachShadow
Element.prototype.attachShadow = function (options: ShadowRootInit) {
	const shadowRoot = originalAttachShadow.call(this, options)
	if (options.mode === "open") mutationObserver.observe(shadowRoot, { childList: true, subtree: true })
	return shadowRoot
}

const originalRemoveChild = Node.prototype.removeChild
Node.prototype.removeChild = function <T extends Node>(child: T) {
	originalRemoveChild(child)
	removedNode(child)
	return child
}

const originalRemove = Element.prototype.remove
Element.prototype.remove = function () {
	originalRemove.call(this)
	removedNode(this)
}

function addedNode(node: Node) {
	if (node.getRootNode({ composed: true }) !== document) return
	emitMount(node)
	if (node instanceof HTMLElement) Array.from(node.shadowRoot?.childNodes ?? []).forEach((node) => addedNode(node))
	Array.from(node.childNodes).forEach((node) => addedNode(node))
}

function removedNode(node: Node) {
	emitUnmount(node)
	if (node instanceof HTMLElement) Array.from(node.shadowRoot?.childNodes ?? []).forEach(removedNode)
	Array.from(node.childNodes).forEach(removedNode)
}

function emitMount(node: Node) {
	const mountable = mountables.get(node)
	if (!mountable) return

	if (mountable.mounted) return
	mountable.mounted = true
	mountable.listeners.mount.forEach((listener) => listener())
}

function emitUnmount(node: Node) {
	const mountable = mountables.get(node)
	if (!mountable) return

	if (!mountable.mounted) return
	mountable.mounted = false
	mountable.listeners.unmount.forEach((listener) => listener())
}

export type MountListener<R extends Function | void = Function | void> = {
	(): R
}

export function onMount<T extends MountListener>(node: Node, listener: T) {
	const mountable = mountableOf(node)

	if (mountable.mounted === true) listener()?.()
	else {
		mountable.listeners.mount.push(() => {
			const cleanup = listener()
			if (typeof cleanup === "function") mountable.listeners.unmount.push(cleanup)
		})
	}
}

export function onUnmount<T extends MountListener>(node: Node, listener: T) {
	const mountable = mountableOf(node)

	if (mountable.mounted === false) listener()?.()
	else {
		mountable.listeners.unmount.push(() => {
			const cleanup = listener()
			if (typeof cleanup === "function") mountable.listeners.mount.push(cleanup)
		})
	}
}