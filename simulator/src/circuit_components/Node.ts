import { InputState, Mode } from "./Enums.js"
import { wireMng, mode, fillForBoolean } from "../simulator.js"
import { addLiveNode, GRID_STEP, HasPosition, PositionSupport, removeLiveNode } from "./Component.js"


const DIAMETER = 8
const HIT_RANGE = DIAMETER + 2 // not more to avoid matching more than 1 vertically if aligned on grid

export class Node extends PositionSupport {

    private _inputState: number = InputState.FREE // only once input per node
    private _isAlive = true // not destroyed

    constructor(
        public readonly id: number,
        private _parent: HasPosition,
        private _gridOffsetX: number,
        private _gridOffsetY: number,
        private _isOutput = false,
        private _value = false
    ) {
        super(null)
        addLiveNode(this)
        this.updatePositionFromParent()
    }

    destroy() {
        this._isAlive = false
        removeLiveNode(this)
    }

    draw() {
        fillForBoolean(this._value)

        stroke(0)
        strokeWeight(1)
        circle(this.posX, this.posY, DIAMETER)

        if (this.isMouseOver()) {
            fill(128, 128)
            noStroke()
            circle(this.posX, this.posY, DIAMETER * 2)
        }
    }

    public get isAlive() {
        return this._isAlive
    }

    public get isOutput() {
        return this._isOutput
    }

    public get inputState() {
        return this._inputState
    }

    public set inputState(state: number) {
        this._inputState = state
    }

    public get value(): boolean {
        return this._value
    }

    public set value(val: boolean) {
        this._value = val
    }

    public get gridOffsetX() {
        return this._gridOffsetX
    }

    public set gridOffsetX(newVal: number) {
        this._gridOffsetX = newVal
        this.updatePositionFromParent()
    }

    public get gridOffsetY() {
        return this._gridOffsetY
    }

    public set gridOffsetY(newVal: number) {
        this._gridOffsetY = newVal
        this.updatePositionFromParent()
    }

    updatePositionFromParent() {
        return this.setPosition(
            this._parent.posX + this._gridOffsetX * GRID_STEP,
            this._parent.posY + this._gridOffsetY * GRID_STEP,
            false,
        ) ?? [this.posX, this.posY]
    }

    isMouseOver() {
        return mode >= Mode.CONNECT && dist(mouseX, mouseY, this.posX, this.posY) < HIT_RANGE / 2
    }

    mouseClicked() {
        if (this.isMouseOver() && (this.inputState === InputState.FREE || this.isOutput)) {
            wireMng.addNode(this)
            return true
        }
        return false
    }

}
