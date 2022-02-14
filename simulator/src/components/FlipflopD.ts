import { isDefined, LogicState } from "../utils"
import { COLOR_COMPONENT_INNER_LABELS, drawLabel, drawWireLineToComponent } from "../drawutils"
import { DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { defineFlipflop, Flipflop } from "./FlipflopOrLatch"
import { LogicEditor } from "../LogicEditor"


const enum INPUT {
    Clock,
    Preset,
    Clear,
    D,
}

export const FlipflopDDef =
    defineFlipflop(1, "flipflop-d", "FlipflopD", {})

export type FlipflopDRepr = typeof FlipflopDDef.reprType

export class FlipflopD extends Flipflop<1, FlipflopDRepr> {

    public constructor(editor: LogicEditor, savedData: FlipflopDRepr | null) {
        super(editor, savedData, {
            inOffsets: [[-4, -2, "w"]],
            clockYOffset: 2,
        })
    }

    toJSON() {
        return {
            type: "flipflop-d" as const,
            ...this.toJSONBase(),
        }
    }

    override getInputName(i: number): string | undefined {
        const superName = super.getInputName(i)
        if (isDefined(superName)) {
            return superName
        }
        switch (i) {
            case INPUT.D: return "D (donnée)"
        }
        return undefined
    }

    public override makeTooltip() {
        return tooltipContent("Bascule D", mods(
            div(`Stocke un bit.`) // TODO more info
        ))
    }

    protected doRecalcValueAfterClock(): LogicState {
        return this.inputs[INPUT.D].value
    }

    protected override doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, right: number) {
        super.doDrawLatchOrFlipflop(g, ctx, width, height, left, right)

        drawWireLineToComponent(g, this.inputs[INPUT.D], left - 2, this.inputs[INPUT.D].posYInParentTransform, false)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "D", "w", left, this.inputs[INPUT.D])
        })
    }

}
