import { StringUtility } from "./StringUtility";

export class ValueFormatter {
    static asNumberArray(v) {
        let out: number[] = []
        for (let x of StringUtility.splitTokens(v)) {
            let n = Number.parseFloat(x)
            if (Number.isNaN(n)) {
                throw new Error("Not a number: " + x)
            }

            out.push(n)
        }

        return out
    }

    static asStringArray(v) {
        return StringUtility.splitTokens(v)
    }
}