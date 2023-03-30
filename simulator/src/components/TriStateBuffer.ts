import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, drawWireLineToComponent, GRID_STEP } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { HighImpedance, isHighImpedance, isUnknown, LogicValue, Unknown } from "../utils"
import { ComponentBase, defineComponent, Repr } from "./Component"
import { DrawContext } from "./Drawable"

export const TriStateBufferDef =
    defineComponent("gate", "TRI", {
        button: { imgWidth: 50 },
        valueDefaults: {},
        size: { gridWidth: 7, gridHeight: 4 },
        makeNodes: () => ({
            ins: {
                In: [-4, 0, "w"],
                E: [0, -3, "n", "E (Enable)"],
            },
            outs: {
                Out: [+4, 0, "e"],
            },
        }),
        initialValue: () => HighImpedance as LogicValue,
    })

type TriStateBufferRepr = Repr<typeof TriStateBufferDef>

export class TriStateBuffer extends ComponentBase<TriStateBufferRepr> {

    public constructor(editor: LogicEditor, saved?: TriStateBufferRepr) {
        super(editor, TriStateBufferDef, saved)
    }

    public toJSON() {
        return {
            type: "TRI" as const,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods(
            div(S.Components.TriStateBuffer.tooltip) // TODO
        ))
    }

    protected doRecalcValue(): LogicValue {
        const en = this.inputs.E.value
        if (isUnknown(en) || isHighImpedance(en)) {
            return Unknown
        }
        if (!en) {
            return HighImpedance
        }
        const i = this.inputs.In.value
        if (isHighImpedance(i)) {
            return Unknown
        }
        return i
    }

    protected override propagateValue(newValue: LogicValue) {
        this.outputs.Out.value = newValue
    }

    protected override doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        // const right = left + width
        const top = this.posY - height / 2
        const bottom = top + height

        if (ctx.isMouseOver) {
            const frameWidth = 2
            const frameMargin = 2
            g.lineWidth = frameWidth
            g.strokeStyle = COLOR_MOUSE_OVER
            g.beginPath()
            g.rect(
                left - frameWidth - frameMargin,
                top - frameWidth - frameMargin,
                width + 2 * (frameWidth + frameMargin),
                height + 2 * (frameWidth + frameMargin)
            )
            g.stroke()
        }

        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = COLOR_COMPONENT_BORDER
        g.lineWidth = 3

        const gateWidth = (2 * Math.max(2, this.inputs._all.length)) * GRID_STEP
        const gateLeft = this.posX - gateWidth / 2
        const gateRight = this.posX + gateWidth / 2

        g.beginPath()
        g.moveTo(gateLeft, top)
        g.lineTo(gateRight, this.posY)
        g.lineTo(gateLeft, bottom)
        g.closePath()
        g.stroke()

        drawWireLineToComponent(g, this.inputs.In, gateLeft - 1, this.inputs.In.posYInParentTransform)
        drawWireLineToComponent(g, this.inputs.E, this.inputs.E.posXInParentTransform, this.posY - height / 4 - 1)
        drawWireLineToComponent(g, this.outputs.Out, gateRight + 1, this.posY)
    }

}
TriStateBufferDef.impl = TriStateBuffer
