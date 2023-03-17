import { left, right } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { isString, isUndefined } from "../utils"
import { Clock, ClockDef } from "./Clock"
import { Input, InputDef } from "./Input"
import { InputRandom, InputRandomDef } from "./InputRandom"


export const InputDef_ = t.union([
    InputDef.repr,
    ClockDef.repr,
    InputRandomDef.repr,
], "Input")

type InputRepr_ = t.TypeOf<typeof InputDef_>


export const InputFactory = {

    make: (editor: LogicEditor, savedDataOrType: InputRepr_ | string | undefined, params: Record<string, unknown> | undefined) => {
        let blank
        let savedData: InputRepr_

        if (isUndefined(savedDataOrType)) {
            // default, typeless option
            blank = true
            savedData = {} as InputRepr_
        } else if (isString(savedDataOrType)) {
            // specific subtype
            blank = true
            savedData = { type: savedDataOrType } as InputRepr_
        } else {
            // as saved
            blank = false
            savedData = savedDataOrType
        }

        if (!("type" in savedData)) {
            return new Input(editor, blank ? left(params as any) : right(savedData))
        }
        switch (savedData.type) {
            case "clock":
                return new Clock(editor, blank ? null : savedData)
            case "random":
                return new InputRandom(editor, blank ? left(params as any) : right(savedData))
        }
    },

}

