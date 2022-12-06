import { isHighImpedance, isUndefined, isUnknown, LogicValue, Unknown } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, GRID_STEP, drawWireLineToComponent, drawLabel } from "../drawutils"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"

const GRID_WIDTH = 7
const GRID_HEIGHT = 5

const enum INPUT {
    A, B, E
}

const enum OUTPUT {
    G, Eq
}

export const ComparatorDef =
    defineComponent(3, 2, t.type({
        type: t.literal("comparator"),
    }, "Compatator"))

export type ComparatorRepr = typeof ComparatorDef.reprType

export class Comparator extends ComponentBase<3, 2, ComparatorRepr, [LogicValue, LogicValue]> {

    public constructor(editor: LogicEditor, savedData: ComparatorRepr | null) {
        super(editor, [false, false], savedData, {
            ins: [
                ["A", -2, -4, "n"],
                ["B", 2, -4, "n"],
                ["E", -5, 0, "w"],
            ],
            outs: [
                ["G", 0, 4, "s"],
                ["Eq", 5, 0, "e"],
            ],
        })
    }

    toJSON() {
        return {
            type: "comparator" as const,
            ...this.toJSONBase(),
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
        return tooltipContent(S.Components.Comparator.caption, mods(
            div(S.Components.Comparator.tooltip),
        ))
    }

    protected doRecalcValue(): [LogicValue, LogicValue] {
        const a = this.inputs[INPUT.A].value
        const b = this.inputs[INPUT.B].value
        const e = this.inputs[INPUT.E].value

        if (isUnknown(a) || isUnknown(b) || isUnknown(e) || isHighImpedance(a) || isHighImpedance(b) || isHighImpedance(e)) {
            return [Unknown, Unknown]
        }

        if ((+e) === 0) {
            return [false, false]
        }

        const g = ((+a) > (+b))
        const eq = ((+a) === (+b))

        return [g, eq]
    }

    protected override propagateValue(newValue: [LogicValue, LogicValue]) {
        this.outputs[OUTPUT.G].value = newValue[OUTPUT.G]
        this.outputs[OUTPUT.Eq].value = newValue[OUTPUT.Eq]
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP

        g.fillStyle = COLOR_BACKGROUND
        g.lineWidth = 3
        if (ctx.isMouseOver) {
            g.strokeStyle = COLOR_MOUSE_OVER
        } else {
            g.strokeStyle = COLOR_COMPONENT_BORDER
        }

        g.beginPath()
        g.rect(this.posX - width / 2, this.posY - height / 2, width, height)
        g.fill()
        g.stroke()

        drawWireLineToComponent(g, this.inputs[INPUT.A], this.inputs[INPUT.A].posXInParentTransform, this.posY - height / 2 - 2, true)
        drawWireLineToComponent(g, this.inputs[INPUT.B], this.inputs[INPUT.B].posXInParentTransform, this.posY - height / 2 - 2, true)
        drawWireLineToComponent(g, this.inputs[INPUT.E], this.posX - width / 2 - 2, this.inputs[INPUT.E].posYInParentTransform, true)


        drawWireLineToComponent(g, this.outputs[OUTPUT.G], this.outputs[OUTPUT.G].posXInParentTransform, this.posY + height / 2 + 2, true)
        drawWireLineToComponent(g, this.outputs[OUTPUT.Eq], this.posX + width / 2 + 2, this.outputs[OUTPUT.Eq].posYInParentTransform, true)


        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.textAlign = "center"
            g.font = "11px sans-serif"

            const top = this.posY - height / 2
            const bottom = this.posY + height / 2
            const right = this.posX + width / 2
            const left = this.posX - width / 2

            drawLabel(ctx, this.orient, "A", "n", this.inputs[INPUT.A], top)
            drawLabel(ctx, this.orient, "B", "n", this.inputs[INPUT.B], top)
            drawLabel(ctx, this.orient, "E", "w", left, this.inputs[INPUT.E])

            drawLabel(ctx, this.orient, ">", "s", this.outputs[OUTPUT.G], bottom)
            drawLabel(ctx, this.orient, "=", "e", right, this.outputs[OUTPUT.Eq])

            g.fillStyle = COLOR_COMPONENT_BORDER
            g.font = "bold 11px sans-serif"
            g.textAlign = "center"
            g.textBaseline = "middle"
            g.fillText("CMP", this.posX, this.posY)
        })
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        const forceOutputItem = this.makeForceOutputsContextMenuItem()
        if (isUndefined(forceOutputItem)) {
            return []
        }
        return [
            ["mid", forceOutputItem],
        ]
    }


}
