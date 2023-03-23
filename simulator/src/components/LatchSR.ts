import { COLOR_COMPONENT_BORDER, drawLabel, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { LogicValue } from "../utils"
import { defineComponent, Repr } from "./Component"
import { ContextMenuData, DrawContext, MenuItems } from "./Drawable"
import { FlipflopOrLatch, FlipflopOrLatchDef } from "./FlipflopOrLatch"


export const LatchSRDef =
    defineComponent("ic", "latch-sr", {
        ...FlipflopOrLatchDef,
        makeNodes: () => {
            const base = FlipflopOrLatchDef.makeNodes()
            const s = S.Components.Generic
            return {
                ins: {
                    Set: [-4, -2, "w", s.InputSetDesc, true],
                    Reset: [-4, 2, "w", s.InputResetDesc, true],
                },
                outs: base.outs,
            }
        },
    })

type LatchSRRepr = Repr<typeof LatchSRDef>

export class LatchSR extends FlipflopOrLatch<LatchSRRepr> {

    public constructor(editor: LogicEditor, saved?: LatchSRRepr) {
        super(editor, LatchSRDef, saved)
    }

    public toJSON() {
        return {
            type: "latch-sr" as const,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        const s = S.Components.LatchSR.tooltip
        return tooltipContent(s.title, mods(
            div(s.desc) // TODO more info
        ))
    }

    protected doRecalcValue(): [LogicValue, LogicValue] {
        const s = this.inputs.Set.value
        const r = this.inputs.Reset.value

        // assume this state is valid
        this._isInInvalidState = false

        // handle set and reset signals
        if (s === true) {
            if (r === true) {
                this._isInInvalidState = true
                return [false, false]
            } else {
                // set is true, reset is false, set output to 1
                return [true, false]
            }
        }
        if (r === true) {
            // set is false, reset is true, set output to 0
            return [false, true]
        }

        // no change
        const q = this.outputs.Q.value
        return [q, LogicValue.invert(q)]
    }

    protected doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, __right: number) {

        drawWireLineToComponent(g, this.inputs.Set, left - 2, this.inputs.Set.posYInParentTransform, false)
        drawWireLineToComponent(g, this.inputs.Reset, left - 2, this.inputs.Reset.posYInParentTransform, false)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_BORDER
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "S", "w", left, this.inputs.Set)
            drawLabel(ctx, this.orient, "R", "w", left, this.inputs.Reset)
        })
    }

    protected override makeComponentSpecificContextMenuItems(): MenuItems {
        const icon = this._showContent ? "check" : "none"
        const toggleShowContentItem = ContextMenuData.item(icon, S.Components.Generic.contextMenu.ShowContent, () => {
            this.doSetShowContent(!this._showContent)
        })

        return [
            ["mid", toggleShowContentItem],
            ...this.makeForceOutputsContextMenuItem(true),
        ]
    }

}
LatchSRDef.impl = LatchSR
