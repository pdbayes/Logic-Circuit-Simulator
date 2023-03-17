import { Either } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { colorForBoolean, COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_EMPTY, COLOR_MOUSE_OVER, displayValuesFromArray, drawLabel, drawWireLineToComponent, GRID_STEP, strokeSingleLine } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { ArrayFillWith, isArray, isDefined, isNotNull, isNull, isUndefined, isUnknown, LogicValue, typeOrUndefined, Unknown, validate } from "../utils"
import { allBooleans, binaryStringRepr, ComponentBase, defineParametrizedComponent, groupHorizontal, groupVertical, hexStringRepr, isAllZeros, Params, Repr, wordFromBinaryOrHexRepr } from "./Component"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"
import { EdgeTrigger, Flipflop, makeTriggerItems } from "./FlipflopOrLatch"


export const RAMDef =
    defineParametrizedComponent("ram", true, true, {
        variantName: ({ bits, lines }) => `ram-${lines}x${bits}`,
        repr: {
            bits: typeOrUndefined(t.number),
            lines: typeOrUndefined(t.number),
            showContent: typeOrUndefined(t.boolean),
            trigger: typeOrUndefined(t.keyof(EdgeTrigger)),
            content: typeOrUndefined(t.union([t.string, t.array(t.string)])),
        },
        valueDefaults: {
            showContent: true,
            trigger: EdgeTrigger.rising,
        },
        paramDefaults: {
            bits: 4,
            lines: 16,
        },
        validateParams: ({ bits, lines }, defaults) => {
            const numDataBits = validate(bits, [4, 8, 16], defaults.bits, "RAM bits")
            const numAddressBits = Math.ceil(Math.log2(lines))
            const numWords = Math.pow(2, numAddressBits)
            return { numDataBits, numAddressBits, numWords }
        },
        makeNodes: ({ numDataBits, numAddressBits, numWords }) => {
            const gridHeight = RAM.gridHeight(numWords)
            const bottomOffset = Math.ceil((gridHeight + 1) / 2)
            const addrTopOffset = -bottomOffset
            const clockYOffset = bottomOffset - 2
            const s = S.Components.Generic

            return {
                ins: {
                    Clock: [-7, clockYOffset, "w", () => s.InputClockDesc, true],
                    WriteEnable: [-2, bottomOffset, "s", () => s.InputWriteEnableDesc],
                    Clear: [+2, bottomOffset, "s", () => s.InputClearDesc, true],
                    D: groupVertical("w", -7, 0, numDataBits),
                    Addr: groupHorizontal("n", 0, addrTopOffset, numAddressBits),
                },
                outs: {
                    Q: groupVertical("e", 7, 0, numDataBits),
                },
            }
        },
        initialValue: (savedData, { numDataBits, numWords }) => {
            if (isNull(savedData) || isUndefined(savedData.content)) {
                return RAM.defaultValue(numWords, numDataBits)
            }
            const mem: LogicValue[][] = new Array(numWords)
            const savedContent = isArray(savedData.content) ? savedData.content : savedData.content.split(" ")
            for (let i = 0; i < numWords; i++) {
                const row = i >= savedContent.length
                    ? ArrayFillWith(false, numDataBits)
                    : wordFromBinaryOrHexRepr(savedContent[i], numDataBits)
                mem[i] = row
            }
            const out = [...mem[0]]
            return { mem, out }
        },
    })


export type RAMRepr = Repr<typeof RAMDef>
export type RAMParams = Params<typeof RAMDef>

type RAMValue = {
    mem: LogicValue[][]
    out: LogicValue[]
}

export class RAM extends ComponentBase<RAMRepr, RAMValue> {

    public static defaultValue(numWords: number, numDataBits: number) {
        return RAM.valueFilledWith(false, numWords, numDataBits)
    }

    public static valueFilledWith(v: LogicValue, numWords: number, numDataBits: number): RAMValue {
        const mem: LogicValue[][] = new Array(numWords)
        for (let i = 0; i < numWords; i++) {
            mem[i] = ArrayFillWith(v, numDataBits)
        }
        const out = ArrayFillWith(v, numDataBits)
        return { mem, out }
    }

    public readonly numDataBits: number
    public readonly numAddressBits: number
    public readonly numWords: number
    private _showContent: boolean = RAMDef.aults.showContent
    private _trigger: EdgeTrigger = RAMDef.aults.trigger
    private _lastClock: LogicValue = Unknown

    public constructor(editor: LogicEditor, initData: Either<RAMParams, RAMRepr>) {
        const [params, savedData] = RAMDef.validate(initData)
        super(editor, RAMDef(params), savedData)

        this.numDataBits = params.numDataBits
        this.numAddressBits = params.numAddressBits
        this.numWords = params.numWords

        if (isNotNull(savedData)) {
            this._showContent = savedData.showContent ?? RAMDef.aults.showContent
            this._trigger = savedData.trigger ?? RAMDef.aults.trigger
        }
    }

    public toJSON() {
        return {
            type: "ram" as const,
            bits: this.numDataBits === RAMDef.aults.bits ? undefined : this.numDataBits,
            lines: this.numWords === RAMDef.aults.lines ? undefined : this.numWords,
            ...super.toJSONBase(),
            showContent: (this._showContent !== RAMDef.aults.showContent) ? this._showContent : undefined,
            trigger: (this._trigger !== RAMDef.aults.trigger) ? this._trigger : undefined,
            content: this.contentRepr(),
        }
    }

    public get componentType() {
        return "ic" as const
    }

    public get unrotatedWidth() {
        return 11 * GRID_STEP
    }

    public get unrotatedHeight() {
        return RAM.gridHeight(this.numWords) * GRID_STEP
    }

    public static gridHeight(numWords: number): number {
        return numWords <= 16 ? 16 : 22
    }

    public get trigger() {
        return this._trigger
    }

    private contentRepr(): string | undefined {
        const cells: string[] = []
        const useHex = this.numDataBits >= 8
        const hexWidth = Math.ceil(this.numDataBits / 4)
        for (let addr = 0; addr < this.numWords; addr++) {
            const word = this.value.mem[addr]
            const wordRepr = useHex && allBooleans(word) ? hexStringRepr(word, hexWidth) : binaryStringRepr(word)
            cells.push(wordRepr)
        }
        let numToSkip = 0
        for (let addr = this.numWords - 1; addr >= 0; addr--) {
            if (isAllZeros(cells[addr])) {
                numToSkip++
            } else {
                break
            }
        }
        if (numToSkip > 0) {
            // remove last numToSkip cells
            cells.splice(this.numWords - numToSkip, numToSkip)
        }
        return cells.length === 0 ? undefined : cells.join(" ")
    }


    protected doRecalcValue(): RAMValue {
        const clear = this.inputs.Clear.value
        const numWords = this.numWords
        if (clear === true) {
            // clear is true, preset is false, set output to 0
            return RAM.valueFilledWith(false, numWords, this.numDataBits)
        }

        // first, determine output
        const addr = this.currentAddress()

        const prevClock = this._lastClock
        const clock = this._lastClock = this.inputs.Clock.value

        // handle normal operation
        const oldState = this.value
        const we = this.inputs.WriteEnable.value
        if (we !== true || !Flipflop.isClockTrigger(this.trigger, prevClock, clock)) {
            // nothing to write, just update output
            const out = isUnknown(addr) ? ArrayFillWith(Unknown, this.numDataBits) : oldState.mem[addr]
            return { mem: oldState.mem, out }
        }

        // we write
        if (isUnknown(addr)) {
            return RAM.valueFilledWith(Unknown, numWords, this.numDataBits)
        }

        // build new state
        const newData = this.inputValues(this.inputs.D)
        const newState: LogicValue[][] = new Array(numWords)
        for (let i = 0; i < numWords; i++) {
            if (i === addr) {
                newState[i] = newData
            } else {
                newState[i] = oldState.mem[i]
            }
        }
        return { mem: newState, out: newData }
    }

    private currentAddress(): number | Unknown {
        const addrBits = this.inputValues(this.inputs.Addr)
        const [__, addr] = displayValuesFromArray(addrBits, false)
        return addr
    }

    protected override propagateValue(newValue: RAMValue) {
        this.outputValues(this.outputs.Q, newValue.out)
    }

    protected doSetShowContent(showContent: boolean) {
        this._showContent = showContent
        this.setNeedsRedraw("show content changed")
    }

    protected doSetTrigger(trigger: EdgeTrigger) {
        this._trigger = trigger
        this.setNeedsRedraw("trigger changed")
    }


    public override makeTooltip() {
        const s = S.Components.RAM.tooltip
        return tooltipContent(s.title, mods(
            div(s.desc.expand({ numWords: this.numWords, numDataBits: this.numDataBits }))
            // TODO more info
        ))
    }


    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        const right = this.posX + width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2

        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3

        g.beginPath()
        g.rect(left, top, width, height)
        g.fill()
        g.stroke()
        g.fillStyle = COLOR_BACKGROUND

        Flipflop.drawClockInput(g, left, this.inputs.Clock, this._trigger)
        drawWireLineToComponent(g, this.inputs.WriteEnable, this.inputs.WriteEnable.posXInParentTransform, bottom + 2, false)
        drawWireLineToComponent(g, this.inputs.Clear, this.inputs.Clear.posXInParentTransform, bottom + 2, false)
        for (const input of this.inputs.D) {
            drawWireLineToComponent(g, input, left - 1, input.posYInParentTransform, false)
        }
        for (const input of this.inputs.Addr) {
            drawWireLineToComponent(g, input, input.posXInParentTransform, top, false)
        }

        for (const output of this.outputs.Q) {
            drawWireLineToComponent(g, output, right + 1, output.posYInParentTransform, false)
        }


        ctx.inNonTransformedFrame(ctx => {
            if (!this._showContent || this.editor.options.hideMemoryContent) {
                g.font = `bold 18px sans-serif`
                g.fillStyle = COLOR_COMPONENT_BORDER
                g.textAlign = "center"
                g.textBaseline = "middle"
                g.fillText("RAM", this.posX, this.posY - 6)
                g.font = `11px sans-serif`
                g.fillText(`${this.numWords} × ${this.numDataBits} bits`, this.posX, this.posY + 12)
            } else {
                const mem = this.value.mem
                const addr = this.currentAddress()
                const showSingleVerticalBlock = this.numWords <= 16 || !Orientation.isVertical(this.orient)
                const cellHeight = this.numWords <= 16
                    ? Orientation.isVertical(this.orient) ? 4.5 : 7
                    : 2.5

                if (showSingleVerticalBlock) {
                    const cellWidth = this.numDataBits <= 4 ? 10 : this.numDataBits <= 8 ? 8 : 4.5
                    drawMemoryCells(g, mem, this.numDataBits, addr, 0, this.numWords, this.posX + 2, this.posY, cellWidth, cellHeight)
                } else {
                    const cellWidth = this.numDataBits <= 8 ? 6.5 : 4
                    drawMemoryCells(g, mem, this.numDataBits, addr, 0, this.numWords / 2, this.posX + 2 - 38, this.posY, cellWidth, cellHeight)
                    drawMemoryCells(g, mem, this.numDataBits, addr, this.numWords / 2, this.numWords, this.posX + 2 + 38, this.posY, cellWidth, cellHeight)
                }

            }

            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            drawLabel(ctx, this.orient, "WE", "s", this.inputs.WriteEnable, bottom)
            drawLabel(ctx, this.orient, "Clr", "s", this.inputs.Clear, bottom)

            g.font = "bold 12px sans-serif"
            drawLabel(ctx, this.orient, "Addr", "n", this.inputs.Addr, top)
            drawLabel(ctx, this.orient, "D", "w", left, this.inputs.D)
            drawLabel(ctx, this.orient, "Q", "e", right, this.outputs.Q)
        })

    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        const icon = this._showContent ? "check" : "none"
        const toggleShowOpItem = ContextMenuData.item(icon, S.Components.Generic.contextMenu.ShowContent,
            () => this.doSetShowContent(!this._showContent))

        const items: [ContextMenuItemPlacement, ContextMenuItem][] = [
            ...makeTriggerItems(this._trigger, this.doSetTrigger.bind(this)),
            ["mid", ContextMenuData.sep()],
            ["mid", toggleShowOpItem]]

        const forceOutputItem = this.makeForceOutputsContextMenuItem()
        if (isDefined(forceOutputItem)) {
            items.push(
                ["mid", forceOutputItem]
            )
        }

        return items
    }

}

function drawMemoryCells(g: CanvasRenderingContext2D, mem: LogicValue[][], numDataBits: number, addr: number | Unknown, start: number, end: number, centerX: number, centerY: number, cellWidth: number, cellHeight: number,) {
    const numCellsToDraw = end - start
    const contentTop = centerY - numCellsToDraw / 2 * cellHeight
    const contentLeft = centerX - numDataBits / 2 * cellWidth
    const contentRight = contentLeft + numDataBits * cellWidth
    const contentBottom = contentTop + numCellsToDraw * cellHeight

    // by default, paint everything as zero
    g.fillStyle = COLOR_EMPTY
    g.fillRect(contentLeft, contentTop, contentRight - contentLeft, contentBottom - contentTop)

    for (let i = start; i < end; i++) {
        for (let j = 0; j < numDataBits; j++) {
            const v = mem[i][numDataBits - j - 1]
            if (v !== false) {
                g.fillStyle = colorForBoolean(v)
                g.fillRect(contentLeft + j * cellWidth, contentTop + i * cellHeight, cellWidth, cellHeight)
            }
        }
    }

    g.strokeStyle = COLOR_COMPONENT_BORDER
    g.lineWidth = 0.5
    for (let i = 1; i < numCellsToDraw; i++) {
        const y = contentTop + i * cellHeight
        strokeSingleLine(g, contentLeft, y, contentRight, y)
    }
    for (let j = 1; j < numDataBits; j++) {
        const x = contentLeft + j * cellWidth
        strokeSingleLine(g, x, contentTop, x, contentBottom)
    }
    const borderLineWidth = 2
    g.lineWidth = borderLineWidth
    g.strokeRect(contentLeft - borderLineWidth / 2, contentTop - borderLineWidth / 2, contentRight - contentLeft + borderLineWidth, contentBottom - contentTop + borderLineWidth)
    if (!isUnknown(addr) && addr >= start && addr < end) {
        const arrowY = contentTop + (addr - start) * cellHeight + cellHeight / 2
        const arrowRight = contentLeft - 3
        const arrowWidth = 8
        const arrowHalfHeight = 3
        g.beginPath()
        g.moveTo(arrowRight, arrowY)
        g.lineTo(arrowRight - arrowWidth, arrowY + arrowHalfHeight)
        g.lineTo(arrowRight - arrowWidth + 2, arrowY)
        g.lineTo(arrowRight - arrowWidth, arrowY - arrowHalfHeight)
        g.closePath()
        g.fillStyle = COLOR_COMPONENT_BORDER
        g.fill()
    }
}