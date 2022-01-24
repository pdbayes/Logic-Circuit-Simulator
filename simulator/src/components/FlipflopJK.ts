import { isDefined, TriState } from "../utils"
import { COLOR_COMPONENT_INNER_LABELS, drawLabel, drawWireLineToComponent } from "../drawutils"
import { DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { defineFlipflop, Flipflop, OUTPUT } from "./FlipflopOrLatch"
import { LogicEditor } from "../LogicEditor"

const enum INPUT {
    Clock,
    Preset,
    Clear,
    J,
    K,
}

export const FlipflopJKDef =
    defineFlipflop(2, "flipflop-jk", "FlipflopJK", {})

export type FlipflopJKRepr = typeof FlipflopJKDef.reprType

export class FlipflopJK extends Flipflop<2, FlipflopJKRepr> {

    public constructor(editor: LogicEditor, savedData: FlipflopJKRepr | null) {
        super(editor, savedData, {
            inOffsets: [[-4, -2, "w"], [-4, 2, "w"]],
            clockYOffset: 0,
        })
    }

    toJSON() {
        return {
            type: "flipflop-jk" as const,
            ...this.toJSONBase(),
        }
    }

    override getInputName(i: number): string | undefined {
        const superName = super.getInputName(i)
        if (isDefined(superName)) {
            return superName
        }
        switch (i) {
            case INPUT.J: return "J (Jump, mise à 1)"
            case INPUT.K: return "K (Kill, mise à 0)"
        }
        return undefined
    }

    public override makeTooltip() {
        return tooltipContent("Bascule JK", mods(
            div(`Stocke un bit.`) // TODO more info
        ))
    }

    protected doRecalcValueAfterClock(): TriState {
        const j = this.inputs[INPUT.J].value
        const k = this.inputs[INPUT.K].value
        const q = this.outputs[OUTPUT.Q].value

        if (j === true) {
            if (k === true) {
                return TriState.invert(q)
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

        drawWireLineToComponent(g, this.inputs[INPUT.J], left - 2, this.inputs[INPUT.J].posYInParentTransform, false)
        drawWireLineToComponent(g, this.inputs[INPUT.K], left - 2, this.inputs[INPUT.K].posYInParentTransform, false)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "J", "w", left, this.inputs[INPUT.J])
            drawLabel(ctx, this.orient, "K", "w", left, this.inputs[INPUT.K])
        })
    }

}
