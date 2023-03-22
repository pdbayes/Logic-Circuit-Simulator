import * as t from "io-ts"
import { circle, colorForBoolean, COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, COLOR_UNKNOWN, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { ArrayFillWith, isHighImpedance, isUnknown, LogicValue, typeOrUndefined, Unknown, validate } from "../utils"
import { ComponentBase, defineParametrizedComponent, groupVertical, Repr, ResolvedParams } from "./Component"
import { DrawContext } from "./Drawable"


export const SwitchedInverterDef =
    defineParametrizedComponent("ic", "switched-inverter", true, true, {
        variantName: ({ bits }) => `switched-inverter-${bits}`,
        button: { imgWidth: 50 },
        repr: {
            bits: typeOrUndefined(t.number),
        },
        valueDefaults: {},
        paramDefaults: {
            bits: 4,
        },
        validateParams: ({ bits }, defaults) => {
            const numBits = validate(bits, [2, 4, 8, 16], defaults.bits, "Switched inverter bits")
            return { numBits }
        },
        size: ({ numBits }) => {
            return { gridWidth: 4, gridHeight: 8 } // TODO var height
        },
        makeNodes: ({ numBits }) => ({
            ins: {
                I: groupVertical("w", -3, 0, numBits),
                S: [0, -5, "n"],
            },
            outs: {
                O: groupVertical("e", +3, 0, numBits),
            },
        }),
        initialValue: (saved, { numBits }) => ArrayFillWith<LogicValue>(false, numBits),
    })


export type SwitchedInverterRepr = Repr<typeof SwitchedInverterDef>
export type SwitchedInverterParams = ResolvedParams<typeof SwitchedInverterDef>


export class SwitchedInverter extends ComponentBase<SwitchedInverterRepr> {

    public readonly numBits: number

    public constructor(editor: LogicEditor, params: SwitchedInverterParams, saved?: SwitchedInverterRepr) {
        super(editor, SwitchedInverterDef.with(params), saved)
        this.numBits = params.numBits
    }

    public toJSON() {
        return {
            type: "switched-inverter" as const,
            bits: this.numBits === SwitchedInverterDef.aults.bits ? undefined : this.numBits,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        const s = S.Components.SwitchedInverter.tooltip
        return tooltipContent(s.title, mods(
            div(s.desc)
        ))
    }

    protected doRecalcValue(): LogicValue[] {
        const input = this.inputValues(this.inputs.I)
        const switch_ = this.inputs.S.value

        if (isUnknown(switch_) || isHighImpedance(switch_)) {
            return ArrayFillWith(Unknown, this.numBits)
        }

        if (!switch_) {
            return input
        }

        return input.map(LogicValue.invert)
    }

    protected override propagateValue(newValue: LogicValue[]) {
        this.outputValues(this.outputs.O, newValue)
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const invert = this.inputs.S.value

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        const right = left + width
        const top = this.posY - height / 2
        // const bottom = top + height

        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3

        g.beginPath()
        g.rect(this.posX - width / 2, this.posY - height / 2, width, height)
        g.fill()
        g.stroke()

        g.lineWidth = 2
        g.strokeStyle = colorForBoolean(invert)
        g.beginPath()
        g.moveTo(this.posX, top + 3)
        g.lineTo(this.posX, this.posY - 4)
        g.stroke()

        g.strokeStyle = invert === true ? COLOR_COMPONENT_BORDER : COLOR_UNKNOWN
        g.beginPath()
        g.moveTo(left + 12, this.posY - 8)
        g.lineTo(right - 13, this.posY)
        g.lineTo(left + 12, this.posY + 8)
        g.closePath()
        g.stroke()
        g.beginPath()
        circle(g, right - 10, this.posY, 5)
        g.stroke()


        for (const input of this.inputs.I) {
            drawWireLineToComponent(g, input, left - 2, input.posYInParentTransform)
        }

        drawWireLineToComponent(g, this.inputs.S, this.inputs.S.posXInParentTransform, top - 2)


        for (const output of this.outputs.O) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform)
        }
    }
}
SwitchedInverterDef.impl = SwitchedInverter
