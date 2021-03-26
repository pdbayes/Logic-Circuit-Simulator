import { isDefined, isUnset, Mode, toTriState, TriState, Unset } from "../utils.js"
import { wireMng, mode, fillForBoolean, modifierKeys } from "../simulator.js"
import { ComponentState, InputNodeRepr, OutputNodeRepr } from "./Component.js"
import { GRID_STEP, HasPosition, PositionSupport } from "./Position.js"
import { NodeManager } from "../NodeManager.js"


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

    public readonly id: number
    private _connectionState = ConnectionState.FREE
    private _isAlive = true
    private _value: TriState = false
    private _forceValue: TriState | undefined

    constructor(
        nodeSpec: InputNodeRepr | OutputNodeRepr,
        public readonly parent: NodeParent,
        private _gridOffsetX: number,
        private _gridOffsetY: number,
        public readonly isOutput: boolean,
    ) {
        super(null)
        this.id = nodeSpec.id
        if ("force" in nodeSpec) {
            this._forceValue = toTriState(nodeSpec.force)
        }
        NodeManager.addLiveNode(this)
        this.updatePositionFromParent()
    }

    destroy() {
        this._isAlive = false
        NodeManager.removeLiveNode(this)
    }

    draw() {
        if (mode < Mode.CONNECT) {
            return
        }

        fillForBoolean(this.value)

        const [circleColor, thickness] =
            isDefined(this._forceValue) && mode >= Mode.DESIGN_FULL
                ? [[180, 0, 0], 3] // show forced nodes with red border if not in teacher mode
                : [[0, 0, 0], 1]   // show normally

        stroke(circleColor)
        strokeWeight(thickness)
        circle(this.posX, this.posY, DIAMETER)

        noStroke()
        if (mode >= Mode.DESIGN_FULL && !isUnset(this._value) && !isUnset(this.value) && this._value !== this.value) {
            // forced value to something that is contrary to normal output
            textAlign(CENTER, CENTER)
            fill(circleColor)
            textSize(14)
            textStyle(BOLD)
            text("!", this.posX, this.posY - 12)
        }

        if (this.isMouseOver()) {
            fill(128, 128)
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

    public get value(): TriState {
        return isDefined(this._forceValue) ? this._forceValue : this._value
    }

    public set value(val: TriState) {
        this._value = val
    }

    public get forceValue() {
        return this._forceValue
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

    doubleClicked() {
        if (mode >= Mode.DESIGN_FULL && modifierKeys.isOptionDown && this.isOutput && this.isMouseOver()) {
            this._forceValue = (() => {
                switch (this._forceValue) {
                    case undefined: return Unset
                    case Unset: return false
                    case false: return true
                    case true: return undefined
                }
            })()
        }
    }

}
