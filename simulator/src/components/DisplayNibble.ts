import { isDefined, isNotNull, isUnset, Mode, unset } from "../utils"
import { ComponentBase, defineComponent, typeOrUndefined } from "./Component"
import * as t from "io-ts"
import { displayValuesFromInputs } from "./Node"
import { COLOR_MOUSE_OVER, COLOR_UNSET, fillForFraction, GRID_STEP, inRect, wireLine } from "../drawutils"
import { mode } from "../simulator"

const GRID_WIDTH = 4
const GRID_HEIGHT = 8
const DEFAULT_RADIX = 10

export const DisplayNibbleDef =
    defineComponent(4, 0, t.type({
        type: t.literal("nibble"),
        name: typeOrUndefined(t.string),
        radix: typeOrUndefined(t.number),
    }, "DisplayNibble"))

type DisplayNibbleRepr = typeof DisplayNibbleDef.reprType

export class DisplayNibble extends ComponentBase<4, 0, DisplayNibbleRepr, [string, number | unset]> {

    private readonly name: string | undefined = undefined
    private _radix = DEFAULT_RADIX

    public constructor(savedData: DisplayNibbleRepr | null) {
        super(["0000", 0], savedData, { inOffsets: [[-3, -3], [-3, -1], [-3, +1], [-3, +3]] })
        if (isNotNull(savedData)) {
            this.name = savedData.name
            this._radix = savedData.radix ?? DEFAULT_RADIX
        }
    }

    toJSON() {
        return {
            type: "nibble" as const,
            ...this.toJSONBase(),
            name: this.name,
            radix: this._radix === DEFAULT_RADIX ? undefined : this._radix,
        }
    }

    protected doRecalcValue() {
        return displayValuesFromInputs(this.inputs)
    }

    doDraw(isMouseOver: boolean) {

        const [binaryStringRep, value] = this.value

        const maxValue = (1 << this.inputs.length) - 1
        const backColor = isUnset(value) ? COLOR_UNSET : fillForFraction(value / maxValue)

        if (isMouseOver) {
            stroke(...COLOR_MOUSE_OVER)
        } else {
            stroke(0)
        }

        strokeWeight(4)

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
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

        const textColor = backColor[0] + backColor[1] + backColor[2] > 3 * 127 ? 0 : 0xFF
        fill(textColor)

        textSize(10)
        textAlign(CENTER, CENTER)
        textStyle(NORMAL)
        text(binaryStringRep, this.posX, this.posY - height / 2 + 8)

        textSize(18)
        textStyle(BOLD)

        const caption = value.toString(this._radix).toUpperCase()
        const prefix = (() => {
            switch (this._radix) {
                case 16: return "0x"
                case 8: return "0o"
                case 2: return "0b"
                default: return ""
            }
        })()
        text(prefix + caption, this.posX, this.posY + width / 6)
    }

    isOver(x: number, y: number) {
        return mode >= Mode.CONNECT && inRect(this.posX, this.posY, GRID_WIDTH * GRID_STEP, GRID_HEIGHT * GRID_STEP, x, y)
    }

    mouseDoubleClick(__: MouseEvent) {
        this._radix = this._radix === 10 ? 16 : 10
        this.setNeedsRedraw()
    }

}
