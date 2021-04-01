import { isDefined, isUnset, Mode, TriState, Unset, int, toTriState, isNull, isNotNull } from "../utils"
import { mode, modifierKeys, wireMgr } from "../simulator"
import { ComponentState, InputNodeRepr, OutputNodeRepr } from "./Component"
import { HasPosition, DrawableWithPosition } from "./Drawable"
import { NodeManager } from "../NodeManager"
import { fillForBoolean, GRID_STEP } from "../drawutils"
import { Wire } from "./Wire"


const DIAMETER = 8
const HIT_RANGE = DIAMETER + 2 // not more to avoid matching more than 1 vertically if aligned on grid

// This should just be Component, but it then has some cyclic 
// type definition issue which causes problems
type NodeParent = HasPosition & { isMoving: boolean, state: ComponentState, setNeedsRecalc(): void }

export type Node = NodeIn | NodeOut

abstract class NodeBase extends DrawableWithPosition {

    public readonly id: int
    private _isAlive = true
    private _value: TriState = false
    private _forceValue: TriState | undefined

    constructor(
        nodeSpec: InputNodeRepr | OutputNodeRepr,
        public readonly parent: NodeParent,
        private _gridOffsetX: number,
        private _gridOffsetY: number,
    ) {
        super(null)
        this.id = nodeSpec.id
        if ("force" in nodeSpec) {
            this._forceValue = toTriState(nodeSpec.force)
        }
        NodeManager.addLiveNode(this.asNode)
        this.updatePositionFromParent()
    }

    private get asNode(): Node {
        return this as unknown as Node
    }

    get isOutput(): boolean {
        return Node.isOutput(this.asNode)
    }

    get width() {
        return DIAMETER
    }

    get height() {
        return DIAMETER
    }

    isOver(x: number, y: number) {
        return mode >= Mode.CONNECT
            && this.acceptsMoreConnections
            && dist(x, y, this.posX, this.posY) < HIT_RANGE / 2
    }

    destroy() {
        this._isAlive = false
        NodeManager.removeLiveNode(this.asNode)
    }

    doDraw(isMouseOver: boolean) {
        if (mode < Mode.CONNECT) {
            return
        }

        fillForBoolean(this.value)

        const [circleColor, thickness] =
            isDefined(this._forceValue) && mode >= Mode.FULL
                ? [[180, 0, 0], 3] // show forced nodes with red border if not in teacher mode
                : [[0, 0, 0], 1]   // show normally

        stroke(circleColor)
        strokeWeight(thickness)
        circle(this.posX, this.posY, DIAMETER)

        noStroke()
        if (mode >= Mode.FULL && !isUnset(this._value) && !isUnset(this.value) && this._value !== this.value) {
            // forced value to something that is contrary to normal output
            textAlign(CENTER, CENTER)
            fill(circleColor)
            textSize(14)
            textStyle(BOLD)
            text("!", this.posX, this.posY - 12)
        }

        if (isMouseOver) {
            fill(128, 128)
            circle(this.posX, this.posY, DIAMETER * 2)
        }
    }

    public get isAlive() {
        return this._isAlive
    }

    public get value(): TriState {
        return isDefined(this._forceValue) ? this._forceValue : this._value
    }

    public set value(val: TriState) {
        const oldVisibleValue = this.value
        if (val !== this._value) {
            this._value = val
            this.propagateNewValueIfNecessary(oldVisibleValue)
        }
    }

    private propagateNewValueIfNecessary(oldVisibleValue: TriState) {
        const newVisibleValue = this.value
        if (newVisibleValue !== oldVisibleValue) {
            this.propagateNewValue(newVisibleValue)
        }
    }

    protected abstract propagateNewValue(newValue: TriState): void

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

    public abstract get acceptsMoreConnections(): boolean

    updatePositionFromParent() {
        return this.setPosition(
            this.parent.posX + this._gridOffsetX * GRID_STEP,
            this.parent.posY + this._gridOffsetY * GRID_STEP,
            false,
        ) ?? [this.posX, this.posY]
    }

    get cursorWhenMouseover() {
        return "crosshair"
    }

    mouseDoubleClick(__: MouseEvent | TouchEvent) {
        if (mode >= Mode.FULL && modifierKeys.isOptionDown && this.isOutput && !(this.parent.constructor.name === "LogicInput")) {
            const oldVisibleValue = this.value
            this._forceValue = (() => {
                switch (this._forceValue) {
                    case undefined: return Unset
                    case Unset: return false
                    case false: return true
                    case true: return undefined
                }
            })()
            this.propagateNewValueIfNecessary(oldVisibleValue)
            this.setNeedsRedraw("changed forced output value")
        }
    }

    mouseDown(__: MouseEvent | TouchEvent) {
        wireMgr.addNode(this.asNode)
        return { lockMouseOver: false }
    }

    mouseUp(__: MouseEvent | TouchEvent) {
        wireMgr.addNode(this.asNode)
    }

}

export class NodeIn extends NodeBase {

    public readonly _tag = "_nodein"

    private _incomingWire: Wire | null = null

    get incomingWire() {
        return this._incomingWire
    }

    set incomingWire(wire: Wire | null) {
        this._incomingWire = wire
        if (isNull(wire)) {
            this.value = false
        } else {
            this.value = wire.startNode.value
        }
    }

    get acceptsMoreConnections() {
        return isNull(this._incomingWire)
    }

    protected propagateNewValue(__newValue: TriState) {
        this.parent.setNeedsRecalc()
    }

}


export class NodeOut extends NodeBase {

    public readonly _tag = "_nodeout"

    private readonly _outgoingWires: Wire[] = []

    addOutgoingWire(wire: Wire) {
        this._outgoingWires.push(wire)
    }

    removeOutgoingWire(wire: Wire) {
        const i = this._outgoingWires.indexOf(wire)
        if (i !== -1) {
            this._outgoingWires.splice(i, 1)
        }
    }

    get acceptsMoreConnections() {
        return true
    }

    protected propagateNewValue(newValue: TriState) {
        for (const wire of this._outgoingWires) {
            if (isNotNull(wire.endNode)) {
                wire.endNode.value = newValue
            }
        }
    }

}

export const Node = {
    isOutput(node: Node): node is NodeOut {
        return node._tag === "_nodeout"
    },
}