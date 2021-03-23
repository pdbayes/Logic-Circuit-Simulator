import { any, inRect, wireLine } from "../simulator.js"
import { Mode, RichStringEnum } from "./Enums.js"
import { Node } from "./Node.js"
import { colorMouseOver, mode } from "../simulator.js"
import { ComponentBase, ComponentRepr, GRID_STEP, IDGen } from "./Component.js"

export const Gate2Types = RichStringEnum.withProps<
    (in1: boolean, in2: boolean) => boolean
>()({
    AND: (in1: boolean, in2: boolean) => in1 && in2,
    OR: (in1: boolean, in2: boolean) => in1 || in2,
    XOR: (in1: boolean, in2: boolean) => in1 !== in2,
    NAND: (in1: boolean, in2: boolean) => !(in1 && in2),
    NOR: (in1: boolean, in2: boolean) => !(in1 && in2),
    XNOR: (in1: boolean, in2: boolean) => in1 === in2,
})

export const GateTypeNot = "NOT"

export type Gate2Type = typeof Gate2Types.type

export type GateType = Gate2Type | typeof GateTypeNot
export const GateTypes = {
    isValue: (str: string): str is GateType => {
        return str === GateTypeNot || Gate2Types.isValue(str)
    },
}


interface GateMandatoryParams {
    type: GateType
}

interface Gate2MandatoryParams {
    type: Gate2Type
}

interface GateRepr extends ComponentRepr, GateMandatoryParams { }


interface Gate2Repr extends ComponentRepr, Gate2MandatoryParams { }


const GRID_WIDTH = 7
const GRID_HEIGHT = 4

export type Gate = GateBase<any>

export abstract class GateBase<NumInput extends number> extends ComponentBase<NumInput, 1, GateRepr> {

    toJSON() {
        return {
            type: this.type,
            ...this.toJSONBase(),
        }
    }

    abstract get type(): GateType

    public get outputValue(): boolean {
        return this.outputs[0].value
    }

    public get inputs_(): Node[] {
        return this.inputs
    }

    draw() {
        this.drawGate(this.type)
    }

    protected drawGate(type: GateType) {
        this.updatePositionIfNeeded()
        const output = this.outputs[0]
        output.value = this.calculateValue()

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        const left = this.posX - width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2
        const pi2 = Math.PI / 2

        noFill()
        if (this.isMouseOver()) {
            const frameWidth = 2
            const frameMargin = 2
            strokeWeight(frameWidth)
            stroke(colorMouseOver[0], colorMouseOver[1], colorMouseOver[2])
            rect(
                left - frameWidth - frameMargin,
                top - frameWidth - frameMargin,
                width + 2 * (frameWidth + frameMargin),
                height + 2 * (frameWidth + frameMargin)
            )
        }

        const gateWidth = 40
        let gateLeft = this.posX - gateWidth / 2
        let gateRight = this.posX + gateWidth / 2
        stroke(0)
        strokeWeight(3)
        const rightCircle = () => {
            gateRight += 5
            arc(gateRight, this.posY, 8, 8, 0, 0)
            gateRight += 4
        }
        const wireEnds = () => {
            for (const input of this.inputs_) {
                wireLine(input, gateLeft - 2, input.posY)
            }
            wireLine(output, gateRight + 2, this.posY)
        }

        switch (type) {
            case "NOT":
                line(gateLeft, top, gateLeft, bottom)
                line(gateLeft, top, gateRight, this.posY)
                line(gateLeft, bottom, gateRight, this.posY)
                rightCircle()
                wireEnds()
                break

            case "AND":
            case "NAND":
                line(gateLeft, bottom, this.posX, bottom)
                line(gateLeft, top, this.posX, top)
                line(gateLeft, top, gateLeft, bottom)
                arc(this.posX, this.posY, gateWidth, height, -pi2, pi2)
                if (this.type === "NAND") {
                    rightCircle()
                }
                wireEnds()
                break

            case "OR":
            case "NOR":
            case "XOR":
            case "XNOR":
                arc(gateLeft - 35, this.posY, 75, 75, -.55, .55)
                gateLeft -= 3
                line(gateLeft, top, this.posX - 15, top)
                line(gateLeft, bottom, this.posX - 15, bottom)
                bezier(this.posX - 15, top, this.posX + 10, top,
                    gateRight - 5, this.posY - 8, gateRight, this.posY)
                bezier(this.posX - 15, bottom, this.posX + 10, bottom,
                    gateRight - 5, this.posY + 8, gateRight, this.posY)
                if (this.type === "XOR" || this.type === "XNOR") {
                    arc(gateLeft - 38, this.posY, 75, 75, -.55, .55)
                }
                gateLeft += 4
                if (this.type === "NOR" || this.type === "XNOR") {
                    rightCircle()
                }
                wireEnds()
                break
        }

        for (const input of this.inputs_) {
            input.draw()
        }
        output.draw()
    }

    protected abstract calculateValue(): boolean

    isMouseOver(): boolean {
        return mode >= Mode.CONNECT && inRect(this.posX, this.posY, GRID_WIDTH * GRID_STEP, GRID_HEIGHT * GRID_STEP, mouseX, mouseY)
    }

    mouseClicked() {
        const results = [
            this.isMouseOver(),
        ]
        for (const input of this.inputs_) {
            results.push(input.mouseClicked())
        }
        results.push(this.outputs[0].mouseClicked())
        return any(results)
    }

}




export class Gate2 extends GateBase<2> {

    public readonly type: Gate2Type

    constructor(savedData: Gate2Repr | Gate2MandatoryParams) {
        super("id" in savedData ? savedData : null)
        this.type = savedData.type
    }

    protected makeNodes(genID: IDGen) {
        const input1 = new Node(genID(), this, -4, -1)
        const input2 = new Node(genID(), this, -4, +1)
        return [[
            input1, input2,
        ], [
            new Node(genID(), this, +4, 0, true),
        ]] as const
    }

    protected calculateValue(): boolean {
        const calcOut = Gate2Types.propsOf(this.type)
        return calcOut(this.inputs[0].value, this.inputs[1].value)
    }


}

export class Gate1Inverter extends GateBase<1> {

    constructor(savedData: GateRepr | GateMandatoryParams) {
        super("id" in savedData ? savedData : null)
    }

    get type() {
        return "NOT" as const
    }

    protected makeNodes(genID: IDGen) {
        return [[
            new Node(genID(), this, -4, 0),
        ], [
            new Node(genID(), this, +4, 0, true),
        ]] as const
    }

    protected calculateValue(): boolean {
        return !this.inputs[0].value
    }

}

export const GateFactory = {

    make: (savedData: GateRepr | GateMandatoryParams) => {
        if (savedData.type === "NOT") {
            return new Gate1Inverter(savedData)
        } else {
            const sameSavedDataWithBetterTyping = { ...savedData, type: savedData.type }
            return new Gate2(sameSavedDataWithBetterTyping)
        }
    },

}