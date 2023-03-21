import { Either } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_BACKGROUND_INVALID, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, drawLabel, drawWireLineToComponent, GRID_STEP, useCompact } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { ArrayFillWith, isDefined, isNotNull, isNull, isUndefined, LogicValue, typeOrUndefined, Unknown, validate } from "../utils"
import { allBooleans, binaryStringRepr, ComponentBase, defineAbstractParametrizedComponent, defineParametrizedComponent, groupVertical, hexStringRepr, isAllZeros, NodesIn, NodesOut, Params, ReadonlyGroupedNodeArray, Repr, wordFromBinaryOrHexRepr } from "./Component"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext, DrawContextExt, Orientation } from "./Drawable"
import { EdgeTrigger, Flipflop, FlipflopOrLatch, makeTriggerItems } from "./FlipflopOrLatch"
import { NodeOut } from "./Node"
import { type ShiftRegisterDef } from "./ShiftRegister"


export const RegisterBaseDef =
    defineAbstractParametrizedComponent({
        repr: {
            bits: typeOrUndefined(t.number),
            showContent: typeOrUndefined(t.boolean),
            trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
            content: typeOrUndefined(t.string),
        },
        valueDefaults: {
            showContent: true,
            trigger: EdgeTrigger.rising,
        },
        paramDefaults: {
            bits: 4,
        },
        validateParams: ({ bits }, defaults) => {
            const numBits = validate(bits, [4, 8, 16], defaults.bits, "Register bits")
            return { numBits }
        },
        size: ({ numBits }) => ({
            gridWidth: 7,
            gridHeight: Math.max(16, 5 + numBits),
        }),
        makeNodes: ({ numBits, gridHeight }) => {
            const bottomOffset = Math.ceil((gridHeight + 1) / 2)
            const clockYOffset = bottomOffset - 2
            const topOffset = -bottomOffset
            const s = S.Components.Generic

            return {
                ins: {
                    Clock: [-5, clockYOffset, "w", () => s.InputClockDesc, true],
                    Preset: [0, topOffset, "n", () => s.InputPresetDesc, true],
                    Clear: [0, bottomOffset, "s", () => s.InputClearDesc, true],
                },
                outs: {
                    Q: groupVertical("e", 5, 0, numBits),
                },
            }
        },
        initialValue: (savedData, { numBits }) => {
            let content
            if (isNull(savedData) || isUndefined(content = savedData.content)) {
                return ArrayFillWith(false, numBits)
            }
            return wordFromBinaryOrHexRepr(content, numBits)
        },
    })


export type RegisterBaseRepr = Repr<typeof RegisterBaseDef>
export type RegisterBaseParams = Params<typeof RegisterBaseDef>

export abstract class RegisterBase<
    TRepr extends RegisterBaseRepr,
    TParams extends RegisterBaseParams
> extends ComponentBase<
    TRepr,
    LogicValue[],
    NodesIn<TRepr>,
    NodesOut<TRepr>,
    true, true
> {

    public readonly numBits: number
    protected _showContent: boolean = RegisterDef.aults.showContent
    protected _trigger: EdgeTrigger = RegisterDef.aults.trigger
    protected _isInInvalidState = false
    protected _lastClock: LogicValue = Unknown

    protected constructor(editor: LogicEditor, SubclassDef: typeof RegisterDef | typeof ShiftRegisterDef, initData: Either<TParams, TRepr>) {
        const [params, savedData] = SubclassDef.validate(initData)
        super(editor, SubclassDef(params), savedData)

        this.numBits = params.numBits

        if (isNotNull(savedData)) {
            this._showContent = savedData.showContent ?? RegisterDef.aults.showContent
            this._trigger = savedData.trigger ?? RegisterDef.aults.trigger
        }
    }

    protected override toJSONBase() {
        return {
            bits: this.numBits === RegisterDef.aults.bits ? undefined : this.numBits,
            ...super.toJSONBase(),
            showContent: (this._showContent !== RegisterDef.aults.showContent) ? this._showContent : undefined,
            trigger: (this._trigger !== RegisterDef.aults.trigger) ? this._trigger : undefined,
            content: this.contentRepr(),
        }
    }

    private contentRepr(): string | undefined {
        const content = this.value
        const hexWidth = Math.ceil(this.numBits / 4)
        const repr = allBooleans(content) ? hexStringRepr(content, hexWidth) : binaryStringRepr(content)
        return isAllZeros(repr) ? undefined : repr
    }

    public get trigger() {
        return this._trigger
    }

    protected doRecalcValue(): LogicValue[] {
        const prevClock = this._lastClock
        const clock = this._lastClock = this.inputs.Clock.value
        const { isInInvalidState, newState } =
            Flipflop.doRecalcValueForSyncComponent(this, prevClock, clock,
                this.inputs.Preset.value,
                this.inputs.Clear.value)
        this._isInInvalidState = isInInvalidState
        return newState
    }

    public makeInvalidState(): LogicValue[] {
        return ArrayFillWith(false, this.numBits)
    }

    public makeStateFromMainValue(val: LogicValue): LogicValue[] {
        return ArrayFillWith(val, this.numBits)
    }

    public abstract makeStateAfterClock(): LogicValue[]

    protected override propagateValue(newValue: LogicValue[]) {
        this.outputValues(this.outputs.Q, newValue)
    }

    protected doSetShowContent(showContent: boolean) {
        this._showContent = showContent
        this.setNeedsRedraw("show content changed")
    }

    protected doSetTrigger(trigger: EdgeTrigger) {
        this._trigger = trigger
        this.setNeedsRedraw("trigger changed")
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        const right = this.posX + width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2

        // inputs/outputs
        for (const output of this.outputs.Q) {
            drawWireLineToComponent(g, output, right, output.posYInParentTransform, false)
        }

        Flipflop.drawClockInput(g, left, this.inputs.Clock, this._trigger)
        drawWireLineToComponent(g, this.inputs.Preset, this.inputs.Preset.posXInParentTransform, top, false)
        drawWireLineToComponent(g, this.inputs.Clear, this.inputs.Clear.posXInParentTransform, bottom, false)
        this.doDrawSpecificInputs(g, left)

        // background
        const outlinePath = new Path2D()
        outlinePath.rect(left, top, width, height)
        g.fillStyle = this._isInInvalidState ? COLOR_BACKGROUND_INVALID : COLOR_BACKGROUND
        g.fill(outlinePath)

        // g.fillStyle = COLOR_BACKGROUND


        // outline
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3
        g.stroke(outlinePath)


        ctx.inNonTransformedFrame(ctx => {
            if (this._showContent && !this.editor.options.hideMemoryContent) {
                RegisterBase.drawStoredValues(g, ctx, this.outputs.Q, this.posX, Orientation.isVertical(this.orient))
            } else {
                this.doDrawGenericCaption(g)
            }

            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "Pre", "n", this.inputs.Preset, top)
            drawLabel(ctx, this.orient, "Clr", "s", this.inputs.Clear, bottom)

            g.font = "bold 12px sans-serif"
            drawLabel(ctx, this.orient, "Q", "e", right, this.outputs.Q)


            this.doDrawSpecificLabels(g, ctx, left)
        })
    }

    public static drawStoredValues(g: CanvasRenderingContext2D, ctx: DrawContextExt, outputs: ReadonlyGroupedNodeArray<NodeOut>, posX: number, swapHeightWidth: boolean) {
        const cellHeight = useCompact(outputs.length) ? GRID_STEP : 2 * GRID_STEP
        for (const output of outputs) {
            FlipflopOrLatch.drawStoredValue(g, output.value, ...ctx.rotatePoint(posX, output.posYInParentTransform), cellHeight, swapHeightWidth)
        }
    }

    protected abstract doDrawSpecificInputs(g: CanvasRenderingContext2D, left: number): void

    protected abstract doDrawGenericCaption(g: CanvasRenderingContext2D): void

    protected abstract doDrawSpecificLabels(g: CanvasRenderingContext2D, ctx: DrawContextExt, left: number): void

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        const icon = this._showContent ? "check" : "none"
        const toggleShowOpItem = ContextMenuData.item(icon, S.Components.Generic.contextMenu.ShowContent,
            () => this.doSetShowContent(!this._showContent))

        const items: [ContextMenuItemPlacement, ContextMenuItem][] = [
            ...makeTriggerItems(this._trigger, this.doSetTrigger.bind(this)),
            ["mid", ContextMenuData.sep()],
            ["mid", toggleShowOpItem],
        ]

        const forceOutputItem = this.makeForceOutputsContextMenuItem()
        if (isDefined(forceOutputItem)) {
            items.push(
                ["mid", forceOutputItem]
            )
        }

        return items
    }

}

export const RegisterDef =
    defineParametrizedComponent("ic", "register", true, true, {
        variantName: ({ bits }) => `register-${bits}`,
        ...RegisterBaseDef,
        makeNodes: (params, defaults) => {
            const base = RegisterBaseDef.makeNodes(params, defaults)
            return {
                ins: {
                    ...base.ins,
                    D: groupVertical("w", -5, 0, params.numBits),
                },
                outs: base.outs,
            }
        },
    })

export type RegisterRepr = Repr<typeof RegisterDef>
export type RegisterParams = Params<typeof RegisterDef>

export class Register extends RegisterBase<RegisterRepr, RegisterParams> {

    public constructor(editor: LogicEditor, initData: Either<RegisterParams, RegisterRepr>) {
        super(editor, RegisterDef, initData)
    }

    public toJSON() {
        return {
            type: "register" as const,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        const s = S.Components.Register.tooltip

        return tooltipContent(s.title, mods(
            div(s.desc.expand({ numBits: this.numBits })) // TODO more info
        ))
    }

    public makeStateAfterClock(): LogicValue[] {
        return this.inputValues(this.inputs.D)
    }

    protected override doDrawSpecificInputs(g: CanvasRenderingContext2D, left: number) {
        for (const input of this.inputs.D) {
            drawWireLineToComponent(g, input, left, input.posYInParentTransform, false)
        }
    }

    protected override doDrawGenericCaption(g: CanvasRenderingContext2D) {
        g.font = `bold 15px sans-serif`
        g.fillStyle = COLOR_COMPONENT_BORDER
        g.textAlign = "center"
        g.textBaseline = "middle"
        g.fillText("Reg.", this.posX, this.posY - 8)
        g.font = `11px sans-serif`
        g.fillText(`${this.numBits} bits`, this.posX, this.posY + 10)
    }

    protected override doDrawSpecificLabels(g: CanvasRenderingContext2D, ctx: DrawContextExt, left: number) {
        g.font = "bold 12px sans-serif"
        drawLabel(ctx, this.orient, "D", "w", left, this.inputs.D)
    }
}
