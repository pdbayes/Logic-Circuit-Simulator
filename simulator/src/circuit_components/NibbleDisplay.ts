import { Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, fillForFraction, inRect, isDefined, isNotNull, mode, wireLine } from "../simulator.js"
import { ComponentBase, ComponentRepr, GRID_STEP, IDGen } from "./Component.js"

const GRID_WIDTH = 4
const GRID_HEIGHT = 8
const DEFAULT_RADIX = 10

export interface NibbleDisplayRepr extends ComponentRepr {
    type: "nibble"
    name: string | undefined
    radix: number | undefined
}

export class NibbleDisplay extends ComponentBase<4, 0, NibbleDisplayRepr> {

    private _value = 0
    private readonly name: string | undefined = undefined
    private _radix = DEFAULT_RADIX

    public constructor(savedData: NibbleDisplayRepr | null) {
        super(savedData)
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

    protected makeNodes(genID: IDGen) {
        return [[
            new Node(genID(), this, -3, -3),
            new Node(genID(), this, -3, -1),
            new Node(genID(), this, -3, +1),
            new Node(genID(), this, -3, +3),
        ], []] as const
    }

    public get value() {
        return this._value
    }

    draw() {
        this.updatePositionIfNeeded()

        let binaryStringRep = ""
        for (const input of this.inputs) {
            binaryStringRep = +input.value + binaryStringRep
        }
        this._value = parseInt(binaryStringRep, 2)

        const maxValue = (1 << this.inputs.length) - 1
        const backColor = fillForFraction(this._value / maxValue)

        if (this.isMouseOver()) {
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
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

        const textColor = backColor[0] + backColor[1] + backColor[2] > 3 * 127 ? 0 : 0xFF
        fill(textColor)

        textSize(10)
        textAlign(CENTER, CENTER)
        textStyle(NORMAL)
        text(binaryStringRep, this.posX, this.posY - height / 2 + 8)

        textSize(18)
        textStyle(BOLD)

        const caption = this.value.toString(this._radix).toUpperCase()
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
        if (this.isMouseOver()) {
            this._radix = this._radix === 10 ? 16 : 10
        }
    }

}
