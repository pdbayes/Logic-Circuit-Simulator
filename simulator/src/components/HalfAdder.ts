import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, drawLabel, drawWireLineToComponent, GRID_STEP } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { isHighImpedance, isUndefined, isUnknown, LogicValue, Unknown } from "../utils"
import { ComponentBase, defineComponent, Repr } from "./Component"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"


export const HalfAdderDef =
    defineComponent("halfadder", {
        valueDefaults: {},
        makeNodes: () => {
            const s = S.Components.Generic
            return {
                ins: {
                    A: [-4, -2, "w"],
                    B: [-4, 2, "w"],
                },
                outs: {
                    S: [4, -2, "e", () => s.OutputSumDesc],
                    C: [4, 2, "e", () => s.OutputCarryDesc],
                },
            }
        },
        initialValue: () => ({ s: false as LogicValue, c: false as LogicValue }),
    })

type HalfAdderRepr = Repr<typeof HalfAdderDef>

export class HalfAdder extends ComponentBase<HalfAdderRepr> {

    public constructor(editor: LogicEditor, savedData: HalfAdderRepr | null) {
        super(editor, HalfAdderDef, savedData)
    }

    public toJSON() {
        return {
            type: "halfadder" as const,
            ...this.toJSONBase(),
        }
    }

    public get componentType() {
        return "ic" as const
    }

    public get unrotatedWidth() {
        return 4 * GRID_STEP
    }

    public get unrotatedHeight() {
        return 6 * GRID_STEP
    }

    public override makeTooltip() {
        const s = S.Components.HalfAdder.tooltip
        return tooltipContent(s.title, mods(
            div(s.desc)
        ))
    }

    protected doRecalcValue() {
        const a = this.inputs.A.value
        const b = this.inputs.B.value

        if (isUnknown(a) || isUnknown(b) || isHighImpedance(a) || isHighImpedance(b)) {
            return { s: Unknown, c: Unknown }
        }

        const sum = (+a) + (+b)
        switch (sum) {
            case 0: return { s: false, c: false }
            case 1: return { s: true, c: false }
            case 2: return { s: false, c: true }
            default:
                console.log("ERROR: sum of halfadder is > 2")
                return { s: false, c: false }
        }
    }

    protected override propagateValue(newValue: { s: LogicValue, c: LogicValue }) {
        this.outputs.S.value = newValue.s
        this.outputs.C.value = newValue.c
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight

        const left = this.posX - width / 2
        const right = left + width

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

        drawWireLineToComponent(g, this.inputs.A, left - 2, this.inputs.A.posYInParentTransform, true)
        drawWireLineToComponent(g, this.inputs.B, left - 2, this.inputs.B.posYInParentTransform, true)

        drawWireLineToComponent(g, this.outputs.S, right + 2, this.outputs.S.posYInParentTransform, true)
        drawWireLineToComponent(g, this.outputs.C, right + 2, this.outputs.C.posYInParentTransform, true)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "11px sans-serif"

            drawLabel(ctx, this.orient, "A", "w", left, this.inputs.A)
            drawLabel(ctx, this.orient, "B", "w", left, this.inputs.B)

            drawLabel(ctx, this.orient, "S", "e", right, this.outputs.S)
            drawLabel(ctx, this.orient, "C", "e", right, this.outputs.C)

            g.fillStyle = COLOR_COMPONENT_BORDER
            g.font = "26px sans-serif"
            g.textAlign = "center"
            g.textBaseline = "middle"
            g.fillText("+", this.posX, this.posY - 2)
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
