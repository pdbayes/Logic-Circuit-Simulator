import { isNotNull, isUnset, TriState, Unset } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_UNSET, drawWireLineToComponent, COLOR_MOUSE_OVER, GRID_STEP, pxToGrid, COLOR_COMPONENT_BORDER, COLOR_WIRE_BORDER, COLOR_LED_ON } from "../drawutils"
import { asValue, Modifier, mods, tooltipContent } from "../htmlgen"
import { DrawContext } from "./Drawable"


export const DisplayBarTypes = {
    v: null,
    h: null,
    px: null,
    PX: null,
} as const

type DisplayBarType = keyof typeof DisplayBarTypes

const DEFAULT_BAR_DISPLAY: DisplayBarType = "h"
const GRID_WIDTH = 10
const GRID_HEIGHT = 2


export const DisplayBarDef =
    defineComponent(1, 0, t.type({
        type: t.literal("bar"),
        display: t.keyof(DisplayBarTypes, "DisplayBarType"),
    }, "DisplayBar"))

type DisplayBarRepr = typeof DisplayBarDef.reprType

export class DisplayBar extends ComponentBase<1, 0, DisplayBarRepr, TriState> {

    private _display = DEFAULT_BAR_DISPLAY

    public constructor(savedData: DisplayBarRepr | null) {
        super(false, savedData, { inOffsets: [[0, 0, "w"]] })
        if (isNotNull(savedData)) {
            this.doSetDisplay(savedData.display)
        } else {
            this.updateInputOffsetX()
        }
    }

    toJSON() {
        return {
            type: "bar" as const,
            ...super.toJSONBase(),
            display: this._display,
        }
    }

    public get componentType() {
        return "Display" as const
    }

    get unrotatedWidth() {
        return this.getWidthAndHeight()[0]
    }

    get unrotatedHeight() {
        return this.getWidthAndHeight()[1]
    }

    public override makeTooltip() {
        const expl: Modifier = (() => {
            switch (this.value) {
                case Unset: return "Son état est indéterminé car son entrée n’est pas connue."
                case true: return mods("Il est actuellement allumé car son entrée est de ", asValue(this.value), ".")
                case false: return mods("Il est actuellement éteint car son entrée est de ", asValue(this.value), ".")
            }
        })()
        return tooltipContent("Afficheur lumineux", expl)
    }

    public get display() {
        return this._display
    }

    protected doRecalcValue(): TriState {
        return this.inputs[0].value
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const input = this.inputs[0]
        const value = this.value

        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 4

        const backColor = isUnset(value) ? COLOR_UNSET : (value) ? COLOR_LED_ON : COLOR_WIRE_BORDER
        g.fillStyle = backColor
        const [w, h] = this.getWidthAndHeight()
        g.beginPath()
        g.rect(this.posX - w / 2, this.posY - h / 2, w, h)
        g.closePath()
        g.fill()
        g.stroke()

        drawWireLineToComponent(g, input, this.posX - w / 2 - 2, this.posY)
    }

    getWidthAndHeight() {
        switch (this._display) {
            case "h":
                return [GRID_WIDTH * GRID_STEP, GRID_HEIGHT * GRID_STEP] as const
            case "v":
                return [GRID_HEIGHT * GRID_STEP, GRID_WIDTH * GRID_STEP] as const
            case "px":
                return [GRID_HEIGHT * GRID_STEP, GRID_HEIGHT * GRID_STEP] as const
            case "PX":
                return [GRID_WIDTH * GRID_STEP, GRID_WIDTH * GRID_STEP] as const
        }
    }

    override mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClicked(e)) {
            return true // already handled
        }
        this.doSetDisplay((() => {
            switch (this.display) {
                case "h":
                    return "v"
                case "v":
                    return "px"
                case "px":
                    return "PX"
                case "PX":
                    return "h"
            }
        })())
        return true
    }

    private doSetDisplay(newDisplay: DisplayBarType) {
        this._display = newDisplay
        this.updateInputOffsetX()
        this.setNeedsRedraw("display mode changed")
    }

    private updateInputOffsetX() {
        const width = this.getWidthAndHeight()[0]
        this.inputs[0].gridOffsetX = -pxToGrid(width / 2) - 2
    }

}
