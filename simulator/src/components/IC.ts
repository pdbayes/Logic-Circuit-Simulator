import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { isString, isUndefined } from "../utils"
import { Adder, AdderDef } from "./Adder"
import { ALU, ALUDef } from "./ALU"
import { Decoder7Seg, Decoder7SegDef } from "./Decoder7Seg"
import { DecoderBCD4, DecoderBCD4Def } from "./DecoderBCD4"
import { FlipflopD, FlipflopDDef } from "./FlipflopD"
import { FlipflopJK, FlipflopJKDef } from "./FlipflopJK"
import { FlipflopT, FlipflopTDef } from "./FlipflopT"
import { LatchSR, LatchSRDef } from "./LatchSR"
import { Mux2To1, Mux2To1Def, Mux4To1, Mux4To1Def, Mux4To2, Mux4To2Def, Mux8To1, Mux8To1Def, Mux8To2, Mux8To2Def, Mux8To4, Mux8To4Def } from "./Mux"
import { RAM16by4, RAM16x4Def } from "./RAM"
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
    RAM16x4Def.repr,
    Decoder7SegDef.repr,
    DecoderBCD4Def.repr,
], "IC")

type ICRepr = t.TypeOf<typeof ICDef>

export const ICFactory = {

    make: (editor: LogicEditor, savedDataOrType: ICRepr | string | undefined) => {
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
                return new Adder(editor, blank ? null : savedData)
            case "alu":
                return new ALU(editor, blank ? null : savedData)
            case "mux-2to1":
                return new Mux2To1(editor, blank ? null : savedData)
            case "mux-4to1":
                return new Mux4To1(editor, blank ? null : savedData)
            case "mux-8to1":
                return new Mux8To1(editor, blank ? null : savedData)
            case "mux-4to2":
                return new Mux4To2(editor, blank ? null : savedData)
            case "mux-8to2":
                return new Mux8To2(editor, blank ? null : savedData)
            case "mux-8to4":
                return new Mux8To4(editor, blank ? null : savedData)
            case "latch-sr":
                return new LatchSR(editor, blank ? null : savedData)
            case "flipflop-jk":
                return new FlipflopJK(editor, blank ? null : savedData)
            case "flipflop-t":
                return new FlipflopT(editor, blank ? null : savedData)
            case "flipflop-d":
                return new FlipflopD(editor, blank ? null : savedData)
            case "register":
                return new Register(editor, blank ? null : savedData)
            case "ram-16x4":
                return new RAM16by4(editor, blank ? null : savedData)
            case "decoder-7seg":
                return new Decoder7Seg(editor, blank ? null : savedData)
            case "decoder-bcd4":
                return new DecoderBCD4(editor, blank ? null : savedData)
        }
    },

}