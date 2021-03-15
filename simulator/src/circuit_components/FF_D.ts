import { any } from "../simulator.js"
import { ICType, GateType } from "./Enums.js"
import { Integrated } from "./Integrated.js"
import { Node } from "./Node.js"
import { SR_LatchSync } from "./SR_Latch.js"

export abstract class FF_D extends Integrated {

    public nodeD = new Node(this.posX + 5, this.posY + 30)
    public nodeClock = new Node(this.posX + 5, this.posY + this.height - 30)
    public nodeQ = new Node(this.posX + this.width - 5, this.posY + 30, true)
    public nodeNotQ = new Node(this.posX + this.width + 5, this.posY + this.height - 30, true)
    public nodeStartID = this.nodeD.id

    constructor(type: ICType) {
        super(type)
    }

    destroy() {
        this.nodeD.destroy()
        this.nodeClock.destroy()
        this.nodeQ.destroy()
        this.nodeNotQ.destroy()
    }

    draw() {
        super.draw()
        this.generateOutput()

        this.nodeD.updatePosition(this.posX + 5, this.posY + 30)
        this.nodeClock.updatePosition(this.posX + 5, this.posY + this.height - 30)
        this.nodeQ.updatePosition(this.posX + this.width - 5, this.posY + 30)
        this.nodeNotQ.updatePosition(this.posX + this.width - 5, this.posY + this.height - 30)

        this.nodeD.draw()
        this.nodeClock.draw()
        this.nodeQ.draw()
        this.nodeNotQ.draw()
    }

    refreshNodes() {
        let currentID = this.nodeStartID

        this.nodeD.setID(currentID)
        currentID++

        this.nodeClock.setID(currentID)
        currentID++

        this.nodeQ.setID(currentID)
        currentID++

        this.nodeNotQ.setID(currentID)

    }

    abstract generateOutput(): void

    mouseClicked(): boolean {
        return any([
            this.isMouseOver(),
            this.nodeD.mouseClicked(),
            this.nodeClock.mouseClicked(),
            this.nodeQ.mouseClicked(),
            this.nodeNotQ.mouseClicked(),
        ])
    }

}

export class FF_D_Single extends FF_D {

    public srLatchSync = new SR_LatchSync(GateType.NAND, true)

    constructor() {
        super(ICType.FF_D_SINGLE)
        this.nodeClock.value = true
        this.generateOutput()
        this.nodeClock.value = false
    }

    generateOutput() {
        this.srLatchSync.nodeSet.value = this.nodeD.value
        this.srLatchSync.nodeReset.value = !this.nodeD.value
        this.srLatchSync.nodeClock.value = this.nodeClock.value

        this.srLatchSync.generateOutput()

        this.nodeQ.value = this.srLatchSync.nodeQ.value
        this.nodeNotQ.value = this.srLatchSync.nodeNotQ.value
    }
}

export class FF_D_MasterSlave extends FF_D {

    public master = new FF_D_Single()
    public slave = new FF_D_Single()

    constructor() {
        super(ICType.FF_D_MASTERSLAVE)
    }

    generateOutput() {
        this.master.nodeD.value = this.nodeD.value
        this.master.nodeClock.value = this.nodeClock.value

        this.master.generateOutput()

        this.slave.nodeD.value = this.master.nodeQ.value
        this.slave.nodeClock.value = !this.nodeClock.value

        this.slave.generateOutput()

        this.nodeQ.value = this.slave.nodeQ.value
        this.nodeNotQ.value = this.slave.nodeNotQ.value
    }

    draw() {
        super.draw()

        // negative edge-triggered
        fill(0xFF) // white
        stroke(0)
        strokeWeight(2)
        circle(this.posX + 17, this.posY + this.height - 30, 8)
    }
}
