import type { Utils } from "./utils"

true satisfies Utils.Equals<"a", "a">
false satisfies Utils.Equals<"a", string>
false satisfies Utils.Equals<string, Utils.Brand<"hello", string>>
false satisfies Utils.Equals<string, number>
false satisfies Utils.Equals<string, string | number>
false satisfies Utils.Equals<string | number, string>
true satisfies Utils.Equals<string, string | "">
false satisfies Utils.Equals<true, boolean>
true satisfies Utils.Equals<true | false, true | false>
