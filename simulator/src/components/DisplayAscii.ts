import { isDefined, isNotNull, isUnset, Mode, typeOrUndefined } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_MOUSE_OVER, GRID_STEP, drawWireLineToComponent, formatWithRadix, displayValuesFromInputs, COLOR_UNSET, COLOR_COMPONENT_BORDER, COLOR_BACKGROUND } from "../drawutils"
import { tooltipContent, mods, div, b, emptyMod } from "../htmlgen"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext, isOrientationVertical } from "./Drawable"
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
        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP

        g.fillStyle = COLOR_BACKGROUND
        g.lineWidth = 4
        if (ctx.isMouseOver) {
            g.strokeStyle = COLOR_MOUSE_OVER
        } else if (this._showAsUnknown) {
            g.strokeStyle = COLOR_UNSET
        } else {
            g.strokeStyle = COLOR_COMPONENT_BORDER
        }

        g.beginPath()
        g.rect(this.posX - width / 2, this.posY - height / 2, width, height)
        g.fill()
        g.stroke()

        for (const input of this.inputs) {
            drawWireLineToComponent(g, input, this.posX - width / 2 - 2, input.posYInParentTransform)
        }

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_BORDER

            if (isDefined(this.name)) {
                g.textAlign = "start"
                g.font = "italic 18px sans-serif"
                g.fillText(this.name, ...ctx.rotatePoint(this.posX + width / 2 + 5, this.posY))
            }

            const isVertical = isOrientationVertical(this.orient)
            const hasAdditionalRepresentation = isDefined(this._additionalReprRadix)

            g.font = "9px sans-serif"
            if (isVertical && hasAdditionalRepresentation) {
                // upper left corner
                g.textAlign = "start"
                g.fillText(binaryStringRep, this.posX - height / 2 + 3, this.posY - width / 2 + 8)
                g.textAlign = "center"
            } else {
                // upper center
                g.textAlign = "center"
                g.fillText(binaryStringRep, this.posX, this.posY + (isVertical ? -width / 2 + 8 : -height / 2 + 10))
            }

            let mainTextPosY = this.posY + (isVertical ? 4 : 0)

            if (hasAdditionalRepresentation) {
                const additionalRepr = formatWithRadix(value, this._additionalReprRadix ?? 10)
                g.font = "bold 11px sans-serif"
                if (isVertical) {
                    // upper right
                    g.textAlign = "end"
                    g.fillText(additionalRepr, this.posX + height / 2 - 3, this.posY - width / 2 + 9)
                    g.textAlign = "center"
                } else {
                    // center, below bin repr
                    g.fillText(additionalRepr, this.posX, this.posY - height / 2 + 22)
                    mainTextPosY += 8 // shift main repr a bit
                }
            }

            let mainText: string
            if (isUnset(value) || this._showAsUnknown) {
                g.font = "bold 18px sans-serif"
                if (this._showAsUnknown) {
                    g.fillStyle = COLOR_UNSET
                }
                mainText = "?"
            } else if (value < 32) {
                // non-printable
                g.font = "16px sans-serif"
                mainText = "\\" + value
            } else {
                g.font = "bold 18px sans-serif"
                mainText = "‘" + String.fromCharCode(value) + "’"
            }
            g.fillText(mainText, this.posX, mainTextPosY)

        })
    }

    override mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClicked(e)) {
            return true // already handled
        }
        if (mode >= Mode.FULL && e.altKey) {
            this.doSetShowAsUnknown(!this._showAsUnknown)
            return true
        } else if (mode >= Mode.DESIGN) {
            this.doSetAdditionalDisplayRadix((() => {
                switch (this._additionalReprRadix) {
                    case undefined: return 10
                    case 10: return 16
                    case 16: return undefined
                    default: return undefined
                }
            })())
            return true
        }
        return false
    }

    private doSetShowAsUnknown(showAsUnknown: boolean) {
        this._showAsUnknown = showAsUnknown
        this.setNeedsRedraw("display as unknown changed")
    }

    private doSetAdditionalDisplayRadix(additionalReprRadix: number | undefined) {
        this._additionalReprRadix = additionalReprRadix
        this.setNeedsRedraw("additional display radix changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const makeItemShowAs = (desc: string, handler: () => void, isCurrent: boolean,) => {
            const icon = isCurrent ? "check" : "none"
            return ContextMenuData.item(icon, desc, handler)
        }

        const makeItemShowRadix = (radix: number | undefined, desc: string) => {
            return makeItemShowAs(desc,
                () => this.doSetAdditionalDisplayRadix(radix),
                this._additionalReprRadix === radix
            )
        }

        return [
            ["mid", ContextMenuData.submenu("eye", "Affichage supplémentaire", [
                makeItemShowRadix(undefined, "Aucun"),
                makeItemShowRadix(10, "Valeur décimale"),
                makeItemShowRadix(16, "Valeur hexadécimale"),
                ContextMenuData.sep(),
                ContextMenuData.text("Changez l’affichage supplémentaire avec un double-clic sur le composant"),

            ])],
            ["mid", makeItemShowAs("Afficher comme inconnu", () => this.doSetShowAsUnknown(!this._showAsUnknown), this._showAsUnknown)],
        ]
    }


}
