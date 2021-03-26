import { currMouseAction } from "../menutools.js"
import { MouseAction, Mode } from "../utils.js"
import { colorForBoolean, colorMouseOver, mode, wireLine } from "../simulator.js"
import { Node, ConnectionState } from "./Node.js"

const WIRE_WIDTH = 8

export class Wire {

    private _endNode: Node | null = null
    private startID = this.startNode.id
    private endID: number | null = null

    constructor(
        private _startNode: Node
    ) { }

    toJSON() {
        return [this.startID, this.endID] as const
    }

    public get startNode(): Node {
        return this._startNode
    }

    public get endNode(): Node | null {
        return this._endNode
    }

    public set endNode(endNode: Node | null) {
        if (!endNode) {
            return
        }
        if (endNode.isOutput) {
            // set as startNode instead
            const tempNode = this.startNode
            this._startNode = endNode
            this.startID = endNode.id
            tempNode.connectionState = ConnectionState.TAKEN
            this.endID = tempNode.id
            this._endNode = tempNode
        } else {
            this.startNode.connectionState = ConnectionState.TAKEN
            endNode.connectionState = ConnectionState.TAKEN
            this.endID = endNode.id
            this._endNode = endNode
        }

    }

    /**
     * Delete the wire and free start node and end node
     */
    destroy() {
        this.startNode.connectionState = ConnectionState.FREE
        if (this.endNode) {
            this.endNode.value = false
            this.endNode.connectionState = ConnectionState.FREE
        }
    }


    /**
     * Function to draw wire
     */
    draw() {
        stroke(0)
        const mainStrokeWidth = WIRE_WIDTH / 2
        strokeWeight(mainStrokeWidth)

        if (!this.endNode) {

            if (!this.startNode.isAlive) {
                // destroy the wire
                return false
            }

            wireLine(this.startNode, mouseX, mouseY)

        } else if (this.startNode.isAlive && this.endNode.isAlive) {

            const bezierAnchorPointDist = Math.max(25, (this.endNode.posX - this.startNode.posX) / 3)

            this.generateNodeValue()

            noFill()

            // just a straight line if nodes are aligned on X or Y
            const doDraw = (this.startNode.posX === this.endNode.posX || this.startNode.posY === this.endNode.posY)
                ? () => line(
                    this.startNode.posX, this.startNode.posY,
                    this.endNode!.posX, this.endNode!.posY)
                : () => bezier(
                    this.startNode.posX, this.startNode.posY,
                    this.startNode.posX + bezierAnchorPointDist, this.startNode.posY,
                    this.endNode!.posX - bezierAnchorPointDist, this.endNode!.posY,
                    this.endNode!.posX, this.endNode!.posY)

            if (this.isMouseOver()) {
                strokeWeight(mainStrokeWidth + 2)
                stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
            } else {
                stroke(80)
            }
            doDraw()

            strokeWeight(mainStrokeWidth - 2)
            stroke(...colorForBoolean(this.startNode.value))
            doDraw()

        } else {
            this.endNode.value = false
            return false // destroy the wire
        }

        return true
    }

    generateNodeValue() {
        if (!this.endNode) {
            return
        }
        this.endNode.value = this.startNode.value
    }

    isMouseOver(): boolean {

        if (mode < Mode.CONNECT || !this.startNode.isAlive || !this.endNode || !this.endNode.isAlive) {
            return false
        }

        const distance = []

        distance.push(dist(this.startNode.posX, this.startNode.posY,
            mouseX, mouseY))
        distance.push(dist(this.endNode.posX, this.endNode.posY,
            mouseX, mouseY))
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

    public wires: Wire[] = []
    private _isOpened = false

    draw() {
        for (let i = 0; i < this.wires.length; i++) {
            const result = this.wires[i].draw()
            if (!result) {
                // wire is not valid, destroy
                this._isOpened = false
                this.wires[i].destroy()
                delete this.wires[i]
                this.wires.splice(i, 1)
            }
        }
    }

    addNode(newNode: Node) {
        const canvasSim = document.getElementById("canvas-sim")!
        if (!this._isOpened) {
            // start drawing a new wire
            this.wires.push(new Wire(newNode))
            this._isOpened = true
            canvasSim.style.cursor = "crosshair"

        } else {
            // complete the new wire
            const currentWireIndex = this.wires.length - 1
            const currentWire = this.wires[currentWireIndex]
            let created = false
            if (newNode !== currentWire.startNode) {
                if (currentWire.startNode.isOutput !== newNode.isOutput && newNode.acceptsMoreConnections) {
                    // normal, create
                    currentWire.endNode = newNode
                    created = true
                } else if (newNode.connectionState === ConnectionState.TAKEN) {
                    // try connect to other end of new node
                    for (const wire of this.wires) {
                        if (wire.endNode === newNode &&
                            currentWire.startNode.isOutput !== wire.startNode.isOutput &&
                            wire.startNode.acceptsMoreConnections) {
                            currentWire.endNode = wire.startNode
                            created = true
                            break
                        }
                    }
                }
            }

            if (!created) {
                delete this.wires[currentWireIndex]
                this.wires.length--
            }

            this._isOpened = false
            canvasSim.style.cursor = "default"
        }
    }

    mouseClicked(): void {
        if (currMouseAction === MouseAction.DELETE) {
            for (let i = 0; i < this.wires.length; i++) {
                if (this.wires[i].isMouseOver()) {
                    // destroy the wire
                    this.wires[i].destroy()
                    delete this.wires[i]
                    this.wires.splice(i, 1)
                }
            }
        }
    }

    tryCancelWire() {
        if (this._isOpened) {
            // adding the start node as end node to trigger deletion
            this.addNode(this.wires[this.wires.length - 1].startNode)
        }
    }

}
