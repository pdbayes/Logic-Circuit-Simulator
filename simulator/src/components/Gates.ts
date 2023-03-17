import { left, right } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { isString, isUndefined } from "../utils"
import { Gate1, Gate1Def, Gate1Repr, GateN, GateNDef, GateNRepr } from "./Gate"
import { Gate1Types, GateNTypes } from "./GateTypes"
import { TriStateBuffer, TriStateBufferDef } from "./TriStateBuffer"


export const GateDef = t.union([
    Gate1Def.repr,
    GateNDef.repr,
    TriStateBufferDef.repr,
], "Gate")

type GateRepr = t.TypeOf<typeof GateDef>


export const GateFactory = {

    make: (editor: LogicEditor, savedDataOrType: GateRepr | string | undefined, params: Record<string, unknown> | undefined) => {
        let blank
        let savedData: GateRepr

        if (isUndefined(savedDataOrType)) {
            // default, typeless option
            blank = true
            savedData = { type: "NAND" } as GateRepr
        } else if (isString(savedDataOrType)) {
            // specific subtype
            blank = true
            savedData = { type: savedDataOrType } as GateRepr
        } else {
            // as saved
            blank = false
            savedData = savedDataOrType
        }

        const type = savedData.type
        if (blank) {
            params = { ...params, type: savedData.type }
        }


        if (Gate1Types.includes(type)) {
            return new Gate1(editor, blank ? left(params as any) : right(savedData as Gate1Repr))
        } else if (GateNTypes.includes(type)) {
            return new GateN(editor, blank ? left(params as any) : right(savedData as GateNRepr))
        } else if (type === "TRI") {
            return new TriStateBuffer(editor, blank ? null : savedDataOrType as any)
        }
        return undefined
    },

}
