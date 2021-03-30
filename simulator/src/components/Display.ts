import { DisplayAscii, DisplayAsciiDef } from "./DisplayAscii"
import { DisplayBar, DisplayBarDef } from "./DisplayBar"
import { DisplayNibble, DisplayNibbleDef } from "./DisplayNibble"
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

