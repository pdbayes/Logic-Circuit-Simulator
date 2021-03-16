import { currMouseAction, backToEdit } from "../menutools.js"
import { ICImages } from "../simulator.js"
import { MouseAction, Mode, ICType } from "./Enums.js"
import { colorMouseOver, fileManager, mode } from "../simulator.js"

export abstract class Integrated {

    public width = ICImages[this.type].width
    public height = ICImages[this.type].height
    public posX = mouseX - (this.width / 2)
    public posY = mouseY - (this.height / 2)
    public isSpawned = false
    public offsetMouseX = 0
    public offsetMouseY = 0
    public isMoving = false
    public isSaved = false

    constructor(
        public type: ICType
    ) {
    }

    draw() {
        if (!this.isSpawned) {
            this.posX = mouseX - (this.width / 2)
            this.posY = mouseY - (this.height / 2)
        } else if (!this.isSaved) {
            fileManager.saveState()
            this.isSaved = true
        }

        if (this.isMoving) {
            this.posX = mouseX + this.offsetMouseX
            this.posY = mouseY + this.offsetMouseY
        }

        if (this.isMouseOver()) {
            noFill()
            strokeWeight(2)
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
            rect(this.posX, this.posY, ICImages[this.type].width, ICImages[this.type].height)
        }

        image(ICImages[this.type], this.posX, this.posY)
    }

    /**
     * Checking if mouse is over this element
     */
    isMouseOver() {
        if (mode >= Mode.CONNECT && mouseX > this.posX && mouseX < (this.posX + this.width)
            && mouseY > this.posY && mouseY < (this.posY + this.height)) {
            return true
        }
        return false
    }

    /**
     * When mouse is clicked:
     *  -If this element is not spawned, Spawn this on mouse position, return to edit mode.
     * 
     *  -If mouse is over this element OR current mouse action is move, set this isMoving to true and move this element to mouse position  
     */
    mousePressed() {
        if (!this.isSpawned) {
            this.posX = mouseX - (this.width / 2)
            this.posY = mouseY - (this.height / 2)
            this.isSpawned = true
            backToEdit()
            return
        }

        if (this.isMouseOver() || currMouseAction === MouseAction.MOVE) {
            this.isMoving = true
            this.offsetMouseX = this.posX - mouseX
            this.offsetMouseY = this.posY - mouseY
        }
    }

    /**
     * Function to call when mouse is clicked
     */
    abstract mouseClicked(): boolean

    /**
     * Function to call when mouse is released:
     *  Stop this element.
     */
    mouseReleased() {
        this.isMoving = false
    }

}
