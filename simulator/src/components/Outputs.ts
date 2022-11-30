import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { isString, isUndefined } from "../utils"
import { Output16Seg, Output16SegDef } from "./Output16Seg"
import { Output7Seg, Output7SegDef } from "./Output7Seg"
import { OutputAscii, OutputAsciiDef } from "./OutputAscii"
import { OutputBar, OutputBarDef } from "./OutputBar"
import { OutputBit, OutputBitDef } from "./OutputBit"
import { OutputByte, OutputByteDef } from "./OutputByte"
import { OutputByteDisplay, OutputByteDisplayDef } from "./OutputByteDisplay"
import { OutputNibble, OutputNibbleDef } from "./OutputNibble"
import { OutputNibbleDisplay, OutputNibbleDisplayDef } from "./OutputNibbleDisplay"
import { OutputShiftBuffer, OutputShiftBufferDef } from "./OutputShiftBuffer"

export type Output = OutputBit | OutputNibbleDisplay | OutputAscii | OutputBar | OutputShiftBuffer

export const OutputDef = t.union([
    OutputBitDef.repr,
    OutputNibbleDef.repr,
    OutputNibbleDisplayDef.repr,
    OutputByteDef.repr,
    OutputByteDisplayDef.repr,
    Output7SegDef.repr,
    Output16SegDef.repr,
    OutputAsciiDef.repr,
    OutputBarDef.repr,
    OutputShiftBufferDef.repr,
], "Output")

type OutputRepr = t.TypeOf<typeof OutputDef>

export const OutputFactory = {

    make: (editor: LogicEditor, savedDataOrType: OutputRepr | string | undefined) => {
        let blank
        let savedData: OutputRepr

        if (isUndefined(savedDataOrType)) {
            // default, typeless option
            blank = true
            savedData = {} as OutputRepr
        } else if (isString(savedDataOrType)) {
            // specific subtype
            blank = true
            savedData = { type: savedDataOrType } as OutputRepr
        } else {
            // as saved
            blank = false
            savedData = savedDataOrType
        }

        if (!("type" in savedData)) {
            return new OutputBit(editor, blank ? null : savedData)
        }
        switch (savedData.type) {
            case "nibble":
                return new OutputNibble(editor, blank ? null : savedData)
            case "nibble-display":
                return new OutputNibbleDisplay(editor, blank ? null : savedData)
            case "byte":
                return new OutputByte(editor, blank ? null : savedData)
            case "byte-display":
                return new OutputByteDisplay(editor, blank ? null : savedData)
            case "7seg":
                return new Output7Seg(editor, blank ? null : savedData)
            case "16seg":
                return new Output16Seg(editor, blank ? null : savedData)
            case "ascii":
                return new OutputAscii(editor, blank ? null : savedData)
            case "bar":
                return new OutputBar(editor, blank ? null : savedData)
            case "shiftbuffer":
                return new OutputShiftBuffer(editor, blank ? null : savedData)
        }
    },

}

