// import { FF_D_MasterSlave } from "./FF_D.js"
// import { GateBase } from "./Gate.js"
// import { ICType } from "./Enums.js"
// import { Integrated } from "./Integrated.js"
// import { Node } from "./Node.js"
// import { any } from "../simulator.js"
// import { GRID_STEP } from "./Component.js"

// export class FF_T extends Integrated {

//     public nodeT = new Node(this, +5, +3)
//     public nodeClock = new Node(this, +5, + this.height / GRID_STEP - 3) // TODO misaligned y
//     public nodeQ = new Node(this, +this.width - 5, +3, true)
//     public nodeNotQ = new Node(this, + this.width + 5, +this.height / GRID_STEP - 3, true)// TODO misaligned y
//     public ff_D = new FF_D_MasterSlave()
//     public orGate = new GateBase("OR")
//     public andGate_Q = new GateBase("AND")
//     public andGate_NotQ = new GateBase("AND")
//     public nodeStartID = this.nodeT.id

//     constructor(
//         public isNegativeEdgeTrig: boolean
//     ) {
//         super(ICType.FF_T)
//     }

//     destroy() {
//         this.nodeT.destroy()
//         this.nodeClock.destroy()
//         this.nodeQ.destroy()
//         this.nodeNotQ.destroy()
//     }

//     draw() {
//         super.draw()
//         this.generateOutput()

//         this.nodeT.updatePositionFromParent()
//         this.nodeClock.updatePositionFromParent()
//         this.nodeQ.updatePositionFromParent()
//         this.nodeNotQ.updatePositionFromParent()

//         this.nodeT.draw()
//         this.nodeClock.draw()
//         this.nodeQ.draw()
//         this.nodeNotQ.draw()

//         if (this.isNegativeEdgeTrig) {
//             fill(0xFF) // white
//             stroke(0)
//             strokeWeight(2)
//             circle(this.posX + 17, this.posY + this.height - 30, 8)
//         }
//     }

//     refreshNodes() {
//         let currentID = this.nodeStartID
//         this.nodeT.id = currentID++
//         this.nodeClock.id = currentID++
//         this.nodeQ.id = currentID++
//         this.nodeNotQ.id = currentID++
//     }

//     generateOutput() {
//         const clockValue = this.isNegativeEdgeTrig ? this.nodeClock.value : !this.nodeClock.value

//         this.andGate_NotQ.input0 = this.nodeT.value
//         this.andGate_NotQ.input1 = this.ff_D.nodeNotQ.value
//         this.andGate_Q.input0 = !this.nodeT.value
//         this.andGate_Q.input1 = this.ff_D.nodeQ.value

//         this.andGate_Q.generateOutput()
//         this.andGate_NotQ.generateOutput()

//         this.orGate.input0 = this.andGate_Q.outputValue
//         this.orGate.input1 = this.andGate_NotQ.outputValue

//         this.orGate.generateOutput()

//         this.ff_D.nodeD.value = this.orGate.outputValue
//         this.ff_D.nodeClock.value = clockValue

//         this.ff_D.generateOutput()

//         this.nodeQ.value = this.ff_D.nodeQ.value
//         this.nodeNotQ.value = this.ff_D.nodeNotQ.value
//     }

//     mouseClicked(): boolean {
//         return any([
//             this.isMouseOver(),
//             this.nodeT.mouseClicked(),
//             this.nodeClock.mouseClicked(),
//             this.nodeQ.mouseClicked(),
//             this.nodeNotQ.mouseClicked(),
//         ])
//     }

// }
