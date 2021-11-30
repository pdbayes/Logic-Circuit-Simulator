import { FixedArray, FixedArraySize, isNotNull, isUndefined, isUnset, TriState, typeOrUndefined, unset, Unset } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, GRID_STEP, drawWireLineToComponent, COLOR_COMPONENT_INNER_LABELS } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"

const GRID_WIDTH = 6
const GRID_HEIGHT = 19

const INPUT_A = [0, 1, 2, 3] as const
const INPUT_B = [4, 5, 6, 7] as const
const INPUT_Op = [8, 9] as const

const OUTPUT_Y = [0, 1, 2, 3] as const
const OUTPUT_V = 4
const OUTPUT_Z = 5

export const ALUDef =
    defineComponent(10, 6, t.type({
        type: t.literal("alu"),
        showOp: typeOrUndefined(t.boolean),
    }, "ALU"))

export type ALURepr = typeof ALUDef.reprType

export type ALUOp = "add" | "sub" | "and" | "or"
export const ALUOp = {
    shortName(op: ALUOp): string {
        switch (op) {
            case "add": return "Add."
            case "sub": return "Soustr."
            case "and": return "ET"
            case "or": return "OU"
        }
    },
    fullName(op: ALUOp): string {
        switch (op) {
            case "add": return "Addition"
            case "sub": return "Soustraction"
            case "and": return "ET"
            case "or": return "OU"
        }
    },
}

const ALUDefaults = {
    showOp: true,
}

export class ALU extends ComponentBase<10, 6, ALURepr, [FixedArray<TriState, 4>, TriState, TriState]> {

    private _showOp = ALUDefaults.showOp

    public constructor(savedData: ALURepr | null) {
        super([[false, false, false, false], false, true], savedData, {
            inOffsets: [
                [-4, -8, "w"], [-4, -6, "w"], [-4, -4, "w"], [-4, -2, "w"], // A
                [-4, 2, "w"], [-4, 4, "w"], [-4, 6, "w"], [-4, 8, "w"], // B
                [1, -10, "n"], [-1, -10, "n"], // Op[0] then Op[1]
            ],
            outOffsets: [
                [4, -3, "e"], [4, -1, "e"], [4, 1, "e"], [4, 3, "e"], // Y
                [-1, 10, "s"], // V
                [1, 10, "s"], // Z
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
        return "IC" as const
    }

    protected override getInputName(i: number): string | undefined {
        if (i <= INPUT_A[INPUT_A.length - 1]) {
            return "A" + i
        }
        if (i <= INPUT_B[INPUT_B.length - 1]) {
            return "B" + (i - INPUT_B[0])
        }
        if (i <= INPUT_Op[INPUT_Op.length - 1]) {
            return "Op" + (i - INPUT_Op[0])
        }
        return undefined
    }

    protected override getOutputName(i: number): string | undefined {
        if (i <= OUTPUT_Y[OUTPUT_Y.length - 1]) {
            return "Y" + i
        }
        if (i === OUTPUT_V) {
            return "V (oVerflow)"
        }
        if (i === OUTPUT_Z) {
            return "Z (Zero)"
        }
        return undefined
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    public override makeTooltip() {
        const op = this.op
        const opDesc = isUnset(op) ? "une opération inconnue" : "l’opération " + ALUOp.fullName(op)
        return tooltipContent("Unité arithmétique et logique (ALU)", mods(
            div(`Effectue actuellement ${opDesc}.`)
        ))
    }

    private inputValues = <N extends FixedArraySize>(inds: FixedArray<number, N>): FixedArray<TriState, N> => {
        return inds.map(i => this.inputs[i].value) as any as FixedArray<TriState, N>
    }

    public get op(): ALUOp | unset {
        const opcode = this.inputValues<2>(INPUT_Op)
        switch (opcode[1]) {
            case false:
                switch (opcode[0]) {
                    case false: // 00
                        return "add"
                    case true: // 01
                        return "sub"
                    case "?":
                        return Unset
                }
                break
            case true:
                switch (opcode[0]) {
                    case false: // 10
                        return "or" // opcode logic: "only one 1 needed"
                    case true: // 11
                        return "and"// opcode logic: "two 1s needed"
                    case "?":
                        return Unset
                }
                break
            case "?":
                return Unset
        }
    }

    protected doRecalcValue(): [FixedArray<TriState, 4>, TriState, TriState] {
        const op = this.op

        if (isUnset(op)) {
            return [[Unset, Unset, Unset, Unset], Unset, Unset]
        }

        const a = this.inputValues<4>(INPUT_A)
        const b = this.inputValues<4>(INPUT_B)


        function allZeros(vals: TriState[]): TriState {
            for (const v of vals) {
                if (isUnset(v)) {
                    return Unset
                }
                if (v) {
                    return false
                }
            }
            return true
        }

        const y: TriState[] = [Unset, Unset, Unset, Unset]
        let v: TriState = Unset

        switch (op) {
            case "add": {
                const sum3bits = (a: TriState, b: TriState, c: TriState): [TriState, TriState] => {
                    const asNumber = (v: TriState) => v === true ? 1 : 0
                    const numUnset = (isUnset(a) ? 1 : 0) + (isUnset(b) ? 1 : 0) + (isUnset(c) ? 1 : 0)
                    const sum = asNumber(a) + asNumber(b) + asNumber(c)

                    if (numUnset === 0) {
                        // we know exactly
                        return [sum % 2 === 1, sum >= 2]
                    }
                    if (numUnset === 1 && sum >= 2) {
                        // carry will always be set
                        return [Unset, true]
                    }
                    // At this point, could be anything
                    return [Unset, Unset]

                }
                let cin: TriState = false
                for (let i = 0; i < a.length; i++) {
                    const [s, cout] = sum3bits(cin, a[i], b[i])
                    y[i] = s
                    cin = cout
                }
                v = cin
                break
            }

            case "sub": {
                const toInt = (vs: readonly TriState[]): number | undefined => {
                    let s = 0
                    let col = 1
                    for (const v of vs) {
                        if (isUnset(v)) {
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
                    console.log(`${aInt} - ${bInt} = ${yInt}`)
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
                        y[i] = Unset
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
                        y[i] = Unset
                    }
                }
                v = false
                break
            }
        }

        const z = allZeros(y)
        return [y as any as FixedArray<TriState, 4>, v, z]
    }

    protected override propagateNewValue(newValue: [FixedArray<TriState, 4>, TriState, TriState]) {
        for (let i = 0; i < OUTPUT_Y.length; i++) {
            this.outputs[OUTPUT_Y[i]].value = newValue[0][i]
        }
        this.outputs[OUTPUT_V].value = newValue[1]
        this.outputs[OUTPUT_Z].value = newValue[2]
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        const left = this.posX - width / 2
        const right = this.posX + width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2

        // inputs
        for (let i = 0; i < INPUT_A.length; i++) {
            const inputi = this.inputs[INPUT_A[i]]
            drawWireLineToComponent(g, inputi, left, inputi.posYInParentTransform)
        }
        for (let i = 0; i < INPUT_B.length; i++) {
            const inputi = this.inputs[INPUT_B[i]]
            drawWireLineToComponent(g, inputi, left, inputi.posYInParentTransform)
        }
        drawWireLineToComponent(g, this.inputs[INPUT_Op[1]], this.inputs[INPUT_Op[1]].posXInParentTransform, top + 6)
        drawWireLineToComponent(g, this.inputs[INPUT_Op[0]], this.inputs[INPUT_Op[0]].posXInParentTransform, top + 13)

        // outputs
        for (let i = 0; i < OUTPUT_Y.length; i++) {
            const outputi = this.outputs[OUTPUT_Y[i]]
            drawWireLineToComponent(g, outputi, right, outputi.posYInParentTransform)
        }
        drawWireLineToComponent(g, this.outputs[OUTPUT_V], this.outputs[OUTPUT_V].posXInParentTransform, bottom - 6)
        drawWireLineToComponent(g, this.outputs[OUTPUT_Z], this.outputs[OUTPUT_Z].posXInParentTransform, bottom - 13)


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
            g.font = "bold 12px sans-serif"

            let opNameOffset: number
            let vOffset: number
            let zOffset: number
            [g.textAlign, opNameOffset, vOffset, zOffset] = (() => {
                switch (this.orient) {
                    case "e":
                    case "w":
                        return ["center", 22, 15, 22] as const
                    case "s":
                        return ["right", 14, 19, 25] as const
                    case "n":
                        return ["left", 14, 19, 25] as const
                }
            })()

            if (this._showOp) {
                const op = this.op
                const opName = isUnset(op) ? "???" : ALUOp.shortName(op)
                g.fillText(opName, ...ctx.rotatePoint(this.posX, top + opNameOffset))
            }

            g.font = "12px sans-serif"
            g.fillText("V", ...ctx.rotatePoint(this.posX - GRID_STEP, bottom - vOffset))
            g.fillText("Z", ...ctx.rotatePoint(this.posX + GRID_STEP, bottom - zOffset))


            g.font = "bold 14px sans-serif"
            g.fillText("A", ...ctx.rotatePoint(this.posX - 20, top + 4 * GRID_STEP + 6))
            g.fillText("B", ...ctx.rotatePoint(this.posX - 20, bottom - 4 * GRID_STEP - 6))
            g.fillText("S", ...ctx.rotatePoint(this.posX + 20, this.posY))


        })
    }

    private doSetShowOp(showOp: boolean) {
        this._showOp = showOp
        this.setNeedsRedraw("show op changed")
    }


    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const icon = this._showOp ? "check" : "none"
        const toggleShowOpItem = ContextMenuData.item(icon, "Afficher l’opération", () => {
            this.doSetShowOp(!this._showOp)
        })

        return [
            ["mid", toggleShowOpItem],
            ["mid", this.makeForceOutputsContextMenuItem()!],
        ]
    }


}
