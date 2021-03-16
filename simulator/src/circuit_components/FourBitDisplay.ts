import { currMouseAction, backToEdit } from "../menutools.js"
import { MouseAction, Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, fileManager, fillForFraction, isUndefined, mode } from "../simulator.js"

const WIDTH = 36
const HEIGHT = 54
const INPUT_X_DISTANCE = 15
const INPUT_Y_SPACING = 15
const FIRST_Y_OFFSET = INPUT_Y_SPACING * 3 / 2

const DEFAULT_RADIX = 10

export class FourBitDisplay {

    private _value = 0
    private name = ""
    private radix = DEFAULT_RADIX
    private posX = mouseX
    private posY = mouseY
    private diameter = 25
    private isSpawned = false
    private isMoving = false
    private offsetMouseX = 0
    private offsetMouseY = 0
    private inputs: [Node, Node, Node, Node] = [
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET - 0 * INPUT_Y_SPACING, false, false),
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET - 1 * INPUT_Y_SPACING, false, false),
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET - 2 * INPUT_Y_SPACING, false, false),
        new Node(this.posX - WIDTH / 2 - INPUT_X_DISTANCE, this.posY + FIRST_Y_OFFSET - 3 * INPUT_Y_SPACING, false, false),
    ]
    private nodeStartID = this.inputs[0]!.id
    private isSaved = false

    static from(id: number, pos: readonly [number, number], radix: number | undefined, name: string | undefined): FourBitDisplay {
        const newObj = new FourBitDisplay()
        newObj.posX = pos[0]
        newObj.posY = pos[1]
        newObj.radix = radix ?? DEFAULT_RADIX
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
            radix: this.radix === DEFAULT_RADIX ? undefined : this.radix,
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
            offset -= INPUT_Y_SPACING
            binaryStringRep = +input.value + binaryStringRep
        }
        this._value = parseInt(binaryStringRep, 2)

        const maxValue = (1 << this.inputs.length) - 1
        const backColor = fillForFraction(this._value / maxValue)

        if (this.isMouseOver()) {
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
        } else {
            stroke(0)
        }

        strokeWeight(4)
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

        const textColor = backColor[0] + backColor[1] + backColor[2] > 3 * 127 ? 0 : 0xFF
        fill(textColor)

        textSize(10)
        textAlign(CENTER, CENTER)
        textStyle(NORMAL)
        text(binaryStringRep, this.posX, this.posY - HEIGHT / 2 + 8)

        textSize(18)
        textStyle(BOLD)

        const caption = this.value.toString(this.radix).toUpperCase()
        text(caption, this.posX, this.posY + WIDTH / 6)
    }

    refreshNodes() {
        let currentID = this.nodeStartID
        for (const input of this.inputs) {
            input.id = currentID++
        }
    }

    isMouseOver() {
        return mode >= Mode.CONNECT &&
            dist(mouseX, mouseY, this.posX, this.posY) < this.diameter / 2
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

    doubleClicked() {
        if (this.isMouseOver()) {
            this.radix = this.radix === 10 ? 16 : 10
        }
    }

}
