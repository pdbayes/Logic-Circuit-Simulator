import { left, right } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { isString, isUndefined } from "../utils"
import { Output, OutputDef } from "./Output"
import { Output16Seg, Output16SegDef } from "./Output16Seg"
import { Output7Seg, Output7SegDef } from "./Output7Seg"
import { OutputAscii, OutputAsciiDef } from "./OutputAscii"
import { OutputBar, OutputBarDef } from "./OutputBar"
import { OutputDisplay, OutputDisplayDef } from "./OutputDisplay"
import { OutputShiftBuffer, OutputShiftBufferDef } from "./OutputShiftBuffer"


export const OutputDef_ = t.union([
    OutputDef.repr,
    OutputDisplayDef.repr,
    Output7SegDef.repr,
    Output16SegDef.repr,
    OutputAsciiDef.repr,
    OutputBarDef.repr,
    OutputShiftBufferDef.repr,
], "Output")

type OutputRepr_ = t.TypeOf<typeof OutputDef_>


export const OutputFactory = {

    make: (editor: LogicEditor, savedDataOrType: OutputRepr_ | string | undefined, params: Record<string, unknown> | undefined) => {
        let blank
        let savedData: OutputRepr_

        if (isUndefined(savedDataOrType)) {
            // default, typeless option
            blank = true
            savedData = {} as OutputRepr_
        } else if (isString(savedDataOrType)) {
            // specific subtype
            blank = true
            savedData = { type: savedDataOrType } as OutputRepr_
        } else {
            // as saved
            blank = false
            savedData = savedDataOrType
        }

        if (!("type" in savedData)) {
            return new Output(editor, blank ? left(params as any) : right(savedData))
        }
        switch (savedData.type) {
            case "display":
                return new OutputDisplay(editor, blank ? left(params as any) : right(savedData))
            case "7seg":
                return new Output7Seg(editor, blank ? null : savedData)
            case "16seg":
                return new Output16Seg(editor, blank ? null : savedData)
            case "ascii":
                return new OutputAscii(editor, blank ? null : savedData)
            case "bar":
                return new OutputBar(editor, blank ? null : savedData)
            case "shift-buffer":
                return new OutputShiftBuffer(editor, blank ? null : savedData)
        }
    },

}

