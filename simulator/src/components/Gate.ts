import { Expand, FixedArraySize, isDefined, isUnset, Mode, RichStringEnum, TriState, Unset, unset } from "../utils"
import { ComponentBase, ComponentRepr, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_MOUSE_OVER, COLOR_UNSET, GRID_STEP, wireLine } from "../drawutils"
import { mode, modifierKeys } from "../simulator"
import { asValue, b, cls, div, emptyMod, Modifier, ModifierObject, mods, table, tbody, td, th, thead, tooltipContent, tr } from "../htmlgen"


const Gate2Types_ = {
    AND: { out: (in1: boolean, in2: boolean) => in1 && in2, localName: "ET" },
    OR: { out: (in1: boolean, in2: boolean) => in1 || in2, localName: "OU" },
    XOR: { out: (in1: boolean, in2: boolean) => in1 !== in2, localName: "OU-X" },
    NAND: { out: (in1: boolean, in2: boolean) => !(in1 && in2), localName: "NON-ET" },
    NOR: { out: (in1: boolean, in2: boolean) => !(in1 || in2), localName: "NON-OU" },
    XNOR: { out: (in1: boolean, in2: boolean) => in1 === in2, localName: "NON-OU-X" },
    IMPLY: { out: (in1: boolean, in2: boolean) => !in1 || in2, localName: "IMPLIQUE" },
    RIMPLY: { out: (in1: boolean, in2: boolean) => in1 || !in2, localName: "IMPLIQUE (bis)" },
    NIMPLY: { out: (in1: boolean, in2: boolean) => in1 && !in2, localName: "NON-IMPLIQUE" },
    RNIMPLY: { out: (in1: boolean, in2: boolean) => !in1 && in2, localName: "NON-IMPLIQUE (bis)" },
} as const

export const Gate2Types = RichStringEnum.withProps<{
    out: (in1: boolean, in2: boolean) => boolean
    localName: string
}>()(Gate2Types_)

export const GateTypeNot = "NOT"

export type Gate2Type = typeof Gate2Types.type

export type GateType = Gate2Type | typeof GateTypeNot
export const GateTypes = {
    isValue: (str: string): str is GateType => {
        return str === GateTypeNot || Gate2Types.isValue(str)
    },
}

const GateMandatoryParams = t.type({
    type: t.union([t.keyof(Gate2Types_,), t.literal(GateTypeNot)], "GateType"),
}, "Gate")
type GateMandatoryParams = t.TypeOf<typeof GateMandatoryParams>


const Gate2Def = defineComponent(2, 1, GateMandatoryParams)
const Gate1Def = defineComponent(1, 1, GateMandatoryParams)

export const GateDef = t.union([
    Gate2Def.repr,
    Gate1Def.repr,
], "Gate")


type GateRepr<N extends FixedArraySize> = ComponentRepr<N, 1> & GateMandatoryParams

const GRID_WIDTH = 7
const GRID_HEIGHT = 4

export type Gate = GateBase<any, GateRepr<any>>

export abstract class GateBase<NumInput extends FixedArraySize, Repr extends GateRepr<NumInput>> extends ComponentBase<NumInput, 1, Repr, TriState> {

    abstract get type(): GateType

    get width() {
        return GRID_WIDTH * GRID_STEP
    }

    get height() {
        return GRID_HEIGHT * GRID_STEP
    }

    protected propagateNewValue(newValue: TriState) {
        this.outputs[0].value = newValue
    }

    doDraw(isMouseOver: boolean) {
        this.drawGate(this.showAsUnknown ? Unset : this.type, isMouseOver)
    }

    protected abstract get showAsUnknown(): boolean

    protected drawGate(type: GateType | unset, isMouseOver: boolean) {
        const output = this.outputs[0]

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        const left = this.posX - width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2
        const pi2 = Math.PI / 2

        noFill()
        if (isMouseOver) {
            const frameWidth = 2
            const frameMargin = 2
            strokeWeight(frameWidth)
            stroke(...COLOR_MOUSE_OVER)
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
        const leftCircle = (up: boolean) => {
            arc(gateLeft - 5, this.posY - (up ? 1 : -1) * GRID_STEP, 8, 8, 0, 0)
        }
        const wireEnds = (shortUp = false, shortDown = false) => {
            for (let i = 0; i < this.inputs.length; i++) {
                const input = this.inputs[i]
                const short = i === 0 ? shortUp : shortDown
                wireLine(input, gateLeft - 3 - (short ? 9 : 0), input.posY)
            }
            wireLine(output, gateRight + 3, this.posY)
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
            case "NIMPLY":
            case "RNIMPLY": {
                line(gateLeft, bottom, this.posX, bottom)
                line(gateLeft, top, this.posX, top)
                line(gateLeft, top, gateLeft, bottom)
                arc(this.posX, this.posY, gateWidth, height, -pi2, pi2)
                if (this.type === "NAND") {
                    rightCircle()
                }
                let shortUp = false, shortDown = false
                if (this.type === "NIMPLY") {
                    leftCircle(false)
                    shortDown = true
                } else if (this.type === "RNIMPLY") {
                    leftCircle(true)
                    shortUp = true
                }
                wireEnds(shortUp, shortDown)
                break
            }

            case "OR":
            case "NOR":
            case "XOR":
            case "XNOR":
            case "IMPLY":
            case "RIMPLY": {
                arc(gateLeft - 35, this.posY, 75, 75, -.55, .55)
                gateLeft -= 3
                line(gateLeft, top, this.posX - 15, top)
                line(gateLeft, bottom, this.posX - 15, bottom)
                bezier(this.posX - 15, top, this.posX + 10, top,
                    gateRight - 5, this.posY - 8, gateRight, this.posY)
                bezier(this.posX - 15, bottom, this.posX + 10, bottom,
                    gateRight - 5, this.posY + 8, gateRight, this.posY)
                const savedGateLeft = gateLeft
                gateLeft += 4
                if (this.type === "NOR" || this.type === "XNOR") {
                    rightCircle()
                }
                let shortUp = false, shortDown = false
                if (this.type === "IMPLY") {
                    leftCircle(true)
                    shortUp = true
                } else if (this.type === "RIMPLY") {
                    leftCircle(false)
                    shortDown = true
                }
                wireEnds(shortUp, shortDown)
                if (this.type === "XOR" || this.type === "XNOR") {
                    gateLeft = savedGateLeft
                    stroke(0)
                    strokeWeight(3)
                    arc(gateLeft - 38, this.posY, 75, 75, -.55, .55)
                }
                break
            }

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
    }

}




type Gate2MandatoryParams = {
    type: Gate2Type
}
type Gate2Repr = Expand<ComponentRepr<2, 1> & Gate2MandatoryParams & {
    showAsUnknown?: boolean
}>

export class Gate2 extends GateBase<2, Gate2Repr> {

    private _type: Gate2Type
    private _showAsUnknown = false

    constructor(savedData: Gate2Repr | Gate2MandatoryParams) {
        super(false, "in" in savedData ? savedData : null, {
            inOffsets: [[-4, -1], [-4, +1]],
            outOffsets: [[+4, 0]],
        })
        this._type = savedData.type
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

    public get type() {
        return this._type
    }

    protected toStringDetails(): string {
        return this.type
    }

    public makeTooltip() {
        if (this._showAsUnknown) {
            return div("Porte cachée")
        }

        const gateProps = Gate2Types.propsOf(this._type)
        const myIn0 = this.inputs[0].value
        const myIn1 = this.inputs[1].value
        const myOut = this.value

        const genTruthTableData = () => {
            const header = ["Entrée 1", "Entrée 2", "Sortie"]
            const rows: TruthTableRowData[] = []
            for (const in0 of [false, true]) {
                for (const in1 of [false, true]) {
                    const matchesCurrent = myIn0 === in0 && myIn1 === in1
                    const out = gateProps.out(in0, in1)
                    rows.push({ matchesCurrent, cells: [in0, in1, out] })
                }
            }
            return [header, rows] as const
        }

        const nodeOut = this.outputs[0].value
        const desc = nodeOut === myOut
            ? "Actuellement, elle livre"
            : "Actuellement, elle devrait livrer"

        const gateIsUnspecified = isUnset(myIn0) || isUnset(myIn1)
        const explanation = gateIsUnspecified
            ? mods(desc + " une sortie indéterminée comme toutes ses entrées ne sont pas connues. Sa table de vérité est:")
            : mods(desc + " une sortie de ", asValue(myOut), " selon la table de vérité suivante:")

        return makeGateTooltip(
            mods("Porte ", b(gateProps.localName)),
            explanation,
            makeTruthTable(genTruthTableData())
        )

    }

    protected get showAsUnknown() {
        return this._showAsUnknown
    }

    protected doRecalcValue(): TriState {
        const in1 = this.inputs[0].value
        const in2 = this.inputs[1].value
        if (isUnset(in1) || isUnset(in2)) {
            return Unset
        }
        const gateProps = Gate2Types.propsOf(this._type)
        return gateProps.out(in1, in2)
    }

    mouseDoubleClick(__: MouseEvent | TouchEvent) {
        if (mode >= Mode.FULL && modifierKeys.isOptionDown) {
            this._showAsUnknown = !this._showAsUnknown
            this.setNeedsRedraw("display style changed")
        } else if (mode >= Mode.DESIGN) {
            // switch to IMPLY / NIMPLY variant
            this._type = (() => {
                switch (this._type) {
                    case "IMPLY": return "RIMPLY"
                    case "RIMPLY": return "IMPLY"
                    case "NIMPLY": return "RNIMPLY"
                    case "RNIMPLY": return "NIMPLY"
                    default: return this._type
                }
            })()
            this.setNeedsRecalc()
            this.setNeedsRedraw("gate variant changed")
        }
    }

}

type GateRepr1 = Expand<GateRepr<1>>

export class Gate1Inverter extends GateBase<1, GateRepr1> {

    constructor(savedData: GateRepr1 | GateMandatoryParams) {
        super(false, "in" in savedData ? savedData : null, {
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

    protected doRecalcValue(): TriState {
        const in0 = this.inputs[0].value
        if (isUnset(in0)) {
            return Unset
        }
        return !in0
    }

    public makeTooltip() {
        const myIn = this.inputs[0].value
        const myOut = this.value

        const genTruthTableData = () => {
            const header = ["Entrée", "Sortie"]
            const rows: TruthTableRowData[] = []
            for (const in0 of [false, true]) {
                const matchesCurrent = myIn === in0
                rows.push({ matchesCurrent, cells: [in0, !in0] })
            }
            return [header, rows] as const
        }

        const nodeOut = this.outputs[0].value
        const desc = nodeOut === myOut
            ? "Actuellement, il livre"
            : "Actuellement, il devrait livrer"

        const explanation = isUnset(myIn)
            ? mods(desc + " une sortie indéterminée comme son entrée n’est pas connue. Sa table de vérité est:")
            : mods(desc + " une sortie de ", asValue(myOut), " car son entrée est ", asValue(myIn), ", selon la table de vérité suivante:")

        return makeGateTooltip(
            mods("Inverseur (porte ", b("NON"), ")"),
            explanation,
            makeTruthTable(genTruthTableData())
        )
    }

}

// Truth table generation helpers

type TruthTableRowData = { matchesCurrent: boolean, cells: boolean[] }
const makeTruthTable = ([header, rows]: readonly [string[], TruthTableRowData[]]) => {
    const htmlRows = rows.map(({ matchesCurrent, cells }) =>
        tr(matchesCurrent ? cls("current") : emptyMod, ...cells.map(v => td(asValue(v))))
    )
    return table(cls("truth-table"),
        thead(tr(...header.map(title =>
            th(title))
        )),
        tbody(...htmlRows)
    )
}
const makeGateTooltip = (title: Modifier, explanation: Modifier, truthTable: Modifier): ModifierObject => {
    return tooltipContent(title, mods(div(explanation), div(truthTable)))
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