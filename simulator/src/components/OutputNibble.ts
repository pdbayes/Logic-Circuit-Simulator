import * as t from "io-ts"
import { colorForBoolean, COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, drawComponentName, drawRoundValue, drawWireLineToComponent, GRID_STEP } from "../drawutils"
import { mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { FixedArray, FixedArrayFill, isDefined, isNotNull, LogicValue, Mode, toLogicValueRepr, Unknown } from "../utils"
import { ComponentBase, ComponentName, ComponentNameRepr, defineComponent } from "./Component"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"

const GRID_WIDTH = 2
const GRID_HEIGHT = 8

export const OutputNibbleDef =
    defineComponent(4, 0, t.type({
        type: t.literal("nibble"),
        name: ComponentNameRepr,
    }, "OutputNibble"))

type OutputNibbleRepr = typeof OutputNibbleDef.reprType

export class OutputNibble extends ComponentBase<4, 0, OutputNibbleRepr, FixedArray<LogicValue, 4>> {

    private _name: ComponentName = undefined

    public constructor(editor: LogicEditor, savedData: OutputNibbleRepr | null) {
        super(editor, FixedArrayFill(false, 4), savedData, {
            ins: [
                [undefined, -2, -3, "w", "In"],
                [undefined, -2, -1, "w", "In"],
                [undefined, -2, +1, "w", "In"],
                [undefined, -2, +3, "w", "In"],
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
            name: this._name,
        }
    }

    public get componentType() {
        return "out" as const
    }

    public get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    public get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods(S.Components.OutputNibble.tooltip))
    }
    
    protected doRecalcValue(): FixedArray<LogicValue, 4> {
        // this never changes on its own, just upon user interaction
        return this.inputValues<4>([0, 1, 2, 3])
    }

    public doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        g.fillStyle = COLOR_BACKGROUND
        const drawMouseOver = ctx.isMouseOver && this.editor.mode !== Mode.STATIC
        g.strokeStyle = drawMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 4

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        const left = this.posX - width / 2
        // const right = left + width
        const top = this.posY - height / 2

        g.beginPath()
        g.rect(left, top, width, height)
        g.fill()
        g.stroke()

        const displayValues = this.editor.options.hideOutputColors ? FixedArrayFill(Unknown, 4) : this.value

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

        for (const input of this.inputs) {
            drawWireLineToComponent(g, input, left - 2, input.posYInParentTransform, true)
        }

        ctx.inNonTransformedFrame(ctx => {
            if (isDefined(this._name)) {
                const valueString = displayValues.map(toLogicValueRepr).join("")
                drawComponentName(g, ctx, this._name, valueString, this, true)
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

}
