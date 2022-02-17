import { Mode, isNull, isNotNull, isDefined, isUndefined, LogicValue, typeOrUndefined } from "../utils"
import { Node, NodeIn } from "./Node"
import * as t from "io-ts"
import { NodeID } from "./Component"
import { dist, drawStraightWireLine, drawWaypoint, isOverWaypoint, strokeAsWireLine, WAYPOINT_DIAMETER, WIRE_WIDTH } from "../drawutils"
import { ContextMenuData, Drawable, DrawableWithDraggablePosition, DrawableWithPosition, DrawContext, Orientation, Orientations_, PositionSupportRepr } from "./Drawable"
import { LogicEditor } from "../LogicEditor"
import { EditorSelection } from "../CursorMovementManager"
import { Timestamp } from "../Timeline"

export type WaypointRepr = t.TypeOf<typeof Waypoint.Repr>

export class Waypoint extends DrawableWithDraggablePosition {

    static get Repr() {
        return t.union([
            t.tuple([t.number, t.number, t.keyof(Orientations_)]), // alternative with more fields first
            t.tuple([t.number, t.number]),
        ], "Wire")
    }

    static toSuperRepr(saved: WaypointRepr | null): PositionSupportRepr | null {
        if (isNull(saved)) {
            return null
        }
        return {
            pos: [saved[0], saved[1]],
            orient: saved[2],
            ref: undefined,
        }
    }

    constructor(
        editor: LogicEditor,
        savedData: WaypointRepr | null,
        public readonly parent: Wire,
    ) {
        super(editor, Waypoint.toSuperRepr(savedData))
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
        return this.editor.mode >= Mode.CONNECT && isOverWaypoint(x, y, this.posX, this.posY)
    }

    override get cursorWhenMouseover() {
        return "grab"
    }

    public removeFromParent() {
        this.parent.removeWaypoint(this)
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext): void {
        if (this.editor.mode < Mode.CONNECT) {
            return
        }

        const neutral = this.editor.options.hideWireColors
        drawWaypoint(g, ctx, this.posX, this.posY, this.parent.startNode.value, ctx.isMouseOver, neutral, false, false, false)
    }

    override mouseDown(e: MouseEvent | TouchEvent) {
        if (this.editor.mode >= Mode.CONNECT) {
            this.tryStartMoving(e)
        }
        return { lockMouseOver: true }
    }

    override mouseDragged(e: MouseEvent | TouchEvent) {
        if (this.editor.mode >= Mode.CONNECT) {
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


export type WireRepr = t.TypeOf<typeof Wire.Repr>

export class Wire extends Drawable {

    static get Repr() {
        return t.union([
            t.tuple([
                NodeID, NodeID,
                t.type({
                    ref: typeOrUndefined(t.string),
                    via: typeOrUndefined(t.array(Waypoint.Repr)),
                    propagationDelay: typeOrUndefined(t.number),
                }),
            ]), // alternative with more fields first
            t.tuple([NodeID, NodeID]),
        ], "Wire")
    }

    private _endNode: NodeIn | null = null
    private _waypoints: Waypoint[] = []
    private _propagatingValues: [LogicValue, Timestamp][] = []
    public customPropagationDelay: number | undefined = undefined

    constructor(
        private _startNode: Node
    ) {
        super(_startNode.editor)
        const editor = _startNode.editor
        const longAgo = -1 - editor.options.propagationDelay // make sure it is fully propagated no matter what
        this._propagatingValues.push([_startNode.value, longAgo])
    }

    toJSON(): WireRepr {
        const endID = this._endNode?.id ?? -1
        if (this._waypoints.length === 0 && isUndefined(this.customPropagationDelay)) {
            // no need for node options
            return [this._startNode.id, endID]
            
        } else {
            // add node options
            const waypoints = this._waypoints.map(w => w.toJSON())
            return [this._startNode.id, endID, {
                ref: this.ref,
                via: (waypoints.length === 0) ? undefined : waypoints,
                propagationDelay: this.customPropagationDelay,
            }]
        }
    }

    public get startNode(): Node {
        return this._startNode
    }

    public get endNode(): Node | null {
        return this._endNode
    }

    public isInRect(__rect: DOMRect) {
        return false
    }

    public get waypoints(): readonly Waypoint[] {
        return this._waypoints
    }

    public setWaypoints(reprs: WaypointRepr[]) {
        this._waypoints = reprs.map(repr => new Waypoint(this.editor, repr, this))
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
            const longAgo = -1 - (this.customPropagationDelay ?? this.editor.options.propagationDelay)
            this._propagatingValues = [[secondNode.value, longAgo]]
        }

        this._startNode.addOutgoingWire(this)
        this._endNode.incomingWire = this
        this._endNode.value = this.startNode.value
    }

    propageNewValue(newValue: LogicValue, now: Timestamp) {
        if (this._propagatingValues[this._propagatingValues.length - 1][0] !== newValue) {
            this._propagatingValues.push([newValue, now])
        }
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
        const [x, y] = this.editor.offsetXYForContextMenu(e)
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

        const waypoint = new Waypoint(this.editor, [x, y, orient], this)
        this._waypoints.splice(i, 0, waypoint)
    }

    public removeWaypoint(waypoint: Waypoint) {
        const i = this._waypoints.indexOf(waypoint)
        if (i !== -1) {
            this._waypoints.splice(i, 1)
            this.setNeedsRedraw("waypoint deleted")
        }
    }

    private prunePropagatingValues(now: Timestamp, propagationDelay: number): LogicValue {
        // first, prune obsolete values if needed
        let removeBefore = 0
        for (let i = 1; i < this._propagatingValues.length; i++) {
            if (now >= this._propagatingValues[i][1] + propagationDelay) {
                // item i has fully propagated
                removeBefore = i
            } else {
                // item i is still propagating
                break
            }
        }
        if (removeBefore > 0) {
            this._propagatingValues.splice(0, removeBefore)
        }
        return this._propagatingValues[0][0]
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        // this has to be checked _before_ we prune the list,
        // otherwise we won't get a chance to have a next animation frame
        // and to run the pending updates created by possibly setting
        // the value of the end node
        const isAnimating = this._propagatingValues.length > 1

        const options = this.editor.options
        const propagationDelay = this.customPropagationDelay ?? options.propagationDelay
        const neutral = options.hideWireColors
        const wireValue = this.prunePropagatingValues(ctx.now, propagationDelay)

        if (isNull(this.endNode)) {
            // draw to mouse position
            drawStraightWireLine(g, this.startNode.posX, this.startNode.posY, this.editor.mouseX, this.editor.mouseY, wireValue, neutral)

        } else {
            this.endNode.value = wireValue

            let prevX = this.startNode.posX
            let prevY = this.startNode.posY
            let prevProlong = this.startNode.wireProlongDirection
            const lastWaypointData = { posX: this.endNode.posX, posY: this.endNode.posY, orient: this.endNode.wireProlongDirection }
            const allWaypoints = [...this._waypoints, lastWaypointData]
            let svgPathDesc = "M" + prevX + " " + prevY + " "
            for (let i = 0; i < allWaypoints.length; i++) {
                const waypoint = allWaypoints[i]
                const nextX = waypoint.posX
                const nextY = waypoint.posY
                const deltaX = nextX - prevX
                const deltaY = nextY - prevY
                const nextProlong = waypoint.orient
                let x, y, x1, y1
                if (prevX === nextX || prevY === nextY) {
                    // straight line
                    if (i === 0) {
                        [x, y] = bezierAnchorForWire(prevProlong, prevX, prevY, -WIRE_WIDTH / 2, -WIRE_WIDTH / 2)
                        svgPathDesc += "M" + x + " " + y + " "
                        svgPathDesc += "L" + prevX + " " + prevY + " "
                    }
                    svgPathDesc += "L" + nextX + " " + nextY + " "
                    if (i === allWaypoints.length - 1) {
                        [x, y] = bezierAnchorForWire(nextProlong, nextX, nextY, -WIRE_WIDTH / 2, -WIRE_WIDTH / 2)
                        svgPathDesc += "L" + x + " " + y + " "
                    }
                } else {
                    // bezier curve
                    const bezierAnchorPointDistX = Math.max(25, Math.abs(deltaX) / 3)
                    const bezierAnchorPointDistY = Math.max(25, Math.abs(deltaY) / 3);

                    // first anchor point
                    [x, y] = bezierAnchorForWire(prevProlong, prevX, prevY, bezierAnchorPointDistX, bezierAnchorPointDistY);
                    [x1, y1] = bezierAnchorForWire(nextProlong, nextX, nextY, bezierAnchorPointDistX, bezierAnchorPointDistY)
                    svgPathDesc += "C" + x + " " + y + "," + x1 + " " + y1 + "," + nextX + " " + nextY + " "
                }

                prevX = nextX
                prevY = nextY
                prevProlong = Orientation.invert(nextProlong)
            }

            const totalLength = this.editor.lengthOfPath(svgPathDesc)
            const path = new Path2D(svgPathDesc) // TODO cache this?

            const old = g.getLineDash()
            for (const [value, timeSet] of this._propagatingValues) {
                const frac = Math.min(1.0, (ctx.now - timeSet) / propagationDelay)
                const lengthToDraw = totalLength * frac
                g.setLineDash([lengthToDraw, totalLength])
                strokeAsWireLine(g, value, ctx.isMouseOver, neutral, path)
            }
            g.setLineDash(old)

            if (isAnimating) {
                this.setNeedsRedraw("propagating value")
            }
        }
    }

    isOver(x: number, y: number): boolean {
        if (this.editor.mode < Mode.CONNECT || !this.startNode.isAlive || !this.endNode || !this.endNode.isAlive) {
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
                this.editor.wireMgr.deleteWire(this)
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

    public readonly editor: LogicEditor
    private readonly _wires: Wire[] = []
    private _isAddingWire = false

    constructor(editor: LogicEditor) {
        this.editor = editor
    }

    public get wires(): readonly Wire[] {
        return this._wires
    }

    public get isAddingWire() {
        return this._isAddingWire
    }

    draw(g: CanvasRenderingContext2D, now: Timestamp, mouseOverComp: Drawable | null, selectionRect: EditorSelection | undefined) {
        this.removeDeadWires()
        for (const wire of this._wires) {
            wire.draw(g, now, mouseOverComp, selectionRect)
            for (const waypoint of wire.waypoints) {
                waypoint.draw(g, now, mouseOverComp, selectionRect)
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
            this.editor.setToolCursor("crosshair")

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
            this.editor.setToolCursor(null)
        }
        this.editor.redrawMgr.addReason("started or stopped wire", null)
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
        this.editor.redrawMgr.addReason("deleted wire", null)
    }

    clearAllWires() {
        for (const wire of this._wires) {
            wire.destroy()
        }
        this._wires.splice(0, this._wires.length)
        this.editor.redrawMgr.addReason("deleted wires", null)
    }

    tryCancelWire() {
        if (this._isAddingWire) {
            // adding the start node as end node to trigger deletion
            this.addNode(this._wires[this._wires.length - 1].startNode)
        }
    }

}
