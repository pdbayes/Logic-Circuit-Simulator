import { isDefined, isNotNull, isUnset, Mode, toTriStateRepr, TriState, TriStateRepr, Unset } from "../utils.js"
import { colorMouseOver, fillForBoolean, roundValue, modifierKeys, mode, wireLine } from "../simulator.js"
import { ComponentBase, ComponentRepr, INPUT_OUTPUT_DIAMETER } from "./Component.js"

export interface LogicInputRepr extends ComponentRepr<0, 1> {
    val: TriStateRepr
    name: string | undefined
}

export abstract class LogicInputBase<Repr extends LogicInputRepr> extends ComponentBase<0, 1, Repr> {

    private _value: TriState = false
    protected readonly name: string | undefined = undefined

    public constructor(savedData: Repr | null) {
        super(savedData, { outOffsets: [[+3, 0]] })
        if (isNotNull(savedData)) {
            this._value = isUnset(savedData.val) ? Unset : !!savedData.val
            this.name = savedData.name
        }
    }

    toJSONBase() {
        return {
            ...super.toJSONBase(),
            name: this.name,
            val: toTriStateRepr(this._value),
        }
    }

    public get value(): TriState {
        return this._value
    }

    toggleValue() {
        this._value = isUnset(this._value) ? true : !this._value
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

        roundValue(this)
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
            this._value = (() => {
                switch (this._value) {
                    case true: return (modifierKeys.isOptionDown) ? Unset : false
                    case false: return (modifierKeys.isOptionDown) ? Unset : true
                    case Unset: return false
                }
            })()
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
