import { currMouseAction, backToEdit } from "../menutools.js"
import { MouseAction, Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, fileManager, inRect, isUndefined, mode } from "../simulator.js"

const WIDTH = 40
const HEIGHT = 100
const INPUT_X_DISTANCE = 15
const INPUT_Y_SPACING = 15
const FIRST_Y_OFFSET = -INPUT_Y_SPACING * 6 / 2

export class AsciiDisplay {

    private _value = 0
    private name = ""
    private posX = mouseX
    private posY = mouseY
    private isSpawned = false
    private isMoving = false
    private offsetMouseX = 0
    private offsetMouseY = 0
    private inputs: [Node, Node, Node, Node, Node, Node, Node] = [
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET + 0 * INPUT_Y_SPACING, false, false),
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET + 1 * INPUT_Y_SPACING, false, false),
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET + 2 * INPUT_Y_SPACING, false, false),
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET + 3 * INPUT_Y_SPACING, false, false),
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET + 4 * INPUT_Y_SPACING, false, false),
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET + 5 * INPUT_Y_SPACING, false, false),
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET + 6 * INPUT_Y_SPACING, false, false),
    ]
    private nodeStartID = this.inputs[0].id
    private isSaved = false

    static from(id: number, pos: readonly [number, number], name: string | undefined): AsciiDisplay {
        const newObj = new AsciiDisplay()
        newObj.posX = pos[0]
        newObj.posY = pos[1]
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
            this.posX = mouseX
            this.posY = mouseY
        } else if (!this.isSaved) {
            fileManager.saveState()
            this.isSaved = true
        }

        if (this.isMoving) {
            this.posX = mouseX + this.offsetMouseX
            this.posY = mouseY + this.offsetMouseY
        }

        let offset = FIRST_Y_OFFSET
        let binaryStringRep = ""
        for (const input of this.inputs) {
            input.updatePosition(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + offset)
            offset += INPUT_Y_SPACING
            binaryStringRep = +input.value + binaryStringRep
        }
        this._value = parseInt(binaryStringRep, 2)

        if (this.isMouseOver()) {
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
        } else {
            stroke(0)
        }

        strokeWeight(4)
        fill(0xFF)
        rect(this.posX - WIDTH / 2, this.posY - HEIGHT / 2, WIDTH, HEIGHT)

        for (const input of this.inputs) {
            line(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, input.posY, this.posX - WIDTH / 2, input.posY)
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
            text(this.name, this.posX + WIDTH / 2 + 5, this.posY)
        }

        fill(0)

        textSize(9)
        textAlign(CENTER, CENTER)
        textStyle(NORMAL)
        text(binaryStringRep, this.posX, this.posY - HEIGHT / 2 + 10)


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
        return mode >= Mode.CONNECT && inRect(this.posX, this.posY, WIDTH, HEIGHT, mouseX, mouseY)
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
