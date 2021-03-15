import { InputState, Mode } from "./Enums.js"
import { wireMng, mode } from "../simulator.js"

export let nodeList: Node[] = []

let nextNodeID = 0

export class Node {

    private diameter: number = 8
    private hitRange = this.diameter + 10
    private _inputState: number = InputState.FREE // only once input per node
    private _isAlive = true // not destroyed
    private _brotherNode: Node | null = null // for short circuit
    private _id = nextNodeID++

    constructor(
        private _posX: number,
        private _posY: number,
        private _isOutput = false,
        private _value = false
    ) {
        nodeList[this._id] = this
    }

    // public get id() { return this._id }

    destroy() {
        this._isAlive = false
        delete nodeList[this._id]
    }

    draw() {
        fillValue(this._value)

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

    public get id() {
        return this._id
    }

    public get posX() {
        return this._posX
    }

    public get posY() {
        return this._posY
    }

    public get isAlive() {
        return this._isAlive
    }

    public get isOutput() {
        return this._isOutput
    }

    public set id(newID: number) {
        if (nodeList[this.id] === this) {
            delete nodeList[this.id]
        }

        this._id = newID
        nodeList[newID] = this

        //update max id
        if (newID >= nextNodeID) {
            nextNodeID = newID + 1
        }
    }

    public get inputState() {
        return this._inputState
    }

    public set inputState(state: number) {
        this._inputState = state
    }

    public get brotherNode() {
        return this._brotherNode
    }

    public set brotherNode(newNode: Node | null) {
        this._brotherNode = newNode
    }

    public get value(): boolean {
        return this._value
    }

    public set value(val: boolean) {
        this._value = val
    }

    updatePosition(posX: number, posY: number) {
        this._posX = posX
        this._posY = posY
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