import { isDefined, isNotNull, isUnset, unset, typeOrUndefined, Mode } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_MOUSE_OVER, COLOR_UNSET, GRID_STEP, wireLineToComponent, formatWithRadix, displayValuesFromInputs, colorForFraction, COLOR_COMPONENT_BORDER } from "../drawutils"
import { tooltipContent, mods, div, emptyMod, b } from "../htmlgen"
import { DrawContext, isOrientationVertical } from "./Drawable"
import { mode } from "../simulator"

const GRID_WIDTH = 4
const GRID_HEIGHT = 8
const DEFAULT_RADIX = 10

export const DisplayNibbleDef =
    defineComponent(4, 0, t.type({
        type: t.literal("nibble"),
        name: typeOrUndefined(t.string),
        radix: typeOrUndefined(t.number),
        showAsUnknown: typeOrUndefined(t.boolean),
    }, "DisplayNibble"))

type DisplayNibbleRepr = typeof DisplayNibbleDef.reprType

export class DisplayNibble extends ComponentBase<4, 0, DisplayNibbleRepr, [string, number | unset]> {

    private readonly name: string | undefined = undefined
    private _radix = DEFAULT_RADIX
    private _showAsUnknown = false

    public constructor(savedData: DisplayNibbleRepr | null) {
        super(["0000", 0], savedData, { inOffsets: [[-3, -3, "w"], [-3, -1, "w"], [-3, +1, "w"], [-3, +3, "w"]] })
        if (isNotNull(savedData)) {
            this.name = savedData.name
            this._radix = savedData.radix ?? DEFAULT_RADIX
            this._showAsUnknown = savedData.showAsUnknown ?? false
        }
    }

    toJSON() {
        return {
            type: "nibble" as const,
            ...this.toJSONBase(),
            name: this.name,
            radix: this._radix === DEFAULT_RADIX ? undefined : this._radix,
            showAsUnknown: (this._showAsUnknown) ? true : undefined,
        }
    }
    
    public get componentType() {
        return "Display" as const
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    public makeTooltip() {
        const radixStr = (() => {
            switch (this._radix) {
                case 2: return "binaire"
                case 10: return "décimale"
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
        return displayValuesFromInputs(this.inputs)
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const [binaryStringRep, value] = this.value

        const maxValue = (1 << this.inputs.length) - 1
        const backColor = isUnset(value) ? COLOR_UNSET : colorForFraction(value / maxValue)
        fill(...backColor)

        if (ctx.isMouseOver) {
            stroke(...COLOR_MOUSE_OVER)
        } else if (this._showAsUnknown) {
            stroke(...COLOR_UNSET)
        } else {
            stroke(COLOR_COMPONENT_BORDER)
        }

        strokeWeight(4)

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        rect(this.posX - width / 2, this.posY - height / 2, width, height)

        for (const input of this.inputs) {
            wireLineToComponent(input, this.posX - width / 2 - 2, input.posYInParentTransform)
        }

        ctx.inNonTransformedFrame(ctx => {
            noStroke()
            fill(COLOR_COMPONENT_BORDER)
            textSize(18)
            textStyle(ITALIC)
            textAlign(LEFT, CENTER)
            if (isDefined(this.name)) {
                text(this.name, ...ctx.rotatePoint(this.posX + width / 2 + 5, this.posY))
            }

            const isVertical = isOrientationVertical(this.orient)

            const textColor = backColor[0] + backColor[1] + backColor[2] > 3 * 127 ? 0 : 0xFF
            fill(textColor)

            textSize(10)
            textAlign(CENTER, CENTER)
            textStyle(NORMAL)
            text(binaryStringRep, this.posX, this.posY + (isVertical ? -width / 2 + 7 : -height / 2 + 8))

            textSize(18)
            textStyle(BOLD)

            let stringRep: string
            if (this._showAsUnknown) {
                stringRep = "?"
                if (!isUnset(value)) {
                    // otherwise we get the same color for background and text
                    fill(...COLOR_UNSET)
                }
            } else {
                stringRep = formatWithRadix(value, this._radix)
            }
            text(stringRep, this.posX, this.posY + (isVertical ? 6 : 0))
        })
    }

    mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClicked(e)) {
            return true // already handled
        }
        if (mode >= Mode.FULL && e.altKey) {
            this._showAsUnknown = !this._showAsUnknown
            this.setNeedsRedraw("display as unknown changed")
            return true
        } else if (mode >= Mode.DESIGN) {
            this._radix = this._radix === 10 ? 16 : 10
            this.setNeedsRedraw("radix changed")
            return true
        }
        return false
    }

}
