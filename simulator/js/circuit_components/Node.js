import { INPUT_STATE } from "./Enums.js";
import { wireMng } from "../simulator.js";

export let nodeList = [];

let nextNodeID = 0;

export class Node {
    
    constructor(posX, posY, isOutput = false, value = false) {
        this.diameter = 10;
        this.value = value;
        this.posX = posX;
        this.posY = posY;
        this.isOutput = isOutput;
        this.hitRange = this.diameter + 10;

        // only once input per node
        this.inputState = INPUT_STATE.FREE;

        this.isAlive = true; // not destroyed
        this.brotherNode = null; // for short circuit

        this.id = nextNodeID++;

        nodeList[this.id] = this;
        //console.log(nodeList);
    }

    destroy() {
        this.isAlive = false;
        delete nodeList[this.id];
    }

    draw() {
        fillValue(this.value);

        stroke(0);
        strokeWeight(4);
        circle(this.posX, this.posY, this.diameter);

        if (this.isMouseOver()) {
            fill(128, 128);
            noStroke();
            circle(this.posX, this.posY, this.hitRange)
        }

        /*noStroke();
        fill(0);
        textSize(12);
        textStyle(NORMAL);
        text(this.id, this.posX - 20, this.posY + 25);*/
    }

    setID(newID) {
        if (nodeList[this.id] == this)
            delete nodeList[this.id];

        this.id = newID;
        nodeList[newID] = this;

        //update max id
        if (newID >= nextNodeID)
            nextNodeID = newID + 1;
    }

    setInputState(state) {
        this.inputState = state;
    }

    setBrother(brotherNode) {
        this.brotherNode = brotherNode;
    }

    getBrother() {
        return this.brotherNode;
    }

    getValue() {
        return this.value;
    }

    setValue(value) {
        this.value = value;
    }

    updatePosition(posX, posY) {
        this.posX = posX;
        this.posY = posY;
    }

    isMouseOver() {
        if (dist(mouseX, mouseY, this.posX, this.posY) < (this.hitRange) / 2)
            return true;
        return false;
    }

    mouseClicked() {
        if (this.isMouseOver() && (this.inputState == INPUT_STATE.FREE || this.isOutput)) {
            wireMng.addNode(this);
            return true;
        }
        return false;
    }


};

export function fillValue(value) {
    if (value)
        fill(255, 193, 7);
    else
        fill(52, 58, 64);
}