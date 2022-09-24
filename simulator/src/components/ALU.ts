import { FixedArray, HighImpedance, isDefined, isHighImpedance, isNotNull, isUndefined, isUnknown, LogicValue, typeOrUndefined, Unknown } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, GRID_STEP, drawWireLineToComponent, COLOR_COMPONENT_INNER_LABELS, drawLabel } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"

const GRID_WIDTH = 6
const GRID_HEIGHT = 19

const INPUT = {
    A: [0, 1, 2, 3] as const,
    B: [4, 5, 6, 7] as const,
    Op: [8, 9] as const,
    Cin: 10,
}

const OUTPUT = {
    S: [0, 1, 2, 3] as const,
    V: 4,
    Z: 5,
}


export const ALUDef =
    defineComponent(11, 6, t.type({
        type: t.literal("alu"),
        showOp: typeOrUndefined(t.boolean),
    }, "ALU"))

export type ALURepr = typeof ALUDef.reprType

export type ALUOp = "add" | "sub" | "and" | "or"
export const ALUOp = {
    shortName(op: ALUOp): string {
        return S.Components.ALU[op][0]
    },
    fullName(op: ALUOp): string {
        return S.Components.ALU[op][1]
    },
}

const ALUDefaults = {
    showOp: true,
}

export class ALU extends ComponentBase<11, 6, ALURepr, [FixedArray<LogicValue, 4>, LogicValue, LogicValue]> {

    private _showOp = ALUDefaults.showOp

    public constructor(editor: LogicEditor, savedData: ALURepr | null) {
        super(editor, [[false, false, false, false], false, true], savedData, {
            ins: [
                // A
                ["A0", -4, -8, "w", "A"],
                ["A1", -4, -6, "w", "A"],
                ["A2", -4, -4, "w", "A"],
                ["A3", -4, -2, "w", "A"],
                // B
                ["B0", -4, 2, "w", "B"],
                ["B1", -4, 4, "w", "B"],
                ["B2", -4, 6, "w", "B"],
                ["B3", -4, 8, "w", "B"],
                ["Op0", 0, -10, "n", "Op"], ["Op1", -2, -10, "n", "Op"],
                [`Cin (${S.Components.ALU.InputCinDesc})`, 2, -10, "n"],
            ],
            outs: [
                ["S0", 4, -3, "e", "S"],
                ["S1", 4, -1, "e", "S"],
                ["S2", 4, 1, "e", "S"],
                ["S3", 4, 3, "e", "S"],
                ["V (oVerflow)", -1, 10, "s"],
                ["Z (Zero)", 1, 10, "s"],
            ],
        })
        if (isNotNull(savedData)) {
            this._showOp = savedData.showOp ?? ALUDefaults.showOp
        }
    }

    toJSON() {
        return {
            type: "alu" as const,
            ...this.toJSONBase(),
            showOp: (this._showOp !== ALUDefaults.showOp) ? this._showOp : undefined,
        }
    }

    public get componentType() {
        return "ic" as const
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    public override makeTooltip() {
        const op = this.op
        const s = S.Components.ALU.tooltip
        const opDesc = isUnknown(op) ? s.SomeUnknownOperation : s.ThisOperation + " " + ALUOp.fullName(op)
        return tooltipContent(s.title, mods(
            div(`${s.CurrentlyCarriesOut} ${opDesc}.`)
        ))
    }

    public get op(): ALUOp | Unknown {
        const op1 = this.inputs[INPUT.Op[1]].value
        const op0 = this.inputs[INPUT.Op[0]].value
        switch (op1) {
            case false: // arithmetic
                switch (op0) {
                    case false: // 00
                        return "add"
                    case true: // 01
                        return "sub"
                    case Unknown:
                    case HighImpedance:
                        return Unknown
                }
                break
            case true: // logic
                switch (op0) {
                    case false: // 10
                        return "or" // opcode logic: "only one 1 needed"
                    case true: // 11
                        return "and"// opcode logic: "two 1s needed"
                    case Unknown:
                    case HighImpedance:
                        return Unknown
                }
                break
            case Unknown:
            case HighImpedance:
                return Unknown
        }
    }

    protected doRecalcValue(): [FixedArray<LogicValue, 4>, LogicValue, LogicValue] {
        const op = this.op

        if (isUnknown(op)) {
            return [[Unknown, Unknown, Unknown, Unknown], Unknown, Unknown]
        }

        const a = this.inputValues<4>(INPUT.A)
        const b = this.inputValues<4>(INPUT.B)
        const cin = this.inputs[INPUT.Cin].value


        function allZeros(vals: LogicValue[]): LogicValue {
            for (const v of vals) {
                if (isUnknown(v) || isHighImpedance(v)) {
                    return Unknown
                }
                if (v === true) {
                    return false
                }
            }
            return true
        }

        const y: LogicValue[] = [Unknown, Unknown, Unknown, Unknown]
        let v: LogicValue = Unknown

        switch (op) {
            case "add": {
                const sum3bits = (a: LogicValue, b: LogicValue, c: LogicValue): [LogicValue, LogicValue] => {
                    const asNumber = (v: LogicValue) => v === true ? 1 : 0
                    const numUnset = (isUnknown(a) || isHighImpedance(a) ? 1 : 0) + (isUnknown(b) || isHighImpedance(a) ? 1 : 0) + (isUnknown(c) || isHighImpedance(a) ? 1 : 0)
                    const sum = asNumber(a) + asNumber(b) + asNumber(c)

                    if (numUnset === 0) {
                        // we know exactly
                        return [sum % 2 === 1, sum >= 2]
                    }
                    if (numUnset === 1 && sum >= 2) {
                        // carry will always be set
                        return [Unknown, true]
                    }
                    // At this point, could be anything
                    return [Unknown, Unknown]

                }
                let prevCin: LogicValue = cin
                for (let i = 0; i < a.length; i++) {
                    const [s, cout] = sum3bits(prevCin, a[i], b[i])
                    y[i] = s
                    prevCin = cout
                }
                v = prevCin
                break
            }

            case "sub": {
                // TODO check how to handle carry, negative numbers, borrow, etc.
                const toInt = (vs: readonly LogicValue[]): number | undefined => {
                    let s = 0
                    let col = 1
                    for (const v of vs) {
                        if (isUnknown(v)) {
                            return undefined
                        }
                        s += Number(v) * col
                        col *= 2
                    }
                    return s
                }

                const aInt = toInt(a)
                const bInt = toInt(b)
                if (!isUndefined(aInt) && !isUndefined(bInt)) {
                    // otherwise, stick with default Unset values everywhere
                    let yInt = aInt - bInt
                    // console.log(`${aInt} - ${bInt} = ${yInt}`)
                    // we can get anything from (max - (-min)) = 7 - (-8) = 15
                    // to (min - max) = -8 - 7 = -15
                    if (yInt < 0) {
                        yInt += 16
                    }
                    // now we have everything between 0 and 15
                    const yBinStr = (yInt >>> 0).toString(2).padStart(4, '0')
                    for (let i = 0; i < 4; i++) {
                        y[i] = yBinStr[3 - i] === '1'
                    }
                    v = bInt > aInt
                }
                break
            }

            // below, we need the '=== true' and '=== false' parts
            // to distinguish also the Unset case
            case "and": {
                for (let i = 0; i < a.length; i++) {
                    if (a[i] === false || b[i] === false) {
                        y[i] = false
                    } else if (a[i] === true && b[i] === true) {
                        y[i] = true
                    } else {
                        y[i] = Unknown
                    }
                }
                v = false
                break
            }

            case "or": {
                for (let i = 0; i < a.length; i++) {
                    if (a[i] === true || b[i] === true) {
                        y[i] = true
                    } else if (a[i] === false && b[i] === false) {
                        y[i] = false
                    } else {
                        y[i] = Unknown
                    }
                }
                v = false
                break
            }
        }

        const z = allZeros(y)
        return [y as any as FixedArray<LogicValue, 4>, v, z]
    }

    protected override propagateValue(newValue: [FixedArray<LogicValue, 4>, LogicValue, LogicValue]) {
        for (let i = 0; i < OUTPUT.S.length; i++) {
            this.outputs[OUTPUT.S[i]].value = newValue[0][i]
        }
        this.outputs[OUTPUT.V].value = newValue[1]
        this.outputs[OUTPUT.Z].value = newValue[2]
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        const left = this.posX - width / 2
        const right = this.posX + width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2

        // inputs
        for (let i = 0; i < INPUT.A.length; i++) {
            const inputi = this.inputs[INPUT.A[i]]
            drawWireLineToComponent(g, inputi, left, inputi.posYInParentTransform)
        }
        for (let i = 0; i < INPUT.B.length; i++) {
            const inputi = this.inputs[INPUT.B[i]]
            drawWireLineToComponent(g, inputi, left, inputi.posYInParentTransform)
        }
        drawWireLineToComponent(g, this.inputs[INPUT.Op[1]], this.inputs[INPUT.Op[1]].posXInParentTransform, top + 3)
        drawWireLineToComponent(g, this.inputs[INPUT.Op[0]], this.inputs[INPUT.Op[0]].posXInParentTransform, top + 9)
        drawWireLineToComponent(g, this.inputs[INPUT.Cin], this.inputs[INPUT.Cin].posXInParentTransform, top + 17)

        // outputs
        for (let i = 0; i < OUTPUT.S.length; i++) {
            const outputi = this.outputs[OUTPUT.S[i]]
            drawWireLineToComponent(g, outputi, right, outputi.posYInParentTransform)
        }
        drawWireLineToComponent(g, this.outputs[OUTPUT.V], this.outputs[OUTPUT.V].posXInParentTransform, bottom - 6)
        drawWireLineToComponent(g, this.outputs[OUTPUT.Z], this.outputs[OUTPUT.Z].posXInParentTransform, bottom - 13)


        // outline
        g.fillStyle = COLOR_BACKGROUND
        g.lineWidth = 3
        if (ctx.isMouseOver) {
            g.strokeStyle = COLOR_MOUSE_OVER
        } else {
            g.strokeStyle = COLOR_COMPONENT_BORDER
        }

        g.beginPath()
        g.moveTo(left, top)
        g.lineTo(right, top + 2 * GRID_STEP)
        g.lineTo(right, bottom - 2 * GRID_STEP)
        g.lineTo(left, bottom)
        g.lineTo(left, this.posY + 1 * GRID_STEP)
        g.lineTo(left + 2 * GRID_STEP, this.posY)
        g.lineTo(left, this.posY - 1 * GRID_STEP)
        g.closePath()
        g.fill()
        g.stroke()

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "V", "s", this.outputs[OUTPUT.V], bottom - 7)
            drawLabel(ctx, this.orient, "Z", "s", this.outputs[OUTPUT.Z], bottom - 14)

            drawLabel(ctx, this.orient, "Cin", "n", this.inputs[INPUT.Cin], top + 17)

            g.font = "bold 12px sans-serif"
            drawLabel(ctx, this.orient, "Op", "n", this.inputs[INPUT.Op[0]].posXInParentTransform - GRID_STEP, top + 8)

            g.font = "bold 14px sans-serif"
            drawLabel(ctx, this.orient, "A", "w", left, top + 4 * GRID_STEP + 6)
            drawLabel(ctx, this.orient, "B", "w", left, bottom - 4 * GRID_STEP - 6)
            drawLabel(ctx, this.orient, "S", "e", right, this.posY)

            if (this._showOp) {
                const opName = isUnknown(this.op) ? "??" : ALUOp.shortName(this.op)
                const size = 25 - 13 * (opName.length - 1)
                g.font = `bold ${size}px sans-serif`
                g.fillStyle = COLOR_COMPONENT_BORDER
                g.textAlign = "center"
                g.textBaseline = "middle"
                g.fillText(opName, this.posX, this.posY)
            }
        })
    }

    private doSetShowOp(showOp: boolean) {
        this._showOp = showOp
        this.setNeedsRedraw("show op changed")
    }


    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const icon = this._showOp ? "check" : "none"
        const toggleShowOpItem = ContextMenuData.item(icon, S.Components.ALU.contextMenu.toggleShowOp, () => {
            this.doSetShowOp(!this._showOp)
        })

        const items: [ContextMenuItemPlacement, ContextMenuItem][] = [
            ["mid", toggleShowOpItem],
        ]

        const forceOutputItem = this.makeForceOutputsContextMenuItem()
        if (isDefined(forceOutputItem)) {
            items.push(
                ["mid", forceOutputItem]
            )
        }

        return items
    }


}
