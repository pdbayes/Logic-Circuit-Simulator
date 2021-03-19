import { currMouseAction, backToEdit } from "../menutools.js"
import { MouseAction, Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, fileManager, inRect, isCmdDown, isUndefined, mode } from "../simulator.js"
import { Component, GRID_STEP } from "./Component.js"

const GRID_WIDTH = 4
const GRID_HEIGHT = 8

export class AsciiDisplay extends Component {

    private _value = 0
    private name = ""
    private isSpawned = false
    private isMoving = false
    private offsetMouseX = 0
    private offsetMouseY = 0
    private inputs: [Node, Node, Node, Node, Node, Node, Node] = [
        new Node(this, -3, -3),
        new Node(this, -3, -2),
        new Node(this, -3, -1),
        new Node(this, -3, +0),
        new Node(this, -3, +1),
        new Node(this, -3, +2),
        new Node(this, -3, +3),
    ]
    private nodeStartID = this.inputs[0].id
    private isSaved = false

    public constructor() {
        super()
    }

    static from(id: number, pos: readonly [number, number], name: string | undefined): AsciiDisplay {
        const newObj = new AsciiDisplay()
        newObj.updatePosition(pos[0], pos[1], false)
        newObj.isSpawned = true
        newObj.isSaved = true
        newObj.nodeStartID = id
        newObj.refreshNodes()
        if (!isUndefined(name)) {
            newObj.name = name
        }
        return newObj
    }

    toJSON() {
        return {
            name: (this.name) ? this.name : undefined,
            id: this.nodeStartID,
            pos: [this.posX, this.posY] as const,
        }
    }

    public get value() {
        return this._value
    }

    destroy() {
        for (const input of this.inputs) {
            input.destroy()
        }
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

        let binaryStringRep = ""
        for (const input of this.inputs) {
            input.updatePositionFromParent()
            binaryStringRep = +input.value + binaryStringRep
        }
        this._value = parseInt(binaryStringRep, 2)

        if (this.isMouseOver()) {
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
        } else {
            stroke(0)
        }

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP

        strokeWeight(4)
        fill(0xFF)
        rect(this.posX - width / 2, this.posY - height / 2, width, height)

        for (const input of this.inputs) {
            line(input.posX, input.posY, this.posX - width / 2, input.posY)
        }
        for (const input of this.inputs) {
            input.draw()
        }

        noStroke()
        fill(0)
        textSize(18)
        textStyle(ITALIC)
        textAlign(LEFT, CENTER)
        if (this.name) {
            text(this.name, this.posX + width / 2 + 5, this.posY)
        }

        fill(0)

        textSize(9)
        textAlign(CENTER, CENTER)
        textStyle(NORMAL)
        text(binaryStringRep, this.posX, this.posY - height / 2 + 10)


        textAlign(CENTER, CENTER)
        if (this._value < 32) {
            // non-printable
            textSize(16)
            textStyle(NORMAL)
            text("\\" + this._value, this.posX, this.posY)

        } else {
            textSize(18)
            textStyle(BOLD)
            text("'" + String.fromCharCode(this._value) + "'", this.posX, this.posY)
        }
    }

    refreshNodes() {
        let currentID = this.nodeStartID
        for (const input of this.inputs) {
            input.id = currentID++
        }
    }

    isMouseOver() {
        return mode >= Mode.CONNECT && inRect(this.posX, this.posY, GRID_WIDTH * GRID_STEP, GRID_HEIGHT * GRID_STEP, mouseX, mouseY)
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
        let didIt = false
        for (const input of this.inputs) {
            if (input.isMouseOver()) {
                input.mouseClicked()
                didIt = true
            }
        }

        return didIt || this.isMouseOver()
    }
}
