import { isHighImpedance, isUnknown, LogicValue, Unknown } from "../utils"
import { COLOR_COMPONENT_INNER_LABELS, drawLabel, drawWireLineToComponent } from "../drawutils"
import { DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { defineFlipflop, Flipflop, OUTPUT } from "./FlipflopOrLatch"
import { LogicEditor } from "../LogicEditor"


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

    public constructor(editor: LogicEditor, savedData: FlipflopTRepr | null) {
        super(editor, savedData, {
            ins: [["T (toggle)", -4, -2, "w"]],
            clockYOffset: 2,
        })
    }

    toJSON() {
        return {
            type: "flipflop-t" as const,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        return tooltipContent("Bascule T", mods(
            div(`Stocke un bit.`) // TODO more info
        ))
    }

    protected doRecalcValueAfterClock(): LogicValue {
        const t = this.inputs[INPUT.T].value
        if (isUnknown(t) || isHighImpedance(t)) {
            return Unknown
        }
        const q = this.outputs[OUTPUT.Q].value
        return t ? LogicValue.invert(q) : q
    }

    protected override doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, right: number) {
        super.doDrawLatchOrFlipflop(g, ctx, width, height, left, right)

        drawWireLineToComponent(g, this.inputs[INPUT.T], left - 2, this.inputs[INPUT.T].posYInParentTransform, false)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "T", "w", left, this.inputs[INPUT.T])
        })
    }

}
