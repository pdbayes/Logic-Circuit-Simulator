import { left, right } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { isString, isUndefined } from "../utils"
import { Adder, AdderDef } from "./Adder"
import { AdderArray, AdderArrayDef } from "./AdderArray"
import { ALU, ALUDef } from "./ALU"
import { Comparator, ComparatorDef } from "./Comparator"
import { Counter, CounterDef } from "./Counter"
import { Decoder16Seg, Decoder16SegDef } from "./Decoder16Seg"
import { Decoder7Seg, Decoder7SegDef } from "./Decoder7Seg"
import { DecoderBCD4, DecoderBCD4Def } from "./DecoderBCD4"
import { Demux, DemuxDef } from "./Demux"
import { FlipflopD, FlipflopDDef } from "./FlipflopD"
import { FlipflopJK, FlipflopJKDef } from "./FlipflopJK"
import { FlipflopT, FlipflopTDef } from "./FlipflopT"
import { GateArray, GateArrayDef } from "./GateArray"
import { HalfAdder, HalfAdderDef } from "./HalfAdder"
import { LatchSR, LatchSRDef } from "./LatchSR"
import { Mux, MuxDef } from "./Mux"
import { RAM, RAMDef } from "./RAM"
import { Register, RegisterDef } from "./Register"
import { ShiftRegister, ShiftRegisterDef } from "./ShiftRegister"
import { SwitchedInverter, SwitchedInverterDef } from "./SwitchedInverter"
import { TriStateBufferArray, TriStateBufferArrayDef } from "./TriStateBufferArray"


export const ICDef = t.union([
    SwitchedInverterDef.repr,
    GateArrayDef.repr,
    TriStateBufferArrayDef.repr,
    HalfAdderDef.repr,
    AdderDef.repr,
    AdderArrayDef.repr,
    ALUDef.repr,
    MuxDef.repr,
    DemuxDef.repr,
    LatchSRDef.repr,
    FlipflopJKDef.repr,
    FlipflopTDef.repr,
    FlipflopDDef.repr,
    RegisterDef.repr,
    ShiftRegisterDef.repr,
    RAMDef.repr,
    CounterDef.repr,
    Decoder7SegDef.repr,
    Decoder16SegDef.repr,
    DecoderBCD4Def.repr,
    ComparatorDef.repr,
], "IC")

type ICRepr = t.TypeOf<typeof ICDef>

export const ICFactory = {

    make: (editor: LogicEditor, savedDataOrType: ICRepr | string | undefined, params: Record<string, unknown> | undefined) => {
        if (isUndefined(savedDataOrType)) {
            return undefined
        }

        let blank
        let savedData: ICRepr
        if (isString(savedDataOrType)) {
            blank = true
            savedData = { type: savedDataOrType } as ICRepr
        } else {
            blank = false
            savedData = savedDataOrType
        }

        switch (savedData.type) {
            case "switched-inverter":
                return new SwitchedInverter(editor, blank ? left(params as any) : right(savedData))
            case "gate-array":
                return new GateArray(editor, blank ? left(params as any) : right(savedData))
            case "tristate-array":
                return new TriStateBufferArray(editor, blank ? left(params as any) : right(savedData))
            case "halfadder":
                return new HalfAdder(editor, blank ? null : savedData)
            case "adder":
                return new Adder(editor, blank ? null : savedData)
            case "adder-array":
                return new AdderArray(editor, blank ? left(params as any) : right(savedData))
            case "alu":
                return new ALU(editor, blank ? left(params as any) : right(savedData))
            case "mux":
                return new Mux(editor, blank ? left(params as any) : right(savedData))
            case "demux":
                return new Demux(editor, blank ? left(params as any) : right(savedData))
            case "latch-sr":
                return new LatchSR(editor, blank ? null : savedData)
            case "flipflop-jk":
                return new FlipflopJK(editor, blank ? null : savedData)
            case "flipflop-t":
                return new FlipflopT(editor, blank ? null : savedData)
            case "flipflop-d":
                return new FlipflopD(editor, blank ? null : savedData)
            case "register":
                return new Register(editor, blank ? left(params as any) : right(savedData))
            case "shift-register":
                return new ShiftRegister(editor, blank ? left(params as any) : right(savedData))
            case "ram":
                return new RAM(editor, blank ? left(params as any) : right(savedData))
            case "counter":
                return new Counter(editor, blank ? null : savedData)
            case "decoder-7seg":
                return new Decoder7Seg(editor, blank ? null : savedData)
            case "decoder-16seg":
                return new Decoder16Seg(editor, blank ? null : savedData)
            case "decoder-bcd4":
                return new DecoderBCD4(editor, blank ? null : savedData)
            case "comparator":
                return new Comparator(editor, blank ? null : savedData)
        }
    },

}
