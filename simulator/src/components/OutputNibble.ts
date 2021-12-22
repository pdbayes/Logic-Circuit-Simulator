import { isDefined, isNotNull, isUnset, unset, typeOrUndefined, Mode } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_MOUSE_OVER, COLOR_UNSET, GRID_STEP, drawWireLineToComponent, formatWithRadix, displayValuesFromArray, colorForFraction, COLOR_COMPONENT_BORDER, colorComps, ColorString, drawComponentName } from "../drawutils"
import { tooltipContent, mods, div, emptyMod, b } from "../htmlgen"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"
import { LogicEditor } from "../LogicEditor"

const GRID_WIDTH = 4
const GRID_HEIGHT = 8
const DEFAULT_RADIX = 10

export const OutputNibbleDef =
    defineComponent(4, 0, t.type({
        type: t.literal("nibble"),
        name: typeOrUndefined(t.string),
        radix: typeOrUndefined(t.number),
        showAsUnknown: typeOrUndefined(t.boolean),
    }, "DisplayNibble"))

type OutputNibbleRepr = typeof OutputNibbleDef.reprType

export class OutputNibble extends ComponentBase<4, 0, OutputNibbleRepr, [string, number | unset]> {

    private _name: string | undefined = undefined
    private _radix = DEFAULT_RADIX
    private _showAsUnknown = false

    public constructor(editor: LogicEditor, savedData: OutputNibbleRepr | null) {
        super(editor, ["0000", 0], savedData, { inOffsets: [[-3, -3, "w"], [-3, -1, "w"], [-3, +1, "w"], [-3, +3, "w"]] })
        if (isNotNull(savedData)) {
            this._name = savedData.name
            this._radix = savedData.radix ?? DEFAULT_RADIX
            this._showAsUnknown = savedData.showAsUnknown ?? false
        }
    }

    toJSON() {
        return {
            type: "nibble" as const,
            ...this.toJSONBase(),
            name: this._name,
            radix: this._radix === DEFAULT_RADIX ? undefined : this._radix,
            showAsUnknown: (this._showAsUnknown) ? true : undefined,
        }
    }

    public get componentType() {
        return "out" as const
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    public override makeTooltip() {
        const radixStr = (() => {
            switch (this._radix) {
                case 2: return "binaire"
                case 10: return "décimale"
                case -10: return "décimale signée"
                case 16: return "hexadécimale"
                default: return `en base ${this._radix}`
            }
        })()
        const [binaryStringRep, value] = this.value

        return tooltipContent("Afficheur de semioctet", mods(
            div(`Affiche la valeur ${radixStr} de ses 4 entrées, actuellement `, b(binaryStringRep), "."),
            !isUnset(value) || this._showAsUnknown
                ? emptyMod
                : div("Comme toutes ses entrées ne sont pas connues, cette valeur est actuellement indéfinie.")
        ))
    }


    protected doRecalcValue() {
        return displayValuesFromArray(this.inputs.map(i => i.value), false)
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const [binaryStringRep, value] = this.value

        const maxValue = (1 << this.inputs.length) - 1
        const backColor = isUnset(value) || this._showAsUnknown ? COLOR_UNSET : colorForFraction(value / maxValue)
        g.fillStyle = backColor
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 4

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        g.beginPath()
        g.rect(this.posX - width / 2, this.posY - height / 2, width, height)
        g.fill()
        g.stroke()

        for (const input of this.inputs) {
            drawWireLineToComponent(g, input, this.posX - width / 2 - 2, input.posYInParentTransform)
        }

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_BORDER

            if (isDefined(this._name)) {
                drawComponentName(g, ctx, this._name, this, true)
            }

            const isVertical = Orientation.isVertical(this.orient)

            const backColorComps = colorComps(backColor)
            const textColor = ColorString(backColorComps[0] + backColorComps[1] + backColorComps[2] > 3 * 127 ? 0 : 0xFF)
            g.fillStyle = textColor

            g.textAlign = "center"
            g.font = "10px sans-serif"
            g.fillText(binaryStringRep, this.posX, this.posY + (isVertical ? -width / 2 + 7 : -height / 2 + 8))

            g.font = "bold 18px sans-serif"

            let stringRep: string
            if (this._showAsUnknown) {
                stringRep = "?"
                // if (!isUnset(value)) {
                //     // otherwise we get the same color for background and text
                //     g.fillStyle = COLOR_UNSET
                // }
            } else {
                stringRep = formatWithRadix(value, this._radix, 4)
            }
            g.fillText(stringRep, this.posX, this.posY + (isVertical ? 6 : 0))
        })
    }

    override mouseDoubleClicked(e: MouseEvent | TouchEvent) {
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

    private doSetName(name: string | undefined) {
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

        const makeItemShowAs = (desc: string, handler: () => void, isCurrent: boolean,) => {
            const icon = isCurrent ? "check" : "none"
            const caption = "Afficher " + desc
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
            ["mid", makeItemShowRadix(10, "en décimal")],
            ["mid", makeItemShowRadix(-10, "en décimal signé")],
            ["mid", makeItemShowRadix(16, "en hexadécimal")],
            ["mid", makeItemShowAs("comme inconnu", () => this.doSetShowAsUnknown(!this._showAsUnknown), this._showAsUnknown)],
            ["mid", ContextMenuData.sep()],
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
        ]
    }

}
