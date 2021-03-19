import { currMouseAction, backToEdit } from "../menutools.js"
import { MouseAction, Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, fileManager, mode, Color, inRect, isCmdDown } from "../simulator.js"
import { Component, GRID_STEP, pxToGrid } from "./Component.js"

const GRID_WIDTH = 10
const GRID_HEIGHT = 2

export const BarDisplayTypes = ["v", "h", "px", "PX"] as const
export type BarDisplayType = typeof BarDisplayTypes[number]

const DEFAULT_BAR_DISPLAY: BarDisplayType = "h"

export class BarDisplay extends Component {

    private _value = false
    private _display = DEFAULT_BAR_DISPLAY
    private isSpawned = false
    private isMoving = false
    private offsetMouseX = 0
    private offsetMouseY = 0
    private input = new Node(this, 0, 0)
    private nodeStartID = this.input.id
    private isSaved = false

    public constructor() {
        super()
        this.updateInputOffsetX()
    }

    static from(id: number, pos: readonly [number, number], display: BarDisplayType): BarDisplay {
        const newObj = new BarDisplay()
        newObj.updatePosition(pos[0], pos[1], false)
        newObj.doSetDisplay(display)
        newObj.isSpawned = true
        newObj.isSaved = true
        newObj.nodeStartID = id
        newObj.refreshNodes()
        return newObj
    }

    toJSON() {
        return {
            display: this._display,
            id: this.nodeStartID,
            pos: [this.posX, this.posY] as const,
        }
    }

    public get value() {
        return this._value
    }

    public get display() {
        return this._display
    }

    destroy() {
        this.input.destroy()
    }

    draw() {
        if (!this.isSpawned) {
            this.updatePosition(mouseX, mouseY, !isCmdDown)
        } else if (!this.isSaved) {
            fileManager.saveState()
            this.isSaved = true
        }

        if (this.isMoving) {
            this.updatePosition(mouseX + this.offsetMouseX, mouseY + this.offsetMouseY, !isCmdDown)
        }


        this._value = this.input.value

        if (this.isMouseOver()) {
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
        } else {
            stroke(0)
        }

        strokeWeight(4)
        const [inputPosX, inputPosY] = this.input.updatePositionFromParent()

        const backColor: Color = (this._value) ? [20, 255, 20] : [80, 80, 80]
        fill(...backColor)
        const [w, h] = this.getWidthAndHeight()
        rect(this.posX - w / 2, this.posY - h / 2, w, h)

        line(this.posX - w / 2, this.posY, inputPosX, inputPosY)
        this.input.draw()
    }

    getWidthAndHeight() {
        switch (this.display) {
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

    refreshNodes() {
        let currentID = this.nodeStartID
        this.input.id = currentID++
    }

    isMouseOver() {
        const [w, h] = this.getWidthAndHeight()
        return mode >= Mode.CONNECT && inRect(this.posX, this.posY, w, h, mouseX, mouseY)
    }

    mousePressed() {
        if (!this.isSpawned) {
            this.updatePosition(mouseX, mouseY, !isCmdDown)
            this.isSpawned = true
            backToEdit()
            return
        }

        if (this.isMouseOver() || currMouseAction === MouseAction.MOVE) {
            this.isMoving = true
            this.offsetMouseX = this.posX - mouseX
            this.offsetMouseY = this.posY - mouseY
        }
    }

    mouseReleased() {
        if (this.isMoving) {
            this.isMoving = false
        }
    }

    mouseClicked() {
        if (this.input.isMouseOver()) {
            this.input.mouseClicked()
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
        this.input.gridOffsetX = -pxToGrid(width / 2) - 2
    }

}
