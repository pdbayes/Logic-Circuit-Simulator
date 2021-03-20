import { currMouseAction, backToEdit } from "../menutools.js"
import { any, colorForBoolean, decNumMoving, incNumMoving, inRect, isCmdDown, isUndefined } from "../simulator.js"
import { GateType, Mode, MouseAction } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, fileManager, mode } from "../simulator.js"
import { Component, GRID_STEP } from "./Component.js"

const GRID_WIDTH = 7
const GRID_HEIGHT = 4

export class Gate extends Component {

    private type = this.convertToType(this.strType)
    private isSpawned = false
    private offsetMouseX = 0
    private offsetMouseY = 0
    private isMoving = false
    private isSaved = false
    private inputs: Node[] = []
    private output: Node | undefined
    private nodeStartID: number

    constructor(
        private strType: string
    ) {
        super()
        if (this.type !== GateType.NOT) {
            const input1 = new Node(this, -4, -1)
            const input2 = new Node(this, -4, +1)
            input1.brotherNode = input2
            input2.brotherNode = input1
            this.inputs.push(input1)
            this.inputs.push(input2)
        } else {
            this.inputs.push(new Node(this, -4, 0))
        }
        this.output = new Node(this, +4, 0, true)
        this.nodeStartID = this.inputs[0].id
    }

    static from(strType: string, pos: readonly [number, number], nodeStartID: number): Gate {
        const newObj = new Gate(strType)
        newObj.updatePosition(pos[0], pos[1], false)
        newObj.isSpawned = true
        newObj.isSaved = true
        newObj.nodeStartID = nodeStartID
        newObj.refreshNodes()
        return newObj
    }

    toJSON() {
        return {
            type: this.strType,
            id: this.nodeStartID,
            pos: [this.posX, this.posY] as const,
        }
    }

    public get outputValue(): boolean {
        return this.output?.value ?? false
    }

    public set input0(val: boolean) {
        this.input0 = val
    }

    public set input1(val: boolean) {
        this.input1 = val
    }

    /**
     * Destroy this gate
     * First destroy and delete all input
     * second destroy and delete the output
     */
    destroy() {
        for (let i = 0; i < this.inputs.length; i++) {
            this.inputs[i].destroy()
            delete this.inputs[i]
        }
        if (this.output) {
            this.output.destroy()
            delete this.output
        }
    }

    /**
     * Draw this gate:
     * If is not spawned, follow mouse
     *  Else if is not saved, save it and set isSaved to true.
     * If is moveing, follow mouse.
     * If this type is gateType.NOT update input[0] position
     *  Else update input[0] and input[1] postion
     * Update gate output.
     * If mouse is over, frame it.
     * Draw gate image and inputs.
     * Generate output and draw it.
     */
    draw() {
        if (!this.isSpawned) {
            this.updatePosition(mouseX, mouseY, !isCmdDown)
        } else if (!this.isSaved) {
            fileManager.saveState()
            this.isSaved = true
        }

        if (this.isMoving) {
            this.updatePosition(mouseX + this.offsetMouseX, mouseY + this.offsetMouseY, !isCmdDown)
        }

        for (const input of this.inputs) {
            input.updatePositionFromParent()
        }
        this.output?.updatePositionFromParent()

        this.generateOutput()

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        const left = this.posX - width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2
        const pi2 = Math.PI / 2

        noFill()
        if (this.isMouseOver()) {
            const frameWidth = 2
            const frameMargin = 2
            strokeWeight(frameWidth)
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
            rect(
                left - frameWidth - frameMargin,
                top - frameWidth - frameMargin,
                width + 2 * (frameWidth + frameMargin),
                height + 2 * (frameWidth + frameMargin)
            )
        }

        const gateWidth = 40
        let gateLeft = this.posX - gateWidth / 2
        let gateRight = this.posX + gateWidth / 2
        stroke(0)
        strokeWeight(3)
        const rightCircle = () => {
            gateRight += 5
            arc(gateRight, this.posY, 8, 8, 0, 0)
            gateRight += 4
        }
        const wireEnds = () => {
            const wireLine = (x0: number, y0: number, x1: number, y1: number, value: boolean) => {
                stroke(80)
                strokeWeight(4)
                line(x0, y0, x1, y1)

                stroke(...colorForBoolean(value))
                strokeWeight(2)
                line(x0, y0, x1, y1)
            }
            for (const input of this.inputs) {
                wireLine(input.posX, input.posY, gateLeft - 2, input.posY, input.value)
            }
            if (!isUndefined(this.output)) {
                wireLine(gateRight + 2, this.posY, this.output.posX, this.posY, this.output.value)
            }
        }

        switch (this.type) {
            case GateType.NOT:
                line(gateLeft, top, gateLeft, bottom)
                line(gateLeft, top, gateRight, this.posY)
                line(gateLeft, bottom, gateRight, this.posY)
                rightCircle()
                wireEnds()
                break

            case GateType.AND:
            case GateType.NAND:
                line(gateLeft, bottom, this.posX, bottom)
                line(gateLeft, top, this.posX, top)
                line(gateLeft, top, gateLeft, bottom)
                arc(this.posX, this.posY, gateWidth, height, -pi2, pi2)
                if (this.type === GateType.NAND) {
                    rightCircle()
                }
                wireEnds()
                break

            case GateType.OR:
            case GateType.NOR:
            case GateType.XOR:
            case GateType.XNOR:
                arc(gateLeft - 35, this.posY, 75, 75, -.55, .55)
                gateLeft -= 3
                line(gateLeft, top, this.posX - 15, top)
                line(gateLeft, bottom, this.posX - 15, bottom)
                bezier(this.posX - 15, top, this.posX + 10, top,
                    gateRight - 5, this.posY - 8, gateRight, this.posY)
                bezier(this.posX - 15, bottom, this.posX + 10, bottom,
                    gateRight - 5, this.posY + 8, gateRight, this.posY)
                if (this.type === GateType.XOR || this.type === GateType.XNOR) {
                    arc(gateLeft - 38, this.posY, 75, 75, -.55, .55)
                }
                gateLeft += 4
                if (this.type === GateType.NOR || this.type === GateType.XNOR) {
                    rightCircle()
                }
                wireEnds()
                break
        }

        for (const input of this.inputs) {
            input.draw()
        }
        this.output?.draw()
    }

    refreshNodes() {
        let currentID = this.nodeStartID
        this.inputs[0].id = currentID++
        if (this.type !== GateType.NOT) {
            this.inputs[1].id = currentID++
        }
        if (this.output) {
            this.output.id = currentID++
        }
    }

    /**
     * Generate gate output
     */
    generateOutput() {
        if (this.output) {
            this.output.value = this.calculateValue()
        }
    }

    /**
     * Calculate gate output by type value
     */
    calculateValue(): boolean {
        switch (this.type) {
            case GateType.NOT:
                return !this.inputs[0].value

            case GateType.AND:
                return this.inputs[0].value && this.inputs[1].value

            case GateType.NAND:
                return !(this.inputs[0].value && this.inputs[1].value)

            case GateType.OR:
                return this.inputs[0].value || this.inputs[1].value

            case GateType.NOR:
                return !(this.inputs[0].value || this.inputs[1].value)

            case GateType.XOR:
                return this.inputs[0].value !== this.inputs[1].value

            case GateType.XNOR:
                return this.inputs[0].value === this.inputs[1].value
        }

        return false
    }

    convertToType(str: string): number {
        switch (str.toUpperCase()) {
            case "NOT":
                return GateType.NOT

            case "AND":
                return GateType.AND

            case "NAND":
                return GateType.NAND

            case "OR":
                return GateType.OR

            case "NOR":
                return GateType.NOR

            case "XOR":
                return GateType.XOR

            case "XNOR":
                return GateType.XNOR
        }

        return GateType.AND
    }

    /**
     * Check if mouse is over
     */
    isMouseOver(): boolean {
        return mode >= Mode.CONNECT && inRect(this.posX, this.posY, GRID_WIDTH * GRID_STEP, GRID_HEIGHT * GRID_STEP, mouseX, mouseY)
    }

    /**
     * When mouse is pressed if gate is not spawned, spawn it, then return 
     */
    mousePressed() {
        if (!this.isSpawned) {
            this.updatePosition(mouseX, mouseY, !isCmdDown)
            this.isSpawned = true
            backToEdit()
            return
        }

        if (this.isMouseOver() || currMouseAction === MouseAction.MOVE) {
            if (!this.isMoving) {
                this.isMoving = true
                incNumMoving()
            }
            this.offsetMouseX = this.posX - mouseX
            this.offsetMouseY = this.posY - mouseY
        }
    }

    mouseReleased() {
        if (this.isMoving) {
            this.isMoving = false
            decNumMoving()
        }
    }

    mouseClicked() {
        const results = [
            this.isMouseOver(),
        ]

        for (const input of this.inputs) {
            results.push(input.mouseClicked())
        }

        if (this.output) {
            results.push(this.output.mouseClicked())
        }

        return any(results)
    }

}
