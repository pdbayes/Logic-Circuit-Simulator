import { isNotNull, isUnset, TriState } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_UNSET, wireLine, COLOR_MOUSE_OVER, Color, GRID_STEP, pxToGrid } from "../drawutils"


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
        super(false, savedData, { inOffsets: [[0, 0]] })
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

    get width() {
        return this.getWidthAndHeight()[0]
    }

    get height() {
        return this.getWidthAndHeight()[1]
    }

    public makeTooltip() {
        return undefined // TODO
    }

    public get display() {
        return this._display
    }

    protected doRecalcValue(): TriState {
        return this.inputs[0].value
    }

    doDraw(isMouseOver: boolean) {
        const input = this.inputs[0]
        const value = this.value

        if (isMouseOver) {
            stroke(...COLOR_MOUSE_OVER)
        } else {
            stroke(0)
        }

        strokeWeight(4)

        const backColor: Color = isUnset(value) ? COLOR_UNSET : (value) ? [20, 255, 20] : [80, 80, 80]
        fill(...backColor)
        const [w, h] = this.getWidthAndHeight()
        rect(this.posX - w / 2, this.posY - h / 2, w, h)

        wireLine(input, this.posX - w / 2 - 2, this.posY)
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

    mouseDoubleClick(__: MouseEvent | TouchEvent) {
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
