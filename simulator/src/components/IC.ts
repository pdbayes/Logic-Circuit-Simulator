import { Adder, AdderDef, AdderRepr } from "./Adder"

export type IC = Adder

export const ICDef = AdderDef //t.union([
// AdderDef.repr,
// ], "IC")

type ICRepr = AdderRepr

export const ICFactory = {

    make: (savedData: ICRepr) => {
        switch (savedData.type) {
            case "adder":
                return new Adder(savedData)
        }
    },

}

