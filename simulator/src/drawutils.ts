import { HasPosition } from "./components/Drawable"
import { isArray, isUnset, TriState, unset, Unset } from "./utils"
import { Node } from "./components/Node"
import { components, wrapHandler } from "./simulator"
import { RedrawManager } from "./RedrawRecalcManager"


//
// GRID, GENERAL
//

export const GRID_STEP = 10

export function pxToGrid(x: number) {
    return Math.round(x / GRID_STEP)
}

export function dist(x0: number, y0: number, x1: number, y1: number): number {
    const dx = x1 - x0
    const dy = y1 - y0
    return Math.sqrt(dx * dx + dy * dy)
}

export function inRect(centerX: number, centerY: number, width: number, height: number, pointX: number, pointY: number): boolean {
    const w2 = width / 2
    const h2 = height / 2
    return pointX >= centerX - w2 && pointX < centerX + w2 &&
        pointY >= centerY - h2 && pointY < centerY + h2
}


//
// COLORS
//

export type ColorGreyLevel = number
export type ColorComponents = [number, number, number]
export type ColorString = string

export let COLOR_BACKGROUND: ColorString
export let COLOR_BACKGROUND_UNUSED_REGION: ColorString
export let COLOR_BORDER: ColorString
export let COLOR_GRID_LINES: ColorString
export let COLOR_LABEL_OFF: ColorString
export let COLOR_LABEL_ON: ColorString
export let COLORCOMP_COMPONENT_BORDER: ColorGreyLevel
export let COLOR_COMPONENT_BORDER: ColorString
export let COLOR_COMPONENT_INNER_LABELS: ColorString
export let COLOR_WIRE_BORDER: ColorString
export let COLOR_MOUSE_OVER: ColorString
export let COLORCOMPS_FULL: ColorComponents
export let COLOR_FULL: ColorString
export let COLOR_LED_ON: ColorString
export let COLOR_DARK_RED: ColorString
export let COLORCOMPS_EMPTY: ColorComponents
export let COLOR_EMPTY: ColorString
export let COLOR_UNSET: ColorString
export let COLOR_GATE_NAMES: ColorString

export const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)")
darkModeQuery.onchange = wrapHandler(() => {
    setColors(darkModeQuery.matches)
    RedrawManager.addReason("dark/light mode switch", null)
})
setColors(darkModeQuery.matches)

function setColors(darkMode: boolean) {
    if (!darkMode) {
        // Light Theme
        COLOR_BACKGROUND = ColorString(0xFF)
        COLOR_BACKGROUND_UNUSED_REGION = ColorString(0xEE)
        COLOR_BORDER = ColorString(200)
        COLOR_GRID_LINES = ColorString(240)
        COLOR_LABEL_OFF = ColorString(0xFF)
        COLOR_LABEL_ON = ColorString(0)
        COLORCOMP_COMPONENT_BORDER = 0x00
        COLOR_COMPONENT_INNER_LABELS = ColorString(0xAA)
        COLOR_WIRE_BORDER = ColorString(80)
        COLOR_MOUSE_OVER = ColorString([0, 0x7B, 0xFF])
        COLORCOMPS_FULL = [255, 193, 7]
        COLOR_LED_ON = ColorString([20, 255, 20])
        COLOR_DARK_RED = ColorString([180, 0, 0])
        COLORCOMPS_EMPTY = [52, 58, 64]
        COLOR_UNSET = ColorString([152, 158, 164])
        COLOR_GATE_NAMES = ColorString([190, 190, 190])
    } else {
        // Dark Theme
        COLOR_BACKGROUND = ColorString(43)
        COLOR_BACKGROUND_UNUSED_REGION = ColorString(55)
        COLOR_BORDER = ColorString(0x55)
        COLOR_GRID_LINES = ColorString(30)
        COLOR_LABEL_OFF = ColorString(185)
        COLOR_LABEL_ON = COLOR_BACKGROUND
        COLORCOMP_COMPONENT_BORDER = 200
        COLOR_COMPONENT_INNER_LABELS = ColorString(0x8B)
        COLOR_WIRE_BORDER = ColorString(175)
        COLOR_MOUSE_OVER = ColorString([0, 0x7B, 0xFF])
        COLORCOMPS_FULL = [255, 193, 7]
        COLOR_LED_ON = ColorString([11, 144, 11])
        COLOR_DARK_RED = ColorString([180, 0, 0])
        COLORCOMPS_EMPTY = [80, 89, 99]
        COLOR_UNSET = ColorString([108, 106, 98])
        COLOR_GATE_NAMES = ColorString([95, 95, 95])
    }
    COLOR_COMPONENT_BORDER = ColorString(COLORCOMP_COMPONENT_BORDER)
    COLOR_FULL = ColorString(COLORCOMPS_FULL)
    COLOR_EMPTY = ColorString(COLORCOMPS_EMPTY)
}

export function ColorString(input: ColorGreyLevel | ColorComponents): ColorString {
    if (isArray(input)) {
        return `rgb(${input[0]},${input[1]},${input[2]})`
    }
    // else, grey
    return `rgb(${input},${input},${input})`
}

export function colorComps(c: ColorString) {
    const PREFIX = "rgb("
    if (c.startsWith(PREFIX)) {
        c = c.substring(PREFIX.length)
    }
    const SUFFIX = ")"
    if (c.endsWith(SUFFIX)) {
        c = c.substring(0, c.length - SUFFIX.length)
    }
    return c.split(',').map(compStr => parseInt(compStr))
}

export function colorForBoolean(value: TriState): ColorString {
    return isUnset(value) ? COLOR_UNSET : value ? COLOR_FULL : COLOR_EMPTY
}

export function colorForFraction(fraction: number): ColorString {
    const c: ColorComponents = [
        (COLORCOMPS_FULL[0] - COLORCOMPS_EMPTY[0]) * fraction + COLORCOMPS_EMPTY[0],
        (COLORCOMPS_FULL[1] - COLORCOMPS_EMPTY[1]) * fraction + COLORCOMPS_EMPTY[1],
        (COLORCOMPS_FULL[2] - COLORCOMPS_EMPTY[2]) * fraction + COLORCOMPS_EMPTY[2],
    ]
    return ColorString(c)
}


//
// DRAWING
//

// Adding to current path

export function triangle(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) {
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.lineTo(x2, y2)
    g.closePath()
}

export function circle(g: CanvasRenderingContext2D, cx: number, cy: number, d: number) {
    const r = d / 2
    g.ellipse(cx, cy, r, r, 0, 0, 2 * Math.PI)
}

// Stroking/filling

export function strokeSingleLine(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.stroke()
}

export function strokeBezier(g: CanvasRenderingContext2D, x0: number, y0: number, anchorX0: number, anchorY0: number, anchorX1: number, anchorY1: number, x1: number, y1: number) {
    g.beginPath()
    g.moveTo(x0, y0)
    g.bezierCurveTo(anchorX0, anchorY0, anchorX1, anchorY1, x1, y1)
    g.stroke()
}

export function drawWireLineToComponent(g: CanvasRenderingContext2D, node: Node, x1: number, y1: number, withTriangle = false) {
    const x0 = node.posXInParentTransform
    const y0 = node.posYInParentTransform
    drawWireLine(g, x0, y0, x1, y1, node.value)
    if (withTriangle) {
        g.strokeStyle = COLOR_COMPONENT_BORDER
        g.fillStyle = COLOR_COMPONENT_BORDER
        g.beginPath()
        const shift = node.isOutput ? 2 : -1
        if (x0 === x1) {
            // vertical line
            const pointsDown = (node.isOutput && y1 <= y0) || (!node.isOutput && y0 <= y1)
            if (pointsDown) {
                triangle(g,
                    x1 - 3, y1 - 2 + shift,
                    x1 + 3, y1 - 2 + shift,
                    x1, y1 + 1 + shift,
                )
            } else {
                triangle(g,
                    x1 - 3, y1 - 2 - shift,
                    x1 + 3, y1 - 2 - shift,
                    x1, y1 - 5 - shift,
                )
            }
        } else if (y0 === y1) {
            // horizontal line
            const pointsRight = (node.isOutput && x1 <= x0) || (!node.isOutput && x0 <= x1)
            if (pointsRight) {
                triangle(g,
                    x1 - 2 + shift, y1 - 3,
                    x1 - 2 + shift, y1 + 3,
                    x1 + 1 + shift, y1,
                )
            } else {
                triangle(g,
                    x1 + 2 - shift, y1 - 3,
                    x1 + 2 - shift, y1 + 3,
                    x1 - 1 - shift, y1,
                )
            }
        } else {
            console.log(`ERROR  wireLineToComponent cannot draw triangle as line is not vertical or horizontal between (${x0}, ${y0}) and (${x1}, ${y1})`)
        }
        g.fill()
        g.stroke()
    }
}

export function drawWireLineBetweenComponents(g: CanvasRenderingContext2D, node: Node, x1: number, y1: number) {
    const x0 = node.posX
    const y0 = node.posY
    drawWireLine(g, x0, y0, x1, y1, node.value)
}


function drawWireLine(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, value: TriState) {
    const oldLineCap = g.lineCap
    g.lineCap = "butt"

    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)

    g.strokeStyle = COLOR_WIRE_BORDER
    g.lineWidth = 4
    g.stroke()

    g.strokeStyle = colorForBoolean(value)
    g.lineWidth = 2
    g.stroke()

    g.lineCap = oldLineCap
}

export function drawRoundValue(g: CanvasRenderingContext2D, comp: HasPosition & { value: TriState }) {
    const value = comp.value
    g.textAlign = "center"

    let boldSpec = ""
    let label = ""

    if (isUnset(value)) {
        g.fillStyle = COLOR_LABEL_OFF
        boldSpec = "bold "
        label = '?'
    } else if (value) {
        g.fillStyle = COLOR_LABEL_ON
        boldSpec = "bold "
        label = '1'
    } else {
        g.fillStyle = COLOR_LABEL_OFF
        label = '0'
    }
    g.font = `${boldSpec}18px sans-serif`
    g.fillText(label, comp.posX, comp.posY)
}


//
// MISC
//

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
