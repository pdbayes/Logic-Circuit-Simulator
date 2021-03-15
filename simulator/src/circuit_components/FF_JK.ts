import { FF_D_MasterSlave } from "./FF_D.js"
import { Gate } from "./Gate.js"
import { ICType } from "./Enums.js"
import { Integrated } from "./Integrated.js"
import { Node } from "./Node.js"
import { any } from "../simulator.js"

export class FF_JK extends Integrated {

    public nodeJ = new Node(this.posX + 5, this.posY + 30)
    public nodeClock = new Node(this.posX + 5, this.posY + (this.height / 2))
    public nodeK = new Node(this.posX + 5, this.posY + this.height - 30)
    public nodeQ = new Node(this.posX + this.width - 5, this.posY + 30, true)
    public nodeNotQ = new Node(this.posX + this.width + 5, this.posY + this.height - 30, true)
    public ff_D = new FF_D_MasterSlave()
    public orGate = new Gate("OR")
    public andGate_Q = new Gate("AND")
    public andGate_NotQ = new Gate("AND")
    public nodeStartID = this.nodeJ.id

    constructor(
        public isNegativeEdgeTrig: boolean
    ) {
        super(ICType.FF_JK)
    }

    destroy() {
        this.nodeK.destroy()
        this.nodeClock.destroy()
        this.nodeJ.destroy()
        this.nodeQ.destroy()
        this.nodeNotQ.destroy()
    }

    draw() {
        super.draw()
        this.generateOutput()

        this.nodeJ.updatePosition(this.posX + 5, this.posY + 30)
        this.nodeClock.updatePosition(this.posX + 5, this.posY + (this.height / 2))
        this.nodeK.updatePosition(this.posX + 5, this.posY + this.height - 30)
        this.nodeQ.updatePosition(this.posX + this.width - 5, this.posY + 30)
        this.nodeNotQ.updatePosition(this.posX + this.width - 5, this.posY + this.height - 30)

        this.nodeJ.draw()
        this.nodeClock.draw()
        this.nodeK.draw()
        this.nodeQ.draw()
        this.nodeNotQ.draw()

        if (this.isNegativeEdgeTrig) {
            fill(0xFF) // white
            stroke(0)
            strokeWeight(2)
            circle(this.posX + 17, this.posY + (this.height / 2), 8)
        }
    }

    refreshNodes() {
        let currentID = this.nodeStartID
        this.nodeJ.setID(currentID++)
        this.nodeClock.setID(currentID++)
        this.nodeK.setID(currentID++)
        this.nodeQ.setID(currentID++)
        this.nodeNotQ.setID(currentID++)
    }

    generateOutput() {
        let clockValue = this.isNegativeEdgeTrig ? this.nodeClock.value : !this.nodeClock.value

        this.andGate_NotQ.input[0].value = this.nodeJ.value
        this.andGate_NotQ.input[1].value = this.ff_D.nodeNotQ.value
        this.andGate_Q.input[0].value = !this.nodeK.value

        this.andGate_Q.generateOutput()
        this.andGate_NotQ.generateOutput()

        this.orGate.input[0].value = this.andGate_Q.output?.value ?? false
        this.orGate.input[1].value = this.andGate_NotQ.output?.value ?? false

        this.orGate.generateOutput()

        this.ff_D.nodeD.value = this.orGate.output?.value ?? false
        this.ff_D.nodeClock.value = clockValue

        this.ff_D.generateOutput()

        this.nodeQ.value = this.ff_D.nodeQ.value
        this.nodeNotQ.value = this.ff_D.nodeNotQ.value
    }

    mouseClicked(): boolean {
        return any([
            this.isMouseOver(),
            this.nodeJ.mouseClicked(),
            this.nodeK.mouseClicked(),
            this.nodeClock.mouseClicked(),
            this.nodeQ.mouseClicked(),
            this.nodeNotQ.mouseClicked(),
        ])
    }

}
