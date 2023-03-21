import { COLOR_COMPONENT_INNER_LABELS, drawLabel, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { LogicValue } from "../utils"
import { defineComponent, Repr } from "./Component"
import { DrawContext } from "./Drawable"
import { Flipflop, FlipflopBaseDef } from "./FlipflopOrLatch"


export const FlipflopDDef =
    defineComponent("ic", "flipflop-d", {
        ...FlipflopBaseDef,
        makeNodes: () => {
            const base = FlipflopBaseDef.makeNodes(2)
            const s = S.Components.Generic
            return {
                ins: {
                    ...base.ins,
                    D: [-4, -2, "w", s.InputDataDesc],
                },
                outs: base.outs,
            }
        },
    })

type FlipflopDRepr = Repr<typeof FlipflopDDef>

export class FlipflopD extends Flipflop<FlipflopDRepr> {

    public constructor(editor: LogicEditor, savedData: FlipflopDRepr | null) {
        super(editor, FlipflopDDef, savedData)
    }

    public toJSON() {
        return {
            type: "flipflop-d" as const,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        const s = S.Components.FlipflopD.tooltip
        return tooltipContent(s.title, mods(
            div(s.desc) // TODO more info
        ))
    }

    protected doRecalcValueAfterClock(): LogicValue {
        return this.inputs.D.value
    }

    protected override doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, right: number) {
        super.doDrawLatchOrFlipflop(g, ctx, width, height, left, right)

        drawWireLineToComponent(g, this.inputs.D, left - 2, this.inputs.D.posYInParentTransform, false)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "D", "w", left, this.inputs.D)
        })
    }

}
