import { InputState, Mode } from "./Enums.js"
import { wireMng, mode } from "../simulator.js"

export let nodeList: Node[] = []

let nextNodeID = 0

export class Node {

    // TODO check which of these should be private
    public diameter: number = 8
    public hitRange = this.diameter + 10
    public inputState: number = InputState.FREE // only once input per node
    public isAlive = true // not destroyed
    public brotherNode: Node | null = null // for short circuit
    public id = nextNodeID++

    constructor(
        public posX: number,
        public posY: number,
        public isOutput = false,
        public value = false
    ) {
        nodeList[this.id] = this
    }

    // public get id() { return this._id }

    destroy() {
        this.isAlive = false
        delete nodeList[this.id]
    }

    draw() {
        fillValue(this.value)

        stroke(0)
        strokeWeight(1)
        circle(this.posX, this.posY, this.diameter)

        if (this.isMouseOver()) {
            fill(128, 128)
            noStroke()
            circle(this.posX, this.posY, this.hitRange)
        }

        /*noStroke();
        fill(0);
        textSize(12);
        textStyle(NORMAL);
        text(this.id, this.posX - 20, this.posY + 25);*/
    }

    setID(newID: number) {
        if (nodeList[this.id] === this) {
            delete nodeList[this.id]
        }

        this.id = newID
        nodeList[newID] = this

        //update max id
        if (newID >= nextNodeID) {
            nextNodeID = newID + 1
        }
    }

    setInputState(state: number) {
        this.inputState = state
    }

    setBrother(brotherNode: Node) {
        this.brotherNode = brotherNode
    }

    getBrother() {
        return this.brotherNode
    }

    getValue() {
        return this.value
    }

    setValue(value: boolean) {
        this.value = value
    }

    updatePosition(posX: number, posY: number) {
        this.posX = posX
        this.posY = posY
    }

    isMouseOver() {
        if (mode >= Mode.CONNECT && dist(mouseX, mouseY, this.posX, this.posY) < (this.hitRange) / 2) {
            return true
        }
        return false
    }

    mouseClicked() {
        if (this.isMouseOver() && (this.inputState === InputState.FREE || this.isOutput)) {
            wireMng.addNode(this)
            return true
        }
        return false
    }


};

export function fillValue(value: boolean) {
    if (value) {
        fill(255, 193, 7)
    } else {
        fill(52, 58, 64)
    }
}