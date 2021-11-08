import { Mode, isNull, isNotNull, isDefined, isUndefined } from "../utils"
import { mode, mouseX, mouseY, offsetXY, offsetXYForContextMenu, setToolCursor, wireMgr } from "../simulator"
import { Node, NodeIn } from "./Node"
import * as t from "io-ts"
import { NodeID } from "./Component"
import { dist, drawStraightWireLine, drawWaypoint, isOverWaypoint, strokeAsWireLine, WAYPOINT_DIAMETER, WIRE_WIDTH } from "../drawutils"
import { ContextMenuData, Drawable, DrawableWithDraggablePosition, DrawableWithPosition, DrawContext, Orientation, Orientations_, PositionSupportRepr } from "./Drawable"
import { RedrawManager } from "../RedrawRecalcManager"

export const WaypointRepr = t.union([
    t.tuple([t.number, t.number, t.keyof(Orientations_)]), // alternative with more fields first
    t.tuple([t.number, t.number]),
], "Wire")

export type WaypointRepr = t.TypeOf<typeof WaypointRepr>


export class Waypoint extends DrawableWithDraggablePosition {

    static toSuperRepr(saved: WaypointRepr | null): PositionSupportRepr | null {
        if (isNull(saved)) {
            return null
        }
        return {
            pos: [saved[0], saved[1]],
            orient: saved[2],
        }
    }

    constructor(
        savedData: WaypointRepr | null,
        public readonly parent: Wire,
    ) {
        super(Waypoint.toSuperRepr(savedData))
    }

    toJSON(): WaypointRepr {
        if (this.orient === Orientation.default) {
            return [this.posX, this.posY]
        } else {
            return [this.posX, this.posY, this.orient]
        }
    }

    get unrotatedWidth(): number {
        return WAYPOINT_DIAMETER
    }

    get unrotatedHeight(): number {
        return WAYPOINT_DIAMETER
    }

    public override isOver(x: number, y: number) {
        return mode >= Mode.CONNECT && isOverWaypoint(x, y, this.posX, this.posY)
    }

    override get cursorWhenMouseover() {
        return "grab"
    }

    public removeFromParent() {
        this.parent.removeWaypoint(this)
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext): void {
        if (mode < Mode.CONNECT) {
            return
        }

        drawWaypoint(g, ctx, this.posX, this.posY, this.parent.startNode.value, ctx.isMouseOver, false, false, false)
    }

    override mouseDown(e: MouseEvent | TouchEvent) {
        if (mode >= Mode.CONNECT) {
            this.tryStartMoving(e)
        }
        return { lockMouseOver: true }
    }

    override mouseDragged(e: MouseEvent | TouchEvent) {
        if (mode >= Mode.CONNECT) {
            this.updateWhileMoving(e)
        }
    }

    override mouseUp(__: MouseEvent | TouchEvent) {
        this.tryStopMoving()
    }

    public override makeContextMenu(): ContextMenuData {
        return [
            this.makeChangeOrientationContextMenuItem(),
            ContextMenuData.sep(),
            ContextMenuData.item("trash-o", "Supprimer", () => {
                this.removeFromParent()
            }, true),
        ]
    }
}


export const WireRepr = t.union([
    t.tuple([
        NodeID, NodeID,
        t.type({
            waypoints: t.array(WaypointRepr),
        }),
    ]), // alternative with more fields first
    t.tuple([NodeID, NodeID]),
], "Wire")

export type WireRepr = t.TypeOf<typeof WireRepr>

export class Wire extends Drawable {

    private _endNode: NodeIn | null = null
    private _waypoints: Waypoint[] = []

    constructor(
        private _startNode: Node
    ) {
        super()
    }

    toJSON(): WireRepr {
        const endID = this._endNode?.id ?? -1
        if (this._waypoints.length === 0) {
            return [this._startNode.id, endID]
        } else {
            const waypoints = this._waypoints.map(w => w.toJSON())
            return [this._startNode.id, endID, { waypoints }]
        }
    }

    public get startNode(): Node {
        return this._startNode
    }

    public get endNode(): Node | null {
        return this._endNode
    }

    public get waypoints(): readonly Waypoint[] {
        return this._waypoints
    }

    public setWaypoints(reprs: WaypointRepr[]) {
        this._waypoints = reprs.map(repr => new Waypoint(repr, this))
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
        // for (const waypoint of this._waypoints) {
        //     waypoint.destroy()
        // }
    }

    get isAlive() {
        // the start node should be alive and the end node
        // should either be null (wire being drawn) or alive
        // (wire set) for the wire to be alive
        return this.startNode.isAlive &&
            (isNull(this.endNode) || this.endNode.isAlive)
    }

    public addWaypoint(e: MouseEvent | TouchEvent) {
        const [x, y] = offsetXYForContextMenu(e)
        let coordData = this.indexOfNextWaypointIfMouseover(x, y)
        if (isUndefined(coordData)) {
            // shouldn't happen since we're calling this form a context menu
            // which was invoked when we were in a mouseover state
            coordData = [
                0,
                [this.startNode.posX, this.startNode.posY],
                [this.endNode?.posX ?? this.startNode.posX + 20, this.endNode?.posY ?? this.startNode.posY + 20],
            ]
        }

        // determine inial direction
        const [i, [startX, startY], [endX, endY]] = coordData
        const deltaX = endX - startX
        const deltaY = endY - startY
        let orient: Orientation
        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
            // initial orientation will be horizontal
            if (endX >= startX) {
                orient = "e"
            } else {
                orient = "w"
            }
        } else {
            // initial orientation will be vertical
            if (endY >= startY) {
                orient = "s"
            } else {
                orient = "n"
            }
        }

        const waypoint = new Waypoint([x, y, orient], this)
        this._waypoints.splice(i, 0, waypoint)
    }

    public removeWaypoint(waypoint: Waypoint) {
        const i = this._waypoints.indexOf(waypoint)
        if (i !== -1) {
            this._waypoints.splice(i, 1)
            this.setNeedsRedraw("waypoint deleted")
        }
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const wireValue = this.startNode.value

        if (isNull(this.endNode)) {
            // draw to mouse position
            drawStraightWireLine(g, this.startNode.posX, this.startNode.posY, mouseX, mouseY, wireValue)

        } else {
            let prevX = this.startNode.posX
            let prevY = this.startNode.posY
            let prevProlong = this.startNode.wireProlongDirection
            g.beginPath()
            g.moveTo(prevX, prevY)

            const lastWaypointData = { posX: this.endNode.posX, posY: this.endNode.posY, orient: this.endNode.wireProlongDirection }
            const allWaypoints = [...this._waypoints, lastWaypointData]
            for (let i = 0; i < allWaypoints.length; i++) {
                const waypoint = allWaypoints[i]
                const nextX = waypoint.posX
                const nextY = waypoint.posY
                const deltaX = nextX - prevX
                const deltaY = nextY - prevY
                const nextProlong = waypoint.orient
                if (prevX === nextX || prevY === nextY) {
                    // straight line
                    if (i === 0) {
                        g.moveTo(...bezierAnchorForWire(prevProlong, prevX, prevY, -WIRE_WIDTH / 2, -WIRE_WIDTH / 2))
                        g.lineTo(prevX, prevY)
                    }
                    g.lineTo(nextX, nextY)
                    if (i === allWaypoints.length - 1) {
                        g.lineTo(...bezierAnchorForWire(nextProlong, nextX, nextY, -WIRE_WIDTH / 2, -WIRE_WIDTH / 2))
                    }
                } else {
                    // bezier curve
                    const bezierAnchorPointDistX = Math.max(25, Math.abs(deltaX) / 3)
                    const bezierAnchorPointDistY = Math.max(25, Math.abs(deltaY) / 3)

                    g.bezierCurveTo(
                        ...bezierAnchorForWire(prevProlong, prevX, prevY, bezierAnchorPointDistX, bezierAnchorPointDistY),
                        ...bezierAnchorForWire(nextProlong, nextX, nextY, bezierAnchorPointDistX, bezierAnchorPointDistY),
                        nextX, nextY,
                    )
                }

                prevX = nextX
                prevY = nextY
                prevProlong = Orientation.invert(nextProlong)
            }

            strokeAsWireLine(g, wireValue, ctx.isMouseOver)
        }
    }

    isOver(x: number, y: number): boolean {
        if (mode < Mode.CONNECT || !this.startNode.isAlive || !this.endNode || !this.endNode.isAlive) {
            return false
        }
        return isDefined(this.indexOfNextWaypointIfMouseover(x, y))
    }

    private indexOfNextWaypointIfMouseover(x: number, y: number): undefined | [number, [number, number], [number, number]] {
        if (!this.endNode) {
            return undefined
        }
        const waypoints: DrawableWithPosition[] = [this.startNode, ...this._waypoints, this.endNode]
        const tol = WIRE_WIDTH / (10 * 2)
        for (let i = 0; i < waypoints.length - 1; i++) {
            const startX = waypoints[i].posX
            const startY = waypoints[i].posY
            const endX = waypoints[i + 1].posX
            const endY = waypoints[i + 1].posY
            const sumDist = dist(startX, startY, x, y) + dist(endX, endY, x, y)
            const wireLength = dist(startX, startY, endX, endY)
            if (sumDist >= wireLength - tol && sumDist <= wireLength + tol) {
                return [i, [startX, startY], [endX, endY]]
            }
        }
        return undefined
    }

    public override makeContextMenu(): ContextMenuData {
        return [
            ContextMenuData.item("plus-circle", "Ajouter point intermédiaire", (__itemEvent, contextEvent) => {
                this.addWaypoint(contextEvent)
            }),
            ContextMenuData.sep(),
            ContextMenuData.item("trash-o", "Supprimer", () => {
                wireMgr.deleteWire(this)
            }, true),
        ]
    }

}

function bezierAnchorForWire(wireProlongDirection: Orientation, x: number, y: number, distX: number, distY: number): [number, number] {
    switch (wireProlongDirection) {
        case "e": // going east, so anchor point is before on X
            return [x - distX, y]
        case "w": // going west, so anchor point is after on X
            return [x + distX, y]
        case "s":// going south, so anchor point is before on Y
            return [x, y - distY]
        case "n":// going north, so anchor point is after on Y
            return [x, y + distY]
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
            for (const waypoint of wire.waypoints) {
                waypoint.draw(g, mouseOverComp)
            }
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

    addNode(newNode: Node): Wire | undefined {
        let completedWire = undefined
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
            } else {
                completedWire = currentWire
            }

            this._isAddingWire = false
            setToolCursor(null)
        }
        RedrawManager.addReason("started or stopped wire", null)
        return completedWire
    }

    deleteWire(wire: Wire) {
        wire.destroy()
        for (let i = 0; i < this._wires.length; i++) {
            if (this._wires[i] === wire) {
                this._wires.splice(i, 1)
                break
            }
        }
        RedrawManager.addReason("deleted wire", null)
    }

    clearAllWires() {
        for (const wire of this._wires) {
            wire.destroy()
        }
        this._wires.splice(0, this._wires.length)
        RedrawManager.addReason("deleted wires", null)
    }

    tryCancelWire() {
        if (this._isAddingWire) {
            // adding the start node as end node to trigger deletion
            this.addNode(this._wires[this._wires.length - 1].startNode)
        }
    }

}
