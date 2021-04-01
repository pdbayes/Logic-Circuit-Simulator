import { isDefined, isNotNull, isUnset, Mode, toTriState, toTriStateRepr, TriState, TriStateRepr, Unset } from "../utils"
import { ComponentBase, defineComponent, INPUT_OUTPUT_DIAMETER, typeOrUndefined } from "./Component"
import * as t from "io-ts"
import { wireLine, fillForBoolean, roundValue, COLOR_MOUSE_OVER } from "../drawutils"
import { mode, modifierKeys } from "../simulator"

export const LogicInputDef =
    defineComponent(0, 1, t.type({
        val: TriStateRepr,
        name: typeOrUndefined(t.string),
    }, "LogicInput"))

export type LogicInputRepr = typeof LogicInputDef.reprType

export abstract class LogicInputBase<Repr extends typeof LogicInputDef.reprType> extends ComponentBase<0, 1, Repr, TriState> {

    protected readonly name: string | undefined = undefined

    public constructor(savedData: Repr | null) {
        super(
            // initial value may be given by saved data
            isNotNull(savedData) ? toTriState(savedData.val) : false,
            savedData, { outOffsets: [[+3, 0]] }
        )
        if (isNotNull(savedData)) {
            this.name = savedData.name
        }
    }

    toJSONBase() {
        return {
            ...super.toJSONBase(),
            name: this.name,
            val: toTriStateRepr(this.value),
        }
    }

    protected toStringDetails(): string {
        return "" + this.value
    }

    get width() {
        return INPUT_OUTPUT_DIAMETER
    }

    get height() {
        return INPUT_OUTPUT_DIAMETER
    }

    isOver(x: number, y: number) {
        return mode >= Mode.TRYOUT && dist(x, y, this.posX, this.posY) < INPUT_OUTPUT_DIAMETER / 2
    }

    toggleValue() {
        this.doSetValue(isUnset(this.value) ? true : !this.value)
    }

    protected propagateNewValue(newValue: TriState) {
        this.outputs[0].value = newValue
    }

    doDraw(isMouseOver: boolean) {
        wireLine(this.outputs[0], this.posX, this.posY)

        if (isMouseOver) {
            stroke(...COLOR_MOUSE_OVER)
        } else {
            stroke(0)
        }
        fillForBoolean(this.value)
        strokeWeight(4)
        circle(this.posX, this.posY, INPUT_OUTPUT_DIAMETER)

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

    mouseDoubleClick(__: MouseEvent | TouchEvent) {
        this.doSetValue((() => {
            switch (this.value) {
                case true: return (mode >= Mode.FULL && modifierKeys.isOptionDown) ? Unset : false
                case false: return (mode >= Mode.FULL && modifierKeys.isOptionDown) ? Unset : true
                case Unset: return mode >= Mode.FULL ? false : Unset
            }
        })())
    }

}

export class LogicInput extends LogicInputBase<typeof LogicInputDef.reprType> {

    toJSON() {
        return this.toJSONBase()
    }

    get cursorWhenMouseover() {
        return "pointer"
    }

    protected doRecalcValue(): TriState {
        // this never changes on its own
        return this.value
    }

}
