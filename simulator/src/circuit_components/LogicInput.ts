import { currMouseAction, backToEdit } from "../menutools.js"
import { MouseAction, Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, fileManager, fillForBoolean, isCmdDown, isUndefined, mode } from "../simulator.js"
import { Component } from "./Component.js"

/**
 * Generate input for the circuit
 */
export class LogicInput extends Component {

    private _value = false
    private name = ""
    private diameter = 25
    private isSpawned = false
    private isMoving = false
    private offsetMouseX = 0
    private offsetMouseY = 0
    private output: Node | undefined = new Node(this.posX + 30, this.posY, true, this.value)
    private nodeStartID = this.output!.id
    private isSaved = false

    public constructor() {
        super()
    }

    static from(id: number, pos: readonly [number, number], value: boolean, name: string | undefined): LogicInput {
        const newObj = new LogicInput()
        newObj.posX = pos[0]
        newObj.posY = pos[1]
        newObj._value = value
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
            val: this.value ? 1 : 0,
        }
    }

    public get value(): boolean {
        return this._value
    }

    destroy() {
        if (this.output) {
            this.output.destroy()
            delete this.output
        }
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

        fillForBoolean(this.value)

        if (this.isMoving) {
            this.posX = mouseX + this.offsetMouseX
            this.posY = mouseY + this.offsetMouseY
            if (!isCmdDown) {
                this.snapToGrid()
            }
        }

        if (this.isMouseOver()) {
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
        } else {
            stroke(0)
        }

        strokeWeight(4)
        line(this.posX, this.posY, this.posX + 30, this.posY)
        circle(this.posX, this.posY, this.diameter)

        if (this.output) {
            this.output.updatePosition(this.posX + 30, this.posY)
            this.output.value = this.value
            this.output.draw()
        }

        this.printInfo()

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
        if (this.output) {
            this.output.id = currentID++
        }
    }


    printInfo() {
        noStroke()
        fill(0)
        textSize(18)
        textStyle(ITALIC)
        textAlign(RIGHT, CENTER)
        if (this.name) { text(this.name, this.posX - 25, this.posY) }
    }

    /**
     * Checking if mouse if over the input
     */
    isMouseOver(): boolean {
        if (mode >= Mode.TRYOUT && dist(mouseX, mouseY, this.posX, this.posY) < this.diameter / 2) { return true }
        return false
    }

    /**
     * Called when mouse is pressed
     * If the element is not spawned, it will be spawned.
     * Then if mouse is over OR the current action is MOVE then move it
     */
    mousePressed() {
        if (!this.isSpawned) {
            this.posX = mouseX
            this.posY = mouseY
            this.isSpawned = true
            backToEdit()
            return
        }

        if (mode >= Mode.CONNECT && this.isMouseOver() || currMouseAction === MouseAction.MOVE) {
            this.isMoving = true
            this.offsetMouseX = this.posX - mouseX
            this.offsetMouseY = this.posY - mouseY
        }
    }

    /**
     * Called when mouse is released
     * If the element was moving, release it. 
     */
    mouseReleased() {
        if (this.isMoving) {
            this.isMoving = false
        }
    }

    /**
     * Called when mouse is double clicked
     * If mouse is over this instance
     * Invert input value 
     */
    doubleClicked() {
        if (this.isMouseOver()) {
            this.toggle()
        }
    }

    mouseClicked() {
        if (this.isMouseOver() || (this.output?.isMouseOver() ?? false)) {
            this.output?.mouseClicked()
            return true
        }
        return false
    }

    toggle() {
        this._value = !this._value
    }

}
