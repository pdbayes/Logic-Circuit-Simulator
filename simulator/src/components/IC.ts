import * as t from "io-ts"
import { isString, isUndefined } from "../utils"
import { Adder, AdderDef } from "./Adder"
import { ALU, ALUDef } from "./ALU"
import { FlipflopD, FlipflopDDef } from "./FlipflopD"
import { FlipflopJK, FlipflopJKDef } from "./FlipflopJK"
import { FlipflopT, FlipflopTDef } from "./FlipflopT"
import { LatchSR, LatchSRDef } from "./LatchSR"
import { Mux2To1, Mux2To1Def, Mux4To1, Mux4To1Def, Mux4To2, Mux4To2Def, Mux8To1, Mux8To1Def, Mux8To2, Mux8To2Def, Mux8To4, Mux8To4Def } from "./Mux"
import { Register, RegisterDef } from "./Register"

export type IC = Adder

export const ICDef = t.union([
    AdderDef.repr,
    ALUDef.repr,
    Mux2To1Def.repr,
    Mux4To1Def.repr,
    Mux8To1Def.repr,
    Mux4To2Def.repr,
    Mux8To2Def.repr,
    Mux8To4Def.repr,
    LatchSRDef.repr,
    FlipflopJKDef.repr,
    FlipflopTDef.repr,
    FlipflopDDef.repr,
    RegisterDef.repr,
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
            case "adder":
                return new Adder(blank ? null : savedData)
            case "alu":
                return new ALU(blank ? null : savedData)
            case "mux-2to1":
                return new Mux2To1(blank ? null : savedData)
            case "mux-4to1":
                return new Mux4To1(blank ? null : savedData)
            case "mux-8to1":
                return new Mux8To1(blank ? null : savedData)
            case "mux-4to2":
                return new Mux4To2(blank ? null : savedData)
            case "mux-8to2":
                return new Mux8To2(blank ? null : savedData)
            case "mux-8to4":
                return new Mux8To4(blank ? null : savedData)
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
        }
    },

}