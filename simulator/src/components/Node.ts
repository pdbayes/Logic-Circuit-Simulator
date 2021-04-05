import { isDefined, isUnset, Mode, TriState, Unset, toTriState, isNull, isNotNull } from "../utils"
import { mode, modifierKeys, wireMgr } from "../simulator"
import { ComponentState, InputNodeRepr, OutputNodeRepr } from "./Component"
import { DrawableWithPosition } from "./Drawable"
import { NodeManager } from "../NodeManager"
import { COLOR_DARK_RED, fillForBoolean, GRID_STEP } from "../drawutils"
import { Wire } from "./Wire"


const DIAMETER = 8
const HIT_RANGE = DIAMETER + 2 // not more to avoid matching more than 1 vertically if aligned on grid

// This should just be Component, but it then has some cyclic 
// type definition issue which causes problems
type NodeParent = DrawableWithPosition & { isMoving: boolean, state: ComponentState, setNeedsRecalc(): void, allowsForcedOutputs: boolean }

export type Node = NodeIn | NodeOut

abstract class NodeBase extends DrawableWithPosition {

    public readonly id: number
    private _isAlive = true
    private _value: TriState = false
    protected _forceValue: TriState | undefined

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

    get unrotatedWidth() {
        return DIAMETER
    }

    get unrotatedHeight() {
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

    doDraw(g: CanvasRenderingContext2D, isMouseOver: boolean) {
        if (mode < Mode.CONNECT) {
            return
        }

        fillForBoolean(this.value)

        const [circleColor, thickness] =
            isDefined(this._forceValue) && mode >= Mode.FULL
                ? [COLOR_DARK_RED, 3] // show forced nodes with red border if not in teacher mode
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

    protected propagateNewValueIfNecessary(oldVisibleValue: TriState) {
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

    public get posXInParentTransform() {
        return this.parent.posX + this._gridOffsetX * GRID_STEP
    }

    public get posYInParentTransform() {
        return this.parent.posY + this._gridOffsetY * GRID_STEP
    }

    updatePositionFromParent() {
        const [appliedGridOffsetX, appliedGridOffsetY] = (() => {
            switch (this.parent.orient) {
                case "e": return [+this._gridOffsetX, +this._gridOffsetY]
                case "w": return [-this._gridOffsetX, -this._gridOffsetY]
                case "s": return [-this._gridOffsetY, +this._gridOffsetX]
                case "n": return [+this._gridOffsetY, -this._gridOffsetX]
            }
        })()
        return this.setPosition(
            this.parent.posX + appliedGridOffsetX * GRID_STEP,
            this.parent.posY + appliedGridOffsetY * GRID_STEP,
            false
        ) ?? [this.posX, this.posY]
    }

    public wireBezierAnchor(distX: number, distY: number): [number, number] {
        const wireProlongDirection = (() => {
            switch (this.parent.orient) {
                case "e": return this.isOutput ? "w" : "e"
                case "w": return this.isOutput ? "e" : "w"
                case "s": return this.isOutput ? "n" : "s"
                case "n": return this.isOutput ? "s" : "n"
            }
        })()
        switch (wireProlongDirection) {
            case "e": // going east, so anchor point is before on X
                return [this.posX - distX, this.posY]
            case "w": // going west, so anchor point is after on X
                return [this.posX + distX, this.posY]
            case "s":// going south, so anchor point is before on Y
                return [this.posX, this.posY - distY]
            case "n":// going north, so anchor point is after on Y
                return [this.posX, this.posY + distY]
        }
    }

    get cursorWhenMouseover() {
        return "crosshair"
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

    mouseDoubleClick(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClick(e)) {
            return true // already handled
        }
        if (mode >= Mode.FULL && modifierKeys.isOptionDown && this.isOutput && this.parent.allowsForcedOutputs) {
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
            return true
        }
        return false
    }

}

export const Node = {
    isOutput(node: Node): node is NodeOut {
        return node._tag === "_nodeout"
    },
}