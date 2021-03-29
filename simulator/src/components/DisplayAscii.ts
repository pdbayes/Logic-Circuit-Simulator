import { isDefined, isNotNull, isUnset, Mode, unset } from "../utils.js"
import { colorMouseOver, inRect, mode, wireLine } from "../simulator.js"
import { ComponentBase, defineComponent, typeOrUndefined } from "./Component.js"
import { GRID_STEP } from "./Position.js"
import * as t from "io-ts"
import { displayValuesFromInputs } from "./Node.js"

const GRID_WIDTH = 4
const GRID_HEIGHT = 8


export const DisplayAsciiDef =
    defineComponent(7, 0, t.type({
        type: t.literal("ascii"),
        name: typeOrUndefined(t.string),
    }, "DisplayAscii"))

type DisplayAsciiRepr = typeof DisplayAsciiDef.reprType

export class DisplayAscii extends ComponentBase<7, 0, DisplayAsciiRepr> {

    private _value: number | unset = 0
    private readonly name: string | undefined = undefined

    public constructor(savedData: DisplayAsciiRepr | null) {
        super(savedData, {
            inOffsets: [[-3, -3], [-3, -2], [-3, -1], [-3, 0], [-3, +1], [-3, +2], [-3, +3]],
        })
        if (isNotNull(savedData)) {
            this.name = savedData.name
        }
    }

    toJSON() {
        return {
            type: "ascii" as const,
            ...this.toJSONBase(),
            name: this.name,
        }
    }

    public get value() {
        return this._value
    }

    draw() {
        this.updatePositionIfNeeded()

        const [binaryStringRep, value] = displayValuesFromInputs(this.inputs)
        this._value = value

        if (this.isMouseOver()) {
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
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
        for (const input of this.inputs) {
            input.draw()
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

        textSize(9)
        textAlign(CENTER, CENTER)
        textStyle(NORMAL)
        text(binaryStringRep, this.posX, this.posY - height / 2 + 10)


        textAlign(CENTER, CENTER)

        if (isUnset(value)) {
            textSize(18)
            textStyle(BOLD)
            text("?", this.posX, this.posY)

        } else if (value < 32) {
            // non-printable
            textSize(16)
            textStyle(NORMAL)
            text("\\" + value, this.posX, this.posY)

        } else {
            textSize(18)
            textStyle(BOLD)
            text("‘" + String.fromCharCode(value) + "’", this.posX, this.posY)
        }
    }

    isMouseOver() {
        return mode >= Mode.CONNECT && inRect(this.posX, this.posY, GRID_WIDTH * GRID_STEP, GRID_HEIGHT * GRID_STEP, mouseX, mouseY)
    }

    mouseClicked() {
        let didIt = false
        for (const input of this.inputs) {
            if (input.isMouseOver()) {
                input.mouseClicked()
                didIt = true
            }
        }

        return didIt || this.isMouseOver()
    }

    doubleClicked() {
        // nothing to toggle
    }
}
