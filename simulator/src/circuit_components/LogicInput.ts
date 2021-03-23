import { Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, fillForBoolean, isDefined, isNotNull, mode, wireLine } from "../simulator.js"
import { ComponentBase, ComponentRepr, IDGen, INPUT_OUTPUT_DIAMETER } from "./Component.js"

export interface LogicInputRepr extends ComponentRepr {
    val: number
    name: string | undefined
}

export abstract class LogicInputBase<Repr extends LogicInputRepr> extends ComponentBase<0, 1, Repr> {

    private _value = false
    protected readonly name: string | undefined = undefined

    public constructor(savedData: Repr | null) {
        super(savedData)
        if (isNotNull(savedData)) {
            this._value = !!savedData.val
            this.name = savedData.name
        }
    }

    toJSONBase() {
        return {
            name: this.name,
            val: this.value ? 1 : 0,
            ...super.toJSONBase(),
        }
    }

    protected makeNodes(genID: IDGen) {
        return [[], [
            new Node(genID(), this, +3, 0, true),
        ]] as const
    }

    public get value(): boolean {
        return this._value
    }

    toggleValue() {
        this._value = !this._value
    }

    draw() {
        this.updatePositionIfNeeded()

        const output = this.outputs[0]
        output.value = this.value
        wireLine(output, this.posX, this.posY)

        if (this.isMouseOver()) {
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
        } else {
            stroke(0)
        }
        fillForBoolean(this.value)
        strokeWeight(4)
        circle(this.posX, this.posY, INPUT_OUTPUT_DIAMETER)

        output.draw()

        this.printInfo()
        textSize(18)
        textAlign(CENTER, CENTER)
        if (this.value) {
            textStyle(BOLD)
            text('1', this.posX, this.posY)
        } else {
            fill(255)
            textStyle(NORMAL)
            text('0', this.posX, this.posY)
        }
    }

    printInfo() {
        noStroke()
        fill(0)
        textSize(18)
        textStyle(ITALIC)
        textAlign(RIGHT, CENTER)
        if (isDefined(this.name)) {
            text(this.name, this.posX - 25, this.posY)
        }
    }

    isMouseOver(): boolean {
        return mode >= Mode.TRYOUT && dist(mouseX, mouseY, this.posX, this.posY) < INPUT_OUTPUT_DIAMETER / 2
    }

    doubleClicked() {
        if (this.isMouseOver()) {
            this.toggleValue()
        }
    }

    mouseClicked() {
        const output = this.outputs[0]
        if (this.isMouseOver() || output.isMouseOver()) {
            output.mouseClicked()
            return true
        }
        return false
    }

}

export class LogicInput extends LogicInputBase<LogicInputRepr> {

    toJSON() {
        return this.toJSONBase()
    }

}
