// import * as t from "io-ts"
// import { FixedArray, FixedArraySize, FixedReadonlyArray, LogicValue, typeOrUndefined } from "../utils"
// import { defineComponent } from "./Component"
// import { EdgeTrigger } from "./FlipflopOrLatch"

import { colorForBoolean, COLOR_COMPONENT_BORDER, COLOR_EMPTY, strokeSingleLine } from "../drawutils"
import { FixedArraySize, FixedReadonlyArray, isUnknown, LogicValue, Unknown } from "../utils"

// export function defineRAMComponent<NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize, N extends string>(numInputs: NumInputs, numOutputs: NumOutputs, jsonName: N, className: string) {
//     return defineComponent(numInputs, numOutputs, t.type({
//         type: t.literal(jsonName),
//         showContent: typeOrUndefined(t.boolean),
//         trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
//         content: typeOrUndefined(t.array(t.string)),
//     }, className))
// }

// const RAMDefaults = {
//     showContent: true,
//     trigger: EdgeTrigger.rising,
// }

// type RAMValue<BitWidth extends FixedArraySize> = {
//     mem: Array<FixedArray<LogicValue, BitWidth>>
//     out: FixedReadonlyArray<LogicValue, BitWidth>
// }


// abstract class RAMBase extends { }

// export const RAM64x8Def =
//     defineRAMComponent(17, 8, "ram-64x8", "RAM64x8")

// export type RAM64x8Repr = typeof RAM64x8Def.reprType



export function drawMemoryCells<N extends FixedArraySize>(g: CanvasRenderingContext2D, mem: Array<FixedReadonlyArray<LogicValue, N>>, wordWidth: N, addr: number | Unknown, start: number, end: number, centerX: number, centerY: number, cellWidth: number, cellHeight: number,) {
    const numCellsToDraw = end - start
    const contentTop = centerY - numCellsToDraw / 2 * cellHeight
    const contentLeft = centerX - wordWidth / 2 * cellWidth
    const contentRight = contentLeft + wordWidth * cellWidth
    const contentBottom = contentTop + numCellsToDraw * cellHeight

    // by default, paint everything as zero
    g.fillStyle = COLOR_EMPTY
    g.fillRect(contentLeft, contentTop, contentRight - contentLeft, contentBottom - contentTop)

    for (let i = start; i < end; i++) {
        for (let j = 0; j < wordWidth; j++) {
            const v = mem[i][wordWidth - j - 1]
            if (v !== false) {
                g.fillStyle = colorForBoolean(v)
                g.fillRect(contentLeft + j * cellWidth, contentTop + i * cellHeight, cellWidth, cellHeight)
            }
        }
    }

    g.strokeStyle = COLOR_COMPONENT_BORDER
    g.lineWidth = 0.5
    for (let i = 1; i < numCellsToDraw; i++) {
        const y = contentTop + i * cellHeight
        strokeSingleLine(g, contentLeft, y, contentRight, y)
    }
    for (let j = 1; j < wordWidth; j++) {
        const x = contentLeft + j * cellWidth
        strokeSingleLine(g, x, contentTop, x, contentBottom)
    }
    const borderLineWidth = 2
    g.lineWidth = borderLineWidth
    g.strokeRect(contentLeft - borderLineWidth / 2, contentTop - borderLineWidth / 2, contentRight - contentLeft + borderLineWidth, contentBottom - contentTop + borderLineWidth)
    if (!isUnknown(addr) && addr >= start && addr < end) {
        const arrowY = contentTop + (addr - start) * cellHeight + cellHeight / 2
        const arrowRight = contentLeft - 3
        const arrowWidth = 8
        const arrowHalfHeight = 3
        g.beginPath()
        g.moveTo(arrowRight, arrowY)
        g.lineTo(arrowRight - arrowWidth, arrowY + arrowHalfHeight)
        g.lineTo(arrowRight - arrowWidth + 2, arrowY)
        g.lineTo(arrowRight - arrowWidth, arrowY - arrowHalfHeight)
        g.closePath()
        g.fillStyle = COLOR_COMPONENT_BORDER
        g.fill()
    }
}