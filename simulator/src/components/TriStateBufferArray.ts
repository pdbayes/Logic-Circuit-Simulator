import { Either } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { colorForBoolean, COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { ArrayFillWith, HighImpedance, isHighImpedance, isUnknown, LogicValue, typeOrUndefined, Unknown, validate } from "../utils"
import { ComponentBase, defineParametrizedComponent, groupVertical, Params, Repr } from "./Component"
import { DrawContext } from "./Drawable"


export const TriStateBufferArrayDef =
    defineParametrizedComponent("ic", "tristate-array", true, true, {
        variantName: ({ bits }) => `tristate-array-${bits}`,
        repr: {
            bits: typeOrUndefined(t.number),
        },
        valueDefaults: {},
        paramDefaults: {
            bits: 4,
        },
        validateParams: ({ bits }, defaults) => {
            const numBits = validate(bits, [2, 4, 8, 16], defaults.bits, "Tri-state buffer array bits")
            return { numBits }
        },
        size: ({ numBits }) => {
            return { gridWidth: 4, gridHeight: 8 } // TODO var height
        },
        makeNodes: ({ numBits }) => ({
            ins: {
                I: groupVertical("w", -3, 0, numBits),
                E: [0, -5, "n", "E (Enable)"],
            },
            outs: {
                O: groupVertical("e", 3, 0, numBits),
            },
        }),
        initialValue: (savedData, { numBits }) => ArrayFillWith<LogicValue>(HighImpedance, numBits),
    })


export type TriStateBufferArrayRepr = Repr<typeof TriStateBufferArrayDef>
export type TriStateBufferArrayParams = Params<typeof TriStateBufferArrayDef>

export class TriStateBufferArray extends ComponentBase<TriStateBufferArrayRepr> {

    public readonly numBits: number

    public constructor(editor: LogicEditor, initData: Either<TriStateBufferArrayParams, TriStateBufferArrayRepr>) {
        const [params, savedData] = TriStateBufferArrayDef.validate(initData)
        super(editor, TriStateBufferArrayDef(params), savedData)
        this.numBits = params.numBits
    }

    public toJSON() {
        return {
            type: "tristate-array" as const,
            bits: this.numBits === TriStateBufferArrayDef.aults.bits ? undefined : this.numBits,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        const s = S.Components.TriStateBufferArray.tooltip
        return tooltipContent(s.title, mods(
            div(s.desc)
        ))
    }

    protected doRecalcValue(): LogicValue[] {
        const enable = this.inputs.E.value

        if (isUnknown(enable) || isHighImpedance(enable)) {
            return ArrayFillWith(Unknown, this.numBits)
        }

        if (!enable) {
            return ArrayFillWith(HighImpedance, this.numBits)
        }

        return this.inputValues(this.inputs.I)
    }

    protected override propagateValue(newValue: LogicValue[]) {
        this.outputValues(this.outputs.O, newValue)
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const enable = this.inputs.E.value

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
        g.strokeStyle = colorForBoolean(enable)
        g.beginPath()
        g.moveTo(this.posX, top + 3)
        g.lineTo(this.posX, this.posY - 4)
        g.stroke()

        g.strokeStyle = COLOR_COMPONENT_BORDER
        g.beginPath()
        g.moveTo(left + 12, this.posY - 8)
        g.lineTo(right - 13, this.posY)
        g.lineTo(left + 12, this.posY + 8)
        g.closePath()
        g.stroke()


        for (const input of this.inputs.I) {
            drawWireLineToComponent(g, input, left - 2, input.posYInParentTransform)
        }

        drawWireLineToComponent(g, this.inputs.E, this.inputs.E.posXInParentTransform, top - 2)


        for (const output of this.outputs.O) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform)
        }
    }
}
