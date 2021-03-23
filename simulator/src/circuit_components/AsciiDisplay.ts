import { Mode } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, inRect, isDefined, isNotNull, mode, wireLine } from "../simulator.js"
import { ComponentBase, ComponentRepr, GRID_STEP, IDGen } from "./Component.js"

const GRID_WIDTH = 4
const GRID_HEIGHT = 8

interface AsciiDisplayRepr extends ComponentRepr {
    name: string | undefined
}

export class AsciiDisplay extends ComponentBase<7, 0, AsciiDisplayRepr> {

    private _value = 0
    private readonly name: string | undefined = undefined

    public constructor(savedData: AsciiDisplayRepr | null) {
        super(savedData)
        if (isNotNull(savedData)) {
            this.name = savedData.name
        }
    }

    toJSON() {
        return {
            name: this.name,
            ...this.toJSONBase(),
        }
    }

    protected makeNodes(genID: IDGen) {
        return [[
            new Node(genID(), this, -3, -3),
            new Node(genID(), this, -3, -2),
            new Node(genID(), this, -3, -1),
            new Node(genID(), this, -3, +0),
            new Node(genID(), this, -3, +1),
            new Node(genID(), this, -3, +2),
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
            input.updatePositionFromParent()
            binaryStringRep = +input.value + binaryStringRep
        }
        this._value = parseInt(binaryStringRep, 2)

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
        if (this._value < 32) {
            // non-printable
            textSize(16)
            textStyle(NORMAL)
            text("\\" + this._value, this.posX, this.posY)

        } else {
            textSize(18)
            textStyle(BOLD)
            text("'" + String.fromCharCode(this._value) + "'", this.posX, this.posY)
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
}
