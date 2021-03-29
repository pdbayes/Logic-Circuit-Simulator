import { isNotNull, isUnset, Mode, TriState } from "../utils.js"
import { ComponentBase, defineComponent } from "./Component.js"
import { GRID_STEP, pxToGrid } from "./Position.js"
import * as t from "io-ts"
import { COLOR_UNSET, wireLine, inRect, COLOR_MOUSE_OVER, Color } from "../drawutils.js"
import { mode } from "../simulator.js"


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

export class DisplayBar extends ComponentBase<1, 0, DisplayBarRepr> {

    private _value: TriState = false
    private _display = DEFAULT_BAR_DISPLAY

    public constructor(savedData: DisplayBarRepr | null) {
        super(savedData, { inOffsets: [[0, 0]] })
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

    public get value() {
        return this._value
    }

    public get display() {
        return this._display
    }


    draw() {
        this.updatePositionIfNeeded()

        const input = this.inputs[0]
        this._value = input.value

        if (this.isMouseOver()) {
            stroke(...COLOR_MOUSE_OVER)
        } else {
            stroke(0)
        }

        strokeWeight(4)

        const backColor: Color = isUnset(this._value) ? COLOR_UNSET : (this._value) ? [20, 255, 20] : [80, 80, 80]
        fill(...backColor)
        const [w, h] = this.getWidthAndHeight()
        rect(this.posX - w / 2, this.posY - h / 2, w, h)

        wireLine(input, this.posX - w / 2 - 2, this.posY)
        input.draw()
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

    isMouseOver() {
        const [w, h] = this.getWidthAndHeight()
        return mode >= Mode.CONNECT && inRect(this.posX, this.posY, w, h, mouseX, mouseY)
    }

    mouseClicked() {
        const input = this.inputs[0]
        if (input.isMouseOver()) {
            input.mouseClicked()
            return true
        }

        return this.isMouseOver()
    }

    doubleClicked() {
        if (this.isMouseOver()) {
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
    }

    private doSetDisplay(newDisplay: DisplayBarType) {
        this._display = newDisplay
        this.updateInputOffsetX()
    }

    private updateInputOffsetX() {
        const width = this.getWidthAndHeight()[0]
        this.inputs[0].gridOffsetX = -pxToGrid(width / 2) - 2
    }

}
