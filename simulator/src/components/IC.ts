import * as t from "io-ts"
import { isString, isUndefined } from "../utils"
import { Adder, AdderDef } from "./Adder"
import { ALU, ALUDef } from "./ALU"
import { FlipflopD, FlipflopDDef } from "./FlipflopD"
import { FlipflopJK, FlipflopJKDef } from "./FlipflopJK"
import { FlipflopT, FlipflopTDef } from "./FlipflopT"
import { InputNibble, InputNibbleDef } from "./InputNibble"
import { LatchSR, LatchSRDef } from "./LatchSR"
import { Register, RegisterDef } from "./Register"
import { ShiftBufferOut, ShiftBufferOutDef } from "./ShiftBufferOut"

export type IC = Adder

export const ICDef = t.union([
    InputNibbleDef.repr,
    AdderDef.repr,
    ALUDef.repr,
    LatchSRDef.repr,
    FlipflopJKDef.repr,
    FlipflopTDef.repr,
    FlipflopDDef.repr,
    RegisterDef.repr,
    ShiftBufferOutDef.repr,
], "IC")

type ICRepr = t.TypeOf<typeof ICDef>

export const ICFactory = {

    make: (savedDataOrType: ICRepr | string | undefined) => {
        let blank
        let savedData: ICRepr
        if (isUndefined(savedDataOrType)) {
            return undefined
        }
        if (isString(savedDataOrType)) {
            blank = true
            savedData = { type: savedDataOrType } as ICRepr
        } else {
            blank = false
            savedData = savedDataOrType
        }

        switch (savedData.type) {
            case "input-nibble":
                return new InputNibble(blank ? null : savedData)
            case "adder":
                return new Adder(blank ? null : savedData)
            case "alu":
                return new ALU(blank ? null : savedData)
            case "latch-sr":
                return new LatchSR(blank ? null : savedData)
            case "flipflop-jk":
                return new FlipflopJK(blank ? null : savedData)
            case "flipflop-t":
                return new FlipflopT(blank ? null : savedData)
            case "flipflop-d":
                return new FlipflopD(blank ? null : savedData)
            case "register":
                return new Register(blank ? null : savedData)
            case "shiftbufferout":
                return new ShiftBufferOut(blank ? null : savedData)

        }
    },

}