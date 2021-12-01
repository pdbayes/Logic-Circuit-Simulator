import { isNotNull, isNull, toTriState, toTriStateRepr, TriState, TriStateRepr, typeOrUndefined } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, GRID_STEP, drawWireLineToComponent, strokeSingleLine, colorForBoolean, drawRoundValue } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"

const GRID_WIDTH = 5
const GRID_HEIGHT = 7

const enum INPUT {
    Set,
    Reset,
}

const enum OUTPUT {
    Q, Qb
}

// TODO merge latches and flipflops!

export const LatchSRDef =
    defineComponent(2, 2, t.type({
        type: t.literal("latch-sr"),
        state: typeOrUndefined(TriStateRepr),
        showContent: typeOrUndefined(t.boolean),
    }, "LatchSR"))

export type LatchSRRepr = typeof LatchSRDef.reprType


const LatchSRDefaults = {
    showContent: false,
}

export class LatchSR extends ComponentBase<2, 2, LatchSRRepr, [TriState, TriState]> {

    private _showContent: boolean = LatchSRDefaults.showContent

    private static savedStateFrom(savedData: LatchSRRepr | null): [TriState, TriState] {
        if (isNull(savedData)) {
            return [false, true]
        }
        const state = toTriState(savedData.state ?? 0)
        return [state, TriState.invert(state)]
    }

    public constructor(savedData: LatchSRRepr | null) {
        super(LatchSR.savedStateFrom(savedData), savedData, {
            inOffsets: [[-4, 2, "w"], [-4, -2, "w"]],
            outOffsets: [[+4, -2, "e"], [+4, 2, "e"]],
        })
        if (isNotNull(savedData)) {
            this._showContent = savedData.showContent ?? LatchSRDefaults.showContent
        }
    }

    toJSON() {
        return {
            type: "latch-sr" as const,
            ...this.toJSONBase(),
            state: toTriStateRepr(this.value[0]),
            showContent: (this._showContent !== LatchSRDefaults.showContent) ? this._showContent : undefined,
        }
    }

    public get componentType() {
        return "IC" as const
    }

    protected override getInputName(i: number): string | undefined {
        switch (i) {
            case INPUT.Set: return "S (Set, mise à 1)"
            case INPUT.Reset: return "S (Reset, mise à 0)"
        }
        return undefined
    }

    protected override getOutputName(i: number): string | undefined {
        switch (i) {
            case OUTPUT.Q: return "Q (sortie)"
            case OUTPUT.Qb: return "Qb (sortie inversée)"
        }
        return undefined
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    public override makeTooltip() {
        return tooltipContent("Verrou SR", mods(
            div(`Stocke un bit.`) // TODO more info
        ))
    }

    protected doRecalcValue(): [TriState, TriState] {
        const s = this.inputs[INPUT.Set].value
        const r = this.inputs[INPUT.Reset].value


        // handle set and reset signals
        if (s === true) {
            if (r === true) {
                // both set and reset are true, flip a coin
                const coin = Math.random() < 0.5
                return [coin, !coin]
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
        return [this.outputs[OUTPUT.Q].value, this.outputs[OUTPUT.Qb].value]
    }

    protected override propagateNewValue(newValue: [TriState, TriState]) {
        this.outputs[OUTPUT.Q].value = newValue[OUTPUT.Q]
        this.outputs[OUTPUT.Qb].value = newValue[OUTPUT.Qb]
    }

    private doSetShowContent(showContent: boolean) {
        this._showContent = showContent
        this.setNeedsRedraw("show content changed")
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP

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

        const left = this.posX - width / 2
        const right = this.posX + width / 2

        drawWireLineToComponent(g, this.inputs[INPUT.Set], left - 2, this.inputs[INPUT.Set].posYInParentTransform, false)
        drawWireLineToComponent(g, this.inputs[INPUT.Reset], left - 2, this.inputs[INPUT.Reset].posYInParentTransform, false)

        drawWireLineToComponent(g, this.outputs[OUTPUT.Q], right + 2, this.outputs[OUTPUT.Q].posYInParentTransform, false)
        drawWireLineToComponent(g, this.outputs[OUTPUT.Qb], right + 2, this.outputs[OUTPUT.Qb].posYInParentTransform, false)

        ctx.inNonTransformedFrame(ctx => {

            if (this._showContent) {
                const centerLabelWidth = 20
                const centerLabelHeight = 26
                g.strokeStyle = COLOR_COMPONENT_BORDER
                g.fillStyle = colorForBoolean(this.value[OUTPUT.Q])
                g.lineWidth = 2
                g.beginPath()
                g.rect(this.posX - centerLabelWidth / 2, this.posY - centerLabelHeight / 2, centerLabelWidth, centerLabelHeight)
                g.fill()
                g.stroke()
                drawRoundValue(g, this.value[OUTPUT.Q], this)
            }

            g.fillStyle = COLOR_COMPONENT_BORDER
            g.textAlign = "center"
            g.font = "12px sans-serif"

            g.fillText("S", ...ctx.rotatePoint(left + 8, this.inputs[INPUT.Set].posYInParentTransform))
            g.fillText("R", ...ctx.rotatePoint(left + 8, this.inputs[INPUT.Reset].posYInParentTransform))

            g.fillText("Q", ...ctx.rotatePoint(right - 8, this.outputs[OUTPUT.Q].posYInParentTransform))
            const [qbarCenterX, qbarCenterY] = ctx.rotatePoint(right - 8, this.outputs[OUTPUT.Qb].posYInParentTransform)
            g.fillText("Q", qbarCenterX, qbarCenterY)
            const barY = qbarCenterY - 8
            g.strokeStyle = g.fillStyle
            strokeSingleLine(g, qbarCenterX - 4, barY, qbarCenterX + 3, barY)
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
