import * as t from "io-ts"
import { DisplayDef } from "./components/Display"
import { GateDef } from "./components/Gate"
import { LogicInputDef } from "./components/LogicInput"
import { LogicOutputDef } from "./components/LogicOutput"
import { WireRepr } from "./components/Wire"
import { PartialWhereUndefinedRecursively } from "./utils"

const Circuit = t.partial({
    in: t.array(LogicInputDef.repr),
    out: t.array(LogicOutputDef.repr),
    displays: t.array(DisplayDef),
    gates: t.array(GateDef),
    wires: t.array(WireRepr),
})
type Circuit = PartialWhereUndefinedRecursively<t.TypeOf<typeof Circuit>>

function assertCircuits<T extends Record<string, Circuit>>(v: T): T {
    // remove prototype to have a nice, clean completion in the console
    return Object.assign(Object.create(null), v)
}

export const gallery = assertCircuits({
    CharacterComparator: {
        "in": [
            { "pos": [50, 130], "id": 0, "val": 1 },
            { "pos": [50, 160], "id": 1, "val": 1 },
            { "pos": [50, 190], "id": 2, "val": 1 },
            { "pos": [50, 220], "id": 3, "val": 0 },
            { "pos": [50, 250], "id": 4, "val": 1 },
            { "pos": [50, 280], "id": 13, "val": 0 },
            { "pos": [50, 310], "id": 14, "val": 1 },
            { "pos": [50, 360], "id": 15, "val": 1 },
            { "pos": [50, 390], "id": 16, "val": 0 },
            { "pos": [50, 420], "id": 17, "val": 1 },
            { "pos": [50, 450], "id": 18, "val": 0 },
            { "pos": [50, 480], "id": 19, "val": 1 },
            { "pos": [50, 510], "id": 20, "val": 0 },
            { "pos": [50, 540], "id": 21, "val": 1 },
        ],
        "out": [{ "pos": [870, 310], "id": 5 }],
        "displays": [
            { "type": "ascii", "pos": [180, 60], "id": [6, 7, 8, 9, 10, 11, 12] },
            { "type": "ascii", "pos": [180, 620], "id": [22, 23, 24, 25, 26, 27, 28] },
        ],
        "gates": [
            { "type": "XOR", "pos": [360, 140], "in": [29, 30], "out": 31 },
            { "type": "XOR", "pos": [360, 200], "in": [32, 33], "out": 34 },
            { "type": "XOR", "pos": [360, 260], "in": [35, 36], "out": 37 },
            { "type": "XOR", "pos": [360, 320], "in": [38, 39], "out": 40 },
            { "type": "XOR", "pos": [360, 380], "in": [41, 42], "out": 43 },
            { "type": "XOR", "pos": [360, 440], "in": [44, 45], "out": 46 },
            { "type": "XOR", "pos": [360, 500], "in": [47, 48], "out": 49 },
            { "type": "OR", "pos": [470, 170], "in": [68, 69], "out": 70 },
            { "type": "OR", "pos": [500, 280], "in": [71, 72], "out": 73 },
            { "type": "OR", "pos": [490, 410], "in": [74, 75], "out": 76 },
            { "type": "OR", "pos": [630, 250], "in": [77, 78], "out": 79 },
            { "type": "OR", "pos": [630, 410], "in": [80, 81], "out": 82 },
            { "type": "OR", "pos": [730, 310], "in": [83, 84], "out": 85 },
            { "type": "NOT", "pos": [800, 310], "in": 50, "out": 51 },
        ],
        "wires": [
            [0, 6],
            [1, 7],
            [2, 8],
            [3, 9],
            [4, 10],
            [13, 11],
            [14, 12],
            [15, 22],
            [16, 23],
            [17, 24],
            [18, 25],
            [19, 26],
            [20, 27],
            [21, 28],
            [0, 29],
            [15, 30],
            [79, 83],
            [82, 84],
            [31, 68],
            [34, 69],
            [37, 71],
            [40, 72],
            [43, 74],
            [46, 75],
            [49, 81],
            [76, 80],
            [73, 78],
            [70, 77],
            [85, 50],
            [51, 5],
            [1, 32],
            [16, 33],
            [2, 35],
            [17, 36],
            [18, 39],
            [3, 38],
            [4, 41],
            [19, 42],
            [13, 44],
            [20, 45],
            [21, 48],
            [14, 47],
        ],
    },
    Counters: {
        "displays": [
            { "type": "nibble", "pos": [260, 150], "id": [1, 2, 3, 4] },
            { "type": "ascii", "pos": [590, 200], "id": [13, 14, 15, 16, 17, 18, 19] },
        ],
        "clocks": [
            { "pos": [50, 40], "id": 0, "name": "0", "period": 2000, "phase": 1000 },
            { "pos": [50, 130], "id": 10, "name": "1", "period": 4000, "phase": 2000 },
            { "pos": [50, 210], "id": 23, "name": "2", "period": 8000, "phase": 4000 },
            { "pos": [50, 300], "id": 24, "name": "3", "period": 16000, "phase": 8000 },
            { "pos": [430, 30], "id": 5, "period": 400, "phase": 200 },
            { "pos": [430, 100], "id": 6, "period": 800, "phase": 400 },
            { "pos": [430, 170], "id": 7, "period": 1600, "phase": 800 },
            { "pos": [430, 240], "id": 8, "period": 3200, "phase": 1600 },
            { "pos": [430, 310], "id": 9, "period": 6400, "phase": 3200 },
            { "pos": [430, 380], "id": 11, "period": 12800, "phase": 6400 },
            { "pos": [430, 450], "id": 12, "period": 25600, "phase": 12800 },
        ],
        "wires": [
            [0, 1],
            [24, 4],
            [23, 3],
            [10, 2],
            [5, 13],
            [6, 14],
            [7, 15],
            [8, 16],
            [9, 17],
            [11, 18],
            [12, 19],
        ],
    },
})