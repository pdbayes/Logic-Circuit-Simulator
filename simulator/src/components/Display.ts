import { DisplayAscii, DisplayAsciiDef } from "./DisplayAscii.js"
import { DisplayBar, DisplayBarDef } from "./DisplayBar.js"
import { DisplayNibble, DisplayNibbleDef } from "./DisplayNibble.js"
import * as t from "io-ts"

export type Display = DisplayNibble | DisplayAscii | DisplayBar

export const DisplayDef = t.union([
    DisplayNibbleDef.repr,
    DisplayAsciiDef.repr,
    DisplayBarDef.repr,
], "Display")

type DisplayRepr = t.TypeOf<typeof DisplayDef>

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

