import * as t from "io-ts"
import { colorForBoolean, COLOR_BACKGROUND, COLOR_BACKGROUND_INVALID, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, drawLabel, drawValueText, drawWireLineToComponent, GRID_STEP } from "../drawutils"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { isDefined, isNotNull, isNull, isUndefined, LogicValue, LogicValueRepr, toLogicValue, toLogicValueRepr, typeOrUndefined, Unknown } from "../utils"
import { ComponentBase, ComponentDef, defineAbstractComponent, InOutRecs, NodesIn, NodesOut, Repr } from "./Component"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"
import { NodeIn } from "./Node"


export const FlipflopOrLatchDef =
    defineAbstractComponent({
        repr: {
            state: typeOrUndefined(LogicValueRepr),
            showContent: typeOrUndefined(t.boolean),
        },
        valueDefaults: {
            state: false,
            showContent: true,
        },
        makeNodes: () => {
            const s = S.Components.Generic
            return {
                outs: {
                    Q: [+4, -2, "e", s.OutputQDesc],
                    Qb: [+4, 2, "e", s.OutputQBarDesc],
                },
            }
        },
        initialValue: (savedData, defaults): [LogicValue, LogicValue] => {
            if (isNull(savedData)) {
                return [false, true]
            }
            const state = isUndefined(savedData.state) ? defaults.state : toLogicValue(savedData.state)
            return [state, LogicValue.invert(state)]
        },
    })

export type FlipflopOrLatchRepr = Repr<typeof FlipflopOrLatchDef>

export abstract class FlipflopOrLatch<TRepr extends FlipflopOrLatchRepr> extends ComponentBase<
    TRepr,
    [LogicValue, LogicValue],
    NodesIn<TRepr>,
    NodesOut<TRepr>,
    true, true
> {

    protected _showContent: boolean = FlipflopOrLatchDef.aults.showContent
    protected _isInInvalidState = false

    protected constructor(editor: LogicEditor, SubclassDef: ComponentDef<t.Mixed, InOutRecs, [LogicValue, LogicValue], any> /* TODO */, savedData: TRepr | null) {
        super(editor, SubclassDef, savedData)
        if (isNotNull(savedData)) {
            this._showContent = savedData.showContent ?? FlipflopOrLatchDef.aults.showContent
        }
    }

    protected override toJSONBase() {
        const state = this.value[0]
        return {
            ...super.toJSONBase(),
            state: state !== FlipflopOrLatchDef.aults.state ? toLogicValueRepr(state) : undefined,
            showContent: (this._showContent !== FlipflopOrLatchDef.aults.showContent) ? this._showContent : undefined,
        }
    }

    public get componentType() {
        return "ic" as const
    }

    public get unrotatedWidth() {
        return 5 * GRID_STEP
    }

    public get unrotatedHeight() {
        return 7 * GRID_STEP
    }

    protected override propagateValue(newValue: [LogicValue, LogicValue]) {
        this.outputs.Q.value = newValue[0]
        this.outputs.Qb.value = newValue[1]
    }

    protected doSetShowContent(showContent: boolean) {
        this._showContent = showContent
        this.setNeedsRedraw("show content changed")
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

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

        drawWireLineToComponent(g, this.outputs.Q, right + 2, this.outputs.Q.posYInParentTransform, false)
        drawWireLineToComponent(g, this.outputs.Qb, right + 2, this.outputs.Qb.posYInParentTransform, false)

        this.doDrawLatchOrFlipflop(g, ctx, width, height, left, right)

        ctx.inNonTransformedFrame(ctx => {
            if (this._showContent && !this.editor.options.hideMemoryContent) {
                FlipflopOrLatch.drawStoredValue(g, this.value[0], this.posX, this.posY, 26, Orientation.isVertical(this.orient))
            }

            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "Q", "e", right, this.outputs.Q)
            drawLabel(ctx, this.orient, "Q̅", "e", right, this.outputs.Qb)

            // TODO bar placement is not great
            // const [qbarCenterX, qbarCenterY] = ctx.rotatePoint(right - 7, this.outputs[OUTPUT.Qb].posYInParentTransform)
            // const barY = qbarCenterY - 8
            // g.strokeStyle = g.fillStyle
            // strokeSingleLine(g, qbarCenterX - 4, barY, qbarCenterX + 3, barY)
        })

    }

    protected abstract doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, right: number): void


    public static drawStoredValueFrame(g: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, swapHeightWidth: boolean) {
        if (swapHeightWidth) {
            [width, height] = [height, width]
        }
        g.strokeStyle = COLOR_COMPONENT_BORDER
        g.lineWidth = 2
        g.beginPath()
        g.rect(x - width / 2, y - height / 2, width, height)
        g.fill()
        g.stroke()
    }

    public static drawStoredValue(g: CanvasRenderingContext2D, value: LogicValue, x: number, y: number, cellHeight: number, swapHeightWidth: boolean) {
        g.fillStyle = colorForBoolean(value)
        FlipflopOrLatch.drawStoredValueFrame(g, x, y, 20, cellHeight, swapHeightWidth)
        drawValueText(g, value, x, y, { small: cellHeight < 18 })
    }

}


// Flip-flop base class

export const EdgeTrigger = {
    rising: "rising",
    falling: "falling",
} as const

export type EdgeTrigger = keyof typeof EdgeTrigger


export const FlipflopBaseDef =
    defineAbstractComponent({
        repr: {
            ...FlipflopOrLatchDef.repr,
            trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
        },
        valueDefaults: {
            ...FlipflopOrLatchDef.valueDefaults,
            trigger: EdgeTrigger.rising,
        },
        makeNodes: (clockYOffset: number) => {
            const base = FlipflopOrLatchDef.makeNodes()
            const s = S.Components.Generic
            return {
                ins: {
                    Clock: [-4, clockYOffset, "w", s.InputClockDesc, true],
                    Preset: [0, -4, "n", s.InputPresetDesc, true],
                    Clear: [0, +4, "s", s.InputClearDesc, true],
                },
                outs: base.outs,
            }
        },
        initialValue: FlipflopOrLatchDef.initialValue,
    })

export type FlipflopBaseRepr = Repr<typeof FlipflopBaseDef>

export interface SyncComponent<State> {
    trigger: EdgeTrigger
    value: State
    makeInvalidState(): State
    makeStateFromMainValue(val: LogicValue): State
    makeStateAfterClock(): State
}


export abstract class Flipflop<
    TRepr extends FlipflopBaseRepr,
> extends FlipflopOrLatch<TRepr> implements SyncComponent<[LogicValue, LogicValue]> {

    protected _lastClock: LogicValue = Unknown
    protected _trigger: EdgeTrigger = FlipflopBaseDef.aults.trigger

    protected constructor(editor: LogicEditor, SubclassDef: ComponentDef<t.Mixed, InOutRecs, [LogicValue, LogicValue], any> /* TODO */, savedData: TRepr | null) {
        super(editor, SubclassDef, savedData)
        if (isNotNull(savedData)) {
            this._trigger = savedData.trigger ?? FlipflopBaseDef.aults.trigger
        }
    }

    protected override toJSONBase() {
        return {
            ...super.toJSONBase(),
            trigger: (this._trigger !== FlipflopBaseDef.aults.trigger) ? this._trigger : undefined,
        }
    }

    public get trigger() {
        return this._trigger
    }

    public static doRecalcValueForSyncComponent<State>(comp: SyncComponent<State>, prevClock: LogicValue, clock: LogicValue, preset: LogicValue, clear: LogicValue): { isInInvalidState: boolean, newState: State } {
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

    public static isClockTrigger(trigger: EdgeTrigger, prevClock: LogicValue, clock: LogicValue): boolean {
        return (trigger === EdgeTrigger.rising && prevClock === false && clock === true)
            || (trigger === EdgeTrigger.falling && prevClock === true && clock === false)
    }

    protected doRecalcValue(): [LogicValue, LogicValue] {
        const prevClock = this._lastClock
        const clock = this._lastClock = this.inputs.Clock.value
        const { isInInvalidState, newState } =
            Flipflop.doRecalcValueForSyncComponent(this, prevClock, clock,
                this.inputs.Preset.value,
                this.inputs.Clear.value)
        this._isInInvalidState = isInInvalidState
        return newState
    }

    public makeInvalidState(): [LogicValue, LogicValue] {
        return [false, false]
    }

    public makeStateFromMainValue(val: LogicValue): [LogicValue, LogicValue] {
        return [val, LogicValue.invert(val)]
    }

    public makeStateAfterClock(): [LogicValue, LogicValue] {
        return this.makeStateFromMainValue(this.doRecalcValueAfterClock())
    }

    protected abstract doRecalcValueAfterClock(): LogicValue

    protected doSetTrigger(trigger: EdgeTrigger) {
        this._trigger = trigger
        this.setNeedsRedraw("trigger changed")
    }

    public static drawClockInput(g: CanvasRenderingContext2D, left: number, clockNode: NodeIn, trigger: EdgeTrigger) {
        const clockY = clockNode.posYInParentTransform
        const clockLineOffset = 1
        g.strokeStyle = COLOR_COMPONENT_BORDER
        g.lineWidth = 2

        // if (trigger === EdgeTrigger.falling) {
        //     clockLineOffset += 7
        //     g.beginPath()
        //     circle(g, left - 5, clockY, 6)
        //     g.fillStyle = COLOR_BACKGROUND
        //     g.fill()
        //     g.stroke()
        // }
        g.beginPath()
        g.moveTo(left + 1, clockY - 4)
        g.lineTo(left + 9, clockY)
        g.lineTo(left + 1, clockY + 4)
        g.stroke()
        if (trigger === EdgeTrigger.falling) {
            g.fillStyle = COLOR_COMPONENT_BORDER
            g.closePath()
            g.fill()
        }

        drawWireLineToComponent(g, clockNode, left - clockLineOffset, clockY, false)
    }

    protected override doDrawLatchOrFlipflop(g: CanvasRenderingContext2D, ctx: DrawContext, width: number, height: number, left: number, __right: number) {

        const top = this.posY - height / 2
        const bottom = this.posY + height / 2

        Flipflop.drawClockInput(g, left, this.inputs.Clock, this._trigger)

        drawWireLineToComponent(g, this.inputs.Preset, this.inputs.Preset.posXInParentTransform, top - 2, false)
        drawWireLineToComponent(g, this.inputs.Clear, this.inputs.Clear.posXInParentTransform, bottom + 2, false)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "11px sans-serif"

            drawLabel(ctx, this.orient, "Pre", "n", this.inputs.Preset, top)
            drawLabel(ctx, this.orient, "Clr", "s", this.inputs.Clear, bottom)
        })
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const icon = this._showContent ? "check" : "none"
        const toggleShowOpItem = ContextMenuData.item(icon, S.Components.Generic.contextMenu.ShowContent,
            () => this.doSetShowContent(!this._showContent))

        const items: [ContextMenuItemPlacement, ContextMenuItem][] = [
            ...makeTriggerItems(this._trigger, this.doSetTrigger.bind(this)),
            ["mid", ContextMenuData.sep()],
            ["mid", toggleShowOpItem],
        ]

        const forceOutputItem = this.makeForceOutputsContextMenuItem()
        if (isDefined(forceOutputItem)) {
            items.push(
                ["mid", forceOutputItem]
            )
        }

        return items
    }

}


export function makeTriggerItems(currentTrigger: EdgeTrigger, handler: (trigger: EdgeTrigger) => void): [ContextMenuItemPlacement, ContextMenuItem][] {
    const s = S.Components.Generic.contextMenu

    const makeTriggerItem = (trigger: EdgeTrigger, desc: string) => {
        const isCurrent = currentTrigger === trigger
        const icon = isCurrent ? "check" : "none"
        const caption = s.TriggerOn + " " + desc
        const action = isCurrent ? () => undefined :
            () => handler(trigger)
        return ContextMenuData.item(icon, caption, action)
    }

    return [
        ["mid", makeTriggerItem(EdgeTrigger.rising, s.TriggerRisingEdge)],
        ["mid", makeTriggerItem(EdgeTrigger.falling, s.TriggerFallingEdge)],
    ]
}
