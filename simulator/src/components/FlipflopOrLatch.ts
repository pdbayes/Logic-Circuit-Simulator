import { FixedArraySize, FixedArraySizeNonZero, isNotNull, isNull, Plus3, toTriState, toTriStateRepr, TriState, TriStateRepr, typeOrUndefined, Unset } from "../utils"
import { ComponentBase, ComponentRepr, defineComponent, NodeOffsets } from "./Component"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import * as t from "io-ts"
import { circle, colorForBoolean, COLOR_BACKGROUND, COLOR_BACKGROUND_INVALID, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, drawRoundValue, drawWireLineToComponent, GRID_STEP, strokeSingleLine } from "../drawutils"
import { NodeIn } from "./Node"

const GRID_WIDTH = 5
const GRID_HEIGHT = 7

export function defineFlipflopOrLatch<NumInputs extends FixedArraySize, N extends string, P extends t.Props>(numInputs: NumInputs, jsonName: N, className: string, props: P) {
    return defineComponent(numInputs, 2, t.type({
        type: t.literal(jsonName),
        state: typeOrUndefined(TriStateRepr),
        showContent: typeOrUndefined(t.boolean),
        ...props,
    }, className))
}

export type FlipflopOrLatchRepr<NumInputs extends FixedArraySize> =
    ComponentRepr<NumInputs, 2> & {
        state: TriStateRepr | undefined
        showContent: boolean | undefined
    }

const FlipflorOrLatchDefaults = {
    showContent: false,
}

export const enum OUTPUT {
    Q, Qb
}

export abstract class FlipflopOrLatch<
    NumInputs extends FixedArraySize,
    Repr extends FlipflopOrLatchRepr<NumInputs>,
    > extends ComponentBase<NumInputs, 2, Repr, [TriState, TriState]> {

    private static savedStateFrom(savedData: { state: TriStateRepr | undefined } | null): [TriState, TriState] {
        if (isNull(savedData)) {
            return [false, true]
        }
        const state = toTriState(savedData.state ?? 0)
        return [state, TriState.invert(state)]
    }

    protected _showContent: boolean = FlipflorOrLatchDefaults.showContent
    protected _isInInvalidState = false

    protected constructor(savedData: Repr | null, nodeInOffsets: NodeOffsets<NumInputs, 0>) {
        super(FlipflopOrLatch.savedStateFrom(savedData), savedData, {
            inOffsets: (nodeInOffsets as any).inOffsets,
            outOffsets: [[+4, -2, "e"], [+4, 2, "e"]],
        })
        if (isNotNull(savedData)) {
            this._showContent = savedData.showContent ?? FlipflorOrLatchDefaults.showContent
        }
    }

    override toJSONBase() {
        return {
            ...super.toJSONBase(),
            state: toTriStateRepr(this.value[0]),
            showContent: (this._showContent !== FlipflorOrLatchDefaults.showContent) ? this._showContent : undefined,
        }
    }

    public get componentType() {
        return "ic" as const
    }

    override getOutputName(i: number): string | undefined {
        switch (i) {
            case OUTPUT.Q: return "Q (sortie)"
            case OUTPUT.Qb: return "Q' (sortie inversée)"
        }
        return undefined
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    protected override propagateNewValue(newValue: [TriState, TriState]) {
        this.outputs[OUTPUT.Q].value = newValue[OUTPUT.Q]
        this.outputs[OUTPUT.Qb].value = newValue[OUTPUT.Qb]
    }

    protected doSetShowContent(showContent: boolean) {
        this._showContent = showContent
        this.setNeedsRedraw("show content changed")
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        const right = this.posX + width / 2

        g.fillStyle = this._isInInvalidState ? COLOR_BACKGROUND_INVALID : COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3

        g.beginPath()
        g.rect(left, this.posY - height / 2, width, height)
        g.fill()
        g.stroke()
        g.fillStyle = COLOR_BACKGROUND

        drawWireLineToComponent(g, this.outputs[OUTPUT.Q], right + 2, this.outputs[OUTPUT.Q].posYInParentTransform, false)
        drawWireLineToComponent(g, this.outputs[OUTPUT.Qb], right + 2, this.outputs[OUTPUT.Qb].posYInParentTransform, false)

        this.doDrawLatchOrFlipflop(g, ctx, width, height, left, right)

        ctx.inNonTransformedFrame(ctx => {
            if (this._showContent) {
                FlipflopOrLatch.drawStoredValue(g, this.value[OUTPUT.Q], this.posX, this.posY, 26)
            }

            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.textAlign = "center"
            g.font = "12px sans-serif"

            g.fillText("Q", ...ctx.rotatePoint(right - 8, this.outputs[OUTPUT.Q].posYInParentTransform))
            const [qbarCenterX, qbarCenterY] = ctx.rotatePoint(right - 8, this.outputs[OUTPUT.Qb].posYInParentTransform)
            g.fillText("Q", qbarCenterX, qbarCenterY)
            const barY = qbarCenterY - 8
            g.strokeStyle = g.fillStyle
            strokeSingleLine(g, qbarCenterX - 4, barY, qbarCenterX + 3, barY)
        })

    }

    protected abstract doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, right: number): void

    public static drawStoredValue(g: CanvasRenderingContext2D, value: TriState, x: number, y: number, cellHeight: number) {
        const centerLabelWidth = 20
        g.strokeStyle = COLOR_COMPONENT_BORDER
        g.fillStyle = colorForBoolean(value)
        g.lineWidth = 2
        g.beginPath()
        g.rect(x - centerLabelWidth / 2, y - cellHeight / 2, centerLabelWidth, cellHeight)
        g.fill()
        g.stroke()
        drawRoundValue(g, value, x, y)
    }

}


// Flip-flop base class

export const EdgeTrigger = {
    rising: "rising",
    falling: "falling",
} as const
export type EdgeTrigger = keyof typeof EdgeTrigger

export function defineFlipflop<NumInputs extends FixedArraySize, N extends string, P extends t.Props>(numExtraInputs: NumInputs, jsonName: N, className: string, props: P) {
    return defineFlipflopOrLatch(3 + numExtraInputs as Plus3<NumInputs>, jsonName, className, {
        trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
        ...props,
    })
}

export type FlipflopRepr<NumInputs extends FixedArraySize> =
    FlipflopOrLatchRepr<NumInputs> & {
        trigger: keyof typeof EdgeTrigger | undefined
    }

const FlipflopDefaults = {
    trigger: EdgeTrigger.rising,
}

const enum INPUT {
    Clock,
    Preset,
    Clear,
}

interface SyncComponent<State> {
    trigger: EdgeTrigger
    value: State
    makeInvalidState(): State
    makeStateFromMainValue(val: TriState): State
    makeStateAfterClock(): State
}

export abstract class Flipflop<
    NumInputs extends FixedArraySizeNonZero,
    Repr extends FlipflopRepr<Plus3<NumInputs>>,
    > extends FlipflopOrLatch<Plus3<NumInputs>, Repr> implements SyncComponent<[TriState, TriState]> {

    protected _lastClock: TriState = Unset
    protected _trigger: EdgeTrigger = FlipflopDefaults.trigger

    protected constructor(savedData: Repr | null, nodeInOffsets: NodeOffsets<NumInputs, 0> & { clockYOffset: number }) {
        super(savedData, {
            inOffsets: [
                [-4, nodeInOffsets.clockYOffset, "w"], // Clock
                [0, -4, "n"], // Preset
                [0, +4, "s"], // Clear
                ...nodeInOffsets.inOffsets, // subclass
            ] as any,
        })
        if (isNotNull(savedData)) {
            this._trigger = savedData.trigger ?? FlipflopDefaults.trigger
        }
        this.setInputsPreferSpike(INPUT.Clock, INPUT.Preset, INPUT.Clear)
    }

    override toJSONBase() {
        return {
            ...super.toJSONBase(),
            trigger: (this._trigger !== FlipflopDefaults.trigger) ? this._trigger : undefined,
        }
    }

    get trigger() {
        return this._trigger
    }

    override getInputName(i: number): string | undefined {
        switch (i) {
            case INPUT.Clock: return "Clock (horloge)"
            case INPUT.Preset: return "P (Preset, mise à 1)"
            case INPUT.Clear: return "C (Clear, mise à 0)"
        }
        return undefined
    }


    public static doRecalcValueForSyncComponent<State>(comp: SyncComponent<State>, prevClock: TriState, clock: TriState, preset: TriState, clear: TriState): { isInInvalidState: boolean, newState: State } {
        // handle set and reset signals
        if (preset === true) {
            if (clear === true) {
                return { isInInvalidState: true, newState: comp.makeInvalidState() }
            } else {
                // preset is true, clear is false, set output to 1
                return { isInInvalidState: false, newState: comp.makeStateFromMainValue(true) }
            }
        }
        if (clear === true) {
            // clear is true, preset is false, set output to 0
            return { isInInvalidState: false, newState: comp.makeStateFromMainValue(false) }
        }

        // handle normal operation
        if (!Flipflop.isClockTrigger(comp.trigger, prevClock, clock)) {
            return { isInInvalidState: false, newState: comp.value }
        } else {
            return { isInInvalidState: false, newState: comp.makeStateAfterClock() }
        }
    }

    public static isClockTrigger(trigger: EdgeTrigger, prevClock: TriState, clock: TriState): boolean {
        return (trigger === EdgeTrigger.rising && prevClock === false && clock === true)
        || (trigger === EdgeTrigger.falling && prevClock === true && clock === false)
    }

    protected doRecalcValue(): [TriState, TriState] {
        const prevClock = this._lastClock
        const clock = this._lastClock = this.inputs[INPUT.Clock].value
        const { isInInvalidState, newState } =
            Flipflop.doRecalcValueForSyncComponent(this, prevClock, clock,
                this.inputs[INPUT.Preset].value,
                this.inputs[INPUT.Clear].value)
        this._isInInvalidState = isInInvalidState
        return newState
    }

    makeInvalidState(): [TriState, TriState] {
        return [false, false]
    }

    makeStateFromMainValue(val: TriState): [TriState, TriState] {
        return [val, TriState.invert(val)]
    }

    makeStateAfterClock(): [TriState, TriState] {
        return this.makeStateFromMainValue(this.doRecalcValueAfterClock())
    }

    protected abstract doRecalcValueAfterClock(): TriState

    protected doSetTrigger(trigger: EdgeTrigger) {
        this._trigger = trigger
        this.setNeedsRedraw("trigger changed")
    }

    public static drawClockInput(g: CanvasRenderingContext2D, left: number, clockNode: NodeIn, trigger: EdgeTrigger) {
        const clockY = clockNode.posYInParentTransform
        let clockLineOffset = 2
        g.strokeStyle = COLOR_COMPONENT_BORDER
        g.lineWidth = 2

        if (trigger === EdgeTrigger.falling) {
            clockLineOffset += 7
            g.beginPath()
            circle(g, left - 5, clockY, 6)
            g.fillStyle = COLOR_BACKGROUND
            g.fill()
            g.stroke()
        }
        g.beginPath()
        g.moveTo(left, clockY - 5)
        g.lineTo(left + 10, clockY)
        g.lineTo(left, clockY + 5)
        g.stroke()

        drawWireLineToComponent(g, clockNode, left - clockLineOffset, clockY, false)
    }

    protected override doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, __right: number) {

        const top = this.posY - height / 2
        const bottom = this.posY + height / 2

        Flipflop.drawClockInput(g, left, this.inputs[INPUT.Clock], this._trigger)

        drawWireLineToComponent(g, this.inputs[INPUT.Preset], this.inputs[INPUT.Preset].posXInParentTransform, top - 2, false)
        drawWireLineToComponent(g, this.inputs[INPUT.Clear], this.inputs[INPUT.Clear].posXInParentTransform, bottom + 2, false)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.textAlign = "center"
            g.font = "12px sans-serif"

            g.fillText("P", ...ctx.rotatePoint(this.inputs[INPUT.Preset].posXInParentTransform, top + 8))
            g.fillText("C", ...ctx.rotatePoint(this.inputs[INPUT.Clear].posXInParentTransform, bottom - 8))
        })
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const makeTriggerItem = (trigger: EdgeTrigger, desc: string) => {
            const isCurrent = this._trigger === trigger
            const icon = isCurrent ? "check" : "none"
            const caption = "Stocker au " + desc
            const action = isCurrent ? () => undefined :
                () => this.doSetTrigger(trigger)
            return ContextMenuData.item(icon, caption, action)
        }

        const icon = this._showContent ? "check" : "none"
        const toggleShowOpItem = ContextMenuData.item(icon, "Montrer le contenu",
            () => this.doSetShowContent(!this._showContent))

        return [
            ["mid", makeTriggerItem(EdgeTrigger.rising, "flanc montant")],
            ["mid", makeTriggerItem(EdgeTrigger.falling, "flanc descendant")],
            ["mid", ContextMenuData.sep()],
            ["mid", toggleShowOpItem],
            ["mid", this.makeForceOutputsContextMenuItem()!],
        ]
    }

}
