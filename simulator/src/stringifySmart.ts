// Note: This regex matches even invalid JSON strings, but since we’re
// working on the output of `JSON.stringify` we know that only valid strings
// are present (unless the user supplied a weird `options.indent` but in
// that case we don’t care since the output would be invalid anyway).

import { isDefined } from "./utils"

const stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g

export function stringifySmart(
    passedObj: any,
    options?: {
        replacer?: (this: any, key: string, value: any) => any,
        indent?: number | string,
        maxLength?: number
    }
): string {

    options ??= {}
    const indent: string = JSON.stringify([1], undefined, options.indent ?? 2).slice(2, -3)
    const maxLength: number =
        indent === ""
            ? Infinity
            : options.maxLength ?? 80

    let replacer = options.replacer

    return (function _stringify(obj: any, currentIndent: string, reserved: number): string {
        if (isDefined(obj) && typeof obj.toJSON === "function") {
            obj = obj.toJSON()
        }

        const string = JSON.stringify(obj, replacer)

        if (string === undefined) {
            return string
        }

        let length = maxLength - currentIndent.length - reserved

        if (string.length <= length) {
            const prettified = string.replace(
                stringOrChar,
                function (match, stringLiteral) {
                    return stringLiteral ?? match + " "
                }
            )
            if (prettified.length <= length) {
                return prettified
            }
        }

        if (replacer !== null) {
            obj = JSON.parse(string)
            replacer = undefined
        }

        if (typeof obj === "object" && obj !== null) {
            const nextIndent = currentIndent + indent
            const items: string[] = []
            let index = 0

            let start: string
            let end: string
            if (Array.isArray(obj)) {
                start = "["
                end = "]"
                length = obj.length
                for (; index < length; index++) {
                    items.push(
                        _stringify(obj[index], nextIndent, index === length - 1 ? 0 : 1) ||
                        "null"
                    )
                }
            } else {
                start = "{"
                end = "}"
                const keys = Object.keys(obj)
                length = keys.length
                for (; index < length; index++) {
                    const key = keys[index]
                    const keyPart = JSON.stringify(key) + ": "
                    const value = _stringify(
                        obj[key],
                        nextIndent,
                        keyPart.length + (index === length - 1 ? 0 : 1)
                    )
                    if (value !== undefined) {
                        items.push(keyPart + value)
                    }
                }
            }

            if (items.length > 0) {
                return [start, indent + items.join(",\n" + nextIndent), end].join(
                    "\n" + currentIndent
                )
            }
        }

        return string
    })(passedObj, "", 0)
}
