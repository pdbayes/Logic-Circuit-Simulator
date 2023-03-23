import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, drawLabel, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { ArrayFillWith, LogicValue, typeOrUndefined, validate } from "../utils"
import { doALUOp } from "./ALU"
import { defineParametrizedComponent, groupVertical, ParametrizedComponentBase, Repr, ResolvedParams, Value } from "./Component"
import { DrawContext, MenuItems } from "./Drawable"
import { GateArrayDef } from "./GateArray"


export const AdderArrayDef =
    defineParametrizedComponent("ic", "adder-array", true, true, {
        variantName: ({ bits }) => `adder-array-${bits}`,
        button: { imgWidth: 50 },
        repr: {
            bits: typeOrUndefined(t.number),
        },
        valueDefaults: {},
        paramDefaults: {
            bits: 4,
        },
        validateParams: ({ bits }, defaults) => {
            const numBits = validate(bits, [2, 4, 8, 16], defaults.bits, "Adder array bits")
            return { numBits }
        },
        size: ({ numBits }) => ({
            gridWidth: 4, // constant
            gridHeight: GateArrayDef.size({ numBits }).gridHeight, // mimic GateArray
        }),
        makeNodes: ({ numBits, gridHeight }) => {
            const inputCenterY = 5 + Math.max(0, (numBits - 8) / 2)
            const coutY = Math.floor(gridHeight / 2) + 1
            const cinY = -coutY

            return {
                ins: {
                    A: groupVertical("w", -3, -inputCenterY, numBits),
                    B: groupVertical("w", -3, inputCenterY, numBits),
                    Cin: [0, cinY, "n"],
                },
                outs: {
                    S: groupVertical("e", 3, 0, numBits),
                    Cout: [0, coutY, "s"],
                },
            }
        },
        initialValue: (saved, { numBits }) => ({
            s: ArrayFillWith<LogicValue>(false, numBits),
            cout: false as LogicValue,
        }),
    })


export type AdderArrayRepr = Repr<typeof AdderArrayDef>
export type AdderArrayParams = ResolvedParams<typeof AdderArrayDef>
export type AdderArrayValue = Value<typeof AdderArrayDef>

export class AdderArray extends ParametrizedComponentBase<AdderArrayRepr> {

    public readonly numBits: number

    public constructor(editor: LogicEditor, params: AdderArrayParams, saved?: AdderArrayRepr) {
        super(editor, AdderArrayDef.with(params), saved)
        this.numBits = params.numBits
    }

    public toJSON() {
        return {
            type: "adder-array" as const,
            bits: this.numBits === AdderArrayDef.aults.bits ? undefined : this.numBits,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        const s = S.Components.AdderArray.tooltip
        return tooltipContent(s.title.expand({ numBits: this.numBits }), mods(
            div(s.desc), // TODO more info
        ))
    }

    protected doRecalcValue(): AdderArrayValue {
        const a = this.inputValues(this.inputs.A)
        const b = this.inputValues(this.inputs.B)
        const cin = this.inputs.Cin.value
        return doALUOp("add", a, b, cin)
    }

    protected override propagateValue(newValue: AdderArrayValue) {
        this.outputValues(this.outputs.S, newValue.s)
        this.outputs.Cout.value = newValue.cout
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        const right = this.posX + width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2

        // inputs
        for (const input of this.inputs.A) {
            drawWireLineToComponent(g, input, left, input.posYInParentTransform)
        }
        for (const input of this.inputs.B) {
            drawWireLineToComponent(g, input, left, input.posYInParentTransform)
        }
        drawWireLineToComponent(g, this.inputs.Cin, this.inputs.Cin.posXInParentTransform, top)

        // outputs
        for (const output of this.outputs.S) {
            drawWireLineToComponent(g, output, right, output.posYInParentTransform)
        }
        drawWireLineToComponent(g, this.outputs.Cout, this.outputs.Cout.posXInParentTransform, bottom)


        // outline
        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3

        g.beginPath()
        g.rect(left, top, width, height)
        g.fill()
        g.stroke()

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS

            // non-bold input/output labels
            g.font = "12px sans-serif"
            drawLabel(ctx, this.orient, "Cout", "s", this.outputs.Cout.posXInParentTransform, bottom, this.outputs.Cout)
            drawLabel(ctx, this.orient, "Cin", "n", this.inputs.Cin.posXInParentTransform, top, this.outputs.Cout)

            // inputs
            g.font = "bold 12px sans-serif"
            drawLabel(ctx, this.orient, "S", "e", right, this.outputs.S)
            drawLabel(ctx, this.orient, "A", "w", left, this.inputs.A)
            drawLabel(ctx, this.orient, "B", "w", left, this.inputs.B)

            // right outputs
            g.font = `bold 25px sans-serif`
            g.fillStyle = COLOR_COMPONENT_BORDER
            g.textAlign = "center"
            g.textBaseline = "middle"
            g.fillText("+", ...ctx.rotatePoint(this.posX - 4, this.posY))
        })

    }

    protected override makeComponentSpecificContextMenuItems(): MenuItems {
        return [
            this.makeChangeParamsContextMenuItem("inputs", S.Components.Generic.contextMenu.ParamNumBits, this.numBits, "bits", [2, 4, 8, 16]),
            ...this.makeForceOutputsContextMenuItem(true),
        ]
    }

}
AdderArrayDef.impl = AdderArray
