export {}

// import { any } from "../simulator"
// import { GRID_STEP } from "./Component"
// import { ICType, GateType } from "./Enums"
// import { Integrated } from "./Integrated"
// import { Node } from "./Node"
// import { SR_LatchSync } from "./SR_Latch"

// export abstract class FF_D extends Integrated {

//     public nodeD = new Node(this, +5, +3)
//     public nodeClock = new Node(this, +5, this.height / GRID_STEP - 3) // TODO misaligned y
//     public nodeQ = new Node(this, +this.width - 5, +3, true)
//     public nodeNotQ = new Node(this, this.width + 5, this.height / GRID_STEP - 3, true)// TODO misaligned y
//     public nodeStartID = this.nodeD.id

//     constructor(type: ICType) {
//         super(type)
//     }

//     destroy() {
//         this.nodeD.destroy()
//         this.nodeClock.destroy()
//         this.nodeQ.destroy()
//         this.nodeNotQ.destroy()
//     }

//     oldDraw() {
//         super.draw()
//         this.generateOutput()

//         this.nodeD.updatePositionFromParent()
//         this.nodeClock.updatePositionFromParent()
//         this.nodeQ.updatePositionFromParent()
//         this.nodeNotQ.updatePositionFromParent()

//         this.nodeD.draw()
//         this.nodeClock.draw()
//         this.nodeQ.draw()
//         this.nodeNotQ.draw()
//     }

//     refreshNodes() {
//         let currentID = this.nodeStartID
//         this.nodeD.id = currentID++
//         this.nodeClock.id = currentID++
//         this.nodeQ.id = currentID++
//         this.nodeNotQ.id = currentID++
//     }

//     abstract generateOutput(): void

//     mouseClicked(): boolean {
//         return any([
//             this.isMouseOver(),
//             this.nodeD.mouseClicked(),
//             this.nodeClock.mouseClicked(),
//             this.nodeQ.mouseClicked(),
//             this.nodeNotQ.mouseClicked(),
//         ])
//     }

// }

// export class FF_D_Single extends FF_D {

//     public srLatchSync = new SR_LatchSync(GateType.NAND, true)

//     constructor() {
//         super(ICType.FF_D_SINGLE)
//         this.nodeClock.value = true
//         this.generateOutput()
//         this.nodeClock.value = false
//     }

//     generateOutput() {
//         this.srLatchSync.nodeSet.value = this.nodeD.value
//         this.srLatchSync.nodeReset.value = !this.nodeD.value
//         this.srLatchSync.nodeClock.value = this.nodeClock.value

//         this.srLatchSync.generateOutput()

//         this.nodeQ.value = this.srLatchSync.nodeQ.value
//         this.nodeNotQ.value = this.srLatchSync.nodeNotQ.value
//     }
// }

// export class FF_D_MasterSlave extends FF_D {

//     public master = new FF_D_Single()
//     public slave = new FF_D_Single()

//     constructor() {
//         super(ICType.FF_D_MASTERSLAVE)
//     }

//     generateOutput() {
//         this.master.nodeD.value = this.nodeD.value
//         this.master.nodeClock.value = this.nodeClock.value

//         this.master.generateOutput()

//         this.slave.nodeD.value = this.master.nodeQ.value
//         this.slave.nodeClock.value = !this.nodeClock.value

//         this.slave.generateOutput()

//         this.nodeQ.value = this.slave.nodeQ.value
//         this.nodeNotQ.value = this.slave.nodeNotQ.value
//     }

//     oldDraw() {
//         super.draw()

//         // negative edge-triggered
//         fill(COLOR_BACKGROUND)
//         stroke(COLOR_COMPONENT_BORDER)
//         strokeWeight(2)
//         circle(this.posX + 17, this.posY + this.height - 30, 8)
//     }
// }
