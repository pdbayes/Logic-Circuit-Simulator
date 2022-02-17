import { FixedArray, isNull, isNotNull, isUndefined, toLogicValue, toLogicValueRepr, LogicValue, LogicValueRepr, typeOrUndefined, Unknown } from "../utils"
import { COLOR_BACKGROUND, COLOR_BACKGROUND_INVALID, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, drawLabel, drawWireLineToComponent, GRID_STEP } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { EdgeTrigger, Flipflop, FlipflopOrLatch } from "./FlipflopOrLatch"
import * as t from "io-ts"
import { ComponentBase, defineComponent } from "./Component"
import { LogicEditor } from "../LogicEditor"

const GRID_WIDTH = 7
const GRID_HEIGHT = 15

const INPUT = {
    Clock: 0,
    Preset: 1,
    Clear: 2,
    Data: [3, 4, 5, 6],
} as const

const OUTPUT = {
    Q: [0, 1, 2, 3],
}

export const RegisterDef =
    defineComponent(7, 4, t.type({
        type: t.literal("register"),
        state: typeOrUndefined(t.tuple([LogicValueRepr, LogicValueRepr, LogicValueRepr, LogicValueRepr])),
        showContent: typeOrUndefined(t.boolean),
        trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
    }, "Register"))

export type RegisterRepr = typeof RegisterDef.reprType

const RegisterDefaults = {
    showContent: true,
    trigger: EdgeTrigger.rising,
}

export class Register extends ComponentBase<7, 4, RegisterRepr, FixedArray<LogicValue, 4>> {

    protected _showContent: boolean = RegisterDefaults.showContent
    protected _trigger: EdgeTrigger = RegisterDefaults.trigger
    protected _isInInvalidState = false
    protected _lastClock: LogicValue = Unknown

    private static savedStateFrom(savedData: { state: FixedArray<LogicValueRepr, 4> | undefined } | null): FixedArray<LogicValue, 4> {
        if (isNull(savedData) || isUndefined(savedData.state)) {
            return [false, false, false, false]
        }
        return savedData.state.map(toLogicValue) as unknown as FixedArray<LogicValue, 4>
    }

    public constructor(editor: LogicEditor, savedData: RegisterRepr | null) {
        super(editor, Register.savedStateFrom(savedData), savedData, {
            inOffsets: [
                [-5, +6, "w"], // Clock
                [0, -8, "n"], // Preset
                [0, +8, "s"], // Clear
                [-5, -3, "w"], [-5, -1, "w"], [-5, +1, "w"], [-5, 3, "w"], // Data in
            ],
            outOffsets: [
                [+5, -3, "e"], [+5, -1, "e"], [+5, +1, "e"], [+5, 3, "e"], // Data out
            ],
        })
        if (isNotNull(savedData)) {
            this._showContent = savedData.showContent ?? RegisterDefaults.showContent
            this._trigger = savedData.trigger ?? RegisterDefaults.trigger
        }
        this.setInputsPreferSpike(INPUT.Clock, INPUT.Preset, INPUT.Clear)
    }

    toJSON() {
        return {
            type: "register" as const,
            ...this.toJSONBase(),
            state: this.value.map(toLogicValueRepr) as unknown as FixedArray<LogicValueRepr, 4>,
            showContent: (this._showContent !== RegisterDefaults.showContent) ? this._showContent : undefined,
            trigger: (this._trigger !== RegisterDefaults.trigger) ? this._trigger : undefined,
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
            case INPUT.Preset: return "P (Preset, mise à 1)"
            case INPUT.Clear: return "C (Clear, mise à 0)"
        }
        if (i <= INPUT.Data[INPUT.Data.length - 1]) {
            return "D" + (i - INPUT.Data[0])
        }
        return undefined
    }

    override getOutputName(i: number): string | undefined {
        if (i <= OUTPUT.Q[OUTPUT.Q.length - 1]) {
            return "Q" + (i - OUTPUT.Q[0])
        }
        return undefined
    }

    public override makeTooltip() {
        return tooltipContent("Registre", mods(
            div(`Stocke quatre bits.`) // TODO more info
        ))
    }

    protected doRecalcValue(): FixedArray<LogicValue, 4> {
        const prevClock = this._lastClock
        const clock = this._lastClock = this.inputs[INPUT.Clock].value
        const { isInInvalidState, newState } =
            Flipflop.doRecalcValueForSyncComponent(this, prevClock, clock,
                this.inputs[INPUT.Preset].value,
                this.inputs[INPUT.Clear].value)
        this._isInInvalidState = isInInvalidState
        return newState
    }

    makeInvalidState(): FixedArray<LogicValue, 4> {
        return [false, false, false, false]
    }

    makeStateFromMainValue(val: LogicValue): FixedArray<LogicValue, 4> {
        return [val, val, val, val]
    }

    makeStateAfterClock(): FixedArray<LogicValue, 4> {
        return INPUT.Data.map(i => this.inputs[i].value) as FixedArray<LogicValue, 4>
    }

    protected override propagateValue(newValue: FixedArray<LogicValue, 4>) {
        for (let i = 0; i < newValue.length; i++) {
            this.outputs[OUTPUT.Q[i]].value = newValue[i]
        }
    }

    protected doSetShowContent(showContent: boolean) {
        this._showContent = showContent
        this.setNeedsRedraw("show content changed")
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

        g.fillStyle = this._isInInvalidState ? COLOR_BACKGROUND_INVALID : COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3

        g.beginPath()
        g.rect(left, top, width, height)
        g.fill()
        g.stroke()
        g.fillStyle = COLOR_BACKGROUND

        Flipflop.drawClockInput(g, left, this.inputs[INPUT.Clock], this._trigger)
        drawWireLineToComponent(g, this.inputs[INPUT.Preset], this.inputs[INPUT.Preset].posXInParentTransform, top - 2, false)
        drawWireLineToComponent(g, this.inputs[INPUT.Clear], this.inputs[INPUT.Clear].posXInParentTransform, bottom + 2, false)
        for (const i of INPUT.Data) {
            drawWireLineToComponent(g, this.inputs[i], left - 2, this.inputs[i].posYInParentTransform, false)
        }

        for (const output of this.outputs) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform, false)
        }


        ctx.inNonTransformedFrame(ctx => {
            if (this._showContent) {
                for (const output of this.outputs) {
                    FlipflopOrLatch.drawStoredValue(g, output.value, this.posX, output.posYInParentTransform, 20)
                }
            }

            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "Pre", "n", this.inputs[INPUT.Preset], top)
            drawLabel(ctx, this.orient, "Clr", "s", this.inputs[INPUT.Clear], bottom)

            g.font = "bold 12px sans-serif"
            drawLabel(ctx, this.orient, "Q", "e", right, this.posY)
            drawLabel(ctx, this.orient, "D", "w", left, this.posY)
        })

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
