import { Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, mode, Color, inRect, isDefined, isNotNull } from "../simulator.js"
import { ComponentBase, ComponentRepr, GRID_STEP, IDGen, pxToGrid } from "./Component.js"

const GRID_WIDTH = 10
const GRID_HEIGHT = 2

export const BarDisplayTypes = ["v", "h", "px", "PX"] as const
export type BarDisplayType = typeof BarDisplayTypes[number]

const DEFAULT_BAR_DISPLAY: BarDisplayType = "h"

export interface BarDisplayRepr extends ComponentRepr {
    display: BarDisplayType
}

export class BarDisplay extends ComponentBase<1, 0, BarDisplayRepr> {

    private _value = false
    private _display = DEFAULT_BAR_DISPLAY

    public constructor(savedData: BarDisplayRepr | null) {
        super(savedData)
        if (isNotNull(savedData)) {
            this.doSetDisplay(savedData.display)
        } else {
            this.updateInputOffsetX()
        }
    }

    toJSON() {
        return {
            display: this._display,
            ...super.toJSONBase(),
        }
    }

    protected makeNodes(genID: IDGen) {
        return [[new Node(genID(), this, 0, 0)], []] as const
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
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
        } else {
            stroke(0)
        }

        strokeWeight(4)

        const [inputPosX, inputPosY] = input.updatePositionFromParent()

        const backColor: Color = (this._value) ? [20, 255, 20] : [80, 80, 80]
        fill(...backColor)
        const [w, h] = this.getWidthAndHeight()
        rect(this.posX - w / 2, this.posY - h / 2, w, h)

        line(this.posX - w / 2, this.posY, inputPosX, inputPosY)
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

    private doSetDisplay(newDisplay: BarDisplayType) {
        this._display = newDisplay
        this.updateInputOffsetX()
    }

    private updateInputOffsetX() {
        const width = this.getWidthAndHeight()[0]
        this.inputs[0].gridOffsetX = -pxToGrid(width / 2) - 2
    }

}
