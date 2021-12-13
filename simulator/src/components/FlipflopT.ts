import { isDefined, isUnset, TriState, Unset } from "../utils"
import { COLOR_COMPONENT_INNER_LABELS, drawWireLineToComponent } from "../drawutils"
import { DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { defineFlipflop, Flipflop, OUTPUT } from "./FlipflopOrLatch"


const enum INPUT {
    Clock,
    Preset,
    Clear,
    T,
}

export const FlipflopTDef =
    defineFlipflop(1, "flipflop-t", "FlipflopT", {})

export type FlipflopTRepr = typeof FlipflopTDef.reprType

export class FlipflopT extends Flipflop<1, FlipflopTRepr> {

    public constructor(savedData: FlipflopTRepr | null) {
        super(savedData, {
            inOffsets: [[-4, -2, "w"]],
            clockYOffset: 2,
        })
    }

    toJSON() {
        return {
            type: "flipflop-t" as const,
            ...this.toJSONBase(),
        }
    }

    override getInputName(i: number): string | undefined {
        const superName = super.getInputName(i)
        if (isDefined(superName)) {
            return superName
        }
        switch (i) {
            case INPUT.T: return "T (toggle)"
        }
        return undefined
    }

    public override makeTooltip() {
        return tooltipContent("Bascule T", mods(
            div(`Stocke un bit.`) // TODO more info
        ))
    }

    protected doRecalcValueAfterClock(): TriState {
        const t = this.inputs[INPUT.T].value
        if (isUnset(t)) {
            return Unset
        }
        const q = this.outputs[OUTPUT.Q].value
        return t ? TriState.invert(q) : q
    }

    protected override doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, right: number) {
        super.doDrawLatchOrFlipflop(g, ctx, width, height, left, right)

        drawWireLineToComponent(g, this.inputs[INPUT.T], left - 2, this.inputs[INPUT.T].posYInParentTransform, false)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.textAlign = "center"
            g.font = "12px sans-serif"

            g.fillText("T", ...ctx.rotatePoint(left + 8, this.inputs[INPUT.T].posYInParentTransform))
        })
    }

}
