import { isDefined, isNotNull, isUnset, Mode, toTriState, toTriStateRepr, TriState, TriStateRepr, Unset } from "../utils.js"
import { colorMouseOver, fillForBoolean, roundValue, modifierKeys, mode, wireLine } from "../simulator.js"
import { ComponentBase, defineComponent, INPUT_OUTPUT_DIAMETER, typeOrUndefined } from "./Component.js"
import * as t from "io-ts"

export const LogicInputDef =
    defineComponent(0, 1, t.type({
        val: TriStateRepr,
        name: typeOrUndefined(t.string),
    }, "LogicInput"))

export type LogicInputRepr = typeof LogicInputDef.reprType

export abstract class LogicInputBase<Repr extends typeof LogicInputDef.reprType> extends ComponentBase<0, 1, Repr> {

    private _value: TriState = false
    protected readonly name: string | undefined = undefined

    public constructor(savedData: Repr | null) {
        super(savedData, { outOffsets: [[+3, 0]] })
        if (isNotNull(savedData)) {
            this._value = toTriState(savedData.val)
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
                    case true: return (mode >= Mode.FULL && modifierKeys.isOptionDown) ? Unset : false
                    case false: return (mode >= Mode.FULL && modifierKeys.isOptionDown) ? Unset : true
                    case Unset: return mode >= Mode.FULL ? false : Unset
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

export class LogicInput extends LogicInputBase<typeof LogicInputDef.reprType> {

    toJSON() {
        return this.toJSONBase()
    }

}
