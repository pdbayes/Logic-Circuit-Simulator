import { Mode } from "./Enums.js"
import { wireMng, mode, fillForBoolean } from "../simulator.js"
import { addLiveNode, ComponentState, GRID_STEP, HasPosition, PositionSupport, removeLiveNode } from "./Component.js"


export enum ConnectionState {
    FREE,
    TAKEN,
}

const DIAMETER = 8
const HIT_RANGE = DIAMETER + 2 // not more to avoid matching more than 1 vertically if aligned on grid

// This should just be Component, but it then has some cyclic 
// type definition issue which causes problems
type NodeParent = HasPosition & { isMoving: boolean, state: ComponentState }

export class Node extends PositionSupport {

    private _connectionState = ConnectionState.FREE
    private _isAlive = true
    private _value = false

    constructor(
        public readonly id: number,
        public readonly parent: NodeParent,
        private _gridOffsetX: number,
        private _gridOffsetY: number,
        public readonly isOutput = false,
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

    public get connectionState() {
        return this._connectionState
    }

    public set connectionState(state: number) {
        this._connectionState = state
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

    public get acceptsMoreConnections() {
        return this.isOutput || this.connectionState === ConnectionState.FREE
    }

    updatePositionFromParent() {
        return this.setPosition(
            this.parent.posX + this._gridOffsetX * GRID_STEP,
            this.parent.posY + this._gridOffsetY * GRID_STEP,
            false,
        ) ?? [this.posX, this.posY]
    }

    isMouseOver() {
        return mode >= Mode.CONNECT && dist(mouseX, mouseY, this.posX, this.posY) < HIT_RANGE / 2
    }

    mouseClicked() {
        if (this.isMouseOver() && this.acceptsMoreConnections) {
            wireMng.addNode(this)
            return true
        }
        return false
    }

}
