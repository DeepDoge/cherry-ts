# cherry-ts

<p align="center">
    <img width="100px" height="auto" alt="cherry-ts logo" src="https://ipfs.io/ipfs/QmWtKLVqAg4Y4oFCeExpkua3SQzuBk4FaiPfNQefsU8dKA" />
</p>
<p align="center">
    A lightweight TypeScript library designed for creating SPAs. Cherry on top of vanilla JS.
</p>
<p align="center">
    Enhance Vanilla JS
</p>

## Size ⚡

**cherry-ts** is feature-complete, requires no building step, yet maintains a remarkably small footprint. To demonstrate its efficiency, here's a comparison with other well-known libraries:

| Library         | .min.js  | .min.js.gz |
| --------------- | -------- | ---------- |
| **cherry-ts**   | 4.4 KB   | 2.25 KB    |
| Preact 10.19.3  | 11.2 KB  | 4.5 KB     |
| Solid 1.8.12    | 23 KB    | 8.1 KB     |
| jQuery 3.7.1    | 85.1 KB  | 29.7 KB    |
| Vue 3.4.15      | 110.4 KB | 40 KB      |
| ReactDOM 18.2.0 | 130.2 KB | 42 KB      |
| Angular 17.1.0  | 310 KB   | 104 KB     |

---

**You can see all of it at once:**

<p align="center">
    <img width="auto" height="auto" alt="screenshot of minified code showing how small the library is" src="https://ipfs.io/ipfs/QmYkbaQKLuRjXJGM3omab2WjfgVfxtGWJRARTa4K4HbjDt" />
</p>

## Installation 🍙

[Install Instructions](https://github.com/DeepDoge/cherry-ts/releases)

## Documentation 🍱

Will be available once `0.1.0` or `0.2.0` releases. Everything is changing all the time atm, maintaining the documentation is hard this early.

## Hey

Didn't have time to work on this recently. But I have been thinking about it at the back of my mind (can't stop). 

Gonna try to make some changes ~~next weekend (March 1 2024)~~ on (April 1), Also as a note to myself:
- I think I found a way to differentiate between Element properties vs attributes in the builder props without much code, So I can remove the `attr:` directive.
- So since we use Element propeties now and attributes together, and both are, like all props, supports signals, we don't need the `on:` directive anymore.
- Bind directive can only be used with `<input>`(s) or other input related Elements atm, but we can make this better i believe, we can bind any attribute or property by also providing the event name to the directive.
- Speaking of this, maybe this doesn't have to be a directive i was thinking about something similar to svelte's `use:` directive, but this one is not a directive its a prop that gets an array of functions, and practically works same as it. And `bind` can be a function that you supply to there instead of directive. Many things can act like this tbh. more consistent and more extenadable, better in general.
- I think since now we will support Element propeties, we can also remove the `style:` directive since there is already style property object on the HTMLElement's.
- So in general by adding a few general features, we can remove many of the directives that has a spesific jobs, so use what is there in the vanilla/native js, and enhance it.
- I think I can also make types better too, for example i shouldn't allow nested forms, because it only works when you create the form elements with js and breaks if you render it from html, so not consistent, and probably semantically wrong, so not allow it. if you need similar behevior you can already use "form" attribute. and move the form outside.
- Then I can use this for eternis.

## Todo Example

Todo example with a functional component and CSS `@scoped`

```ts
import { Tags, css, each, sheet, signal } from "cherry-ts"

const { div, input, form, style } = Tags

const randomId = () => Math.random().toString(36).substring(2)

export namespace Todo {
    export type Item = {
        id: string
        text: string
        done: boolean
    }
}

export function Todo(initial: Todo.Item[] = []) {
    const todos = signal(initial)

    const currentText = signal("")
    const todoForm = form({
        hidden: true,
        id: randomId(),
        "on:submit"(event) {
            event.preventDefault()
            todos.ref.push({
                id: randomId(),
                text: currentText.ref,
                done: false,
            })
            todos.ping()
            currentText.ref = ""
        },
    })

    return div([
        todoStyle.cloneNode(true),
        todoForm,
        input({
            type: "text",
            "attr:form": todoForm.id,
            placeholder: "Add todo",
            "bind:value": currentText,
        }),
        div({ className: "todos" }, [
            each(todos)
                .key((todo) => todo.id)
                .as((todo) =>
                    div({ className: "todo" }, [
                        todo.ref.text,
                        input({
                            type: "checkbox",
                            checked: () => todo.ref.done,
                            "on:change"(event) {
                                todo.ref.done = event.currentTarget.checked
                                todos.ping()
                            },
                        }),
                        () => (todo.ref.done ? "Done!" : null),
                    ]),
                ),
        ]),
    ])
}

const todoStyle = style([
    css`
        @scope {
            :scope {
                display: grid;
                gap: 1em;
                max-inline-size: 20em;
                margin-inline: auto;
            }
        }
    `,
])

document.adoptedStyleSheets.push(
    sheet(css`
        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }
    `),
)

document.body.append(
    Todo([
        {
            id: "1",
            text: "Buy milk",
            done: false,
        },
        {
            id: "2",
            text: "Buy eggs",
            done: false,
        },
        {
            id: "3",
            text: "Buy bread",
            done: false,
        },
    ]),
)
```

## Motivation 🍣

Native browser APIs has been getting better, and **cherry-ts** is designed to be complementary to native browser APIs, not to replace them.

By only focusing on SPAs, **cherry-ts** is able work better with the browser's native APIs.
This also makes it easier to learn, and easier to use with other libraries and frameworks. If you know browser's native vanilla APIs and HTML, you already know **cherry-ts**

**cherry-ts** doesn't tell you how to build a component, how to mount a component, or what is a component. And most importantly, it doesn't break when you use browsers native APIs on your DOM because it works with them.

It gives you the freedom to build your app however you want:

-   Wanna use Shadow DOM? Go ahead.
-   Wanna use Custom Elements? Go ahead.
-   Wanna use fragments with CSS `@scoped`? Go ahead.
-   Wanna use history API? Go ahead.
-   Wanna use hash router? Go ahead.
-   Wanna make class based Components? Go ahead.
-   Wanna make functional Components? Go ahead.

Do whatever you want, in the way you want, and **cherry-ts** will work with you.<br/>
Because, **cherry-ts** is not a framework, it's just a library of helpful tools that helps you with templating and reactivity.

## Why not cherry-js?

`cherry-ts` is relays heavily on TypeScript's type system. It's not possible to use it safely without TypeScript. So it's named `cherry-ts` instead of `cherry-js`.
If types comes to JS with this new "types as comments" proposal, then I can call it `cherry-js` instead.

## Why not JSX/TSX templating?

Lack of type safety.

## Why SPA only?

-   Works without server, so works with any static host including IPFS.
-   SSR requires a framework, because SSR works with paths and requests, and **cherry-ts** is not a framework.
-   This is a browser library similar to how jQuery was a library. And **cherry-ts** is a lot more smaller than jQuery.
