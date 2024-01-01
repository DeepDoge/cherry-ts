/* 
    All core functionality is in one file, so internal stuff can be isolated
    Code in this file should be as small and as optimized as much as posibble
    While keeping the readablity in an optimum level 
*/

/* 
    While typing be aware of difference between Node, Element HTMLElement, SVGElement MathMLElement and etc.
    `tags` will only work with HTMLElement(s), while all other functions support Element.
*/

import { browser } from "./environment"
import { instanceOf, isArray } from "./internal/short"
import { isSignalLike } from "./signal"
import type { Template } from "./template"

let NULL: null = null
let doc = browser ? document : NULL
let weakMap = <K extends object, V>() => new WeakMap<K, V>()

let weakSet = WeakSet
let startsWith = <const T extends string>(
    text: string,
    start: T,
): text is `${T}${string}` => text.startsWith(start)
let timeout = setTimeout
let createComment = (...args: Parameters<typeof document.createComment>) =>
    doc!.createComment(...args)
let clearBetween = (start: ChildNode, end: ChildNode, inclusive = false) => {
    while (start.nextSibling !== end) start.nextSibling![REMOVE]()
    inclusive && (end[REMOVE](), start[REMOVE]())
}
let FOR_EACH = "forEach" as const
let REMOVE = "remove" as const
let LENGTH = "length" as const
let EMPTY_STRING = "" as const

export namespace Lifecycle {
    export type Connectable = Element | CharacterData
    export type OnConnected = () => void | Cleanup
    export type Cleanup = () => void
    export type Item =
        | [connected: Lifecycle.OnConnected, cleanup: Lifecycle.Cleanup]
        | [connected: Lifecycle.OnConnected]
        | [connected: Lifecycle.OnConnected, void]
}

let lifecycleListeners = weakMap<Node, Lifecycle.Item[]>()
export let onConnected$ = <T extends Lifecycle.Connectable>(
    node: T,
    listener: Lifecycle.OnConnected,
): void => {
    let lifecycleItem: Lifecycle.Item = [() => (lifecycleItem[1] = listener())]
    node.isConnected && lifecycleItem[0]()
    lifecycleListeners.get(node)?.push(lifecycleItem) ??
        lifecycleListeners.set(node, [lifecycleItem])
}

if (doc) {
    let connected = new weakSet<Node>()
    /**
     * @param tupleIndex 0 = connected, 1 = disconnected
     */
    let callFnOnTree = (node: Node, tupleIndex: 0 | 1): Node => (
        (tupleIndex as unknown as boolean) == !connected.has(node) ||
            (lifecycleListeners
                .get(node)
                ?.[FOR_EACH]((callbacks) => callbacks[tupleIndex]?.()),
            Array.from((node as Element).shadowRoot?.childNodes ?? [])[FOR_EACH](
                (childNode) => callFnOnTree(childNode, tupleIndex),
            ),
            Array.from(node.childNodes)[FOR_EACH]((childNode) =>
                callFnOnTree(childNode, tupleIndex),
            ),
            tupleIndex ? connected.delete(node) : connected.add(node)),
        node
    )

    let mutationObserver = new MutationObserver((mutations) =>
        mutations[FOR_EACH](
            (mutation) => (
                mutation.addedNodes[FOR_EACH]((addedNode) => callFnOnTree(addedNode, 0)),
                mutation.removedNodes[FOR_EACH]((removedNode) =>
                    callFnOnTree(removedNode, 1),
                )
            ),
        ),
    )

    let observe = <T extends Node>(root: T): T => (
        mutationObserver.observe(root, {
            characterData: true,
            childList: true,
            subtree: true,
        }),
        root
    )

    observe(doc)
    /* 
        OGAA BOOGA ME LIKE ROCK 🪨
    */
    let ATTACH_SHADOW = "attachShadow" as const
    let PROTOTYPE = "prototype" as const
    let elementPrototype = Element[PROTOTYPE]
    let elementAttachShadow = elementPrototype[ATTACH_SHADOW]
    let elementRemove = elementPrototype[REMOVE]
    let characterDataPrototype = CharacterData[PROTOTYPE]
    let characterDataRemove = characterDataPrototype[REMOVE]
    elementPrototype[ATTACH_SHADOW] = function (this, ...args) {
        return observe(elementAttachShadow.apply(this, args))
    }
    elementPrototype[REMOVE] = function (this) {
        return elementRemove.call(callFnOnTree(this, 1))
    }
    characterDataPrototype[REMOVE] = function (this) {
        return characterDataRemove.call(callFnOnTree(this, 1))
    }
}

let bindSignalAsFragment = <T>(signalOrFn: SignalOrFn<T>): DocumentFragment => {
    let start = createComment(EMPTY_STRING)
    let end = createComment(EMPTY_STRING)
    let signalFragment = fragment(start, end)

    type Item = Readonly<{
        v: unknown
        s: Comment
        e: Comment
    }>

    // TODO: make this not use an array, use the DOM alone
    let items: Item[] = []
    let createItem = (value: unknown, insertBefore: number = -1) => {
        let itemStart = createComment(EMPTY_STRING)
        let itemEnd = createComment(EMPTY_STRING)

        let self: Item = {
            v: value,
            s: itemStart,
            e: itemEnd,
        }

        let itemBefore = items[insertBefore]
        itemBefore
            ? (itemBefore.s.before(itemStart, toNode(value), itemEnd),
              items.splice(insertBefore, 0, self))
            : (items.push(self), end.before(itemStart, toNode(value), itemEnd))

        return self
    }

    let removeItem = (index: number) => {
        let item = items[index]!
        clearBetween(item.s, item.e, true)
        items.splice(index, 1)
    }

    let oldValue: unknown
    signalFrom(signalOrFn)[FOLLOW$](
        start,
        (value: T) => {
            if (!isArray(oldValue) || !isArray(value))
                clearBetween(start, end), (items[LENGTH] = 0)
            oldValue = value
            if (!isArray(value)) return end.before(toNode(value))

            for (let currentIndex = 0; currentIndex < value[LENGTH]; currentIndex++) {
                let currentItem = items[currentIndex]
                let nextItem = items[currentIndex + 1]
                let currentValue = value[currentIndex]

                !currentItem
                    ? createItem(currentValue)
                    : currentValue !== currentItem.v &&
                      (nextItem && currentValue === nextItem.v
                          ? removeItem(currentIndex)
                          : currentIndex + 1 < value[LENGTH] &&
                              value[currentIndex + 1] === currentItem.v
                            ? createItem(currentValue, currentIndex++)
                            : (removeItem(currentIndex),
                              createItem(currentValue, currentIndex)))
            }
            clearBetween(items[value[LENGTH] - 1]?.e ?? start, end)
            items.splice(value[LENGTH])
        },
        FOLLOW_IMMEDIATE_OPTION,
    )

    return signalFragment
}

let toNode = (value: unknown): CharacterData | Element | DocumentFragment => {
    return value === NULL
        ? fragment()
        : isArray(value)
          ? fragment(...value.map(toNode))
          : instanceOf(value, Element, DocumentFragment, CharacterData)
            ? value
            : isSignalLike(value)
              ? bindSignalAsFragment(value)
              : doc!.createTextNode(value + EMPTY_STRING)
}

export let fragment = <
    const TChildren extends readonly Template.MemberOf<DocumentFragment>[],
>(
    ...children: TChildren
): DocumentFragment => {
    let result = doc!.createDocumentFragment()
    result.append(...children.map(toNode))
    return result
}
