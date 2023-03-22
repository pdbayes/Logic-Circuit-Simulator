import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, displayValuesFromArray, drawComponentName, drawLabel, drawWireLineToComponent, useCompact } from "../drawutils"
import { tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { ArrayFillUsing, ArrayFillWith, isDefined, LogicValue, typeOrUndefined, Unknown, validate } from "../utils"
import { ComponentBase, ComponentName, ComponentNameRepr, defineParametrizedComponent, groupVertical, Repr, ResolvedParams } from "./Component"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"
import { EdgeTrigger, Flipflop, FlipflopOrLatch } from "./FlipflopOrLatch"
import { RegisterBase } from "./Register"


export const InputRandomDef =
    defineParametrizedComponent("in", "random", true, true, {
        variantName: ({ bits }) => `random-${bits}`,
        button: { imgWidth: 32 },
        repr: {
            bits: typeOrUndefined(t.number),
            prob1: typeOrUndefined(t.number),
            showProb: typeOrUndefined(t.boolean),
            trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
            name: ComponentNameRepr,
        },
        valueDefaults: {
            prob1: 0.5,
            showProb: false,
            trigger: EdgeTrigger.rising,
        },
        paramDefaults: {
            bits: 1,
        },
        validateParams: ({ bits }, defaults) => {
            const numBits = validate(bits, [1, 2, 3, 4, 7, 8, 16], defaults.bits, "Random input bits")
            return { numBits }
        },
        size: ({ numBits }) => ({
            gridWidth: 4,
            gridHeight: 4 + (useCompact(numBits) ? numBits / 2 : numBits) * 2,
        }),
        makeNodes: ({ numBits, gridHeight }) => {
            const s = S.Components.Generic
            const clockY = gridHeight / 2 - 1
            return {
                ins: {
                    Clock: [-3, clockY, "w", () => s.InputClockDesc, true],
                },
                outs: {
                    Out: groupVertical("e", 3, 0, numBits),
                },
            }
        },
        initialValue: (saved, { numBits }) => ArrayFillWith<LogicValue>(false, numBits),
    })

export type InputRandomRepr = Repr<typeof InputRandomDef>
export type InputRandomParams = ResolvedParams<typeof InputRandomDef>


export class InputRandom extends ComponentBase<InputRandomRepr> {

    public readonly numBits: number
    private _prob1: number = InputRandomDef.aults.prob1
    private _showProb: boolean = InputRandomDef.aults.showProb
    private _lastClock: LogicValue = Unknown
    private _trigger: EdgeTrigger = InputRandomDef.aults.trigger
    private _name: ComponentName = undefined

    public constructor(editor: LogicEditor, params: InputRandomParams, saved?: InputRandomRepr) {
        super(editor, InputRandomDef.with(params), saved)

        this.numBits = params.numBits
        if (isDefined(saved)) {
            if (isDefined(saved.prob1)) {
                this._prob1 = Math.max(0, Math.min(1, saved.prob1))
            }
            this._showProb = saved.showProb ?? InputRandomDef.aults.showProb
            this._trigger = saved.trigger ?? InputRandomDef.aults.trigger
            this._name = saved.name
        }
    }

    public override toJSON() {
        return {
            type: "random" as const,
            bits: this.numBits === InputRandomDef.aults.bits ? undefined : this.numBits,
            ...super.toJSONBase(),
            name: this._name,
            prob1: (this._prob1 !== InputRandomDef.aults.prob1) ? this._prob1 : undefined,
            showProb: (this._showProb !== InputRandomDef.aults.showProb) ? this._showProb : undefined,
            trigger: (this._trigger !== InputRandomDef.aults.trigger) ? this._trigger : undefined,
        }
    }

    public override get allowsForcedOutputs() {
        return false
    }

    public override makeTooltip() {
        const s = S.Components.InputRandom.tooltip
        return tooltipContent(s.title,
            s.desc[0] + this._prob1 + s.desc[1]
        )
    }

    protected doRecalcValue(): LogicValue[] {
        const prevClock = this._lastClock
        const clock = this._lastClock = this.inputs.Clock.value
        if (!Flipflop.isClockTrigger(this._trigger, prevClock, clock)) {
            // no change
            return this.value
        }
        const randBool = () => {
            return Math.random() < this._prob1
        }
        return ArrayFillUsing(randBool, this.numBits)
    }

    protected override propagateValue(newValue: LogicValue[]) {
        this.outputValues(this.outputs.Out, newValue)
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        const right = this.posX + width / 2
        const top = this.posY - height / 2

        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3

        g.beginPath()
        g.rect(left, top, width, height)
        g.fill()
        g.stroke()

        for (const output of this.outputs.Out) {
            drawWireLineToComponent(g, output, right, output.posYInParentTransform, false)
        }
        drawWireLineToComponent(g, this.inputs.Clock, left, this.inputs.Clock.posYInParentTransform, false)

        Flipflop.drawClockInput(g, left, this.inputs.Clock, this._trigger)


        ctx.inNonTransformedFrame(ctx => {
            const outputValues = this.value

            if (this.numBits === 1) {
                const output = this.outputs.Out[0]
                FlipflopOrLatch.drawStoredValue(g, output.value, ...ctx.rotatePoint(this.posX, output.posYInParentTransform), 26, false)
            } else {
                RegisterBase.drawStoredValues(g, ctx, this.outputs.Out, this.posX, Orientation.isVertical(this.orient))
            }

            if (this._showProb) {
                const isVertical = Orientation.isVertical(this.orient)

                g.fillStyle = COLOR_COMPONENT_INNER_LABELS
                g.font = "9px sans-serif"
                g.textAlign = "center"
                g.textBaseline = "middle"
                const probTextLastPart = String(Math.round(this._prob1 * 100) / 100).substring(1)
                const probTextParts = ["P(1)", "=", probTextLastPart]
                if (isVertical) {
                    let currentOffset = -10
                    let offset = Math.abs(currentOffset)
                    if (this.orient === "s") {
                        currentOffset = -currentOffset
                        offset = -offset
                    }
                    for (const part of probTextParts) {
                        drawLabel(ctx, this.orient, part, "n", this.posX - currentOffset, top - 1, undefined)
                        currentOffset += offset
                    }
                } else {
                    const probText = probTextParts.join(" ")
                    drawLabel(ctx, this.orient, probText, "n", this.posX, top, undefined)
                }
            }


            if (isDefined(this._name)) {
                const [__, value] = displayValuesFromArray(outputValues, false)
                drawComponentName(g, ctx, this._name, value, this, false)
            }
        })
    }

    private doSetName(name: ComponentName) {
        this._name = name
        this.setNeedsRedraw("name changed")
    }

    private doSetShowProb(showProb: boolean) {
        this._showProb = showProb
        this.setNeedsRedraw("show probability changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        const s = S.Components.InputRandom.contextMenu
        const icon = this._showProb ? "check" : "none"
        const toggleShowProbItem = ContextMenuData.item(icon, s.ShowProb,
            () => this.doSetShowProb(!this._showProb))

        return [
            ["mid", toggleShowProbItem],
            ["mid", ContextMenuData.sep()],
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
        ]
    }


    public override keyDown(e: KeyboardEvent): void {
        if (e.key === "Enter") {
            this.runSetNameDialog(this._name, this.doSetName.bind(this))
        }
    }

}
InputRandomDef.impl = InputRandom
