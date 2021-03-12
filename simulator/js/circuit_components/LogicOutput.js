import { currMouseAction, backToEdit } from "../menutools.js"
import { MouseAction } from "./Enums.js";
import { Node, fillValue } from "./Node.js";
import { colorMouseOver, fileManager } from "../simulator.js"

export class LogicOutput {
    
    constructor() {
        this.value = false;
        this.name = "";
        this.posX = mouseX;
        this.posY = mouseY;
        this.diameter = 25;
        this.isSpawned = false;
        this.isMoving = false;
        this.offsetMouseX = 0;
        this.offsetMouseY = 0;
        this.input = new Node(this.posX - 30, this.posY, false, this.value);
        this.nodeStartID = this.input.id;
        this.isSaved = false;
    }

    toJSON(key) {
        return {
            name: (this.name) ? this.name : undefined,
            id: this.nodeStartID,
            pos: [this.posX, this.posY],
            value: this.value,
        }
    }


    destroy() {
        this.input.destroy();
        delete this.input;
    }

    draw() {
        if (!this.isSpawned) {
            this.posX = mouseX;
            this.posY = mouseY;
        } else if (!this.isSaved) {
            fileManager.saveState();
            this.isSaved = true;
        }

        if (this.isMoving) {
            this.posX = mouseX + this.offsetMouseX;
            this.posY = mouseY + this.offsetMouseY;
        }

        this.input.updatePosition(this.posX - 30, this.posY);

        this.value = this.input.getValue();

        fillValue(this.value);

        if (this.isMouseOver())
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2]);
        else
            stroke(0);


        strokeWeight(4);
        line(this.posX, this.posY, this.posX - 30, this.posY);
        circle(this.posX, this.posY, this.diameter);

        this.input.draw();

        noStroke();
        fill(0);
        textSize(18);
        textStyle(ITALIC);
        textAlign(LEFT, CENTER);
        if (this.name)
            text(this.name, this.posX + 21, this.posY);

        textSize(18);
        textAlign(CENTER, CENTER);
        if (this.value) {
            textStyle(BOLD);
            text('1', this.posX, this.posY);
        }
        else {
            textStyle(NORMAL);
            fill(255);
            text('0', this.posX, this.posY);
        }
    }

    refreshNodes() {
        let currentID = this.nodeStartID;
        this.input.setID(currentID);
    }

    isMouseOver() {
        if (dist(mouseX, mouseY, this.posX, this.posY) < this.diameter / 2)
            return true;
        return false;
    }

    mousePressed() {
        if (!this.isSpawned) {
            this.posX = mouseX;
            this.posY = mouseY;
            this.isSpawned = true;
            backToEdit();
            return;
        }

        if (this.isMouseOver() || currMouseAction == MouseAction.MOVE) {
            this.isMoving = true;
            this.offsetMouseX = this.posX - mouseX;
            this.offsetMouseY = this.posY - mouseY;
        }
    }

    mouseReleased() {
        if (this.isMoving) {
            this.isMoving = false;
        }

    }

    mouseClicked() {
        if (this.isMouseOver() || this.input.isMouseOver()) {
            this.input.mouseClicked();
            return true;
        }
        return false;
    }
}
