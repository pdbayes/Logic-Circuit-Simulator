import { COLOR_UNSET, inRect, modifierKeys, wireLine } from "../simulator.js"
import { any, asArray, Expand, FixedArraySize, isDefined, isUnset, Mode, RichStringEnum, TriState, Unset, unset } from "../utils.js"
import { colorMouseOver, mode } from "../simulator.js"
import { ComponentBase, ComponentRepr } from "./Component.js"
import { GRID_STEP } from "./Position.js"

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

type GateMandatoryParams = {
    type: GateType
}

type GateRepr<N extends FixedArraySize> = ComponentRepr<N, 1> & GateMandatoryParams


const GRID_WIDTH = 7
const GRID_HEIGHT = 4

export type Gate = GateBase<any, GateRepr<any>>

export abstract class GateBase<NumInput extends FixedArraySize, Repr extends GateRepr<NumInput>> extends ComponentBase<NumInput, 1, Repr> {

    abstract get type(): GateType

    public get outputValue(): TriState {
        return this.outputs[0].value
    }

    draw() {
        this.drawGate(this.showAsUnknown ? Unset : this.type)
    }

    protected abstract get showAsUnknown(): boolean

    protected drawGate(type: GateType | unset) {
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
            for (const input of asArray(this.inputs)) {
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

            case "?":
                stroke(COLOR_UNSET)
                line(gateLeft, top, gateRight, top)
                line(gateLeft, bottom, gateRight, bottom)
                line(gateLeft, top, gateLeft, bottom)
                line(gateRight, top, gateRight, bottom)
                textAlign(CENTER, CENTER)
                textStyle(BOLD)
                strokeWeight(0)
                fill(COLOR_UNSET)
                text('?', this.posX, this.posY)
                wireEnds()
                break
        }

        for (const input of asArray(this.inputs)) {
            input.draw()
        }
        output.draw()
    }

    protected abstract calculateValue(): TriState

    isMouseOver(): boolean {
        return mode >= Mode.CONNECT && inRect(this.posX, this.posY, GRID_WIDTH * GRID_STEP, GRID_HEIGHT * GRID_STEP, mouseX, mouseY)
    }

    mouseClicked() {
        const results = [
            this.isMouseOver(),
        ]
        for (const input of asArray(this.inputs)) {
            results.push(input.mouseClicked())
        }
        results.push(this.outputs[0].mouseClicked())
        return any(results)
    }

}




type Gate2MandatoryParams = {
    type: Gate2Type
}
type Gate2Repr = Expand<ComponentRepr<2, 1> & Gate2MandatoryParams & {
    showAsUnknown?: boolean
}>

export class Gate2 extends GateBase<2, Gate2Repr> {

    public readonly type: Gate2Type
    private _showAsUnknown = false

    constructor(savedData: Gate2Repr | Gate2MandatoryParams) {
        super("in" in savedData ? savedData : null, {
            inOffsets: [[-4, -1], [-4, +1]],
            outOffsets: [[+4, 0]],
        })
        this.type = savedData.type
        if ("in" in savedData) {
            // it's a Gate2Repr
            if (isDefined(savedData.showAsUnknown)) {
                this._showAsUnknown = savedData.showAsUnknown
            }
        }
    }

    toJSON() {
        return {
            type: this.type,
            ...super.toJSONBase(),
            showAsUnknown: (this._showAsUnknown) ? true : undefined,
        }
    }

    protected get showAsUnknown() {
        return this._showAsUnknown
    }

    protected calculateValue(): TriState {
        const in1 = this.inputs[0].value
        const in2 = this.inputs[1].value
        if (isUnset(in1) || isUnset(in2)) {
            return Unset
        }
        const calcOut = Gate2Types.propsOf(this.type)
        return calcOut(in1, in2)
    }

    doubleClicked() {
        super.doubleClicked()
        if (modifierKeys.isOptionDown && this.isMouseOver()) {
            this._showAsUnknown = !this._showAsUnknown
        }
    }
}

type GateRepr1 = Expand<GateRepr<1>>

export class Gate1Inverter extends GateBase<1, GateRepr1> {

    constructor(savedData: GateRepr1 | GateMandatoryParams) {
        super("in" in savedData ? savedData : null, {
            inOffsets: [[-4, 0]],
            outOffsets: [[+4, 0]],
        })
    }

    toJSON() {
        return {
            type: this.type,
            ...super.toJSONBase(),
        }
    }

    get type() {
        return "NOT" as const
    }

    get showAsUnknown() {
        return false
    }

    protected calculateValue(): TriState {
        const in0 = this.inputs[0].value
        if (isUnset(in0)) {
            return Unset
        }
        return in0!
    }

}

export const GateFactory = {

    make: <N extends FixedArraySize>(savedData: GateRepr<N> | GateMandatoryParams) => {
        if (savedData.type === "NOT") {
            return new Gate1Inverter(savedData)
        } else {
            const sameSavedDataWithBetterTyping = { ...savedData, type: savedData.type }
            return new Gate2(sameSavedDataWithBetterTyping)
        }
    },

}