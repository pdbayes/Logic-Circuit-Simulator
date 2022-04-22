import { FixedArray, isNull, isNotNull, isUndefined, LogicValue, typeOrUndefined, Unknown, FixedArrayFill, isUnknown, typeOrNull, isDefined } from "../utils"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_EMPTY, COLOR_LABEL_OFF, COLOR_MOUSE_OVER, displayValuesFromArray, drawLabel, drawWireLineToComponent, formatWithRadix, GRID_STEP } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { EdgeTrigger, Flipflop, FlipflopOrLatch } from "./FlipflopOrLatch"
import * as t from "io-ts"
import { ComponentBase, defineComponent } from "./Component"
import { LogicEditor } from "../LogicEditor"

const GRID_WIDTH = 5
const GRID_HEIGHT = 11

const enum INPUT { Clock, Clear }

const OUTPUT = {
    Q: [0, 1, 2, 3] as const,
    V: 4,
}

const COUNTER_WIDTH = OUTPUT.Q.length
const COUNTER_RESET_VALUE = Math.pow(2, COUNTER_WIDTH)

export const CounterDef =
    defineComponent(2, 5, t.type({
        type: t.literal("counter"),
        count: typeOrUndefined(t.number),
        trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
        displayRadix: typeOrUndefined(typeOrNull(t.number)), // undefined means default, null means no display
    }, "Counter"))

export type CounterRepr = typeof CounterDef.reprType

const CounterDefaults = {
    trigger: EdgeTrigger.rising,
    displayRadix: 10,
}

export class Counter extends ComponentBase<2, 5, CounterRepr, [FixedArray<LogicValue, 4>, LogicValue]> {

    private _trigger: EdgeTrigger = CounterDefaults.trigger
    private _lastClock: LogicValue = Unknown
    private _displayRadix: number | undefined = CounterDefaults.displayRadix

    private static savedStateFrom(savedData: { count: number | undefined } | null): [FixedArray<LogicValue, 4>, LogicValue] {
        if (isNull(savedData) || isUndefined(savedData.count)) {
            return [[false, false, false, false], false]
        }
        return [Counter.decimalToFourBits(savedData.count), false]
    }

    private static decimalToFourBits(value: number): FixedArray<LogicValue, 4> {
        value = value % COUNTER_RESET_VALUE
        const binStr = value.toString(2).padStart(COUNTER_WIDTH, "0")
        const fourBits = FixedArrayFill(false, COUNTER_WIDTH)
        for (let i = 0; i < COUNTER_WIDTH; i++) {
            fourBits[i] = binStr[COUNTER_WIDTH - i - 1] === "1"
        }
        return fourBits
    }

    public constructor(editor: LogicEditor, savedData: CounterRepr | null) {
        super(editor, Counter.savedStateFrom(savedData), savedData, {
            inOffsets: [
                [-4, +4, "w"], // Clock
                [0, +6, "s"], // Clear
            ],
            outOffsets: [
                [+4, -4, "e"], [+4, -2, "e"], [+4, 0, "e"], [+4, +2, "e"], // Data out
                [+4, +4, "e"],
            ],
        })
        if (isNotNull(savedData)) {
            this._trigger = savedData.trigger ?? CounterDefaults.trigger
            this._displayRadix = isUndefined(savedData.displayRadix) ? CounterDefaults.displayRadix :
                (savedData.displayRadix === null ? undefined : savedData.displayRadix) // convert null in the repr to undefined
        }
        this.setInputsPreferSpike(INPUT.Clock, INPUT.Clear)
    }

    toJSON() {
        const [__, currentCountOrUnknown] = displayValuesFromArray(this.value[0], false)
        const currentCount = isUnknown(currentCountOrUnknown) ? 0 : currentCountOrUnknown
        const displayRadix = isUndefined(this._displayRadix) ? null : this._displayRadix
        return {
            type: "counter" as const,
            ...this.toJSONBase(),
            count: currentCount === 0 ? undefined : currentCount,
            trigger: (this._trigger !== CounterDefaults.trigger) ? this._trigger : undefined,
            displayRadix: (displayRadix !== CounterDefaults.displayRadix) ? displayRadix : undefined,
        }
    }

    get componentType() {
        return "ic" as const
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    get trigger() {
        return this._trigger
    }

    override getInputName(i: number): string | undefined {
        switch (i) {
            case INPUT.Clock: return "Clock (horloge)"
            case INPUT.Clear: return "C (Clear, mise à 0)"
        }
        return undefined
    }

    override getOutputName(i: number): string | undefined {
        if (i <= OUTPUT.Q[OUTPUT.Q.length - 1]) {
            return "Q" + (i - OUTPUT.Q[0])
        }
        if (i === OUTPUT.V) {
            return "V (oVerflow)"
        }
        return undefined
    }

    public override makeTooltip() {
        return tooltipContent("Compteur", mods(
            div(`Compteur à quatre bits.`) // TODO more info
        ))
    }

    protected doRecalcValue(): [FixedArray<LogicValue, 4>, LogicValue] {
        const clear = this.inputs[INPUT.Clear].value
        if (clear === true) {
            return [FixedArrayFill(false, COUNTER_WIDTH), false]
        }

        const prevClock = this._lastClock
        const clock = this._lastClock = this.inputs[INPUT.Clock].value
        const activeOverflowValue = this._trigger === EdgeTrigger.rising ? true : false

        if (Flipflop.isClockTrigger(this._trigger, prevClock, clock)) {
            const [__, value] = displayValuesFromArray(this.value[0], false)
            if (isUnknown(value)) {
                return [[Unknown, Unknown, Unknown, Unknown], Unknown]
            }
            const newValue = value + 1
            if (newValue >= COUNTER_RESET_VALUE) {
                return [FixedArrayFill(false, COUNTER_WIDTH), activeOverflowValue]
            }

            return [Counter.decimalToFourBits(newValue), !activeOverflowValue]

        } else {
            return [this.value[0], !activeOverflowValue]
        }
    }

    protected override propagateValue(newValue: [FixedArray<LogicValue, 4>, LogicValue]) {
        for (let i = 0; i < newValue[0].length; i++) {
            this.outputs[OUTPUT.Q[i]].value = newValue[0][i]
        }
        this.outputs[OUTPUT.V].value = newValue[1]
    }

    protected doSetTrigger(trigger: EdgeTrigger) {
        this._trigger = trigger
        this.setNeedsRedraw("trigger changed")
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

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

        Flipflop.drawClockInput(g, left, this.inputs[INPUT.Clock], this._trigger)
        drawWireLineToComponent(g, this.inputs[INPUT.Clear], this.inputs[INPUT.Clear].posXInParentTransform, bottom + 2, false)

        for (const output of this.outputs) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform, false)
        }


        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "Clr", "s", this.inputs[INPUT.Clear], bottom)

            drawLabel(ctx, this.orient, "V", "e", right, this.outputs[OUTPUT.V])
            g.font = "bold 12px sans-serif"

            const offsetY = (this.outputs[OUTPUT.Q[1]].posYInParentTransform + this.outputs[OUTPUT.Q[2]].posYInParentTransform) / 2
            drawLabel(ctx, this.orient, "Q", "e", right, offsetY)

            if (isDefined(this._displayRadix)) {
                g.font = "bold 20px sans-serif"
                const [__, currentCount] = displayValuesFromArray(this.value[0], false)
                const stringRep = formatWithRadix(currentCount, this._displayRadix, 1, false)
                const valueCenter = ctx.rotatePoint(this.posX - 5, offsetY)

                g.fillStyle = COLOR_EMPTY
                FlipflopOrLatch.drawStoredValueFrame(g, ...valueCenter, 28, 28)

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
        // TODO merge with FlipFlip items
        const makeTriggerItem = (trigger: EdgeTrigger, desc: string) => {
            const isCurrent = this._trigger === trigger
            const icon = isCurrent ? "check" : "none"
            const caption = "Stocker au " + desc
            const action = isCurrent ? () => undefined :
                () => this.doSetTrigger(trigger)
            return ContextMenuData.item(icon, caption, action)
        }

        const makeItemShowRadix = (displayRadix: number | undefined, desc: string) => {
            const icon = this._displayRadix === displayRadix ? "check" : "none"
            const caption = "Affichage " + desc
            const action = () => this.doSetDisplayRadix(displayRadix)
            return ContextMenuData.item(icon, caption, action)
        }

        return [
            ["mid", makeTriggerItem(EdgeTrigger.rising, "flanc montant")],
            ["mid", makeTriggerItem(EdgeTrigger.falling, "flanc descendant")],
            ["mid", ContextMenuData.sep()],
            ["mid", makeItemShowRadix(undefined, "absent")],
            ["mid", makeItemShowRadix(10, "décimal")],
            ["mid", makeItemShowRadix(16, "hexadécimal")],
            ["mid", ContextMenuData.sep()],
            ["mid", this.makeForceOutputsContextMenuItem()!],
        ]
    }

}
