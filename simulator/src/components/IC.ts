import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"
import { Adder, AdderDef } from "./Adder"
import { ALU, ALUDef } from "./ALU"

export type IC = Adder

export const ICDef = t.union([
    AdderDef.repr,
    ALUDef.repr,
], "IC")

type ICRepr = t.TypeOf<typeof ICDef>

export const ICFactory = {

    make: (editor: LogicEditor, savedData: ICRepr) => {
        switch (savedData.type) {
            case "adder":
                return new Adder(editor, savedData)
            case "alu":
                return new ALU(editor, savedData)
        }
    },

}

