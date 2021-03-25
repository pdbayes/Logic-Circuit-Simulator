import { unset, isUnset, Unset } from "../utils.js"
import { DisplayAscii, DisplayAsciiRepr } from "./DisplayAscii.js"
import { DisplayBar, DisplayBarRepr } from "./DisplayBar.js"
import { DisplayNibble, DisplayNibbleRepr } from "./DisplayNibble.js"
import { Node } from "./Node.js"

export type Display = DisplayNibble | DisplayAscii | DisplayBar

export type DisplayRepr = DisplayNibbleRepr | DisplayAsciiRepr | DisplayBarRepr

export const DisplayFactory = {

    make: (savedData: DisplayRepr) => {
        switch (savedData.type) {
            case "nibble":
                return new DisplayNibble(savedData)
            case "ascii":
                return new DisplayAscii(savedData)
            case "bar":
                return new DisplayBar(savedData)
        }
    },

}

export function displayValuesFromInputs(inputs: readonly Node[]): [string, number | unset] {
    let binaryStringRep = ""
    let hasUnset = false
    for (const input of inputs) {
        if (isUnset(input.value)) {
            hasUnset = true
            binaryStringRep = Unset + binaryStringRep
        } else {
            binaryStringRep = +input.value + binaryStringRep
        }
    }
    const value = hasUnset ? Unset : parseInt(binaryStringRep, 2)
    return [binaryStringRep, value]
}
