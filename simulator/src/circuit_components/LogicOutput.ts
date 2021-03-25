import { isDefined, isNotNull, Mode, TriState } from "../utils.js"
import { colorMouseOver, fillForBoolean, mode, roundValue, wireLine } from "../simulator.js"
import { ComponentBase, ComponentRepr, INPUT_OUTPUT_DIAMETER } from "./Component.js"

interface LogicOutputRepr extends ComponentRepr<1, 0> {
    name: string | undefined
}

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
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
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
