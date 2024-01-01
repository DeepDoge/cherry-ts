import { expect, test } from "bun:test"
import { signal } from "../core"
import { each } from "./each"

const describe = () => {
    const line = new Error().stack!.split("\n")[2]!.split(":").at(-2)!.replace(/\D/g, "")
    return `each at line: ${line}`
}

test(describe(), () => {
    const arr = signal([1, 2, 3, 4, 5])

    const result = each(arr)
        .key((item) => item)
        .as((item) => item.ref.toString())

    result.ref satisfies string[]

    expect(result.ref).toBeArrayOfSize(5)
    expect(result.ref[0]).toBe("1")
    expect(result.ref[1]).toBe("2")
    expect(result.ref[2]).toBe("3")
    expect(result.ref[3]).toBe("4")
    expect(result.ref[4]).toBe("5")

    arr.ref.push(6)
    arr.ping()

    expect(result.ref).toBeArrayOfSize(6)
    expect(result.ref[5]).toBe("6")
})
