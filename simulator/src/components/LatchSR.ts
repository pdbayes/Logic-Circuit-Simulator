import { LogicValue } from "../utils"
import { COLOR_COMPONENT_BORDER, drawLabel, drawWireLineToComponent } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { defineFlipflopOrLatch, FlipflopOrLatch, OUTPUT } from "./FlipflopOrLatch"
import { LogicEditor } from "../LogicEditor"

const enum INPUT {
    Set,
    Reset,
}

export const LatchSRDef =
    defineFlipflopOrLatch(2, "latch-sr", "LatchSR", {})

export type LatchSRRepr = typeof LatchSRDef.reprType

export class LatchSR extends FlipflopOrLatch<2, LatchSRRepr> {

    public constructor(editor: LogicEditor, savedData: LatchSRRepr | null) {
        super(editor, savedData, {
            inOffsets: [[-4, 2, "w"], [-4, -2, "w"]],
        })
        this.setInputsPreferSpike(INPUT.Set, INPUT.Reset)
    }

    toJSON() {
        return {
            type: "latch-sr" as const,
            ...this.toJSONBase(),
        }
    }

    override getInputName(i: number): string | undefined {
        switch (i) {
            case INPUT.Set: return "S (Set, mise à 1)"
            case INPUT.Reset: return "R (Reset, mise à 0)"
        }
        return undefined
    }


    public override makeTooltip() {
        return tooltipContent("Verrou SR", mods(
            div(`Stocke un bit.`) // TODO more info
        ))
    }

    protected doRecalcValue(): [LogicValue, LogicValue] {
        const s = this.inputs[INPUT.Set].value
        const r = this.inputs[INPUT.Reset].value

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
        const q = this.outputs[OUTPUT.Q].value
        return [q, LogicValue.invert(q)]
    }

    doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, __right: number) {

        drawWireLineToComponent(g, this.inputs[INPUT.Set], left - 2, this.inputs[INPUT.Set].posYInParentTransform, false)
        drawWireLineToComponent(g, this.inputs[INPUT.Reset], left - 2, this.inputs[INPUT.Reset].posYInParentTransform, false)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_BORDER
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "S", "w", left, this.inputs[INPUT.Set])
            drawLabel(ctx, this.orient, "R", "w", left, this.inputs[INPUT.Reset])
        })
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        const icon = this._showContent ? "check" : "none"
        const toggleShowOpItem = ContextMenuData.item(icon, "Montrer le contenu", () => {
            this.doSetShowContent(!this._showContent)
        })

        return [
            ["mid", toggleShowOpItem],
            ["mid", this.makeForceOutputsContextMenuItem()!],
        ]
    }

}
