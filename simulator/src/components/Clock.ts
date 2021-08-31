import { LogicInputBase, LogicInputBaseDef } from "./LogicInput"
import * as t from "io-ts"
import { ComponentState, extendComponent } from "./Component"
import { isDefined, isUnset, TriState, typeOrUndefined } from "../utils"
import { br, emptyMod, mods, tooltipContent } from "../htmlgen"
import { DrawContext } from "./Drawable"
import { Timeline } from "../Timeline"
import { COLOR_COMPONENT_BORDER } from "../drawutils"


const ClockMandatoryParams = t.type({
    period: t.number,
    dutycycle: typeOrUndefined(t.number),
    phase: typeOrUndefined(t.number),
    showLabel: typeOrUndefined(t.boolean),
}, "Clock")
type ClockMandatoryParams = t.TypeOf<typeof ClockMandatoryParams>

export const ClockDef =
    extendComponent(LogicInputBaseDef, ClockMandatoryParams)

export type ClockRepr = typeof ClockDef.reprType

const DEFAULT_DUTY_CYCLE = 50
const DEFAULT_PHASE = 0
const DEFAULT_SHOW_LABEL = true

export class Clock extends LogicInputBase<ClockRepr> {

    public readonly period: number
    public readonly dutycycle: number = DEFAULT_DUTY_CYCLE
    public readonly phase: number = DEFAULT_PHASE
    public readonly showLabel: boolean = DEFAULT_SHOW_LABEL

    constructor(savedData: ClockRepr | ClockMandatoryParams) {
        super(
            false,
            "id" in savedData ? savedData : null
        )
        this.period = savedData.period
        if (isDefined(savedData.dutycycle)) {
            this.dutycycle = savedData.dutycycle % 100
        }
        if (isDefined(savedData.phase)) {
            this.phase = savedData.phase % savedData.period
        }
        if (isDefined(savedData.showLabel)) {
            this.showLabel = savedData.showLabel
        }
        // sets the value and schedules the next tick
        this.tickCallback(Timeline.adjustedTime())
    }

    toJSON() {
        return {
            ...this.toJSONBase(),
            period: this.period,
            dutycycle: (this.dutycycle === DEFAULT_DUTY_CYCLE) ? undefined : this.dutycycle,
            phase: (this.phase === DEFAULT_PHASE) ? undefined : this.phase,
            showLabel: (this.showLabel === DEFAULT_SHOW_LABEL) ? undefined : this.showLabel,
        }
    }

    public get componentType() {
        return "Clock" as const
    }

    public override makeTooltip() {
        return tooltipContent("Horloge",
            mods(`Période: ${this.period} ms`, br, `Rapport cyclique: ${this.dutycycle}%`,
                this.phase === 0
                    ? emptyMod
                    : mods(br, `Déphasage: ${this.phase} ms`)
            ))
    }

    private currentClockValue(time: number): [boolean, number] {
        const myTime = time - this.phase
        let timeOverPeriod = myTime % this.period
        if (timeOverPeriod < 0) {
            timeOverPeriod += this.period
        }
        const onDuration = this.period * this.dutycycle / 100
        const offDuration = this.period - onDuration
        let value: boolean
        let timeOverLastTick: number
        if (timeOverPeriod < onDuration) {
            value = true
            timeOverLastTick = timeOverPeriod
        } else {
            value = false
            timeOverLastTick = timeOverPeriod - onDuration
        }
        const lastTick = time - timeOverLastTick
        const nextTick = lastTick + (value ? onDuration : offDuration)

        return [value, nextTick]
    }

    protected doRecalcValue(): TriState {
        // nothing special to recalc, will change automatically on next tick,
        // so until further notice, we keep this same value
        return this.value
    }

    private tickCallback(theoreticalTime: number) {
        const [value, nextTick] = this.currentClockValue(theoreticalTime)
        this.doSetValue(value)
        if (this.state !== ComponentState.DEAD) {
            Timeline.scheduleAt(nextTick, "next tick for clock value " + (!value), time => this.tickCallback(time))
        }
    }

    override doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        super.doDraw(g, ctx)

        if (!this.showLabel) {
            return
        }

        ctx.inNonTransformedFrame(() => {
            const w = 40
            const h = 10
            const offsetY = this.orient === "s" ? -36 : 26
            stroke(COLOR_COMPONENT_BORDER)
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
            fill(COLOR_COMPONENT_BORDER)
            textSize(10)
            textAlign(CENTER, CENTER)
            textStyle(NORMAL)
            const periodStr = this.period >= 1000
                ? (this.period / 1000) + " s"
                : this.period + " ms"
            text(periodStr, this.posX, bottom + 8)
        })
    }

    override mouseClicked(__: MouseEvent | TouchEvent): boolean {
        this.doSetValue(isUnset(this.value) ? true : !this.value)
        return true
    }

}
