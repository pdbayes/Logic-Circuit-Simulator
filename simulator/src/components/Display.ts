import { DisplayAscii, DisplayAsciiDef } from "./DisplayAscii"
import { DisplayBar, DisplayBarDef } from "./DisplayBar"
import { DisplayNibble, DisplayNibbleDef } from "./DisplayNibble"
import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"

export type Display = DisplayNibble | DisplayAscii | DisplayBar

export const DisplayDef = t.union([
    DisplayNibbleDef.repr,
    DisplayAsciiDef.repr,
    DisplayBarDef.repr,
], "Display")

type DisplayRepr = t.TypeOf<typeof DisplayDef>

export const DisplayFactory = {

    make: (editor: LogicEditor, savedData: DisplayRepr) => {
        switch (savedData.type) {
            case "nibble":
                return new DisplayNibble(editor, savedData)
            case "ascii":
                return new DisplayAscii(editor, savedData)
            case "bar":
                return new DisplayBar(editor, savedData)
        }
    },

}

