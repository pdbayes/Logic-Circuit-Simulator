import * as t from "io-ts"
import { Clock, ClockDef } from "./Clock"
import { InputNibble, InputNibbleDef } from "./InputNibble"
import { LogicInput, LogicInputDef } from "./LogicInput"

export type Input = LogicInput | Clock | InputNibble

export const InputDef = t.union([
    LogicInputDef.repr,
    ClockDef.repr,
    InputNibbleDef.repr,
], "Output")

type InputRepr = t.TypeOf<typeof InputDef>

export const InputFactory = {

    make: (savedData: InputRepr) => {
        if (!("type" in savedData)) {
            return new LogicInput(savedData)
        }
        switch (savedData.type) {
            case "clock":
                return new Clock(savedData)
            case "nibble":
                return new InputNibble(savedData)
        }
    },

}

