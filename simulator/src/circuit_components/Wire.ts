import { currMouseAction } from "../menutools.js"
import { MouseAction, InputState, Mode } from "./Enums.js"
import { colorForBoolean, colorMouseOver, mode, wireLine } from "../simulator.js"
import { Node } from "./Node.js"

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
            tempNode.inputState = InputState.TAKEN
            this.endID = tempNode.id
            this._endNode = tempNode
        } else {
            this.startNode.inputState = InputState.TAKEN
            endNode.inputState = InputState.TAKEN
            this.endID = endNode.id
            this._endNode = endNode
        }

    }

    /**
     * Delete the wire and free start node and end node
     */
    destroy() {
        this.startNode.inputState = InputState.FREE
        if (this.endNode) {
            this.endNode.value = false
            this.endNode.inputState = InputState.FREE
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
            stroke(...colorForBoolean(this.startNode.value && this.endNode.value))
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
    private isOpened = false

    draw() {
        for (let i = 0; i < this.wires.length; i++) {
            const result = this.wires[i].draw()
            if (!result) {
                // wire is not valid, destroy
                this.isOpened = false
                this.wires[i].destroy()
                delete this.wires[i]
                this.wires.splice(i, 1)
            }
        }
    }

    addNode(node: Node) {
        const canvasSim = document.getElementById("canvas-sim")!
        if (!this.isOpened) {
            // start drawing a new wire
            this.wires.push(new Wire(node))
            this.isOpened = true
            canvasSim.style.cursor = "crosshair"

        } else {
            // complete the new wire
            const currentWireIndex = this.wires.length - 1
            const currentWire = this.wires[currentWireIndex]
            if (node !== currentWire.startNode &&
                currentWire.startNode.isOutput !== node.isOutput) {
                currentWire.endNode = node
            } else {
                delete this.wires[currentWireIndex]
                this.wires.length--
            }

            this.isOpened = false
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
}
