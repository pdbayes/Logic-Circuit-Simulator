import { HasPosition } from "./components/Drawable"
import { isUnset, TriState, unset, Unset } from "./utils"
import { Node } from "./components/Node"
import { components, wrapHandler } from "./simulator"
import { RedrawManager } from "./RedrawRecalcManager"

export const GRID_STEP = 10

export function pxToGrid(x: number) {
    return Math.round(x / GRID_STEP)
}

export type Color = [number, number, number]

export let COLOR_BACKGROUND: number
export let COLOR_BACKGROUND_UNUSED_REGION: number
export let COLOR_BORDER: number
export let COLOR_GRID_LINES: number
export let COLOR_LABEL_OFF: number
export let COLOR_LABEL_ON: number
export let COLOR_COMPONENT_BORDER: number
export let COLOR_COMPONENT_INNER_LABELS: number
export let COLOR_WIRE_BORDER: number
export let COLOR_MOUSE_OVER: Color
export let COLOR_FULL: Color
export let COLOR_LED_ON: Color
export let COLOR_DARK_RED: Color
export let COLOR_EMPTY: Color
export let COLOR_UNSET: Color
export let COLOR_GATE_NAMES: Color

export const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)")
darkModeQuery.onchange = wrapHandler(() => {
    setColors(darkModeQuery.matches)
    RedrawManager.addReason("dark/light mode switch", null)
})
setColors(darkModeQuery.matches)

function setColors(darkMode: boolean) {
    if (!darkMode) {
        // Light Theme
        COLOR_BACKGROUND = 0xFF
        COLOR_BACKGROUND_UNUSED_REGION = 0xEE
        COLOR_BORDER = 200
        COLOR_GRID_LINES = 240
        COLOR_LABEL_OFF = 0xFF
        COLOR_LABEL_ON = 0
        COLOR_COMPONENT_BORDER = 0x00
        COLOR_COMPONENT_INNER_LABELS = 0xAA
        COLOR_WIRE_BORDER = 80
        COLOR_MOUSE_OVER = [0, 0x7B, 0xFF]
        COLOR_FULL = [255, 193, 7]
        COLOR_LED_ON = [20, 255, 20]
        COLOR_DARK_RED = [180, 0, 0]
        COLOR_EMPTY = [52, 58, 64]
        COLOR_UNSET = [152, 158, 164]
        COLOR_GATE_NAMES = [190, 190, 190]
    } else {
        // Dark Theme
        COLOR_BACKGROUND = 43
        COLOR_BACKGROUND_UNUSED_REGION = 55
        COLOR_BORDER = 0x55
        COLOR_GRID_LINES = 0x2D
        COLOR_LABEL_OFF = 185
        COLOR_LABEL_ON = COLOR_BACKGROUND
        COLOR_COMPONENT_BORDER = 200
        COLOR_COMPONENT_INNER_LABELS = 0x8B
        COLOR_WIRE_BORDER = 175
        COLOR_MOUSE_OVER = [0, 0x7B, 0xFF]
        COLOR_FULL = [255, 193, 7]
        COLOR_LED_ON = [11, 144, 11]
        COLOR_DARK_RED = [180, 0, 0]
        COLOR_EMPTY = [80, 89, 99]
        COLOR_UNSET = [108, 106, 98]
        COLOR_GATE_NAMES = [95, 95, 95]
    }
}

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

export function wireLineToComponent(node: Node, x1: number, y1: number, withTriangle = false) {
    const x0 = node.posXInParentTransform
    const y0 = node.posYInParentTransform
    wireLine(x0, y0, x1, y1, node.value)
    if (withTriangle) {
        stroke(COLOR_COMPONENT_BORDER)
        fill(COLOR_COMPONENT_BORDER)
        const shift = node.isOutput ? 3 : 0
        if (x0 === x1) {
            // vertical line
            const pointsDown = (node.isOutput && y1 <= y0) || (!node.isOutput && y0 <= y1)
            if (pointsDown) {
                triangle(
                    x1 - 3, y1 - 2 + shift,
                    x1 + 3, y1 - 2 + shift,
                    x1, y1 + 1 + shift,
                )
            } else {
                triangle(
                    x1 - 3, y1 - 2 - shift,
                    x1 + 3, y1 - 2 - shift,
                    x1, y1 - 5 - shift,
                )
            }
        } else if (y0 === y1) {
            // horizontal line
            const pointsRight = (node.isOutput && x1 <= x0) || (!node.isOutput && x0 <= x1)
            if (pointsRight) {
                triangle(
                    x1 - 2 + shift, y1 - 3,
                    x1 - 2 + shift, y1 + 3,
                    x1 + 1 + shift, y1,
                )
            } else {
                triangle(
                    x1 + 2 - shift, y1 - 3,
                    x1 + 2 - shift, y1 + 3,
                    x1 - 1 - shift, y1,
                )
            }
        } else {
            console.log(`ERROR  wireLineToComponent cannot draw triangle as line is not vertical or horizontal between (${x0}, ${y0}) and (${x1}, ${y1})`)
        }
    }
}

export function wireLineBetweenComponents(node: Node, x1: number, y1: number) {
    const x0 = node.posX
    const y0 = node.posY
    wireLine(x0, y0, x1, y1, node.value)
}

function wireLine(x0: number, y0: number, x1: number, y1: number, value: TriState) {
    stroke(COLOR_WIRE_BORDER)
    strokeWeight(4)
    line(x0, y0, x1, y1)

    stroke(...colorForBoolean(value))
    strokeWeight(2)
    const f = x0 < x1 ? 1 : -1
    line(x0 - f, y0, x1 + f, y1)
}

export function roundValue(comp: HasPosition & { value: TriState }) {
    const value = comp.value
    textSize(18)
    textAlign(CENTER, CENTER)

    if (isUnset(value)) {
        fill(COLOR_LABEL_OFF)
        textStyle(BOLD)
        text('?', comp.posX, comp.posY)
    } else if (value) {
        fill(COLOR_LABEL_ON)
        textStyle(BOLD)
        text('1', comp.posX, comp.posY)
    } else {
        fill(COLOR_LABEL_OFF)
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
    for (const comp of components) {
        const y = comp.posY
        if (y > lowestY) {
            lowestY = y
        }
        if (y < highestY) {
            highestY = y
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
