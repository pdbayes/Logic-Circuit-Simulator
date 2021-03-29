import { isDefined, isNotNull, Mode, TriState } from "../utils.js"
import { ComponentBase, defineComponent, INPUT_OUTPUT_DIAMETER, typeOrUndefined } from "./Component.js"
import * as t from "io-ts"
import { wireLine, fillForBoolean, roundValue, COLOR_MOUSE_OVER } from "../drawutils.js"
import { mode } from "../simulator.js"


export const LogicOutputDef =
    defineComponent(1, 0, t.type({
        name: typeOrUndefined(t.string),
    }, "LogicOutput"))

type LogicOutputRepr = typeof LogicOutputDef.reprType

export class LogicOutput extends ComponentBase<1, 0, LogicOutputRepr> {

    private _value: TriState = false
    private readonly name: string | undefined = undefined

    public constructor(savedData: LogicOutputRepr | null) {
        super(savedData, { inOffsets: [[-3, 0]] })
        if (isNotNull(savedData)) {
            this.name = savedData.name
        }
    }

    toJSON() {
        return {
            ...this.toJSONBase(),
            name: this.name,
        }
    }

    public get value(): TriState {
        return this._value
    }

    draw() {
        this.updatePositionIfNeeded()

        const input = this.inputs[0]
        this._value = input.value
        wireLine(input, this.posX, this.posY)

        if (this.isMouseOver()) {
            stroke(...COLOR_MOUSE_OVER)
        } else {
            stroke(0)
        }
        fillForBoolean(this.value)
        strokeWeight(4)
        circle(this.posX, this.posY, INPUT_OUTPUT_DIAMETER)

        input.draw()

        noStroke()
        fill(0)
        textSize(18)
        textStyle(ITALIC)
        textAlign(LEFT, CENTER)
        if (isDefined(this.name)) {
            text(this.name, this.posX + 21, this.posY)
        }

        roundValue(this)
    }

    isMouseOver() {
        if (mode >= Mode.CONNECT && dist(mouseX, mouseY, this.posX, this.posY) < INPUT_OUTPUT_DIAMETER / 2) { return true }
        return false
    }

    mouseClicked() {
        const input = this.inputs[0]
        if (this.isMouseOver() || input.isMouseOver()) {
            input.mouseClicked()
            return true
        }
        return false
    }
}
