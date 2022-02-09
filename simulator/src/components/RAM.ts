import { FixedArray, isNotNull, TriState, typeOrUndefined, Unset, unset, isUnset, FixedReadonlyArray } from "../utils"
import { colorForBoolean, COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, displayValuesFromArray, drawLabel, drawWireLineToComponent, GRID_STEP, strokeSingleLine } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { EdgeTrigger, Flipflop } from "./FlipflopOrLatch"
import * as t from "io-ts"
import { ComponentBase, defineComponent } from "./Component"
import { LogicEditor } from "../LogicEditor"

const GRID_WIDTH = 11
const GRID_HEIGHT = 15

const INPUT = {
    Clock: 0,
    WriteEnable: 1,
    Clear: 2,
    Data: [3, 4, 5, 6],
    Address: [7, 8, 9, 10],
} as const

const NUM_CELLS = Math.pow(2, INPUT.Address.length)

const OUTPUT = {
    Q: [0, 1, 2, 3],
}

export const RAMDef =
    defineComponent(11, 4, t.type({
        type: t.literal("ram"),
        showContent: typeOrUndefined(t.boolean),
        trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
    }, "RAM"))

export type RAMRepr = typeof RAMDef.reprType

const RAMDefaults = {
    showContent: true,
    trigger: EdgeTrigger.rising,
}

type RAMValue = {
    mem: Array<FixedArray<TriState, 4>>
    out: FixedReadonlyArray<TriState, 4>
}

export class RAM extends ComponentBase<11, 4, RAMRepr, RAMValue> {

    protected _showContent: boolean = RAMDefaults.showContent
    protected _trigger: EdgeTrigger = RAMDefaults.trigger
    protected _lastClock: TriState = Unset

    private static valueFilledWith(v: TriState): RAMValue {
        const mem: Array<FixedArray<TriState, 4>> = new Array(NUM_CELLS)
        for (let i = 0; i < NUM_CELLS; i++) {
            mem[i] = [v, v, v, v]
        }
        const out = [v, v, v, v] as const
        return { mem, out }
    }

    public constructor(editor: LogicEditor, savedData: RAMRepr | null) {
        super(editor, RAM.valueFilledWith(false), savedData, {
            inOffsets: [
                [-7, +6, "w"], // Clock
                [-2, +8, "s"], // WriteEnable
                [+2, +8, "s"], // Clear
                [-7, -3, "w"], [-7, -1, "w"], [-7, +1, "w"], [-7, 3, "w"], // Data in
                [+3, -8, "n"], [+1, -8, "n"], [-1, -8, "n"], [-3, -8, "n"], // Address
            ],
            outOffsets: [
                [+7, -3, "e"], [+7, -1, "e"], [+7, +1, "e"], [+7, 3, "e"], // Data out
            ],
        })
        if (isNotNull(savedData)) {
            this._showContent = savedData.showContent ?? RAMDefaults.showContent
            this._trigger = savedData.trigger ?? RAMDefaults.trigger
        }
        this.setInputsPreferSpike(INPUT.Clock, INPUT.Clear)
    }

    toJSON() {
        return {
            type: "ram" as const,
            ...this.toJSONBase(),
            showContent: (this._showContent !== RAMDefaults.showContent) ? this._showContent : undefined,
            trigger: (this._trigger !== RAMDefaults.trigger) ? this._trigger : undefined,
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
            case INPUT.WriteEnable: return "WE (Write Enable)"
            case INPUT.Clear: return "C (Clear, mise à 0)"
        }
        if (i <= INPUT.Data[INPUT.Data.length - 1]) {
            return "D" + (i - INPUT.Data[0])
        }
        if (i <= INPUT.Address[INPUT.Address.length - 1]) {
            return "Addr" + (i - INPUT.Address[0])
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
        return tooltipContent("RAM", mods(
            div(`Stocke 16 fois quatre bits.`) // TODO more info
        ))
    }

    protected doRecalcValue(): RAMValue {
        const clear = this.inputs[INPUT.Clear].value
        if (clear === true) {
            // clear is true, preset is false, set output to 0
            return RAM.valueFilledWith(false)
        }

        // first, determine output
        const addr = this.currentAddress()

        const prevClock = this._lastClock
        const clock = this._lastClock = this.inputs[INPUT.Clock].value

        // handle normal operation
        const oldState = this.value
        const we = this.inputs[INPUT.WriteEnable].value
        if (we !== true || !Flipflop.isClockTrigger(this.trigger, prevClock, clock)) {
            // nothing to write, just update output
            const out = isUnset(addr) ? [Unset, Unset, Unset, Unset] as const : oldState.mem[addr]
            return { mem: oldState.mem, out }
        }

        // we write
        if (isUnset(addr)) {
            return RAM.valueFilledWith(Unset)
        }

        // build new state
        const newData = this.inputValues<4>(INPUT.Data)
        const newState: Array<FixedArray<TriState, 4>> = new Array(NUM_CELLS)
        for (let i = 0; i < NUM_CELLS; i++) {
            if (i === addr) {
                newState[i] = newData
            } else {
                newState[i] = oldState.mem[i]
            }
        }
        return { mem: newState, out: newData }
    }

    makeStateAfterClock(): FixedArray<TriState, 4> {
        return INPUT.Data.map(i => this.inputs[i].value) as FixedArray<TriState, 4>
    }

    private currentAddress(): number | unset {
        const addrBits = this.inputValues<4>(INPUT.Address)
        const [__, addr] = displayValuesFromArray(addrBits, false)
        return addr
    }

    protected override propagateValue(newValue: RAMValue) {
        for (let i = 0; i < OUTPUT.Q.length; i++) {
            this.outputs[OUTPUT.Q[i]].value = newValue.out[i]
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

        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3

        g.beginPath()
        g.rect(left, top, width, height)
        g.fill()
        g.stroke()
        g.fillStyle = COLOR_BACKGROUND

        Flipflop.drawClockInput(g, left, this.inputs[INPUT.Clock], this._trigger)
        drawWireLineToComponent(g, this.inputs[INPUT.WriteEnable], this.inputs[INPUT.WriteEnable].posXInParentTransform, bottom + 2, false)
        drawWireLineToComponent(g, this.inputs[INPUT.Clear], this.inputs[INPUT.Clear].posXInParentTransform, bottom + 2, false)
        for (const i of INPUT.Data) {
            drawWireLineToComponent(g, this.inputs[i], left - 2, this.inputs[i].posYInParentTransform, false)
        }
        for (const i of INPUT.Address) {
            drawWireLineToComponent(g, this.inputs[i], this.inputs[i].posXInParentTransform, top, false)
        }

        for (const output of this.outputs) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform, false)
        }


        ctx.inNonTransformedFrame(ctx => {
            if (!this._showContent) {
                g.font = `bold 16px sans-serif`
                g.fillStyle = COLOR_COMPONENT_BORDER
                g.textAlign = "center"
                g.textBaseline = "middle"
                g.fillText("RAM", this.posX, this.posY)
            } else {
                const mem = this.value.mem
                const cellWidth = GRID_STEP
                const cellHeight = 6
                const contentTop = this.posY - 8 * cellHeight
                const contentLeft = this.posX - 2 * GRID_STEP
                const contentRight = contentLeft + 4 * cellWidth
                const contentBottom = contentTop + NUM_CELLS * cellHeight
                g.strokeStyle = COLOR_COMPONENT_BORDER
                g.lineWidth = 0.5
                for (let i = 0; i < NUM_CELLS; i++) {
                    for (let j = 0; j < 4; j++) {
                        const v = mem[i][3 - j]
                        g.fillStyle = colorForBoolean(v)
                        g.fillRect(contentLeft + j * cellWidth, contentTop + i * cellHeight, cellWidth, cellHeight)
                    }
                }
                for (let i = 1; i < NUM_CELLS; i++) {
                    const y = contentTop + i * cellHeight
                    strokeSingleLine(g, contentLeft, y, contentRight, y)
                }
                for (let j = 1; j < 4; j++) {
                    const x = contentLeft + j * cellWidth
                    strokeSingleLine(g, x, contentTop, x, contentBottom)
                }
                g.lineWidth = 2
                g.strokeRect(contentLeft, contentTop, contentRight - contentLeft, contentBottom - contentTop)
                const addr = this.currentAddress()
                if (!isUnset(addr)) {
                    const arrowY = contentTop + addr * cellHeight + cellHeight / 2
                    const arrowRight = contentLeft - 3
                    const arrowWidth = 8
                    const arrowHalfHeight = 3
                    g.beginPath()
                    g.moveTo(arrowRight, arrowY)
                    g.lineTo(arrowRight - arrowWidth, arrowY + arrowHalfHeight)
                    g.lineTo(arrowRight - arrowWidth + 2, arrowY)
                    g.lineTo(arrowRight - arrowWidth, arrowY - arrowHalfHeight)
                    g.closePath()
                    g.fill()
                }
            }

            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "WE", "s", this.inputs[INPUT.WriteEnable], bottom)
            drawLabel(ctx, this.orient, "Clr", "s", this.inputs[INPUT.Clear], bottom)

            g.font = "bold 12px sans-serif"
            drawLabel(ctx, this.orient, "Addr", "n", this.posX, top)
            drawLabel(ctx, this.orient, "D", "w", left, this.posY)
            drawLabel(ctx, this.orient, "Q", "e", right, this.posY)
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
