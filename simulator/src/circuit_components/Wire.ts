import { currMouseAction } from "../menutools.js"
import { MouseAction, InputState, Mode } from "./Enums.js"
import { colorMouseOver, fileManager, mode } from "../simulator.js"
import { Node } from "./Node.js"

/**
 * Rappresent a wire
 * @classdesc Rappresent a Wire
 */
export class Wire {

    // TODO check which of these should be private
    public endNode: Node | null = null
    public startID = this.startNode.id
    public endID: number | null = null
    public endX = mouseX
    public endY = mouseY
    public width = 8

    constructor(
        private startNode: Node
    ) { }

    toJSON() {
        return [this.startID, this.endID]
    }

    /**
     * Delete the wire and free start node and end node
     */
    destroy() {
        this.startNode.setInputState(InputState.FREE)

        if (!this.endNode) {
            return
        }

        this.endNode.setValue(false)
        this.endNode.setInputState(InputState.FREE)
    }


    /**
     * Function to draw wire
     */
    draw() {
        stroke(0)
        const mainStrokeWidth = this.width / 2
        strokeWeight(mainStrokeWidth)

        if (!this.endNode) {

            if (!this.startNode.isAlive) {
                // destroy the wire
                return false
            }

            line(this.startNode.posX, this.startNode.posY,
                mouseX, mouseY)

        } else if (this.startNode.isAlive && this.endNode.isAlive) {

            const bezierAnchorPointDist = Math.max(25, (this.endNode.posX - this.startNode.posX) / 3)

            //this.endNode.setValue(this.startNode.getValue());
            this.generateNodeValue()

            noFill()
            if (this.isMouseOver()) {
                strokeWeight(mainStrokeWidth + 2)
                stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
            } else {
                stroke(80)
            }

            bezier(this.startNode.posX, this.startNode.posY,
                this.startNode.posX + bezierAnchorPointDist, this.startNode.posY,
                this.endNode.posX - bezierAnchorPointDist, this.endNode.posY,
                this.endNode.posX, this.endNode.posY)

            strokeWeight(mainStrokeWidth - 2)

            if (this.startNode.getValue() && this.endNode.getValue()) {
                stroke(255, 193, 7)
            } else {
                stroke(80)
            }

            bezier(this.startNode.posX, this.startNode.posY,
                this.startNode.posX + bezierAnchorPointDist, this.startNode.posY,
                this.endNode.posX - bezierAnchorPointDist, this.endNode.posY,
                this.endNode.posX, this.endNode.posY)

        } else {
            this.endNode.setValue(false)
            return false // destroy the wire
        }

        return true
    }

    generateNodeValue() {
        if (!this.endNode) {
            return
        }

        if ((this.startNode.isOutput && this.endNode.isOutput) ||
            (!this.startNode.isOutput && !this.endNode.isOutput)) {
            // short circuit         
            this.startNode.setValue(this.startNode.getValue() ||
                this.endNode.getValue())
            this.endNode.setValue(this.startNode.getValue())

        } else {
            this.endNode.setValue(this.startNode.getValue())
        }
    }

    isMouseOver(): boolean {

        if (mode < Mode.CONNECT || !this.startNode.isAlive || !this.endNode || !this.endNode.isAlive) {
            return false
        }

        let distance = []

        distance.push(dist(this.startNode.posX, this.startNode.posY,
            mouseX, mouseY))
        distance.push(dist(this.endNode.posX, this.endNode.posY,
            mouseX, mouseY))
        const wireLength = dist(this.startNode.posX, this.startNode.posY,
            this.endNode.posX, this.endNode.posY)

        if (distance[0] + distance[1] >= wireLength - (this.width / (10 * 2)) &&
            distance[0] + distance[1] <= wireLength + (this.width / (10 * 2))) {
            return true
        }
        return false
    }

    /**
     * Get wire start node
     */
    getStartNode() {
        return this.startNode
    }

    /**
     * Change wire end
     */
    updateEnd(endX: number, endY: number) {
        this.endX = endX
        this.endY = endY
    }

    /**
     * Set this wire end node
     */
    setEndNode(endNode: Node) {
        if (endNode.isOutput) {
            let tempNode = this.startNode
            this.startNode = endNode
            this.endNode = tempNode
            this.endNode.setInputState(InputState.TAKEN)
        } else {
            this.endNode = endNode
            this.startNode.setInputState(InputState.TAKEN)
            this.endNode.setInputState(InputState.TAKEN)
        }

        this.startID = this.startNode.id
        this.endID = this.endNode.id
    }

}

/**
 * Implements short circuit
 * @classdesc TODO
 * @todo Implement class
 */
class ShortCircuit {
    public inputNode: Node | undefined = new Node(this.firstNode.posX - 10,
        (this.firstNode.posY + this.secondNode.posY) / 2)

    constructor(public firstNode: Node, public secondNode: Node) {
        this.firstNode.setInputState(InputState.TAKEN)
        this.secondNode.setInputState(InputState.TAKEN)
    }

    destroy() {
        if (this.inputNode) {
            this.inputNode.destroy()
            delete this.inputNode
        }
    }

    draw() {
        stroke(0)
        strokeWeight(2)

        if (this.firstNode.isAlive && this.secondNode.isAlive) {
            this.drawShortCircuit()

            if (this.inputNode) {
                this.inputNode.draw()
                this.firstNode.setValue(this.inputNode.getValue())
                this.secondNode.setValue(this.inputNode.getValue())
            }
        } else {
            this.firstNode.setValue(false)
            this.secondNode.setValue(false)

            return false // destroy the short circuit
        }
        return true
    }

    drawShortCircuit() {
        let posCommonNode = [
            this.firstNode.posX - 15,
            (this.firstNode.posY + this.secondNode.posY) / 2,
        ]

        this.inputNode?.updatePosition(posCommonNode[0], posCommonNode[1])

        line(this.firstNode.posX, this.firstNode.posY,
            posCommonNode[0], this.firstNode.posY)
        line(this.secondNode.posX, this.secondNode.posY,
            posCommonNode[0], this.secondNode.posY)
        line(posCommonNode[0], this.firstNode.posY,
            posCommonNode[0], this.secondNode.posY)
    }

    /**
     * Function to call whan mouse is clicked
     */
    mouseClicked() {
        this.inputNode?.mouseClicked()
    }
}

/**
 * Wire manager
 * @classdesc Wire manager
 */
export class WireManager {
    public wire: Wire[] = []
    public shortCircuit: ShortCircuit[] = []
    public isOpened = false

    constructor() { }

    /**
     * Function to draw Wires and ShortCircuit
     */
    draw() {
        for (let i = 0; i < this.wire.length; i++) {
            let result = this.wire[i].draw()
            if (result === false) // wire is not valid
            {
                // destroy the wire
                this.isOpened = false
                if (this.wire[i] !== null) {
                    this.wire[i].destroy()
                }
                delete this.wire[i]
                this.wire.splice(i, 1)
            }
        }

        for (let i = 0; i < this.shortCircuit.length; i++) {
            const result = this.shortCircuit[i].draw()
            if (!result) { // short circuit is not valid
                // destroy the short circuit
                this.isOpened = false
                this.shortCircuit[i].destroy()
                delete this.shortCircuit[i]
                this.shortCircuit.splice(i, 1)
            }
        }
    }

    addNode(node: Node) {
        const canvasSim = document.getElementById("canvas-sim")!
        if (!this.isOpened) {
            this.wire.push(new Wire(node))
            this.isOpened = true
            canvasSim.style.cursor = "crosshair"
        } else {
            let index = this.wire.length - 1
            if (node !== this.wire[index].getStartNode() &&
                (this.wire[index].getStartNode().isOutput !== node.isOutput ||
                    node.getBrother() === this.wire[index].getStartNode())) {
                if (node === this.wire[index].getStartNode().getBrother()) {
                    this.shortCircuit.push(new ShortCircuit(this.wire[index].getStartNode(), node))

                    delete this.wire[index]
                    this.wire.length--
                } else {
                    this.wire[index].setEndNode(node)
                    fileManager.saveState()
                }
            } else {
                delete this.wire[index]
                this.wire.length--
            }

            this.isOpened = false
            canvasSim.style.cursor = "default"
        }
    }

    /**
     * Function to call when mouse is clicked
     */
    mouseClicked(): void {
        if (currMouseAction === MouseAction.DELETE) {
            for (let i = 0; i < this.wire.length; i++) {
                if (this.wire[i].isMouseOver()) {
                    // destroy the wire
                    this.wire[i].destroy()
                    delete this.wire[i]
                    this.wire.splice(i, 1)
                }
            }
        }

        /** For each shortCircuit call mouseClicked*/
        for (let i = 0; i < this.shortCircuit.length; i++) {
            //Call mouseClicked Function for each shortCircuit
            this.shortCircuit[i].mouseClicked()
        }
    }
}
