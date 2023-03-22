import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, drawLabel, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { isHighImpedance, isUndefined, isUnknown, LogicValue, Unknown } from "../utils"
import { ComponentBase, defineComponent, Repr } from "./Component"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"

export const ComparatorDef =
    defineComponent("ic", "comparator", {
        button: { imgWidth: 50 },
        valueDefaults: {},
        size: { gridWidth: 5, gridHeight: 7 },
        makeNodes: () => ({
            ins: {
                A: [-4, 2, "w"],
                B: [-4, -2, "w"],
                E: [0, 5, "s"],
            },
            outs: {
                G: [4, 0, "e"],
                Eq: [0, -5, "n"],
            },
        }),
        initialValue: () => ({
            g: false as LogicValue,
            eq: false as LogicValue,
        }),
    })

type ComparatorRepr = Repr<typeof ComparatorDef>

export class Comparator extends ComponentBase<ComparatorRepr> {

    public constructor(editor: LogicEditor, saved?: ComparatorRepr) {
        super(editor, ComparatorDef, saved)
    }

    public toJSON() {
        return {
            type: "comparator" as const,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        const s = S.Components.Comparator.tooltip
        return tooltipContent(s.title, mods(
            div(s.desc),
        ))
    }

    protected doRecalcValue() {
        const a = this.inputs.A.value
        const b = this.inputs.B.value
        const e = this.inputs.E.value

        if (isUnknown(a) || isUnknown(b) || isUnknown(e) || isHighImpedance(a) || isHighImpedance(b) || isHighImpedance(e)) {
            return { g: Unknown, eq: Unknown }
        }

        if ((+e) === 0) {
            return { g: false, eq: false }
        }

        const g = ((+a) > (+b))
        const eq = ((+a) === (+b))

        return { g, eq }
    }

    protected override propagateValue(newValue: { g: LogicValue, eq: LogicValue }) {
        this.outputs.G.value = newValue.g
        this.outputs.Eq.value = newValue.eq
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight

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

        drawWireLineToComponent(g, this.inputs.A, this.posX - width / 2 - 2, this.inputs.A.posYInParentTransform, true)
        drawWireLineToComponent(g, this.inputs.B, this.posX - width / 2 - 2, this.inputs.B.posYInParentTransform, true)
        drawWireLineToComponent(g, this.inputs.E, this.inputs.E.posXInParentTransform, this.posY + height / 2 + 6, true)


        drawWireLineToComponent(g, this.outputs.G, this.posX + width / 2 + 2, this.outputs.G.posYInParentTransform, true)
        drawWireLineToComponent(g, this.outputs.Eq, this.outputs.Eq.posXInParentTransform, this.posY - height / 2 - 2, true)


        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.textAlign = "center"
            g.font = "11px sans-serif"

            const top = this.posY - height / 2
            const bottom = this.posY + height / 2
            const right = this.posX + width / 2
            const left = this.posX - width / 2

            drawLabel(ctx, this.orient, "A", "w", left, this.inputs.A)
            drawLabel(ctx, this.orient, "B", "w", left, this.inputs.B)
            drawLabel(ctx, this.orient, "E", "s", this.inputs.E, bottom)

            drawLabel(ctx, this.orient, ">", "e", right, this.outputs.G)
            drawLabel(ctx, this.orient, "=", "n", this.outputs.Eq, top)

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
ComparatorDef.impl = Comparator
