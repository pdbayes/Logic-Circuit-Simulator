import { Either } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { colorComps, colorForFraction, ColorString, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, COLOR_UNKNOWN, displayValuesFromArray, drawComponentName, drawWireLineToComponent, formatWithRadix, useCompact } from "../drawutils"
import { b, div, emptyMod, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { isDefined, isNotNull, isUnknown, Mode, typeOrUndefined, Unknown, validate } from "../utils"
import { ComponentBase, ComponentName, ComponentNameRepr, defineParametrizedComponent, groupVertical, Params, Repr } from "./Component"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"

export const OutputDisplayDef =
    defineParametrizedComponent("out", "display", true, false, {
        variantName: ({ bits }) => `display-${bits}`,
        button: { imgWidth: 32 },
        repr: {
            bits: typeOrUndefined(t.number),
            name: ComponentNameRepr,
            radix: typeOrUndefined(t.number),
            showAsUnknown: typeOrUndefined(t.boolean),
        },
        valueDefaults: {
            radix: 10,
            showAsUnknown: false,
        },
        paramDefaults: {
            bits: 4,
        },
        validateParams: ({ bits }, defaults) => {
            const numBits = validate(bits, [4, 8], defaults.bits, "Display bits")
            return { numBits }
        },
        size: ({ numBits }) => ({
            gridWidth: 2 + numBits / 2,
            gridHeight: useCompact(numBits) ? numBits : 2 * numBits,
        }),
        makeNodes: ({ numBits, gridWidth }) => {
            const inX = -gridWidth / 2 - 1
            return {
                ins: {
                    In: groupVertical("w", inX, 0, numBits),
                },
            }
        },
        initialValue: (savedData, { numBits }): [string, number | Unknown] =>
            [repeatString("0", numBits), 0],
    })


export type OutputDisplayRepr = Repr<typeof OutputDisplayDef>
export type OutputDisplayParams = Params<typeof OutputDisplayDef>


export class OutputDisplay extends ComponentBase<OutputDisplayRepr> {

    public readonly numBits: number
    private _name: ComponentName = undefined
    private _radix = OutputDisplayDef.aults.radix
    private _showAsUnknown = false

    public constructor(editor: LogicEditor, initData: Either<OutputDisplayParams, OutputDisplayRepr>) {
        const [params, savedData] = OutputDisplayDef.validate(initData)
        super(editor, OutputDisplayDef(params), savedData)
        this.numBits = params.numBits

        if (isNotNull(savedData)) {
            this._name = savedData.name
            this._radix = savedData.radix ?? OutputDisplayDef.aults.radix
            this._showAsUnknown = savedData.showAsUnknown ?? OutputDisplayDef.aults.showAsUnknown
        }
    }

    public toJSON() {
        return {
            type: "display" as const,
            bits: this.numBits === OutputDisplayDef.aults.bits ? undefined : this.numBits,
            ...this.toJSONBase(),
            name: this._name,
            radix: this._radix === OutputDisplayDef.aults.radix ? undefined : this._radix,
            showAsUnknown: this._showAsUnknown === OutputDisplayDef.aults.showAsUnknown ? undefined : this._showAsUnknown,
        }
    }

    private get showAsUnknown() {
        return this._showAsUnknown || this.editor.options.hideOutputColors
    }

    public override makeTooltip() {
        const s = S.Components.OutputDisplay.tooltip
        const radixStr = (() => {
            switch (this._radix) {
                case 2: return s.RadixBinary
                case 10: return s.RadixDecimal
                case -10: return s.RadixSignedDecimal
                case 16: return s.RadixHexadecimal
                default: return s.RadixGeneric.expand({ radix: this._radix })
            }
        })()
        const [binaryStringRep, value] = this.value

        const sParams = { numBits: this.numBits, radixStr }
        return tooltipContent(s.title.expand(sParams), mods(
            div(s.desc[0].expand(sParams) + " ", b(binaryStringRep), s.desc[1]),
            !isUnknown(value) || this.showAsUnknown
                ? emptyMod
                : div(s.CurrentlyUndefined)
        ))
    }

    protected doRecalcValue() {
        return displayValuesFromArray(this.inputValues(this.inputs.In), false)
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const [binaryStringRep, value] = this.value

        const maxValue = (1 << this.inputs.In.length) - 1
        const backColor = isUnknown(value) || this.showAsUnknown ? COLOR_UNKNOWN : colorForFraction(value / maxValue)
        g.fillStyle = backColor
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 4

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const top = this.posY - height / 2
        // const bottom = top + height

        g.beginPath()
        g.rect(this.posX - width / 2, top, width, height)
        g.fill()
        g.stroke()

        for (const input of this.inputs.In) {
            drawWireLineToComponent(g, input, this.posX - width / 2 - 2, input.posYInParentTransform)
        }

        ctx.inNonTransformedFrame(ctx => {
            if (isDefined(this._name)) {
                drawComponentName(g, ctx, this._name, value, this, true)
            }

            const isVertical = Orientation.isVertical(this.orient)

            // TODO: quite some centering issues with 8 bits... To check in all orientations
            const textXShift = 0 //isVertical ? GRID_STEP / 2 : 0

            const backColorComps = colorComps(backColor)
            const textColor = ColorString(backColorComps[0] + backColorComps[1] + backColorComps[2] > 3 * 127 ? 0 : 0xFF)
            g.fillStyle = textColor

            g.textAlign = "center"

            if (!this.showAsUnknown) {
                g.font = "10px sans-serif"
                g.fillText(binaryStringRep, this.posX + textXShift, this.posY + (isVertical ? -width / 2 + 7 : -height / 2 + 8))
            }

            g.font = "bold 18px sans-serif"

            let stringRep: string
            if (this.showAsUnknown) {
                stringRep = "?"
                // if (!isUnset(value)) {
                //     // otherwise we get the same color for background and text
                //     g.fillStyle = COLOR_UNSET
                // }
            } else {
                stringRep = formatWithRadix(value, this._radix, 8)
            }
            g.fillText(stringRep, this.posX + textXShift, this.posY + (isVertical ? 6 : 0))
        })
    }


    public override mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClicked(e)) {
            return true // already handled
        }
        const mode = this.editor.mode
        if (mode >= Mode.FULL && e.altKey) {
            this.doSetShowAsUnknown(!this._showAsUnknown)
            return true
        } else if (mode >= Mode.DESIGN) {
            this.doSetRadix(this._radix === 10 ? 16 : 10)
            return true
        }
        return false
    }

    private doSetName(name: ComponentName) {
        this._name = name
        this.setNeedsRedraw("name changed")
    }

    private doSetShowAsUnknown(showAsUnknown: boolean) {
        this._showAsUnknown = showAsUnknown
        this.setNeedsRedraw("display as unknown changed")
    }

    private doSetRadix(radix: number) {
        this._radix = radix
        this.setNeedsRedraw("radix changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const s = S.Components.OutputDisplay.contextMenu
        const makeItemShowAs = (desc: string, handler: () => void, isCurrent: boolean,) => {
            const icon = isCurrent ? "check" : "none"
            const caption = s.DisplayAs + " " + desc
            const action = isCurrent ? () => undefined : handler
            return ContextMenuData.item(icon, caption, action)
        }

        const makeItemShowRadix = (radix: number, desc: string) => {
            return makeItemShowAs(desc, () => {
                if (this._showAsUnknown) {
                    this.doSetShowAsUnknown(false)
                }
                this.doSetRadix(radix)
            }, !this._showAsUnknown && this._radix === radix)
        }

        return [
            ["mid", makeItemShowRadix(10, s.DisplayAsDecimal)],
            ["mid", makeItemShowRadix(-10, s.DisplayAsSignedDecimal)],
            ["mid", makeItemShowRadix(16, s.DisplayAsHexadecimal)],
            ["mid", makeItemShowAs(s.DisplayAsUnknown, () => this.doSetShowAsUnknown(!this._showAsUnknown), this._showAsUnknown)],
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

function repeatString(s: string, n: number) {
    let result = ""
    for (let i = 0; i < n; i++) {
        result += s
    }
    return result
}