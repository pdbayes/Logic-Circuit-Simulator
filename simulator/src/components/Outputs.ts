import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { DisplayAscii, DisplayAsciiDef } from "./DisplayAscii"
import { DisplayBar, DisplayBarDef } from "./DisplayBar"
import { DisplayNibble, DisplayNibbleDef } from "./DisplayNibble"
import { LogicOutput, LogicOutputDef } from "./LogicOutput"
import { ShiftBufferOut, ShiftBufferOutDef } from "./ShiftBufferOut"

export type Output = LogicOutput | DisplayNibble | DisplayAscii | DisplayBar | ShiftBufferOut

export const OutputDef = t.union([
    LogicOutputDef.repr,
    DisplayNibbleDef.repr,
    DisplayAsciiDef.repr,
    DisplayBarDef.repr,
    ShiftBufferOutDef.repr,
], "Output")

type OutputRepr = t.TypeOf<typeof OutputDef>

export const OutputFactory = {

    make: (editor: LogicEditor, savedData: OutputRepr) => {
        if (!("type" in savedData)) {
            return new LogicOutput(editor, savedData)
        }
        switch (savedData.type) {
            case "nibble":
                return new DisplayNibble(editor, savedData)
            case "ascii":
                return new DisplayAscii(editor, savedData)
            case "bar":
                return new DisplayBar(editor, savedData)
            case "shiftbuffer":
                return new ShiftBufferOut(editor, savedData)
        }
    },

}

