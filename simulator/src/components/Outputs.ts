import * as t from "io-ts"
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

    make: (savedData: OutputRepr) => {
        if (!("type" in savedData)) {
            return new LogicOutput(savedData)
        }
        switch (savedData.type) {
            case "nibble":
                return new DisplayNibble(savedData)
            case "ascii":
                return new DisplayAscii(savedData)
            case "bar":
                return new DisplayBar(savedData)
            case "shiftbuffer":
                return new ShiftBufferOut(savedData)
        }
    },

}

