import { Mode, isNull, isNotNull, isDefined } from "../utils"
import { mode, setToolCursor } from "../simulator"
import { Node, NodeIn } from "./Node"
import * as t from "io-ts"
import { NodeID } from "./Component"
import { wireLineBetweenComponents, colorForBoolean, COLOR_MOUSE_OVER, COLOR_COMPONENT_BORDER, COLOR_WIRE_BORDER } from "../drawutils"
import { Drawable, DrawContext } from "./Drawable"
import { RedrawManager } from "../RedrawRecalcManager"

export const WireRepr = t.tuple([NodeID, NodeID], "Wire")
export type WireRepr = t.TypeOf<typeof WireRepr>

const WIRE_WIDTH = 8

export class Wire extends Drawable {

    private _endNode: NodeIn | null = null

    constructor(
        private _startNode: Node
    ) {
        super()
    }

    toJSON(): WireRepr {
        const endID = this._endNode?.id ?? -1
        return [this._startNode.id, endID]
    }

    public get startNode(): Node {
        return this._startNode
    }

    public get endNode(): Node | null {
        return this._endNode
    }

    public setSecondNode(secondNode: Node | null) {
        // not the same as setting endNode; this may change startNode as well
        // if we need to reverse input and output

        if (!secondNode) {
            return
        }
        if (!Node.isOutput(secondNode)) {
            if (!Node.isOutput(this._startNode)) {
                console.log("WARN connecting two input nodes")
                return
            }
            this._endNode = secondNode

        } else {
            if (Node.isOutput(this._startNode)) {
                console.log("WARN connecting two output nodes")
                return
            }

            // switch nodes
            const tempNode = this._startNode
            this._startNode = secondNode
            this._endNode = tempNode
        }

        this._startNode.addOutgoingWire(this)
        this._endNode.incomingWire = this
        this._endNode.value = this.startNode.value
    }

    destroy() {
        if (Node.isOutput(this._startNode)) {
            this._startNode.removeOutgoingWire(this)
        }
        if (isNotNull(this._endNode)) {
            this._endNode.incomingWire = null
        }
    }

    get isAlive() {
        // the start node should be alive and the end node
        // should either be null (wire being drawn) or alive
        // (wire set) for the wire to be alive
        return this.startNode.isAlive &&
            (isNull(this.endNode) || this.endNode.isAlive)
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        stroke(COLOR_COMPONENT_BORDER)
        const mainStrokeWidth = WIRE_WIDTH / 2
        strokeWeight(mainStrokeWidth)

        if (isNull(this.endNode)) {
            // draw to mouse position
            wireLineBetweenComponents(this.startNode, mouseX, mouseY)

        } else {
            const bezierAnchorPointDistX = Math.max(25, Math.abs(this.endNode.posX - this.startNode.posX) / 3)
            const bezierAnchorPointDistY = Math.max(25, Math.abs(this.endNode.posY - this.startNode.posY) / 3)

            noFill()



            // just a straight line if nodes are aligned on X or Y
            const doDrawWire = (this.startNode.posX === this.endNode.posX || this.startNode.posY === this.endNode.posY)
                ? () => line(
                    this.startNode.posX, this.startNode.posY,
                    this.endNode!.posX, this.endNode!.posY)
                : () => bezier(
                    this.startNode.posX, this.startNode.posY,
                    ...this.startNode.wireBezierAnchor(bezierAnchorPointDistX, bezierAnchorPointDistY),
                    ...this.endNode!.wireBezierAnchor(bezierAnchorPointDistX, bezierAnchorPointDistY),
                    this.endNode!.posX, this.endNode!.posY)

            if (ctx.isMouseOver) {
                strokeWeight(mainStrokeWidth + 2)
                stroke(...COLOR_MOUSE_OVER)
            } else {
                stroke(COLOR_WIRE_BORDER)
            }
            doDrawWire()

            strokeWeight(mainStrokeWidth - 2)
            stroke(...colorForBoolean(this.startNode.value))
            doDrawWire()

        }
    }

    isOver(x: number, y: number): boolean {
        if (mode < Mode.CONNECT || !this.startNode.isAlive || !this.endNode || !this.endNode.isAlive) {
            return false
        }

        const distance = []

        distance.push(dist(this.startNode.posX, this.startNode.posY,
            x, y))
        distance.push(dist(this.endNode.posX, this.endNode.posY,
            x, y))
        const wireLength = dist(this.startNode.posX, this.startNode.posY,
            this.endNode.posX, this.endNode.posY)

        if (distance[0] + distance[1] >= wireLength - (WIRE_WIDTH / (10 * 2)) &&
            distance[0] + distance[1] <= wireLength + (WIRE_WIDTH / (10 * 2))) {
            return true
        }
        return false
    }

}

export class WireManager {

    private readonly _wires: Wire[] = []
    private _isAddingWire = false

    public get wires(): readonly Wire[] {
        return this._wires
    }

    public get isAddingWire() {
        return this._isAddingWire
    }

    draw(g: CanvasRenderingContext2D, mouseOverComp: Drawable | null) {
        this.removeDeadWires()
        for (const wire of this._wires) {
            wire.draw(g, mouseOverComp)
        }
    }

    private removeDeadWires() {
        let i = 0
        while (i < this._wires.length) {
            const wire = this._wires[i]
            if (!wire.isAlive) {
                wire.destroy()
                this._wires.splice(i, 1)
            } else {
                i++
            }
        }
    }

    addNode(newNode: Node) {
        if (!this._isAddingWire) {
            // start drawing a new wire
            this._wires.push(new Wire(newNode))
            this._isAddingWire = true
            setToolCursor("crosshair")

        } else {
            // complete the new wire
            const currentWireIndex = this._wires.length - 1
            const currentWire = this._wires[currentWireIndex]
            let created = false
            if (newNode !== currentWire.startNode) {
                if (currentWire.startNode.isOutput !== newNode.isOutput && newNode.acceptsMoreConnections) {
                    // normal, create
                    currentWire.setSecondNode(newNode)
                    created = true
                } else if (!Node.isOutput(newNode)) {
                    const otherStartNode = newNode.incomingWire?.startNode
                    if (isDefined(otherStartNode)
                        && otherStartNode.acceptsMoreConnections
                        && otherStartNode.isOutput !== currentWire.startNode.isOutput) {
                        // create new connection with other end of this node
                        currentWire.setSecondNode(otherStartNode)
                        created = true
                    }
                }
            }

            if (!created) {
                delete this._wires[currentWireIndex]
                this._wires.length--
            }

            this._isAddingWire = false
            setToolCursor(null)
        }
        RedrawManager.addReason("started or stopped wire", null)
    }

    deleteWire(wire: Wire) {
        wire.destroy()
        for (let i = 0; i < this._wires.length; i++) {
            if (this._wires[i] === wire) {
                this._wires.splice(i, 1)
                break
            }
        }
    }

    clearAllWires() {
        for (const wire of this._wires) {
            wire.destroy()
        }
        this._wires.splice(0, this._wires.length)
    }

    tryCancelWire() {
        if (this._isAddingWire) {
            // adding the start node as end node to trigger deletion
            this.addNode(this._wires[this._wires.length - 1].startNode)
        }
    }

}
