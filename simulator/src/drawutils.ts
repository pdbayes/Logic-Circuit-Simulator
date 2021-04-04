import { HasPosition } from "./components/Drawable"
import { isUnset, TriState, unset, Unset } from "./utils"
import { Node } from "./components/Node"
import { allComponents } from "./simulator"

export const GRID_STEP = 10

export function pxToGrid(x: number) {
    return Math.round(x / GRID_STEP)
}

export type Color = [number, number, number]

export const COLOR_MOUSE_OVER: Color = [0, 0x7B, 0xFF]
export const COLOR_FULL: Color = [255, 193, 7]
export const COLOR_EMPTY: Color = [52, 58, 64]
export const COLOR_UNSET: Color = [152, 158, 164]

export function colorForBoolean(value: TriState): Color {
    return isUnset(value) ? COLOR_UNSET : value ? COLOR_FULL : COLOR_EMPTY
}

export function fillForBoolean(value: TriState): Color {
    const c = colorForBoolean(value)
    fill(...c)
    return c
}

export function colorForFraction(fraction: number): Color {
    const c: Color = [
        (COLOR_FULL[0] - COLOR_EMPTY[0]) * fraction + COLOR_EMPTY[0],
        (COLOR_FULL[1] - COLOR_EMPTY[1]) * fraction + COLOR_EMPTY[1],
        (COLOR_FULL[2] - COLOR_EMPTY[2]) * fraction + COLOR_EMPTY[2],
    ]
    return c
}

export function wireLine(node: Node, x1: number, y1: number) {
    const x0 = node.posX
    const y0 = node.posY

    stroke(80)
    strokeWeight(4)
    line(x0, y0, x1, y1)

    stroke(...colorForBoolean(node.value))
    strokeWeight(2)
    const f = x0 < x1 ? 1 : -1
    line(x0 - f, y0, x1 + f, y1)
}

export function roundValue(comp: HasPosition & { value: TriState }) {
    const value = comp.value
    textSize(18)
    textAlign(CENTER, CENTER)

    if (isUnset(value)) {
        fill(255)
        textStyle(BOLD)
        text('?', comp.posX, comp.posY)
    } else if (value) {
        textStyle(BOLD)
        text('1', comp.posX, comp.posY)
    } else {
        fill(255)
        textStyle(NORMAL)
        text('0', comp.posX, comp.posY)
    }
}


export function inRect(centerX: number, centerY: number, width: number, height: number, pointX: number, pointY: number): boolean {
    const w2 = width / 2
    const h2 = height / 2
    return pointX >= centerX - w2 && pointX < centerX + w2 &&
        pointY >= centerY - h2 && pointY < centerY + h2
}

export function guessCanvasHeight(): number {
    let lowestY = Number.NEGATIVE_INFINITY, highestY = Number.POSITIVE_INFINITY
    for (const elems of allComponents) {
        for (const elem of elems) {
            const y = elem.posY
            if (y > lowestY) {
                lowestY = y
            }
            if (y < highestY) {
                highestY = y
            }
        }
    }
    return highestY + lowestY // add lower margin equal to top margin
}



export function displayValuesFromInputs(inputs: readonly Node[]): [string, number | unset] {
    let binaryStringRep = ""
    let hasUnset = false
    for (const input of inputs) {
        if (isUnset(input.value)) {
            hasUnset = true
            binaryStringRep = Unset + binaryStringRep
        } else {
            binaryStringRep = +input.value + binaryStringRep
        }
    }
    const value = hasUnset ? Unset : parseInt(binaryStringRep, 2)
    return [binaryStringRep, value]
}

export function formatWithRadix(value: number | unset, radix: number): string {
    if (isUnset(value)) {
        return Unset
    }
    const caption = value.toString(radix).toUpperCase()
    const prefix = (() => {
        switch (radix) {
            case 16: return "0x"
            case 8: return "0o"
            case 2: return "0b"
            default: return ""
        }
    })()
    return prefix + caption
}
