import { COLOR_COMPONENT_INNER_LABELS, drawLabel, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { LogicValue } from "../utils"
import { defineComponent, Repr } from "./Component"
import { DrawContext } from "./Drawable"
import { Flipflop, FlipflopBaseDef } from "./FlipflopOrLatch"


export const FlipflopJKDef =
    defineComponent("ic", "flipflop-jk", {
        ...FlipflopBaseDef,
        makeNodes: () => {
            const base = FlipflopBaseDef.makeNodes(0)
            const s = S.Components.FlipflopJK
            return {
                ins: {
                    ...base.ins,
                    J: [-4, -2, "w", s.InputJDesc],
                    K: [-4, 2, "w", s.InputKDesc],
                },
                outs: base.outs,
            }
        },
    })

type FlipflopJKRepr = Repr<typeof FlipflopJKDef>

export class FlipflopJK extends Flipflop<FlipflopJKRepr> {

    public constructor(editor: LogicEditor, savedData: FlipflopJKRepr | null) {
        super(editor, FlipflopJKDef, savedData)
    }

    public toJSON() {
        return {
            type: "flipflop-jk" as const,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        const s = S.Components.FlipflopJK.tooltip
        return tooltipContent(s.title, mods(
            div(s.desc) // TODO more info
        ))
    }

    protected doRecalcValueAfterClock(): LogicValue {
        const j = this.inputs.J.value
        const k = this.inputs.K.value
        const q = this.outputs.Q.value

        if (j === true) {
            if (k === true) {
                return LogicValue.invert(q)
            } else {
                return true
            }
        }
        if (k === true) {
            return false
        } else {
            return q
        }
    }

    protected override doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, right: number) {
        super.doDrawLatchOrFlipflop(g, ctx, width, height, left, right)

        drawWireLineToComponent(g, this.inputs.J, left - 2, this.inputs.J.posYInParentTransform, false)
        drawWireLineToComponent(g, this.inputs.K, left - 2, this.inputs.K.posYInParentTransform, false)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "J", "w", left, this.inputs.J)
            drawLabel(ctx, this.orient, "K", "w", left, this.inputs.K)
        })
    }

}
