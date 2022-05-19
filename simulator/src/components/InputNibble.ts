import { isDefined, isNotNull, typeOrUndefined, Mode, FixedArray, LogicValue, LogicValueRepr, isNull, toLogicValue, toLogicValueRepr, FixedArrayFill, Unknown } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_MOUSE_OVER, GRID_STEP, drawWireLineToComponent, COLOR_COMPONENT_BORDER, drawComponentName, COLOR_BACKGROUND, colorForBoolean, drawRoundValue, inRect } from "../drawutils"
import { tooltipContent, mods } from "../htmlgen"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { InputBit } from "./InputBit"
import { LogicEditor } from "../LogicEditor"

const GRID_WIDTH = 2
const GRID_HEIGHT = 8

export const InputNibbleDef =
    defineComponent(0, 4, t.type({
        type: t.literal("nibble"),
        val: t.tuple([LogicValueRepr, LogicValueRepr, LogicValueRepr, LogicValueRepr]),
        name: typeOrUndefined(t.string),
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


    private _name: string | undefined = undefined
    // private _radix = DEFAULT_RADIX

    public constructor(editor: LogicEditor, savedData: InputNibbleRepr | null) {
        super(editor, InputNibble.savedStateFrom(savedData), savedData, {
            outOffsets: [[2, -3, "e"], [2, -1, "e"], [2, +1, "e"], [2, +3, "e"]],
        })
        if (isNotNull(savedData)) {
            this._name = savedData.name
        }
    }

    toJSON() {
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

    override get cursorWhenMouseover() {
        return this.editor.mode === Mode.STATIC ? "not-allowed" : "pointer"
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    override isOver(x: number, y: number) {
        return inRect(this.posX, this.posY, this.width, this.height, x, y)
    }

    public override makeTooltip() {
        return tooltipContent("Entrée semioctet", mods("TODO"))
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

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

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

        const displayValues =  this.editor.options.hideInputColors ? FixedArrayFill(Unknown, 4) : this.value

        g.lineWidth = 1
        const cellHeight = height / 4
        for (let i = 0; i < 4; i++) {
            const y = top + i * cellHeight
            g.fillStyle = colorForBoolean(displayValues[i])
            g.beginPath()
            g.rect(left, y, width, height / 4)
            g.fill()
            g.stroke()
        }

        for (const output of this.outputs) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform)
        }

        ctx.inNonTransformedFrame(ctx => {
            if (isDefined(this._name)) {
                drawComponentName(g, ctx, this._name, this, false)
            }

            for (let i = 0; i < 4; i++) {
                const y = top + cellHeight / 2 + i * cellHeight
                drawRoundValue(g, displayValues[i], ...ctx.rotatePoint(this.posX, y))
            }
        })
    }

    private doSetName(name: string | undefined) {
        this._name = name
        this.setNeedsRedraw("name changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        return [
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
        ]
    }


    override keyDown(e: KeyboardEvent): void {
        if (e.key === "Enter") {
            this.runSetNameDialog(this._name, this.doSetName.bind(this))
        }
    }

    override mouseClicked(e: MouseEvent | TouchEvent) {
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
