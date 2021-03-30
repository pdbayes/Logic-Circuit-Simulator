// import { GateBase } from "./Gate"
// import { ICType, GateType } from "./Enums"
// import { Integrated } from "./Integrated"
// import { Node } from "./Node"
// import { any } from "../simulator"
// import { GRID_STEP } from "./Component"

// export abstract class SR_Latch extends Integrated {

//     public nodeSet = new Node(this, +5, +3)
//     public nodeReset = new Node(this, +5, +this.height / GRID_STEP - 3)
//     public nodeQ = new Node(this, +this.width - 5, +3, true)
//     public nodeNotQ = new Node(this, +this.width + 5, +this.height / GRID_STEP - 3, true)
//     public nodeStartID = this.nodeSet.id

//     constructor(type: ICType) {
//         super(type)
//     }

//     destroy() {
//         this.nodeSet.destroy()
//         this.nodeReset.destroy()
//         this.nodeQ.destroy()
//         this.nodeNotQ.destroy()
//     }

//     oldDraw() {
//         super.draw()
//         this.generateOutput()

//         this.nodeSet.updatePositionFromParent()
//         this.nodeReset.updatePositionFromParent()
//         this.nodeQ.updatePositionFromParent()
//         this.nodeNotQ.updatePositionFromParent()

//         this.nodeSet.draw()
//         this.nodeReset.draw()
//         this.nodeQ.draw()
//         this.nodeNotQ.draw()
//     }

//     refreshNodes() {
//         let currentID = this.nodeStartID
//         this.nodeSet.id = currentID++
//         this.nodeReset.id = currentID++
//         this.nodeQ.id = currentID++
//         this.nodeNotQ.id = currentID++
//     }

//     abstract generateOutput(): void

//     mouseClicked(): boolean {
//         return any([
//             this.isMouseOver(),
//             this.nodeSet.mouseClicked(),
//             this.nodeReset.mouseClicked(),
//             this.nodeQ.mouseClicked(),
//             this.nodeNotQ.mouseClicked(),
//         ])
//     }

//     static convertToType(str: string): GateType {
//         switch (str) {
//             case "NAND":
//                 return GateType.NAND

//             case "NOR":
//                 return GateType.NOR
//         }


//         return GateType.NAND
//     }
// }

// export class SR_LatchAsync extends SR_Latch {

//     public gateSet: GateBase | null
//     public gateReset: GateBase | null

//     constructor(
//         public gateType: GateType,
//         public stabilize: boolean
//     ) {
//         super(ICType.SR_LATCH_ASYNC)

//         switch (this.gateType) {
//             case GateType.NAND:
//                 this.gateSet = new GateBase("NAND")
//                 this.gateReset = new GateBase("NAND")
//                 break

//             case GateType.NOR:
//                 this.gateSet = new GateBase("NOR")
//                 this.gateReset = new GateBase("NOR")
//                 break

//             default:
//                 this.gateSet = null
//                 this.gateReset = null
//                 console.log("Gate not supported for this IC " + GateType)
//                 return
//         }


//         if (stabilize) {
//             // reset
//             this.gateReset.input0 = true
//             this.gateSet.generateOutput()
//             this.gateReset.generateOutput()
//         }
//     }

//     destroy() {
//         super.destroy()
//         this.gateReset?.destroy()
//         this.gateSet?.destroy()
//     }

//     generateOutput() {
//         if (!this.gateReset || !this.gateSet) {
//             return
//         }

//         this.gateSet.input0 = this.nodeSet.value
//         this.gateSet.input1 = this.gateReset.outputValue

//         this.gateReset.input0 = this.nodeReset.value
//         this.gateReset.input1 = this.gateSet.outputValue

//         this.gateSet.generateOutput()
//         this.gateReset.generateOutput()

//         this.nodeQ.value = this.gateReset.outputValue
//         this.nodeNotQ.value = this.gateSet.outputValue
//     }

// }

// export class SR_LatchSync extends SR_Latch {

//     public nodeClock = new Node(this, +this.width - 5, (this.height / 2) / GRID_STEP) // TODO y align on grid
//     public asyncLatch = new SR_LatchAsync(this.gateType, this.stabilize)
//     public gateSet: GateBase | null
//     public gateReset: GateBase | null

//     constructor(
//         public gateType: GateType,
//         public stabilize: boolean
//     ) {
//         super(ICType.SR_LATCH_SYNC)

//         switch (this.gateType) {
//             case GateType.NAND:
//                 this.gateSet = new GateBase("NAND")
//                 this.gateReset = new GateBase("NAND")
//                 break

//             case GateType.NOR:
//                 this.gateSet = new GateBase("AND")
//                 this.gateReset = new GateBase("AND")
//                 break

//             default:
//                 this.gateSet = null
//                 this.gateReset = null
//                 console.log("Gate not supported for this IC")
//                 break
//         }

//         if (stabilize) {
//             // reset
//             this.nodeClock.value = true
//             this.nodeReset.value = true
//             this.generateOutput()
//             this.nodeClock.value = false
//             this.nodeReset.value = false
//         }
//     }

//     destroy() {
//         super.destroy()
//         this.nodeClock.destroy()
//         this.gateSet?.destroy()
//         this.gateReset?.destroy()
//         this.asyncLatch.destroy()
//     }

//     oldDraw() {
//         super.draw()
//         this.nodeClock.updatePositionFromParent()
//         this.nodeClock.draw()
//     }

//     refreshNodes() {
//         super.refreshNodes()
//         let currentID = this.nodeStartID + 4
//         this.nodeClock.id = currentID++
//     }

//     generateOutput() {
//         if (!this.gateSet || !this.gateReset) {
//             return
//         }

//         this.gateSet.input0 = this.nodeSet.value
//         this.gateSet.input1 = this.nodeClock.value
//         this.gateReset.input0 = this.nodeReset.value
//         this.gateReset.input1 = this.nodeClock.value

//         this.gateSet.generateOutput()
//         this.gateReset.generateOutput()

//         this.asyncLatch.nodeSet.value = this.gateSet.outputValue
//         this.asyncLatch.nodeReset.value = this.gateReset.outputValue

//         this.asyncLatch.generateOutput()

//         if (this.gateType === GateType.NOR) {
//             this.nodeQ.value = this.asyncLatch.nodeQ.value
//             this.nodeNotQ.value = this.asyncLatch.nodeNotQ.value
//         } else {
//             // invert if NAND
//             this.nodeNotQ.value = this.asyncLatch.nodeQ.value
//             this.nodeQ.value = this.asyncLatch.nodeNotQ.value
//         }
//     }

//     mouseClicked(): boolean {
//         return any([
//             super.mouseClicked(),
//             this.nodeClock.mouseClicked(),
//         ])
//     }
// }
