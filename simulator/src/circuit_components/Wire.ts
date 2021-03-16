import { currMouseAction } from "../menutools.js"
import { MouseAction, InputState, Mode } from "./Enums.js"
import { colorMouseOver, fileManager, mode } from "../simulator.js"
import { Node } from "./Node.js"

export class Wire {

    private _endNode: Node | null = null
    private startID = this.startNode.id
    private endID: number | null = null
    private width = 8

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
        const mainStrokeWidth = this.width / 2
        strokeWeight(mainStrokeWidth)

        if (!this.endNode) {

            if (!this.startNode.isAlive) {
                // destroy the wire
                return false
            }

            line(this.startNode.posX, this.startNode.posY, mouseX, mouseY)

        } else if (this.startNode.isAlive && this.endNode.isAlive) {

            const bezierAnchorPointDist = Math.max(25, (this.endNode.posX - this.startNode.posX) / 3)

            //this.endNode.setValue(this.startNode.value);
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

            if (this.startNode.value && this.endNode.value) {
                stroke(255, 193, 7)
            } else {
                stroke(80)
            }

            bezier(this.startNode.posX, this.startNode.posY,
                this.startNode.posX + bezierAnchorPointDist, this.startNode.posY,
                this.endNode.posX - bezierAnchorPointDist, this.endNode.posY,
                this.endNode.posX, this.endNode.posY)

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

        if ((this.startNode.isOutput && this.endNode.isOutput) ||
            (!this.startNode.isOutput && !this.endNode.isOutput)) {
            // short circuit         
            this.startNode.value = this.startNode.value ||
                this.endNode.value
            this.endNode.value = this.startNode.value

        } else {
            this.endNode.value = this.startNode.value
        }
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

        if (distance[0] + distance[1] >= wireLength - (this.width / (10 * 2)) &&
            distance[0] + distance[1] <= wireLength + (this.width / (10 * 2))) {
            return true
        }
        return false
    }

}

/**
 * Implements short circuit
 */
class ShortCircuit {

    public inputNode: Node | undefined = new Node(this.firstNode.posX - 10,
        (this.firstNode.posY + this.secondNode.posY) / 2)

    constructor(
        public firstNode: Node,
        public secondNode: Node
    ) {
        this.firstNode.inputState = InputState.TAKEN
        this.secondNode.inputState = InputState.TAKEN
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
                this.firstNode.value = this.inputNode.value
                this.secondNode.value = this.inputNode.value
            }
        } else {
            this.firstNode.value = false
            this.secondNode.value = false

            return false // destroy the short circuit
        }
        return true
    }

    drawShortCircuit() {
        const posCommonNode = [
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
 */
export class WireManager {

    public wire: Wire[] = []
    public shortCircuit: ShortCircuit[] = []
    public isOpened = false

    draw() {
        for (let i = 0; i < this.wire.length; i++) {
            const result = this.wire[i].draw()
            if (!result) {
                // wire is not valid, destroy
                this.isOpened = false
                this.wire[i].destroy()
                delete this.wire[i]
                this.wire.splice(i, 1)
            }
        }

        for (let i = 0; i < this.shortCircuit.length; i++) {
            const result = this.shortCircuit[i].draw()
            if (!result) { // 
                // short circuit is not valid, destroy
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
            const index = this.wire.length - 1
            if (node !== this.wire[index].startNode &&
                (this.wire[index].startNode.isOutput !== node.isOutput ||
                    node.brotherNode === this.wire[index].startNode)) {
                if (node === this.wire[index].startNode.brotherNode) {
                    this.shortCircuit.push(new ShortCircuit(this.wire[index].startNode, node))

                    delete this.wire[index]
                    this.wire.length--
                } else {
                    this.wire[index].endNode = node
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
