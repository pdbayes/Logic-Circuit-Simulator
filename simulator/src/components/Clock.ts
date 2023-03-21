import * as t from "io-ts"
import { COLOR_COMPONENT_BORDER } from "../drawutils"
import { br, emptyMod, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { isDefined, isNotNull, LogicValue, typeOrUndefined } from "../utils"
import { ComponentNameRepr, ComponentState, defineComponent, Repr } from "./Component"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { InputBase } from "./Input"

export const ClockDef =
    defineComponent("clock", {
        repr: {
            name: ComponentNameRepr,
            period: t.number,
            dutycycle: typeOrUndefined(t.number),
            phase: typeOrUndefined(t.number),
            showLabel: typeOrUndefined(t.boolean),
        },
        valueDefaults: {
            period: 2000,
            dutycycle: 50,
            phase: 0,
            showLabel: true,
        },
        size: { gridWidth: 2, gridHeight: 2 }, // "overridden" by superclass
        makeNodes: () => ({
            outs: {
                // we don't strictly need a group, but we use it
                // for compatibility with InputBase
                Out: [[3, 0, "e"]],
            },
        }),
        initialValue: () => [false as LogicValue],
    })

export type ClockRepr = Repr<typeof ClockDef>

export class Clock extends InputBase<ClockRepr> {

    public get numBits() { return 1 }
    private _period: number = ClockDef.aults.period
    private _dutycycle: number = ClockDef.aults.dutycycle
    private _phase: number = ClockDef.aults.phase
    private _showLabel: boolean = ClockDef.aults.showLabel

    public constructor(editor: LogicEditor, savedData: ClockRepr | null) {
        super(editor, ClockDef, savedData)
        if (isNotNull(savedData)) {
            this._period = savedData.period
            if (isDefined(savedData.dutycycle)) {
                this._dutycycle = savedData.dutycycle % 100
            }
            if (isDefined(savedData.phase)) {
                this._phase = savedData.phase % savedData.period
            }
            this._showLabel = savedData.showLabel ?? ClockDef.aults.showLabel
        }
        // sets the value and schedules the next tick
        this.tickCallback(editor.timeline.adjustedTime())
    }

    public toJSON() {
        return {
            type: "clock" as const,
            ...this.toJSONBase(),
            period: this._period,
            dutycycle: (this._dutycycle === ClockDef.aults.dutycycle) ? undefined : this._dutycycle,
            phase: (this._phase === ClockDef.aults.phase) ? undefined : this._phase,
            showLabel: (this._showLabel === ClockDef.aults.showLabel) ? undefined : this._showLabel,
        }
    }

    public override makeTooltip() {
        const s = S.Components.Clock.tooltip
        return tooltipContent(s.title,
            mods(s.period[0] + this._period + s.period[1], br,
                s.dutycycle[0] + this._dutycycle + s.dutycycle[1],
                this._phase === 0
                    ? emptyMod
                    : mods(br, s.phase[0] + this._phase + s.phase[1])
            ))
    }

    private currentClockValue(time: number): [boolean, number] {
        const myTime = time - this._phase
        let timeOverPeriod = myTime % this._period
        if (timeOverPeriod < 0) {
            timeOverPeriod += this._period
        }
        const onDuration = this._period * this._dutycycle / 100
        const offDuration = this._period - onDuration
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

    private tickCallback(theoreticalTime: number) {
        const [value, nextTick] = this.currentClockValue(theoreticalTime)
        this.doSetValue([value])
        if (this.state !== ComponentState.DEAD) {
            this.editor.timeline.scheduleAt(nextTick, "next tick for clock value " + (!value), time => this.tickCallback(time))
        }
    }

    protected override doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        super.doDraw(g, ctx)

        if (!this._showLabel) {
            return
        }

        ctx.inNonTransformedFrame(() => {
            const w = 40
            const h = 10
            const offsetY = this.orient === "s" ? -36 : 26
            g.strokeStyle = COLOR_COMPONENT_BORDER
            g.lineWidth = 1
            const left = this.posX - w / 2
            const mid1 = left + w * this._phase / this._period
            const mid2 = mid1 + w * this._dutycycle / 100
            const right = this.posX + w / 2
            const bottom = this.posY + offsetY + h / 2
            const top = this.posY + offsetY - h / 2
            g.beginPath()
            g.moveTo(left, bottom)
            g.lineTo(mid1, bottom)
            g.lineTo(mid1, top)
            g.lineTo(mid2, top)
            g.lineTo(mid2, bottom)
            g.lineTo(right, bottom)
            g.stroke()

            g.fillStyle = COLOR_COMPONENT_BORDER
            g.textAlign = "center"
            g.font = "10px sans-serif"
            const periodStr = this._period >= 1000
                ? (this._period / 1000) + " s"
                : this._period + " ms"
            g.fillText(periodStr, this.posX, bottom + 8)
        })
    }

    private doSetPeriod(period: number) {
        this._period = period
        this.setNeedsRedraw("period changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        const newItems: [ContextMenuItemPlacement, ContextMenuItem][] = []
        const s = S.Components.Clock.contextMenu

        const superItems = super.makeComponentSpecificContextMenuItems()
        if (isDefined(superItems)) {
            newItems.push(...superItems)
        }

        const periodPresets: [number, string][] = [
            [100, "100 ms (10 Hz)"],
            [250, "250 ms (4 Hz)"],
            [500, "500 ms (2 Hz)"],
            [1000, "1 s (1 Hz)"],
            [2000, "2 s (0.5 Hz)"],
            [4000, "4 s (0.25 Hz)"],
            [8000, "8 s (0.125 Hz)"],
        ]

        const makeItemSetPeriod = (data: [number, string]) => {
            const [period, desc] = data
            const isCurrent = this._period === period
            const icon = isCurrent ? "check" : "none"
            return ContextMenuData.item(icon, desc, () => this.doSetPeriod(period))
        }

        const myItems: [ContextMenuItemPlacement, ContextMenuItem][] = [
            ["mid", ContextMenuData.sep()],
            ["mid", ContextMenuData.submenu("timer", s.Period, periodPresets.map(makeItemSetPeriod))],
        ]

        newItems.push(...myItems)
        return newItems
    }


}
