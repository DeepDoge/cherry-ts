import type { NodeWithMasterAPI } from "."

const enum NodePlace
{
    InDOM,
    Unknown
}

const mountUnmountObserver = new MutationObserver((mutations) => 
{
    for (const mutation of mutations)
    {
        Array.from(mutation.removedNodes).forEach(removedNode)
        Array.from(mutation.addedNodes).forEach((node) => addedNode(node, NodePlace.Unknown))
    }
})
mountUnmountObserver.observe(document, { childList: true, subtree: true })
const originalAttachShadow = Element.prototype.attachShadow
Element.prototype.attachShadow = function (options: ShadowRootInit)
{
    const shadowRoot = originalAttachShadow.call(this, options)
    if (options.mode === 'open') mountUnmountObserver.observe(shadowRoot, { childList: true, subtree: true })
    return shadowRoot
}

function addedNode(node: NodeWithMasterAPI, place: NodePlace)
{
    if (place === NodePlace.Unknown && getRootNode(node) !== document) return
    node.$masterAPI?.emitMount()
    Array.from(node.childNodes).forEach((node) => addedNode(node, NodePlace.InDOM))
    if (node instanceof HTMLElement) Array.from(node.shadowRoot?.childNodes ?? []).forEach((node) => addedNode(node, NodePlace.InDOM))
}

function removedNode(node: NodeWithMasterAPI)
{
    node.$masterAPI?.emitUnmount()
    Array.from(node.childNodes).forEach(removedNode)
    if (node instanceof HTMLElement) Array.from(node.shadowRoot?.childNodes ?? []).forEach(removedNode)
}

function getRootNode(node: Node): Node
{
    if (node instanceof ShadowRoot) return getRootNode(node.host)
    if (node.parentNode) return getRootNode(node.parentNode)
    return node
}
