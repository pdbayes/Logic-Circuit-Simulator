import { currMouseAction, backToEdit } from "../menutools.js"
import { MouseAction, Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, fileManager, mode, Color, inRect, isCmdDown } from "../simulator.js"
import { Component } from "./Component.js"

const WIDTH = 100
const HEIGHT = 20
const INPUT_X_DISTANCE = 15

export const BarDisplayTypes = ["v", "h", "px", "PX"] as const
export type BarDisplayType = typeof BarDisplayTypes[number]

const DEFAULT_BAR_DISPLAY: BarDisplayType = "h"

export class BarDisplay extends Component {

    private _value = false
    private display = DEFAULT_BAR_DISPLAY
    private isSpawned = false
    private isMoving = false
    private offsetMouseX = 0
    private offsetMouseY = 0
    private input = new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY, false, false)
    private nodeStartID = this.input.id
    private isSaved = false

    public constructor() {
        super()
    }

    static from(id: number, pos: readonly [number, number], display: BarDisplayType): BarDisplay {
        const newObj = new BarDisplay()
        newObj.posX = pos[0]
        newObj.posY = pos[1]
        newObj.display = display
        newObj.isSpawned = true
        newObj.isSaved = true
        newObj.nodeStartID = id
        newObj.refreshNodes()
        return newObj
    }

    toJSON() {
        return {
            display: this.display,
            id: this.nodeStartID,
            pos: [this.posX, this.posY] as const,
        }
    }

    public get value() {
        return this._value
    }

    destroy() {
        this.input.destroy()
    }

    draw() {
        if (!this.isSpawned) {
            this.posX = mouseX
            this.posY = mouseY
            if (!isCmdDown) {
                this.snapToGrid()
            }
        } else if (!this.isSaved) {
            fileManager.saveState()
            this.isSaved = true
        }

        if (this.isMoving) {
            this.posX = mouseX + this.offsetMouseX
            this.posY = mouseY + this.offsetMouseY
            if (!isCmdDown) {
                this.snapToGrid()
            }
        }


        this._value = this.input.value

        if (this.isMouseOver()) {
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
        } else {
            stroke(0)
        }

        strokeWeight(4)
        const [w, h] = this.getWidthAndHeight()
        this.input.updatePosition(this.posX - w / 2 - INPUT_X_DISTANCE, this.posY)

        const backColor: Color = (this._value) ? [20, 255, 20] : [80, 80, 80]
        fill(...backColor)
        rect(this.posX - w / 2, this.posY - h / 2, w, h)

        line(this.posX - w / 2, this.posY, this.input.posX, this.input.posY)
        this.input.draw()
    }

    getWidthAndHeight() {
        switch (this.display) {
            case "h":
                return [WIDTH, HEIGHT] as const
            case "v":
                return [HEIGHT, WIDTH] as const
            case "px":
                return [HEIGHT, HEIGHT] as const
            case "PX":
                return [WIDTH, WIDTH] as const
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
            this.posX = mouseX
            this.posY = mouseY
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
            const newDisplay = (() => {
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
            })()
            this.display = newDisplay
        }
    }

}
