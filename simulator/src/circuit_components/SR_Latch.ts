import { Gate } from "./Gate.js"
import { ICType, GateType } from "./Enums.js"
import { Integrated } from "./Integrated.js"
import { Node } from "./Node.js"
import { any } from "../simulator.js"

export class SR_Latch extends Integrated {

    public nodeSet = new Node(this.posX + 5, this.posY + 30)
    public nodeReset = new Node(this.posX + 5, this.posY + this.height - 30)
    public nodeQ = new Node(this.posX + this.width - 5, this.posY + 30, true)
    public nodeNotQ = new Node(this.posX + this.width + 5, this.posY + this.height - 30, true)
    public nodeStartID = this.nodeSet.id

    constructor(type: ICType) {
        super(type)
    }

    destroy() {
        this.nodeSet.destroy()
        this.nodeReset.destroy()
        this.nodeQ.destroy()
        this.nodeNotQ.destroy()
    }

    draw() {
        super.draw()
        this.generateOutput()

        this.nodeSet.updatePosition(this.posX + 5, this.posY + 30)
        this.nodeReset.updatePosition(this.posX + 5, this.posY + this.height - 30)
        this.nodeQ.updatePosition(this.posX + this.width - 5, this.posY + 30)
        this.nodeNotQ.updatePosition(this.posX + this.width - 5, this.posY + this.height - 30)

        this.nodeSet.draw()
        this.nodeReset.draw()
        this.nodeQ.draw()
        this.nodeNotQ.draw()
    }

    refreshNodes() {
        let currentID = this.nodeStartID

        this.nodeSet.setID(currentID)
        currentID++

        this.nodeReset.setID(currentID)
        currentID++

        this.nodeQ.setID(currentID)
        currentID++

        this.nodeNotQ.setID(currentID)

    }

    generateOutput() // virtual
    {

    }

    mouseClicked(): boolean {
        return any([
            this.isMouseOver(),
            this.nodeSet.mouseClicked(),
            this.nodeReset.mouseClicked(),
            this.nodeQ.mouseClicked(),
            this.nodeNotQ.mouseClicked(),
        ])
    }

    static convertToType(str: string): GateType {
        switch (str) {
            case "NAND":
                return GateType.NAND

            case "NOR":
                return GateType.NOR
        }


        return GateType.NAND
    }
}

export class SR_LatchAsync extends SR_Latch {

    public gateSet: Gate | null
    public gateReset: Gate | null

    constructor(
        public gateType: GateType,
        public stabilize: boolean
    ) {
        super(ICType.SR_LATCH_ASYNC)

        switch (this.gateType) {
            case GateType.NAND:
                this.gateSet = new Gate("NAND")
                this.gateReset = new Gate("NAND")
                break

            case GateType.NOR:
                this.gateSet = new Gate("NOR")
                this.gateReset = new Gate("NOR")
                break

            default:
                this.gateSet = null
                this.gateReset = null
                console.log("Gate not supported for this IC " + GateType)
                return
        }


        if (stabilize) {
            // reset
            this.gateReset.input[0].value = true
            this.gateSet.generateOutput()
            this.gateReset.generateOutput()
        }
    }

    destroy() {
        super.destroy()

        if (this.gateReset) {
            for (let i = 0; i < this.gateReset.input.length; i++) {
                this.gateReset.input[i].destroy()
                delete this.gateReset.input[i]
            }
        }

        if (this.gateSet) {
            for (let i = 0; i < this.gateSet.input.length; i++) {
                this.gateSet.input[i].destroy()
                delete this.gateSet.input[i]
            }
        }

    }

    generateOutput() {

        if (!this.gateReset || !this.gateSet) {
            return
        }

        this.gateSet.input[0].value = this.nodeSet.value
        this.gateSet.input[1].value = this.gateReset.output?.value ?? false

        this.gateReset.input[0].value = this.nodeReset.value
        this.gateReset.input[1].value = this.gateSet.output?.value ?? false

        this.gateSet.generateOutput()
        this.gateReset.generateOutput()

        this.nodeQ.value = this.gateReset.output?.value ?? false
        this.nodeNotQ.value = this.gateSet.output?.value ?? false
    }

}

export class SR_LatchSync extends SR_Latch {

    public nodeClock = new Node(this.posX + this.width - 5, this.posY + (this.height / 2))
    public asyncLatch = new SR_LatchAsync(this.gateType, this.stabilize)
    public gateSet: Gate | null
    public gateReset: Gate | null

    constructor(
        public gateType: GateType,
        public stabilize: boolean
    ) {
        super(ICType.SR_LATCH_SYNC)

        switch (this.gateType) {
            case GateType.NAND:
                this.gateSet = new Gate("NAND")
                this.gateReset = new Gate("NAND")
                break

            case GateType.NOR:
                this.gateSet = new Gate("AND")
                this.gateReset = new Gate("AND")
                break

            default:
                this.gateSet = null
                this.gateReset = null
                console.log("Gate not supported for this IC")
                break
        }

        if (stabilize) {
            // reset
            this.nodeClock.setValue(true)
            this.nodeReset.setValue(true)
            this.generateOutput()
            this.nodeClock.setValue(false)
            this.nodeReset.setValue(false)
        }
    }

    destroy() {
        super.destroy()
        this.nodeClock.destroy()
        this.gateSet?.destroy()
        this.gateReset?.destroy()
        this.asyncLatch.destroy()
    }

    draw() {
        super.draw()
        this.nodeClock.updatePosition(this.posX + 5, this.posY + (this.height / 2))
        this.nodeClock.draw()
    }

    refreshNodes() {
        super.refreshNodes()
        let currentID = this.nodeStartID + 4
        this.nodeClock.setID(currentID)
    }

    generateOutput() {
        if (!this.gateSet || !this.gateReset) {
            return
        }

        this.gateSet.input[0].value = this.nodeSet.value
        this.gateSet.input[1].value = this.nodeClock.value
        this.gateReset.input[0].value = this.nodeReset.value
        this.gateReset.input[1].value = this.nodeClock.value

        this.gateSet.generateOutput()
        this.gateReset.generateOutput()

        this.asyncLatch.nodeSet.value = this.gateSet.output?.value ?? false
        this.asyncLatch.nodeReset.value = this.gateReset.output?.value ?? false

        this.asyncLatch.generateOutput()

        if (this.gateType === GateType.NOR) {
            this.nodeQ.value = this.asyncLatch.nodeQ.value
            this.nodeNotQ.value = this.asyncLatch.nodeNotQ.value
        } else {
            // invert if NAND
            this.nodeNotQ.value = this.asyncLatch.nodeQ.value
            this.nodeQ.value = this.asyncLatch.nodeNotQ.value
        }
    }

    mouseClicked(): boolean {
        return any([
            super.mouseClicked(),
            this.nodeClock.mouseClicked(),
        ])
    }
}
