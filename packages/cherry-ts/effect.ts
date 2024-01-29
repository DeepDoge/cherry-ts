import { Lifecycle, derive } from "./core"

export let effect$ = (
    node: Lifecycle.Connectable,
    ...args: Parameters<typeof derive>
): void => derive(...args).follow$(node, () => {}, { mode: "immediate" })