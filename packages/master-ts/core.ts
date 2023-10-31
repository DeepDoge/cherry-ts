/* 
	All core functionality is in one file, so internal stuff can be isolated
	Code in this file should be as small and as optimized as much as posibble
	While keeping the readablity in an optimum level 
*/

import type { Utils } from "./utils"

let doc = (typeof window === "undefined" ? null : document) as Document
let isFunction = (value: any): value is Function => typeof value === "function"
let isArray = (value: unknown): value is unknown[] => Array.isArray(value)
let weakMap = <K extends object, V>() => new WeakMap<K, V>()
let weakSet = WeakSet
let startsWith = <const T extends string>(text: string, start: T): text is `${T}${string}` => text.startsWith(start)
let timeout = setTimeout
let createComment = (...args: Parameters<typeof document.createComment>) => doc.createComment(...args)
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
export let onConnected$ = <T extends Lifecycle.Connectable>(node: T, listener: Lifecycle.OnConnected): void => {
    let lifecycleItem: Lifecycle.Item = [() => (lifecycleItem[1] = listener())]
    node.isConnected && lifecycleItem[0]()
    lifecycleListeners.get(node)?.push(lifecycleItem) ?? lifecycleListeners.set(node, [lifecycleItem])
}

if (doc) {
    let connected = new weakSet<Node>()
    let callFnOnTree = (node: Node, tupleIndex: 0 | 1): void => {
        if (!!tupleIndex == !connected.has(node)) return
        lifecycleListeners.get(node)?.[FOR_EACH]((callbacks) => callbacks[tupleIndex]?.())
        Array.from((node as Element).shadowRoot?.childNodes ?? [])[FOR_EACH]((childNode) =>
            callFnOnTree(childNode, tupleIndex)
        )
        Array.from(node.childNodes)[FOR_EACH]((childNode) => callFnOnTree(childNode, tupleIndex))

        // c[i?"delete":"add"](n)
        // i?c.delete(n):c.add(n)
        tupleIndex ? connected.delete(node) : connected.add(node)
    }

    let mutationObserver = new MutationObserver((mutations) =>
        mutations[FOR_EACH](
            (mutation) => (
                mutation.addedNodes[FOR_EACH]((addedNode) => callFnOnTree(addedNode, 0)),
                mutation.removedNodes[FOR_EACH]((removedNode) => callFnOnTree(removedNode, 1))
            )
        )
    )

    let observe = <T extends Node>(root: T): T => (
        mutationObserver.observe(root, {
            characterData: true,
            childList: true,
            subtree: true
        }),
        root
    )

    let ATTACH_SHADOW = "attachShadow" as const
    observe(doc)
    let elementPrototype = Element.prototype
    let elementAttachShadow = elementPrototype[ATTACH_SHADOW]
    elementPrototype[ATTACH_SHADOW] = function (this, ...args) {
        return observe(elementAttachShadow.apply(this, args))
    }
}

export type SignalOrValue<T> = T | Signal<T>
export type SignalOrValueOrFn<T> = SignalOrValue<T> | ((...args: unknown[]) => T)
export type SignalOrFn<T> = Signal<T> | ((...args: unknown[]) => T)
export interface Signal<T> {
    readonly ref: T
    follow(follower: Signal.Follower<T>, options?: Signal.Follow.Options): Signal.Follow
    follow$<T extends Lifecycle.Connectable>(node: T, ...args: Parameters<this["follow"]>): void
    ping(): void
}
export namespace Signal {
    export interface Mut<T> extends Signal<T> {
        ref: T
        asImmutable(): Signal<T>
    }

    export type Builder = <T>(initial: T, updater?: Updater<T>) => Signal.Mut<T>
    export type Updater<T> = (set: (value: T) => void) => (() => void) | void

    export type Follow = { unfollow: Unfollow }
    export type Unfollow = () => void
    export namespace Follow {
        export type Options = {
            mode?: typeof FOLLOW_MODE_ONCE | typeof FOLLOW_MODE_NORMAL | typeof FOLLOW_MODE_IMMEDIATE
        }
    }
    export type Follower<T> = (value: T) => void
}

let FOLLOW = "follow" as const
let FOLLOW$ = (FOLLOW + "$") as `${typeof FOLLOW}$`
let UNFOLLOW = ("un" + FOLLOW) as `un${typeof FOLLOW}`
let FOLLOW_MODE_ONCE = "once" as const
let FOLLOW_MODE_NORMAL = "normal" as const
let FOLLOW_MODE_IMMEDIATE = "immediate" as const

let FOLLOW_IMMEDIATE_OPTION = { mode: FOLLOW_MODE_IMMEDIATE } as const satisfies Signal.Follow.Options

let signals = new weakSet<Signal<unknown>>()

export let isSignal = (value: any): value is Signal<unknown> => signals.has(value)

export let isSignalOrFn = <T>(value: any): value is SignalOrFn<T> => isSignal(value) || isFunction(value)

export let signalFrom = <T>(src: SignalOrFn<T>): Signal<T> => (isFunction(src) ? derive(src) : src)

export let signal: Signal.Builder = (currentValue, updater) => {
    type T = typeof currentValue

    let followers = new Set<Signal.Follower<T>>()

    let ping: Signal<T>["ping"] = () => followers[FOR_EACH]((follower) => follower(currentValue))
    let set = (value: T) => value !== currentValue && ((currentValue = value), ping())

    let cleanup: (() => void) | void
    let passive = () => cleanup && (cleanup(), (cleanup = void 0))
    let active = () => updater && !cleanup && (cleanup = updater(set))

    let self: Signal.Mut<T> = {
        set ref(value) {
            set(value)
        },
        get ref() {
            active(), timeout(() => followers.size || passive(), 5000)
            usedSignalsTail?.add(self)
            return currentValue
        },
        ping,
        [FOLLOW]: (follower, options = {}) => (
            active(),
            options.mode === FOLLOW_MODE_IMMEDIATE && follower(currentValue),
            followers.add(follower),
            {
                [UNFOLLOW]() {
                    followers.delete(follower), followers.size || passive()
                }
            }
        ),
        [FOLLOW$]: (node, ...args) => onConnected$(node, () => self[FOLLOW](...args)[UNFOLLOW]),
        asImmutable: () => self
    }
    signals.add(self)
    return self
}

let usedSignalsTail: Set<Signal<unknown>> | undefined
let callAndCaptureUsedSignals = <T, TArgs extends unknown[]>(
    fn: (...args: TArgs) => T,
    usedSignals?: Set<Signal<unknown>>,
    ...args: TArgs
): T => {
    let userSignalsBefore = usedSignalsTail
    usedSignalsTail = usedSignals
    try {
        return fn(...args)
    } catch (error) {
        throw error
    } finally {
        usedSignalsTail = userSignalsBefore
    }
}

let deriveCache = weakMap<Function, Signal.Mut<unknown>>()
export let derive = <T>(fn: () => T, staticDependencies?: readonly Signal<unknown>[]): Signal<T> => {
    let value = deriveCache.get(fn)
    return value
        ? (value as Signal<T>)
        : staticDependencies
        ? signal<T>(fn(), (set) => {
              let follows = staticDependencies.map((dependency) => dependency.follow(() => set(fn())))
              return () => follows.forEach((follow) => follow.unfollow())
          })
        : signal<T>(undefined!, (set) => {
              let toUnfollow: Set<Signal<unknown>> | undefined
              let follows = weakMap<Signal<unknown>, Signal.Follow>()
              let unfollow = () => toUnfollow?.[FOR_EACH]((signal) => follows.get(signal)!.unfollow())
              let scheduled = false
              let schedule = () =>
                  scheduled || ((scheduled = true), timeout(() => scheduled && ((scheduled = false), update())))
              let update = () => {
                  let toFollow = new Set<Signal<unknown>>()
                  set(callAndCaptureUsedSignals(fn, toFollow))
                  toFollow[FOR_EACH]((signal) => {
                      !follows.has(signal) && follows.set(signal, signal.follow(schedule))
                      toUnfollow?.delete(signal)
                  })
                  unfollow()
                  toUnfollow = toFollow
              }

              update()

              return () => {
                  scheduled = false
                  unfollow()
              }
          })
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
            e: itemEnd
        }

        let itemBefore = items[insertBefore]
        itemBefore
            ? (itemBefore.s.before(itemStart, toNode(value), itemEnd), items.splice(insertBefore, 0, self))
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
            if (!isArray(oldValue) || !isArray(value)) clearBetween(start, end), (items[LENGTH] = 0)
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
                          : currentIndex + 1 < value[LENGTH] && value[currentIndex + 1] === currentItem.v
                          ? createItem(currentValue, currentIndex++)
                          : (removeItem(currentIndex), createItem(currentValue, currentIndex)))
            }
            clearBetween(items[value[LENGTH] - 1]?.e ?? start, end)
            items.splice(value[LENGTH])
        },
        FOLLOW_IMMEDIATE_OPTION
    )

    return signalFragment
}

let toNode = (value: unknown): Node => {
    return value === null
        ? fragment()
        : isArray(value)
        ? fragment(...value.map(toNode))
        : value instanceof Node
        ? value
        : isSignalOrFn(value)
        ? bindSignalAsFragment(value)
        : doc.createTextNode(value + EMPTY_STRING)
}

export let fragment = (...children: Template.Member[]): DocumentFragment => {
    let result = doc.createDocumentFragment()
    result.append(...children.map(toNode))
    return result
}

type InputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
type InputValueKeyMap<Type extends string> = Type extends keyof typeof inputValueKeyMap
    ? (typeof inputValueKeyMap)[Type]
    : typeof VALUE
type InputValueTypeMap<Type extends string> = HTMLInputElement[InputValueKeyMap<Type>]
let CHECKED = "checked" as const
let VALUE = "value" as const
let VALUE_AS_NUMBER = (VALUE + "AsNumber") as `${typeof VALUE}AsNumber`
let VALUE_AS_DATE = (VALUE + "AsDate") as `${typeof VALUE}AsDate`
let inputValueKeyMap = {
    radio: CHECKED,
    checkbox: CHECKED,
    range: VALUE_AS_NUMBER,
    number: VALUE_AS_NUMBER,
    date: VALUE_AS_DATE,
    "datetime-local": VALUE_AS_DATE,
    month: VALUE_AS_DATE,
    time: VALUE_AS_DATE,
    week: VALUE_AS_DATE
} as const
let getInputValueKey = <Type extends keyof typeof inputValueKeyMap | (string & {})>(type: Type) =>
    (inputValueKeyMap[type as keyof typeof inputValueKeyMap] ?? VALUE) as InputValueKeyMap<Type>

export namespace Template {
    export type Member =
        | string
        | number
        | boolean
        | null
        | Node
        | Member[]
        | (() => Member)
        | (Signal<unknown> & { ref: Member })

    export type Attributes<
        T extends Element,
        TInputType extends HTMLInputElement["type"] = HTMLInputElement["type"]
    > = {
        [key: string]: unknown
    } & {
        class?: string
        style?: string
        title?: string
    } & {
        [K in `class:${string}`]?: SignalOrValueOrFn<boolean>
    } & (T extends HTMLElement
            ? {
                  [K in `style:${Utils.Kebab<
                      Extract<keyof CSSStyleDeclaration, string>
                  >}`]?: K extends `style:${Utils.Kebab<
                      Extract<infer StyleKey extends keyof CSSStyleDeclaration, string>
                  >}`
                      ? SignalOrValueOrFn<CSSStyleDeclaration[StyleKey]>
                      : never
              }
            : {}) & {
            [K in `on:${keyof HTMLElementEventMap}`]?: K extends `on:${infer EventName extends
                keyof HTMLElementEventMap}`
                ? ((event: HTMLElementEventMap[EventName] & { target: T }) => void) | Function
                : never
        } & {
            [K in `on:${string}`]?: ((event: Event & { target: T }) => void) | Function
        } & (T extends InputElement
            ? {
                  type?: TInputType
                  "bind:value"?: Signal.Mut<InputValueTypeMap<TInputType>>
              }
            : {})

    export type Builder<T extends Element> = {
        <TInputType extends HTMLInputElement["type"]>(attributes?: Attributes<T, TInputType>, children?: Member[]): T
        (children?: Member[]): T
    }
}

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
            (...args: Parameters<Template.Builder<HTMLElement>>) =>
                populate(doc.createElement(tagName), ...args)
    }
) as Tags

let bindOrSet = <T>(element: Element, value: SignalOrValueOrFn<T>, then: (value: T) => void): void =>
    isSignalOrFn(value) ? signalFrom(value)[FOLLOW$](element, then, FOLLOW_IMMEDIATE_OPTION) : then(value)

let bindSignalAsValue = <T extends InputElement>(element: T, signal: Signal.Mut<InputValueTypeMap<T["type"]>>) => {
    onConnected$(element, () => {
        let onInput = (event: Event) => (signal.ref = (event.target as T)[getInputValueKey(element.type)])
        element.addEventListener("input", onInput)
        let follow = signal[FOLLOW](
            (value) => (element[getInputValueKey(element.type)] = value),
            FOLLOW_IMMEDIATE_OPTION
        )
        return () => (element.removeEventListener("input", onInput), follow[UNFOLLOW]())
    })
}

export let populate: {
    <T extends Element>(element: T, attributes?: Template.Attributes<T>, children?: Template.Member[]): T
    <T extends Node>(node: T, children?: Template.Member[]): T
} = <T extends HTMLElement>(
    element: T,
    _childrenOrAttributes?: Template.Member[] | Template.Attributes<T>,
    _children?: Template.Member[],
    [children, attributes] = isArray(_childrenOrAttributes)
        ? [_childrenOrAttributes]
        : [_children, _childrenOrAttributes]
): T => (
    attributes &&
        Object.keys(attributes)[FOR_EACH]((key) =>
            key === (("bind:" + VALUE) as `bind:${typeof VALUE}`)
                ? isSignal(attributes[key])
                    ? bindSignalAsValue(element as never, attributes[key] as never)
                    : element.setAttribute(VALUE, attributes[key] + EMPTY_STRING)
                : startsWith(key, "style:")
                ? bindOrSet(
                      element,
                      attributes[key],
                      (value) => element.style?.setProperty(key.slice(6), value === null ? value : value + EMPTY_STRING)
                  )
                : startsWith(key, "class:")
                ? bindOrSet(element, attributes[key], (value) => element.classList.toggle(key.slice(6), !!value))
                : startsWith(key, "on:")
                ? element.addEventListener(key.slice(3), attributes[key] as EventListener)
                : bindOrSet(element, attributes[key], (value) =>
                      value === null ? element.removeAttribute(key) : element.setAttribute(key, value + EMPTY_STRING)
                  )
        ),
    children && element.append(toNode(children)),
    element
)
