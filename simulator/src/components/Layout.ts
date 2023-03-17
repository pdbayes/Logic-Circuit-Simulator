import { left, right } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { isString, isUndefined } from "../utils"
import { Passthrough, PassthroughDef } from "./Passthrough"


// export const LayoutDef = t.union([
//     PassthroughDef.repr,
// ], "Layout")

export const LayoutDef = PassthroughDef.repr

type LayoutRepr = t.TypeOf<typeof LayoutDef>


export const LayoutFactory = {

    make: (editor: LogicEditor, savedDataOrType: LayoutRepr | string | undefined, params: Record<string, unknown> | undefined) => {

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
                return new Passthrough(editor, blank ? left(params as any) : right(savedData))
        }

    },

}

