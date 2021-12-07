import { isDefined, isNotNull, isUnset, unset, typeOrUndefined, Mode, FixedArray, TriState, TriStateRepr, isNull, toTriState, toTriStateRepr } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_MOUSE_OVER, COLOR_UNSET, GRID_STEP, drawWireLineToComponent, formatWithRadix, displayValuesFromInputs, colorForFraction, COLOR_COMPONENT_BORDER, colorComps, ColorString, drawComponentName, COLOR_BACKGROUND, colorForBoolean, drawRoundValue, inRect } from "../drawutils"
import { tooltipContent, mods, div, emptyMod, b } from "../htmlgen"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"
import { mode, offsetXY, offsetXYForComponent } from "../simulator"
import { LogicInput } from "./LogicInput"

const GRID_WIDTH = 2
const GRID_HEIGHT = 8

export const InputNibbleDef =
    defineComponent(0, 4, t.type({
        type: t.literal("input-nibble"),
        val: t.tuple([TriStateRepr, TriStateRepr, TriStateRepr, TriStateRepr]),
        name: typeOrUndefined(t.string),
        // radix: typeOrUndefined(t.number),
    }, "DisplayNibble"))

type InputNibbleRepr = typeof InputNibbleDef.reprType

export class InputNibble extends ComponentBase<0, 4, InputNibbleRepr, FixedArray<TriState, 4>> {

    private static savedStateFrom(savedData: { val: FixedArray<TriStateRepr, 4> } | null): FixedArray<TriState, 4> {
        if (isNull(savedData)) {
            return [false, false, false, false]
        }
        return savedData.val.map(v => toTriState(v)) as unknown as FixedArray<TriState, 4>
    }


    private _name: string | undefined = undefined
    // private _radix = DEFAULT_RADIX

    public constructor(savedData: InputNibbleRepr | null) {
        super(InputNibble.savedStateFrom(savedData), savedData, {
            outOffsets: [[2, -3, "e"], [2, -1, "e"], [2, +1, "e"], [2, +3, "e"]],
        })
        if (isNotNull(savedData)) {
            this._name = savedData.name
        }
    }

    toJSON() {
        return {
            type: "input-nibble" as const,
            ...this.toJSONBase(),
            val: this.value.map(v => toTriStateRepr(v)) as unknown as FixedArray<TriStateRepr, 4>,
            name: this._name,
        }
    }

    public get componentType() {
        return "IC" as const
    }

    override get cursorWhenMouseover() {
        return "pointer"
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    override isOver(x: number, y: number) {
        return mode >= Mode.TRYOUT && inRect(this.posX, this.posY, this.width, this.height, x, y)
    }

    public override makeTooltip() {
        return tooltipContent("Entrée semioctet", mods("TODO"))
    }

    protected doRecalcValue(): FixedArray<TriState, 4> {
        // this never changes on its own, just upon user interaction
        return this.value
    }

    protected override propagateNewValue(newValue: FixedArray<TriState, 4>) {
        for (let i = 0; i < 4; i++) {
            this.outputs[i].value = newValue[i]
        }
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
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

        const values = this.value

        g.lineWidth = 1
        const cellHeight = height / 4
        for (let i = 0; i < 4; i++) {
            const y = top + i * cellHeight
            g.fillStyle = colorForBoolean(values[i])
            g.beginPath()
            g.rect(left, y, width, height / 4)
            g.fill()
            g.stroke()
        }

        for (const output of this.outputs) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform)
        }

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_BORDER

            if (isDefined(this._name)) {
                drawComponentName(g, ctx, this._name, this, false)
            }

            for (let i = 0; i < 4; i++) {
                const y = top + cellHeight / 2 + i * cellHeight
                drawRoundValue(g, values[i], ...ctx.rotatePoint(this.posX, y))
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

    override mouseClicked(e: MouseEvent | TouchEvent) {
        // TODO rotate coordinates here
        const h = this.unrotatedHeight
        const y = offsetXYForComponent(e, this)[1] - this.posY + h / 2
        const i = Math.floor(y * 4 / h)

        const newValues = [...this.value]
        newValues[i] = LogicInput.nextValue(newValues[i], mode, e.altKey)

        this.doSetValue(newValues as unknown as FixedArray<TriState, 4>)
        return true
    }

}
