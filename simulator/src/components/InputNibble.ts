import * as t from "io-ts"
import { colorForBoolean, COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, drawComponentName, drawRoundValue, drawWireLineToComponent, GRID_STEP, inRect } from "../drawutils"
import { mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { FixedArray, FixedArrayFill, isDefined, isNotNull, isNull, LogicValue, LogicValueRepr, Mode, toLogicValue, toLogicValueRepr, Unknown } from "../utils"
import { ComponentBase, ComponentName, ComponentNameRepr, defineComponent } from "./Component"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { InputBit } from "./InputBit"

const GRID_WIDTH = 2
const GRID_HEIGHT = 8

export const InputNibbleDef =
    defineComponent(0, 4, t.type({
        type: t.literal("nibble"),
        val: t.tuple([LogicValueRepr, LogicValueRepr, LogicValueRepr, LogicValueRepr]),
        name: ComponentNameRepr,
        // radix: typeOrUndefined(t.number),
    }, "InputNibble"))

type InputNibbleRepr = typeof InputNibbleDef.reprType

export class InputNibble extends ComponentBase<0, 4, InputNibbleRepr, FixedArray<LogicValue, 4>> {

    private static savedStateFrom(savedData: { val: FixedArray<LogicValueRepr, 4> } | null): FixedArray<LogicValue, 4> {
        if (isNull(savedData)) {
            return [false, false, false, false]
        }
        return savedData.val.map(v => toLogicValue(v)) as unknown as FixedArray<LogicValue, 4>
    }


    private _name: ComponentName = undefined
    // private _radix = DEFAULT_RADIX

    public constructor(editor: LogicEditor, savedData: InputNibbleRepr | null) {
        super(editor, InputNibble.savedStateFrom(savedData), savedData, {
            outs: [
                [undefined, 2, -3, "e", "Out"],
                [undefined, 2, -1, "e", "Out"],
                [undefined, 2, +1, "e", "Out"],
                [undefined, 2, +3, "e", "Out"],
            ],
        })
        if (isNotNull(savedData)) {
            this._name = savedData.name
        }
    }

    public toJSON() {
        return {
            type: "nibble" as const,
            ...this.toJSONBase(),
            val: this.value.map(v => toLogicValueRepr(v)) as unknown as FixedArray<LogicValueRepr, 4>,
            name: this._name,
        }
    }

    public get componentType() {
        return "in" as const
    }

    public override get cursorWhenMouseover() {
        return this.editor.mode === Mode.STATIC ? "not-allowed" : "pointer"
    }

    public get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    public get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    public override isOver(x: number, y: number) {
        return inRect(this.posX, this.posY, this.width, this.height, x, y)
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods(S.Components.InputNibble.tooltip))
    }

    protected doRecalcValue(): FixedArray<LogicValue, 4> {
        // this never changes on its own, just upon user interaction
        return this.value
    }

    protected override propagateValue(newValue: FixedArray<LogicValue, 4>) {
        for (let i = 0; i < 4; i++) {
            this.outputs[i].value = newValue[i]
        }
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        g.fillStyle = COLOR_BACKGROUND
        const drawMouseOver = ctx.isMouseOver && this.editor.mode !== Mode.STATIC
        g.strokeStyle = drawMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 4

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        const left = this.posX - width / 2
        const right = left + width
        const top = this.posY - height / 2

        g.beginPath()
        g.rect(left, top, width, height)
        g.fill()
        g.stroke()

        const displayValues = this.editor.options.hideInputColors ? FixedArrayFill(Unknown, 4) : this.value

        g.lineWidth = 1
        const cellHeight = height / 4
        for (let i = 0; i < 4; i++) {
            const y = top + i * cellHeight
            g.fillStyle = colorForBoolean(displayValues[i])
            g.beginPath()
            g.rect(left, y, width, cellHeight)
            g.fill()
            g.stroke()
        }

        for (const output of this.outputs) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform, true)
        }

        ctx.inNonTransformedFrame(ctx => {
            if (isDefined(this._name)) {
                const valueString = displayValues.map(toLogicValueRepr).join("")
                drawComponentName(g, ctx, this._name, valueString, this, false)
            }

            for (let i = 0; i < 4; i++) {
                const y = top + cellHeight / 2 + i * cellHeight
                drawRoundValue(g, displayValues[i], ...ctx.rotatePoint(this.posX, y))
            }
        })
    }

    private doSetName(name: ComponentName) {
        this._name = name
        this.setNeedsRedraw("name changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        return [
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
        ]
    }


    public override keyDown(e: KeyboardEvent): void {
        if (e.key === "Enter") {
            this.runSetNameDialog(this._name, this.doSetName.bind(this))
        }
    }

    public override mouseClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseClicked(e)) {
            return true
        }

        // TODO rotate coordinates here
        const editor = this.editor
        if (editor.mode === Mode.STATIC) {
            return false
        }
        const h = this.unrotatedHeight
        const y = editor.offsetXYForComponent(e, this)[1] - this.posY + h / 2
        const i = Math.floor(y * 4 / h)

        const newValues = [...this.value]
        newValues[i] = InputBit.nextValue(newValues[i], editor.mode, e.altKey)

        this.doSetValue(newValues as unknown as FixedArray<LogicValue, 4>)
        return true
    }

}
