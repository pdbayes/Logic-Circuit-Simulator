import { isDefined, isNotNull, isUnset } from "../utils"
import { ComponentBase, defineComponent, typeOrUndefined } from "./Component"
import * as t from "io-ts"
import { COLOR_MOUSE_OVER, GRID_STEP, wireLine, formatWithRadix, displayValuesFromInputs } from "../drawutils"
import { tooltipContent, mods, div, b } from "../htmlgen"

const GRID_WIDTH = 4
const GRID_HEIGHT = 8


export const DisplayAsciiDef =
    defineComponent(7, 0, t.type({
        type: t.literal("ascii"),
        name: typeOrUndefined(t.string),
        additionalReprRadix: typeOrUndefined(t.number),
    }, "DisplayAscii"))

type DisplayAsciiRepr = typeof DisplayAsciiDef.reprType

export class DisplayAscii extends ComponentBase<7, 0, DisplayAsciiRepr, [string, number | "?"]> {

    private readonly name: string | undefined = undefined
    private _additionalReprRadix: number | undefined = undefined

    public constructor(savedData: DisplayAsciiRepr | null) {
        super(["0000000", 0], savedData, {
            inOffsets: [[-3, -3], [-3, -2], [-3, -1], [-3, 0], [-3, +1], [-3, +2], [-3, +3]],
        })
        if (isNotNull(savedData)) {
            this.name = savedData.name
            this._additionalReprRadix = savedData.additionalReprRadix
        }
    }

    toJSON() {
        return {
            type: "ascii" as const,
            ...this.toJSONBase(),
            name: this.name,
            additionalReprRadix: this._additionalReprRadix,
        }
    }

    get width() {
        return GRID_WIDTH * GRID_STEP
    }

    get height() {
        return GRID_HEIGHT * GRID_STEP
    }

    public makeTooltip() {
        const [binaryStringRep, value] = this.value

        return tooltipContent("Afficheur de caractère", mods(
            div(`Affiche le caractère ASCII représenté par ses 7 entrées, actuellement `, b(binaryStringRep), "."),
            isUnset(value)
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

    doDraw(isMouseOver: boolean) {
        const [binaryStringRep, value] = this.value

        if (isMouseOver) {
            stroke(...COLOR_MOUSE_OVER)
        } else {
            stroke(0)
        }

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP

        strokeWeight(4)
        fill(0xFF)
        rect(this.posX - width / 2, this.posY - height / 2, width, height)

        for (const input of this.inputs) {
            wireLine(input, this.posX - width / 2 - 2, input.posY)
        }

        noStroke()
        fill(0)
        textSize(18)
        textStyle(ITALIC)
        textAlign(LEFT, CENTER)
        if (isDefined(this.name)) {
            text(this.name, this.posX + width / 2 + 5, this.posY)
        }

        fill(0)

        textAlign(CENTER, CENTER)
        textSize(9)
        textStyle(NORMAL)
        text(binaryStringRep, this.posX, this.posY - height / 2 + 10)

        let mainTextPosY = this.posY

        if (isDefined(this._additionalReprRadix)) {
            const additionalRepr = formatWithRadix(value, this._additionalReprRadix)
            textSize(11)
            textStyle(BOLD)
            text(additionalRepr, this.posX, this.posY - height / 2 + 22)
            mainTextPosY += 8
        }

        if (isUnset(value)) {
            textSize(18)
            textStyle(BOLD)
            text("?", this.posX, mainTextPosY)

        } else if (value < 32) {
            // non-printable
            textSize(16)
            textStyle(NORMAL)
            text("\\" + value, this.posX, mainTextPosY)

        } else {
            textSize(18)
            textStyle(BOLD)
            text("‘" + String.fromCharCode(value) + "’", this.posX, mainTextPosY)
        }
    }

    mouseDoubleClick(__: MouseEvent | TouchEvent) {
        console.log("hhh")
        this._additionalReprRadix = (() => {
            switch (this._additionalReprRadix) {
                case undefined: return 10
                case 10: return 16
                case 16: return undefined
                default: return undefined
            }
        })()
        this.setNeedsRedraw("radix changed")
    }


}
