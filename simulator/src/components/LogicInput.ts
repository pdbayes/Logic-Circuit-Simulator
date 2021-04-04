import { isDefined, isNotNull, isUnset, Mode, toTriState, toTriStateRepr, TriState, TriStateRepr, Unset } from "../utils"
import { ComponentBase, defineComponent, extendComponent, INPUT_OUTPUT_DIAMETER, typeOrUndefined } from "./Component"
import * as t from "io-ts"
import { wireLine, fillForBoolean, roundValue, COLOR_MOUSE_OVER } from "../drawutils"
import { mode, modifierKeys } from "../simulator"
import { emptyMod, mods, tooltipContent } from "../htmlgen"

export const LogicInputBaseDef =
    defineComponent(0, 1, t.type({
        name: typeOrUndefined(t.string),
    }, "LogicInputBase"))

export type LogicInputBaseRepr = typeof LogicInputBaseDef.reprType

export abstract class LogicInputBase<Repr extends LogicInputBaseRepr> extends ComponentBase<0, 1, Repr, TriState> {

    protected readonly name: string | undefined = undefined

    protected constructor(initialValue: TriState, savedData: Repr | null) {
        super(initialValue, savedData, { outOffsets: [[+3, 0]] })
        if (isNotNull(savedData)) {
            this.name = savedData.name
        }
    }

    toJSONBase() {
        return {
            ...super.toJSONBase(),
            name: this.name,
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

    get allowsForcedOutputs() {
        return false
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

        noStroke()
        fill(0)
        textSize(18)
        textStyle(ITALIC)
        textAlign(RIGHT, CENTER)
        if (isDefined(this.name)) {
            text(this.name, this.posX - 25, this.posY)
        }

        roundValue(this)
    }

}


export const LogicInputDef =
    extendComponent(LogicInputBaseDef, t.type({
        val: TriStateRepr,
    }, "LogicInput"))

export type LogicInputRepr = typeof LogicInputDef.reprType

export class LogicInput extends LogicInputBase<LogicInputRepr> {

    public constructor(savedData: LogicInputRepr | null) {
        super(
            // initial value may be given by saved data
            isNotNull(savedData) ? toTriState(savedData.val) : false,
            savedData,
        )
    }

    toJSON() {
        return {
            ...super.toJSONBase(),
            val: toTriStateRepr(this.value),
        }
    }

    get cursorWhenMouseover() {
        return "pointer"
    }

    public makeTooltip() {
        return tooltipContent(undefined, mods("Entrée", isUnset(this.value) ? " dont la valeur n’est pas déterminée" : emptyMod))
    }

    protected doRecalcValue(): TriState {
        // this never changes on its own, just upon user interaction
        return this.value
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
