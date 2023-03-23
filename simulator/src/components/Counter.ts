import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_EMPTY, COLOR_LABEL_OFF, COLOR_MOUSE_OVER, displayValuesFromArray, drawLabel, drawWireLineToComponent, formatWithRadix, useCompact } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { ArrayFillWith, isDefined, isUndefined, isUnknown, LogicValue, typeOrNull, typeOrUndefined, Unknown, validate } from "../utils"
import { defineParametrizedComponent, groupVertical, ParametrizedComponentBase, Repr, ResolvedParams } from "./Component"
import { ContextMenuData, DrawContext, MenuItems } from "./Drawable"
import { EdgeTrigger, Flipflop, FlipflopOrLatch, makeTriggerItems } from "./FlipflopOrLatch"


export const CounterDef =
    defineParametrizedComponent("ic", "counter", true, true, {
        variantName: ({ bits }) => `counter-${bits}`,
        button: { imgWidth: 50 },
        repr: {
            bits: typeOrUndefined(t.number),
            count: typeOrUndefined(t.number),
            trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
            displayRadix: typeOrUndefined(typeOrNull(t.number)), // undefined means default, null means no display
        },
        valueDefaults: {
            trigger: EdgeTrigger.rising,
            displayRadix: 10,
        },
        paramDefaults: {
            bits: 4,
        },
        validateParams: ({ bits }, defaults) => {
            const numBits = validate(bits, [2, 3, 4, 7, 8, 16], defaults.bits, "Counter bits")
            const resetValue = Math.pow(2, numBits)
            return { numBits, resetValue }
        },
        size: ({ numBits }) => ({
            gridWidth: numBits <= 6 ? 5 : numBits <= 8 ? 6 : 7,
            gridHeight: Math.max(11, 1 + (numBits + 1) * (useCompact(numBits) ? 1 : 2)),
        }),
        makeNodes: ({ numBits, gridWidth, gridHeight }) => {
            const s = S.Components.Generic
            const outX = 1 + gridWidth / 2
            const groupQ = groupVertical("e", outX, -1, numBits)
            const lastQY = groupQ[numBits - 1][1]
            const qyDiff = lastQY - groupQ[numBits - 2][1]
            const clockVY = lastQY + qyDiff
            const clearY = (gridHeight + 1) / 2

            return {
                ins: {
                    Clock: [-outX, clockVY, "w", () => s.InputClockDesc, true],
                    Clear: [0, clearY, "s", () => s.InputClearDesc, true],
                },
                outs: {
                    Q: groupQ,
                    V: [outX, clockVY, "e", "V (oVerflow)"],
                },
            }
        },
        initialValue: (saved, { numBits, resetValue }) => {
            if (isUndefined(saved) || isUndefined(saved.count)) {
                return Counter.emptyValue(numBits)
            }
            return [Counter.decimalToNBits(saved.count, numBits, resetValue), false] as const
        },
    })

export type CounterRepr = Repr<typeof CounterDef>
export type CounterParams = ResolvedParams<typeof CounterDef>

export class Counter extends ParametrizedComponentBase<CounterRepr> {

    public static emptyValue(numBits: number) {
        return [ArrayFillWith<LogicValue>(false, numBits), false as LogicValue] as const
    }

    public static decimalToNBits(value: number, width: number, resetValue: number): LogicValue[] {
        value = value % resetValue
        const binStr = value.toString(2).padStart(width, "0")
        const asBits = ArrayFillWith(false, width)
        for (let i = 0; i < width; i++) {
            asBits[i] = binStr[width - i - 1] === "1"
        }
        return asBits
    }

    public readonly numBits: number
    public readonly resetValue: number
    private _trigger: EdgeTrigger
    private _lastClock: LogicValue = Unknown
    private _displayRadix: number | undefined

    public constructor(editor: LogicEditor, params: CounterParams, saved?: CounterRepr) {
        super(editor, CounterDef.with(params), saved)

        this.numBits = params.numBits
        this.resetValue = params.resetValue

        this._trigger = saved?.trigger ?? CounterDef.aults.trigger
        this._displayRadix = isUndefined(saved?.displayRadix) ? CounterDef.aults.displayRadix
            : (saved!.displayRadix === null ? undefined : saved!.displayRadix) // convert null in the repr to undefined
    }

    public toJSON() {
        const [__, currentCountOrUnknown] = displayValuesFromArray(this.value[0], false)
        const currentCount = isUnknown(currentCountOrUnknown) ? 0 : currentCountOrUnknown
        const displayRadix = isUndefined(this._displayRadix) ? null : this._displayRadix
        return {
            type: "counter" as const,
            bits: this.numBits === CounterDef.aults.bits ? undefined : this.numBits,
            ...this.toJSONBase(),
            count: currentCount === 0 ? undefined : currentCount,
            trigger: (this._trigger !== CounterDef.aults.trigger) ? this._trigger : undefined,
            displayRadix: (displayRadix !== CounterDef.aults.displayRadix) ? displayRadix : undefined,
        }
    }

    public get trigger() {
        return this._trigger
    }

    public override makeTooltip() {
        const s = S.Components.Counter.tooltip
        return tooltipContent(s.title, mods(
            div(s.desc) // TODO more info
        ))
    }

    protected doRecalcValue(): readonly [LogicValue[], LogicValue] {
        const clear = this.inputs.Clear.value
        if (clear === true) {
            return Counter.emptyValue(this.numBits)
        }

        const prevClock = this._lastClock
        const clock = this._lastClock = this.inputs.Clock.value
        const activeOverflowValue = this._trigger === EdgeTrigger.rising ? true : false

        if (Flipflop.isClockTrigger(this._trigger, prevClock, clock)) {
            const [__, value] = displayValuesFromArray(this.value[0], false)
            if (isUnknown(value)) {
                return [[Unknown, Unknown, Unknown, Unknown], Unknown]
            }
            const newValue = value + 1
            if (newValue >= this.resetValue) {
                return [ArrayFillWith(false, this.numBits), activeOverflowValue]
            }

            return [Counter.decimalToNBits(newValue, this.numBits, this.resetValue), !activeOverflowValue]

        } else {
            return [this.value[0], !activeOverflowValue]
        }
    }

    protected override propagateValue(newValue: readonly [LogicValue[], LogicValue]) {
        const [counter, overflow] = newValue
        this.outputValues(this.outputs.Q, counter)
        this.outputs.V.value = overflow
    }

    protected doSetTrigger(trigger: EdgeTrigger) {
        this._trigger = trigger
        this.setNeedsRedraw("trigger changed")
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        const right = this.posX + width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2

        // background
        const outline = new Path2D()
        outline.rect(left, top, width, height)
        g.fillStyle = COLOR_BACKGROUND
        g.fill(outline)

        // inputs/outputs
        Flipflop.drawClockInput(g, left, this.inputs.Clock, this._trigger)
        drawWireLineToComponent(g, this.inputs.Clear, this.inputs.Clear.posXInParentTransform, bottom, false)

        for (const output of this.outputs._all) {
            drawWireLineToComponent(g, output, right, output.posYInParentTransform, false)
        }

        // outline
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3
        g.stroke(outline)

        // labels
        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "Clr", "s", this.inputs.Clear, bottom)

            drawLabel(ctx, this.orient, "V", "e", right, this.outputs.V)
            g.font = "bold 12px sans-serif"

            drawLabel(ctx, this.orient, "Q", "e", right, this.outputs.Q)

            if (isDefined(this._displayRadix)) {
                g.font = "bold 20px sans-serif"
                const [__, currentCount] = displayValuesFromArray(this.value[0], false)
                const stringRep = formatWithRadix(currentCount, this._displayRadix, this.numBits, false)
                const labelMargin = 10
                const valueCenter = ctx.rotatePoint(this.posX - labelMargin / 2, this.outputs.Q.group.posYInParentTransform)

                g.fillStyle = COLOR_EMPTY
                const frameWidth = width - labelMargin - 12
                FlipflopOrLatch.drawStoredValueFrame(g, ...valueCenter, frameWidth, 28, false)

                g.textAlign = "center"
                g.textBaseline = "middle"
                g.fillStyle = COLOR_LABEL_OFF
                g.fillText(stringRep, ...valueCenter)
            }

        })
    }

    private doSetDisplayRadix(displayRadix: number | undefined) {
        this._displayRadix = displayRadix
        this.setNeedsRedraw("display radix changed")
    }


    protected override makeComponentSpecificContextMenuItems(): MenuItems {

        const s = S.Components.Counter.contextMenu
        const makeItemShowRadix = (displayRadix: number | undefined, desc: string) => {
            const icon = this._displayRadix === displayRadix ? "check" : "none"
            const caption = s.DisplayTempl.expand({ desc })
            const action = () => this.doSetDisplayRadix(displayRadix)
            return ContextMenuData.item(icon, caption, action)
        }

        return [
            ...makeTriggerItems(this._trigger, this.doSetTrigger.bind(this)),
            ["mid", ContextMenuData.sep()],
            ["mid", makeItemShowRadix(undefined, s.DisplayNone)],
            ["mid", makeItemShowRadix(10, s.DisplayDecimal)],
            ["mid", makeItemShowRadix(16, s.DisplayHex)],
            ["mid", ContextMenuData.sep()],
            this.makeChangeParamsContextMenuItem("outputs", S.Components.Generic.contextMenu.ParamNumBits, this.numBits, "bits", [2, 3, 4, 7, 8, 16]),
            ...this.makeForceOutputsContextMenuItem(true),
        ]
    }

}
CounterDef.impl = Counter
