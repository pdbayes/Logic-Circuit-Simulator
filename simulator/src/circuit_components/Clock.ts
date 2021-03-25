import { Expand } from "../utils.js"
import { LogicInputBase, LogicInputRepr } from "./LogicInput.js"

type ClockMandatoryParams = {
    period: number
    dutycycle: number
}

type ClockRepr = Expand<LogicInputRepr & ClockMandatoryParams>

export class Clock extends LogicInputBase<ClockRepr> {

    private readonly period: number
    private readonly dutycycle: number
    private _lastTick = new Date().getTime()

    constructor(savedData: ClockRepr | ClockMandatoryParams) {
        super("id" in savedData ? savedData : null)
        this.period = savedData.period
        this.dutycycle = savedData.dutycycle
    }

    toJSON() {
        return {
            ...this.toJSONBase(),
            period: this.period,
            dutycycle: this.dutycycle,
        }
    }

    draw() {
        const currTick = new Date().getTime()
        const currentStateDuration =
            this.period * (
                (this.value === true) ? this.dutycycle : (100 - this.dutycycle)
            ) / 100

        if (currTick - this._lastTick > currentStateDuration) {
            this.toggleValue()
            this._lastTick = currTick
        }

        super.draw()
    }

    printInfo() {
        noStroke()
        fill(0)
        textSize(12)
        textStyle(NORMAL)
        text("CLOCK \nT = " + this.period + " ms\nD% = " + this.dutycycle, this.posX - 20, this.posY + 25)
    }
}
