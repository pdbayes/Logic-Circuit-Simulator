import * as t from "io-ts"
import { Adder, AdderDef } from "./Adder"
import { ALU, ALUDef } from "./ALU"

export type IC = Adder

export const ICDef = t.union([
    AdderDef.repr,
    ALUDef.repr,
], "IC")

type ICRepr = t.TypeOf<typeof ICDef>

export const ICFactory = {

    make: (savedData: ICRepr) => {
        switch (savedData.type) {
            case "adder":
                return new Adder(savedData)
            case "alu":
                return new ALU(savedData)
        }
    },

}

