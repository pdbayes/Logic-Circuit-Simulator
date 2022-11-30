import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { isString, isUndefined } from "../utils"
import { LabelRect, LabelRectDef } from "./LabelRect"
import { LabelString, LabelStringDef } from "./LabelString"

export type Label = LabelString

export const LabelDef = t.union([
    LabelStringDef.repr,
    LabelRectDef.repr,
], "Label")

type LabelRepr = t.TypeOf<typeof LabelDef>

export const LabelFactory = {

    make: (editor: LogicEditor, savedDataOrType: LabelRepr | string | undefined) => {
        let blank
        let savedData: LabelRepr

        if (isUndefined(savedDataOrType)) {
            // default, typeless option
            blank = true
            savedData = {} as LabelRepr
        } else if (isString(savedDataOrType)) {
            // specific subtype
            blank = true
            savedData = { type: savedDataOrType } as LabelRepr
        } else {
            // as saved
            blank = false
            savedData = savedDataOrType
        }

        if (!("type" in savedData)) {
            return new LabelString(editor, blank ? null : savedData)
        }
        switch (savedData.type) {
            case "rect":
                return new LabelRect(editor, blank ? null : savedData)
        }

    },

}

