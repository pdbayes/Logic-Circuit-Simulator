// import { ICImages } from "../simulator.js"
// import { Mode, ICType } from "./Enums.js"
// import { colorMouseOver, mode } from "../simulator.js"
// import { ComponentBase } from "./Component.js"

export enum ICType {
    SR_LATCH_ASYNC,
    SR_LATCH_SYNC,
    FF_D_SINGLE,
    FF_D_MASTERSLAVE,
    FF_T,
    FF_JK,
}

export enum SyncType {
    ASYNC,
    SYNC,
}

// export abstract class Integrated extends ComponentBase {

//     public width = ICImages[this.type].width
//     public height = ICImages[this.type].height

//     constructor(
//         public type: ICType
//     ) {
//         super()
//     }

//     draw() {
//         this.updatePositionIfNeeded()

//         if (this.isMouseOver()) {
//             noFill()
//             strokeWeight(2)
//             stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
//             rect(this.posX, this.posY, ICImages[this.type].width, ICImages[this.type].height)
//         }

//         image(ICImages[this.type], this.posX, this.posY)
//     }

//     isMouseOver() {
//         return mode >= Mode.CONNECT && mouseX > this.posX && mouseX < (this.posX + this.width)
//             && mouseY > this.posY && mouseY < (this.posY + this.height)
//     }


// }
