import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_EMPTY, COLOR_LABEL_OFF, COLOR_MOUSE_OVER, displayValuesFromArray, drawLabel, drawWireLineToComponent, formatWithRadix, GRID_STEP } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { ArrayFillWith, isDefined, isNotNull, isNull, isUndefined, isUnknown, LogicValue, typeOrNull, typeOrUndefined, Unknown } from "../utils"
import { ComponentBase, defineComponent, group, Repr } from "./Component"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"
import { EdgeTrigger, Flipflop, FlipflopOrLatch, makeTriggerItems } from "./FlipflopOrLatch"

const COUNTER_WIDTH = 4
const COUNTER_RESET_VALUE = Math.pow(2, COUNTER_WIDTH)

export const CounterDef =
    defineComponent("counter", {
        repr: {
            count: typeOrUndefined(t.number),
            trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
            displayRadix: typeOrUndefined(typeOrNull(t.number)), // undefined means default, null means no display
        },
        valueDefaults: {
            trigger: EdgeTrigger.rising,
            displayRadix: 10,
        },
        makeNodes: () => {
            const s = S.Components.Generic
            return {
                ins: {
                    Clock: [-4, +4, "w", () => s.InputClockDesc, true],
                    Clear: [0, +6, "s", () => s.InputClearDesc, true],
                },
                outs: {
                    Q: group("e", [
                        [+4, -4],
                        [+4, -2],
                        [+4, 0],
                        [+4, +2],
                    ]),
                    V: [+4, +4, "e", "V (oVerflow)"],
                },
            }
        },
        initialValue: (savedData) => {
            if (isNull(savedData) || isUndefined(savedData.count)) {
                return Counter.emptyValue(COUNTER_WIDTH)
            }
            return [Counter.decimalToNBits(savedData.count, COUNTER_WIDTH), false] as const
        },
    })

type CounterRepr = Repr<typeof CounterDef>

export class Counter extends ComponentBase<CounterRepr> {

    private _trigger: EdgeTrigger = CounterDef.aults.trigger
    private _lastClock: LogicValue = Unknown
    private _displayRadix: number | undefined = CounterDef.aults.displayRadix

    public static emptyValue(numBits: number) {
        return [ArrayFillWith<LogicValue>(false, numBits), false as LogicValue] as const
    }

    public static decimalToNBits(value: number, width: number): LogicValue[] {
        value = value % COUNTER_RESET_VALUE
        const binStr = value.toString(2).padStart(width, "0")
        const asBits = ArrayFillWith(false, width)
        for (let i = 0; i < width; i++) {
            asBits[i] = binStr[width - i - 1] === "1"
        }
        return asBits
    }

    public constructor(editor: LogicEditor, savedData: CounterRepr | null) {
        super(editor, CounterDef, savedData)
        if (isNotNull(savedData)) {
            this._trigger = savedData.trigger ?? CounterDef.aults.trigger
            this._displayRadix = isUndefined(savedData.displayRadix) ? CounterDef.aults.displayRadix :
                (savedData.displayRadix === null ? undefined : savedData.displayRadix) // convert null in the repr to undefined
        }
    }

    public toJSON() {
        const [__, currentCountOrUnknown] = displayValuesFromArray(this.value[0], false)
        const currentCount = isUnknown(currentCountOrUnknown) ? 0 : currentCountOrUnknown
        const displayRadix = isUndefined(this._displayRadix) ? null : this._displayRadix
        return {
            type: "counter" as const,
            ...this.toJSONBase(),
            count: currentCount === 0 ? undefined : currentCount,
            trigger: (this._trigger !== CounterDef.aults.trigger) ? this._trigger : undefined,
            displayRadix: (displayRadix !== CounterDef.aults.displayRadix) ? displayRadix : undefined,
        }
    }

    public get componentType() {
        return "ic" as const
    }

    public get unrotatedWidth() {
        return 5 * GRID_STEP
    }

    public get unrotatedHeight() {
        return 11 * GRID_STEP
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
            return Counter.emptyValue(COUNTER_WIDTH)
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
            if (newValue >= COUNTER_RESET_VALUE) {
                return [ArrayFillWith(false, COUNTER_WIDTH), activeOverflowValue]
            }

            return [Counter.decimalToNBits(newValue, COUNTER_WIDTH), !activeOverflowValue]

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

        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3

        g.beginPath()
        g.rect(left, top, width, height)
        g.fill()
        g.stroke()
        g.fillStyle = COLOR_BACKGROUND

        Flipflop.drawClockInput(g, left, this.inputs.Clock, this._trigger)
        drawWireLineToComponent(g, this.inputs.Clear, this.inputs.Clear.posXInParentTransform, bottom + 2, false)

        for (const output of this.outputs._all) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform, false)
        }


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
                const stringRep = formatWithRadix(currentCount, this._displayRadix, 1, false)
                const valueCenter = ctx.rotatePoint(this.posX - 5, this.outputs.Q.group.posYInParentTransform)

                g.fillStyle = COLOR_EMPTY
                FlipflopOrLatch.drawStoredValueFrame(g, ...valueCenter, 28, 28, Orientation.isVertical(this.orient))

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


    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const s = S.Components.Counter.contextMenu
        const makeItemShowRadix = (displayRadix: number | undefined, desc: string) => {
            const icon = this._displayRadix === displayRadix ? "check" : "none"
            const caption = s.DisplayTempl.expand({ desc })
            const action = () => this.doSetDisplayRadix(displayRadix)
            return ContextMenuData.item(icon, caption, action)
        }

        const items: [ContextMenuItemPlacement, ContextMenuItem][] = [
            ...makeTriggerItems(this._trigger, this.doSetTrigger.bind(this)),
            ["mid", ContextMenuData.sep()],
            ["mid", makeItemShowRadix(undefined, s.DisplayNone)],
            ["mid", makeItemShowRadix(10, s.DisplayDecimal)],
            ["mid", makeItemShowRadix(16, s.DisplayHex)],
        ]

        const forceOutputItem = this.makeForceOutputsContextMenuItem()
        if (isDefined(forceOutputItem)) {
            items.push(
                ["mid", ContextMenuData.sep()],
                ["mid", forceOutputItem],
            )
        }

        return items
    }

}
