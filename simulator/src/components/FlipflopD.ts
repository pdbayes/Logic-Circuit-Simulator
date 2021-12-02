import { isNotNull, isNull, isUnset, toTriState, toTriStateRepr, TriState, TriStateRepr, typeOrUndefined, Unset } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, GRID_STEP, drawWireLineToComponent, strokeSingleLine, colorForBoolean, drawRoundValue } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"

const GRID_WIDTH = 5
const GRID_HEIGHT = 7

const enum INPUT {
    D,
    Clock,
    Set,
    Reset,
}

const enum OUTPUT {
    Q, Qb
}

const EdgeTrigger = {
    rising: "rising",
    falling: "falling",
} as const
type EdgeTrigger = keyof typeof EdgeTrigger

export const FlipflopDDef =
    defineComponent(4, 2, t.type({
        type: t.literal("flipflop-d"),
        state: typeOrUndefined(TriStateRepr),
        trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
        showContent: typeOrUndefined(t.boolean),
    }, "FlipflopD"))

export type FlipflopDRepr = typeof FlipflopDDef.reprType


const FlipflopDDefaults = {
    trigger: EdgeTrigger.rising,
    showContent: false,
}

export class FlipflopD extends ComponentBase<4, 2, FlipflopDRepr, [TriState, TriState]> {

    private _lastClock: TriState = Unset
    private _trigger: EdgeTrigger = FlipflopDDefaults.trigger
    private _showContent: boolean = FlipflopDDefaults.showContent

    private static savedStateFrom(savedData: FlipflopDRepr | null): [TriState, TriState] {
        if (isNull(savedData)) {
            return [false, true]
        }
        const state = toTriState(savedData.state ?? 0)
        return [state, TriState.invert(state)]
    }

    public constructor(savedData: FlipflopDRepr | null) {
        super(FlipflopD.savedStateFrom(savedData), savedData, {
            inOffsets: [[-4, -2, "w"], [-4, 2, "w"], [0, -4, "n"], [0, +4, "s"]],
            outOffsets: [[+4, -2, "e"], [+4, 2, "e"]],
        })
        if (isNotNull(savedData)) {
            this._trigger = savedData.trigger ?? FlipflopDDefaults.trigger
            this._showContent = savedData.showContent ?? FlipflopDDefaults.showContent
        }
    }

    toJSON() {
        return {
            type: "flipflop-d" as const,
            ...this.toJSONBase(),
            state: toTriStateRepr(this.value[0]),
            trigger: (this._trigger !== FlipflopDDefaults.trigger) ? this._trigger : undefined,
            showContent: (this._showContent !== FlipflopDDefaults.showContent) ? this._showContent : undefined,
        }
    }

    public get componentType() {
        return "IC" as const
    }

    protected override getInputName(i: number): string | undefined {
        switch (i) {
            case INPUT.D: return "D (donnée)"
            case INPUT.Clock: return "Clock (horloge)"
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
        return tooltipContent("Bascule D", mods(
            div(`Stocke un bit.`) // TODO more info
        ))
    }

    protected doRecalcValue(): [TriState, TriState] {
        const s = this.inputs[INPUT.Set].value
        const r = this.inputs[INPUT.Reset].value
        const clock = this.inputs[INPUT.Clock].value

        const oldClock = this._lastClock
        this._lastClock = clock

        // handle set and reset signals

        if (s === true) {
            if (r === true) {
                // both set and reset are true, set all outputs to 1
                return [true, true]
            } else {
                // set is true, reset is false, set output to 1
                return [true, false]
            }
        }
        if (r === true) {
            // set is false, reset is true, set output to 0
            return [false, true]
        }

        // handle normal operation

        // clock rising/falling edge?
        const triggered =
            (this._trigger === EdgeTrigger.rising && oldClock === false && clock === true)
            || (this._trigger === EdgeTrigger.falling && oldClock === true && clock === false)

        if (triggered) {
            const d = this.inputs[INPUT.D].value
            if (isUnset(d)) {
                return [Unset, Unset]
            } else {
                return [d, !d]
            }
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
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2

        const clockY = this.inputs[INPUT.Clock].posYInParentTransform

        drawWireLineToComponent(g, this.inputs[INPUT.D], left - 2, this.inputs[INPUT.D].posYInParentTransform, false)
        drawWireLineToComponent(g, this.inputs[INPUT.Clock], left - 2, clockY, false)
        drawWireLineToComponent(g, this.inputs[INPUT.Set], this.inputs[INPUT.Set].posXInParentTransform, top - 2, false)
        drawWireLineToComponent(g, this.inputs[INPUT.Reset], this.inputs[INPUT.Reset].posXInParentTransform, bottom + 2, false)

        g.strokeStyle = COLOR_COMPONENT_BORDER
        g.beginPath()
        g.moveTo(left, clockY - 5)
        g.lineTo(left + 10, clockY)
        g.lineTo(left, clockY + 5)
        g.stroke()

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

            g.fillText("D", ...ctx.rotatePoint(left + 8, this.inputs[INPUT.D].posYInParentTransform))
            g.fillText("S", ...ctx.rotatePoint(this.inputs[INPUT.Set].posXInParentTransform, top + 8))
            g.fillText("R", ...ctx.rotatePoint(this.inputs[INPUT.Reset].posXInParentTransform, bottom - 8))


            g.fillText("Q", ...ctx.rotatePoint(right - 8, this.outputs[OUTPUT.Q].posYInParentTransform))
            const [qbarCenterX, qbarCenterY] = ctx.rotatePoint(right - 8, this.outputs[OUTPUT.Qb].posYInParentTransform)
            g.fillText("Q", qbarCenterX, qbarCenterY)
            const barY = qbarCenterY - 8
            g.strokeStyle = g.fillStyle
            strokeSingleLine(g, qbarCenterX - 4, barY, qbarCenterX + 3, barY)
        })
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const makeTriggerItem = (trigger: EdgeTrigger, desc: string) => {
            const isCurrent = this._trigger === trigger
            const icon = isCurrent ? "check" : "none"
            const caption = "Stocker au " + desc
            const action = isCurrent ? () => undefined : () => {
                this._trigger = trigger
            }
            return ContextMenuData.item(icon, caption, action)
        }

        const icon = this._showContent ? "check" : "none"
        const toggleShowOpItem = ContextMenuData.item(icon, "Montrer le contenu", () => {
            this.doSetShowContent(!this._showContent)
        })

        return [
            ["mid", makeTriggerItem(EdgeTrigger.rising, "flanc montant")],
            ["mid", makeTriggerItem(EdgeTrigger.falling, "flanc descendant")],
            ["mid", ContextMenuData.sep()],
            ["mid", toggleShowOpItem],
            ["mid", this.makeForceOutputsContextMenuItem()!],
        ]
    }

}
