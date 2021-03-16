import { currMouseAction, backToEdit } from "../menutools.js"
import { MouseAction, Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, fileManager, fillForBoolean, isUndefined, mode } from "../simulator.js"

export class LogicOutput {

    private _value = false
    private name = ""
    private posX = mouseX
    private posY = mouseY
    private diameter = 25
    private isSpawned = false
    private isMoving = false
    private offsetMouseX = 0
    private offsetMouseY = 0
    private input: Node | undefined = new Node(this.posX - 30, this.posY, false, this.value)
    private nodeStartID = this.input!.id
    private isSaved = false

    static from(id: number, pos: readonly [number, number], name: string | undefined): LogicOutput {
        const newObj = new LogicOutput()
        newObj.posX = pos[0]
        newObj.posY = pos[1]
        newObj.isSpawned = true
        newObj.isSaved = true
        newObj.nodeStartID = id
        if (!isUndefined(name)) {
            newObj.name = name
        }
        newObj.refreshNodes()
        return newObj
    }

    toJSON() {
        return {
            name: (this.name) ? this.name : undefined,
            id: this.nodeStartID,
            pos: [this.posX, this.posY] as const,
        }
    }

    public get value(): boolean {
        return this._value
    }

    destroy() {
        if (this.input) {
            this.input.destroy()
            delete this.input
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

        if (this.input) {
            this.input.updatePosition(this.posX - 30, this.posY)
            this._value = this.input.value
        }

        fillForBoolean(this.value)

        if (this.isMouseOver()) {
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
        } else {
            stroke(0)
        }


        strokeWeight(4)
        line(this.posX, this.posY, this.posX - 30, this.posY)
        circle(this.posX, this.posY, this.diameter)

        this.input?.draw()

        noStroke()
        fill(0)
        textSize(18)
        textStyle(ITALIC)
        textAlign(LEFT, CENTER)
        if (this.name) {
            text(this.name, this.posX + 21, this.posY)
        }

        textSize(18)
        textAlign(CENTER, CENTER)
        if (this.value) {
            textStyle(BOLD)
            text('1', this.posX, this.posY)
        }
        else {
            textStyle(NORMAL)
            fill(255)
            text('0', this.posX, this.posY)
        }
    }

    refreshNodes() {
        let currentID = this.nodeStartID
        if (this.input) {
            this.input.id = currentID++
        }
    }

    isMouseOver() {
        if (mode >= Mode.CONNECT && dist(mouseX, mouseY, this.posX, this.posY) < this.diameter / 2) { return true }
        return false
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
        if (this.isMouseOver() || (this.input?.isMouseOver() ?? false)) {
            this.input?.mouseClicked()
            return true
        }
        return false
    }
}
