import { LogicInputBase, LogicInputBaseDef } from "./LogicInput"
import * as t from "io-ts"
import { ComponentState, extendComponent, typeOrUndefined } from "./Component"
import { isDefined, TriState } from "../utils"
import { currentEpochTime } from "../simulator"
import { br, emptyMod, mods, tooltipContent } from "../htmlgen"


const ClockMandatoryParams = t.type({
    period: t.number,
    dutycycle: typeOrUndefined(t.number),
    phase: typeOrUndefined(t.number),
}, "Clock")
type ClockMandatoryParams = t.TypeOf<typeof ClockMandatoryParams>

export const ClockDef =
    extendComponent(LogicInputBaseDef, ClockMandatoryParams)

export type ClockRepr = typeof ClockDef.reprType

const DEFAULT_DUTY_CYCLE = 50

export class Clock extends LogicInputBase<ClockRepr> {

    public readonly period: number
    public readonly dutycycle: number = DEFAULT_DUTY_CYCLE
    public readonly phase: number = 0

    constructor(savedData: ClockRepr | ClockMandatoryParams) {
        super(false, "id" in savedData ? savedData : null)
        this.period = savedData.period
        if (isDefined(savedData.dutycycle)) {
            this.dutycycle = savedData.dutycycle
        }
        if (isDefined(savedData.phase)) {
            this.phase = savedData.phase
        }
    }

    toJSON() {
        return {
            ...this.toJSONBase(),
            period: this.period,
            dutycycle: (this.dutycycle === DEFAULT_DUTY_CYCLE) ? undefined : this.dutycycle,
            phase: (this.phase === 0) ? undefined : this.phase,
        }
    }

    public makeTooltip() {
        return tooltipContent("Horloge",
            mods(`Période: ${this.period} ms`, br, `Rapport cyclique: ${this.dutycycle}%`,
                this.phase === 0
                    ? emptyMod
                    : mods(br, `Déphasage: ${this.phase} ms`)
            ))
    }

    protected doRecalcValue(): TriState {
        const myTime = currentEpochTime() - this.phase
        let timeOverPeriod = myTime % this.period
        while (timeOverPeriod < 0) {
            timeOverPeriod += this.period
        }
        const onDuration = this.period * this.dutycycle / 100
        const value = timeOverPeriod <= onDuration ? true : false

        if (this.state !== ComponentState.DEAD) {
            const nextTick = value
                ? this.period - onDuration - timeOverPeriod
                : this.period - timeOverPeriod
            setTimeout(() => this.recalcValue(), nextTick)
        }

        return value
    }

    doDraw(isMouseOver: boolean) {
        super.doDraw(isMouseOver)

        const w = 40
        const h = 10
        const offsetY = 28
        stroke(0)
        strokeWeight(1)
        const left = this.posX - w / 2
        const mid1 = left + w * this.phase / this.period
        const mid2 = mid1 + w * this.dutycycle / 100
        const right = this.posX + w / 2
        const bottom = this.posY + offsetY + h / 2
        const top = this.posY + offsetY - h / 2
        line(left, bottom, mid1, bottom)
        line(mid1, bottom, mid1, top)
        line(mid1, top, mid2, top)
        line(mid2, top, mid2, bottom)
        line(mid2, bottom, right, bottom)

        noStroke()
        fill(0)
        textSize(10)
        textAlign(CENTER, CENTER)
        textStyle(NORMAL)
        const periodStr = this.period % 1000 === 0
            ? (this.period / 1000) + " s"
            : this.period + " ms"
        text(periodStr, this.posX, bottom + 8)
    }

}
