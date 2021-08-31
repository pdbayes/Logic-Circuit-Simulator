import { isDefined, isNotNull, isUnset, Mode, typeOrUndefined } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_MOUSE_OVER, GRID_STEP, wireLineToComponent, formatWithRadix, displayValuesFromInputs, COLOR_UNSET, COLOR_COMPONENT_BORDER, COLOR_BACKGROUND } from "../drawutils"
import { tooltipContent, mods, div, b, emptyMod } from "../htmlgen"
import { DrawContext, isOrientationVertical } from "./Drawable"
import { mode } from "../simulator"

const GRID_WIDTH = 4
const GRID_HEIGHT = 8


export const DisplayAsciiDef =
    defineComponent(7, 0, t.type({
        type: t.literal("ascii"),
        name: typeOrUndefined(t.string),
        additionalReprRadix: typeOrUndefined(t.number),
        showAsUnknown: typeOrUndefined(t.boolean),
    }, "DisplayAscii"))

type DisplayAsciiRepr = typeof DisplayAsciiDef.reprType

export class DisplayAscii extends ComponentBase<7, 0, DisplayAsciiRepr, [string, number | "?"]> {

    private readonly name: string | undefined = undefined
    private _additionalReprRadix: number | undefined = undefined
    private _showAsUnknown = false

    public constructor(savedData: DisplayAsciiRepr | null) {
        super(["0000000", 0], savedData, {
            inOffsets: [[-3, -3, "w"], [-3, -2, "w"], [-3, -1, "w"], [-3, 0, "w"], [-3, +1, "w"], [-3, +2, "w"], [-3, +3, "w"]],
        })
        if (isNotNull(savedData)) {
            this.name = savedData.name
            this._additionalReprRadix = savedData.additionalReprRadix
            this._showAsUnknown = savedData.showAsUnknown ?? false
        }
    }

    toJSON() {
        return {
            type: "ascii" as const,
            ...this.toJSONBase(),
            name: this.name,
            additionalReprRadix: this._additionalReprRadix,
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

    public override makeTooltip() {
        const [binaryStringRep, value] = this.value

        return tooltipContent("Afficheur de caractère", mods(
            div(`Affiche le caractère ASCII représenté par ses 7 entrées, actuellement `, b(binaryStringRep), "."),
            this._showAsUnknown
                ? emptyMod
                : isUnset(value)
                    ? div("Comme toutes ses entrées ne sont pas connues, ce caractère est actuellement indéfini.")
                    : mods("Actuellement, c’est le caractère numéro ", b("" + value),
                        (value < 32)
                            ? " (un caractère non imprimable)."
                            : mods(", ‘", b(String.fromCharCode(value)), "’.")
                    )
        ))
    }

    protected doRecalcValue() {
        return displayValuesFromInputs(this.inputs)
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const [binaryStringRep, value] = this.value

        if (ctx.isMouseOver) {
            stroke(...COLOR_MOUSE_OVER)
        } else if (this._showAsUnknown) {
            stroke(...COLOR_UNSET)
        } else {
            stroke(COLOR_COMPONENT_BORDER)
        }

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP

        strokeWeight(4)
        fill(COLOR_BACKGROUND)
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

            fill(COLOR_COMPONENT_BORDER)

            const isVertical = isOrientationVertical(this.orient)
            const hasAdditionalRepresentation = isDefined(this._additionalReprRadix)

            textSize(9)
            textStyle(NORMAL)
            if (isVertical && hasAdditionalRepresentation) {
                // upper left corner
                textAlign(LEFT, CENTER)
                text(binaryStringRep, this.posX - height / 2 + 3, this.posY - width / 2 + 8)
                textAlign(CENTER, CENTER)
            } else {
                // upper center
                textAlign(CENTER, CENTER)
                text(binaryStringRep, this.posX, this.posY + (isVertical ? -width / 2 + 8 : -height / 2 + 10))
            }

            let mainTextPosY = this.posY + (isVertical ? 4 : 0)

            if (hasAdditionalRepresentation) {
                const additionalRepr = formatWithRadix(value, this._additionalReprRadix ?? 10)
                textSize(11)
                textStyle(BOLD)
                if (isVertical) {
                    // upper right
                    textAlign(RIGHT, CENTER)
                    text(additionalRepr, this.posX + height / 2 - 3, this.posY - width / 2 + 9)
                    textAlign(CENTER, CENTER)
                } else {
                    // center, below bin repr
                    text(additionalRepr, this.posX, this.posY - height / 2 + 22)
                    mainTextPosY += 8 // shift main repr a bit
                }
            }

            let mainText: string
            if (isUnset(value) || this._showAsUnknown) {
                textSize(18)
                textStyle(BOLD)
                if (this._showAsUnknown) {
                    fill(...COLOR_UNSET)
                }
                mainText = "?"
            } else if (value < 32) {
                // non-printable
                textSize(16)
                textStyle(NORMAL)
                mainText = "\\" + value
            } else {
                textSize(18)
                textStyle(BOLD)
                mainText = "‘" + String.fromCharCode(value) + "’"
            }
            text(mainText, this.posX, mainTextPosY)

        })
    }

    override mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClicked(e)) {
            return true // already handled
        }
        if (mode >= Mode.FULL && e.altKey) {
            this._showAsUnknown = !this._showAsUnknown
            this.setNeedsRedraw("display as unknown changed")
            return true
        } else if (mode >= Mode.DESIGN) {
            this._additionalReprRadix = (() => {
                switch (this._additionalReprRadix) {
                    case undefined: return 10
                    case 10: return 16
                    case 16: return undefined
                    default: return undefined
                }
            })()
            this.setNeedsRedraw("radix changed")
            return true
        }
        return false
    }


}
