import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { isString, isUndefined } from "../utils"
import { Passthrough1, Passthrough1Def, Passthrough4, Passthrough4Def, Passthrough8, Passthrough8Def } from "./Passthrough"

export type Passthrough = Passthrough1 | Passthrough4 | Passthrough8

export const LayoutDef = t.union([
    Passthrough1Def.repr,
    Passthrough4Def.repr,
    Passthrough8Def.repr,
], "Layout")

type LayoutRepr = t.TypeOf<typeof LayoutDef>

export const LayoutFactory = {

    make: (editor: LogicEditor, savedDataOrType: LayoutRepr | string | undefined) => {

        if (isUndefined(savedDataOrType)) {
            return undefined
        }

        let blank
        let savedData: LayoutRepr
        if (isString(savedDataOrType)) {
            // specific subtype
            blank = true
            savedData = { type: savedDataOrType } as LayoutRepr
        } else {
            // as saved
            blank = false
            savedData = savedDataOrType
        }

        switch (savedData.type) {
            case "pass":
                return new Passthrough1(editor, blank ? null : savedData)
            case "pass-4":
                return new Passthrough4(editor, blank ? null : savedData)
            case "pass-8":
                return new Passthrough8(editor, blank ? null : savedData)
        }

    },

}

