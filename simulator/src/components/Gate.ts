import { FixedArraySizeNonZero, isDefined, isUndefined, isUnset, Mode, RichStringEnum, TriState, Unset, unset } from "../utils"
import { ComponentBase, ComponentRepr, defineComponent, NodeOffsets } from "./Component"
import * as t from "io-ts"
import { Color, COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_DARK_RED, COLOR_GATE_NAMES, COLOR_MOUSE_OVER, COLOR_UNSET, GRID_STEP, wireLineToComponent } from "../drawutils"
import { mode, options } from "../simulator"
import { asValue, b, cls, div, emptyMod, Modifier, ModifierObject, mods, table, tbody, td, th, thead, tooltipContent, tr } from "../htmlgen"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"



type GateProps = {
    includeInContextMenu: boolean
    includeInPoseAs: boolean
    localName: string
    shortName: string | undefined
    localDesc: string
}

const Gate2Types_ = {
    // usual suspects
    AND: {
        out: (in1: boolean, in2: boolean) => in1 && in2,
        localName: "ET", shortName: "ET", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 lorsque les deux entrées valent 1.",
    },
    OR: {
        out: (in1: boolean, in2: boolean) => in1 || in2,
        localName: "OU", shortName: "OU", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 lorsqu’au moins une des deux entrées vaut 1.",
    },
    XOR: {
        out: (in1: boolean, in2: boolean) => in1 !== in2,
        localName: "OU-X", shortName: "OU-X", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 lorsque l’une ou l’autre des deux entrées vaut 1, mais pas les deux.",
    },
    NAND: {
        out: (in1: boolean, in2: boolean) => !(in1 && in2),
        localName: "NON-ET", shortName: "N-ET", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "Porte ET inversée: la sortie vaut 1 à moins que les deux entrées ne valent 1.",
    },
    NOR: {
        out: (in1: boolean, in2: boolean) => !(in1 || in2),
        localName: "NON-OU", shortName: "N-OU", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "Porte OU inversée: la sortie vaut 1 lorsque les deux entrées valent 0.",
    },
    XNOR: {
        out: (in1: boolean, in2: boolean) => in1 === in2,
        localName: "NON-OU-X", shortName: "N-OU-X", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "Porte OU-X inversée: la sortie vaut 1 lorsque les entrées valent soit les deux 1, soit les deux 0.",
    },

    // less common gates
    IMPLY: {
        out: (in1: boolean, in2: boolean) => !in1 || in2,
        localName: "IMPLIQUE", shortName: "IMPL", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 si la première entrée vaut 0 ou si les deux entrées valent 1.",
    },
    RIMPLY: {
        out: (in1: boolean, in2: boolean) => in1 || !in2,
        localName: "IMPLIQUE (bis)", shortName: "IMPL", includeInContextMenu: false, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 si la seconde entrée vaut 0 ou si les deux entrées valent 1.",
    },
    NIMPLY: {
        out: (in1: boolean, in2: boolean) => in1 && !in2,
        localName: "NON-IMPLIQUE", shortName: "N-IMPL", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "Porte IMPLIQUE inversée: la sortie ne vaut 1 que lorsque la première entrée vaut 1 et la seconde 0.",
    },
    RNIMPLY: {
        out: (in1: boolean, in2: boolean) => !in1 && in2,
        localName: "NON-IMPLIQUE (bis)", shortName: "N-IMPL", includeInContextMenu: false, includeInPoseAs: true,
        localDesc: "Porte IMPLIQUE inversée: la sortie ne vaut 1 que lorsque la première entrée vaut 0 et la seconde 1.",
    },

    // observing only one input
    TXA: {
        out: (in1: boolean, __: boolean) => in1,
        localName: "TRANSFERT-A", shortName: undefined, includeInContextMenu: true, includeInPoseAs: false,
        localDesc: "La sortie est égale à la première entrée; la seconde entrée est ignorée.",
    },
    TXB: {
        out: (__: boolean, in2: boolean) => in2,
        localName: "TRANSFERT-B", shortName: undefined, includeInContextMenu: false, includeInPoseAs: false,
        localDesc: "La sortie est égale à la seconde entrée; la première entrée est ignorée.",
    },
    TXNA: {
        out: (in1: boolean, __: boolean) => !in1,
        localName: "TRANSFERT-NON-A", shortName: undefined, includeInContextMenu: false, includeInPoseAs: false,
        localDesc: "La sortie est égale à la première entrée inversée; la seconde entrée est ignorée.",
    },
    TXNB: {
        out: (__: boolean, in2: boolean) => !in2,
        localName: "TRANSFERT-NON-B", shortName: undefined, includeInContextMenu: false, includeInPoseAs: false,
        localDesc: "La sortie est égale à la seconde entrée inversée; la première entrée est ignorée.",
    },
} as const

export const Gate2Types = RichStringEnum.withProps<GateProps & {
    out: (in1: boolean, in2: boolean) => boolean
}>()(Gate2Types_)

export type Gate2Type = typeof Gate2Types.type


const Gate1Types_ = {
    NOT: {
        out: (in1: boolean) => !in1,
        localName: "NON", shortName: "NON", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie est égale à l’entrée inversée.",
    },
    BUF: {
        out: (in1: boolean) => in1,
        localName: "OUI", shortName: "OUI", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie est égale à l’entrée.",
    },
} as const

export const Gate1Types = RichStringEnum.withProps<GateProps & {
    out: (in1: boolean) => boolean
}>()(Gate1Types_)

export type Gate1Type = typeof Gate1Types.type


export type GateType = Gate2Type | Gate1Type
export const GateTypes = {
    isValue: (str: string | null | undefined): str is GateType => {
        return Gate2Types.isValue(str) || Gate1Types.isValue(str)
    },
}


const Gate1MandatoryParams = t.type({
    type: t.keyof(Gate1Types_),
})
type Gate1MandatoryParams = t.TypeOf<typeof Gate1MandatoryParams>

const Gate2MandatoryParams = t.type({
    type: t.keyof(Gate2Types_),
})
type Gate2MandatoryParams = t.TypeOf<typeof Gate2MandatoryParams>


type GateMandatoryParams<G extends GateType> = { type: G }

const Gate2Def = defineComponent(2, 1, Gate2MandatoryParams)
const Gate1Def = defineComponent(1, 1, Gate1MandatoryParams)

export const GateDef = t.union([
    Gate2Def.repr,
    Gate1Def.repr,
], "Gate")



type GateRepr<N extends FixedArraySizeNonZero, G extends GateType> = ComponentRepr<N, 1> & GateMandatoryParams<G> & {
    poseAs?: G | undefined
    showAsUnknown: boolean | undefined
}

const GRID_WIDTH = 7
const GRID_HEIGHT = 4

export type Gate = GateBase<GateType, any, GateRepr<any, GateType>>

export abstract class GateBase<
    G extends GateType,
    NumInput extends FixedArraySizeNonZero,
    Repr extends GateRepr<NumInput, G>
    > extends ComponentBase<NumInput, 1, Repr, TriState> {

    private _type: G
    private _poseAs: G | undefined = undefined
    private _showAsUnknown = false

    protected constructor(savedData: Repr | GateMandatoryParams<G>, nodeOffsets: NodeOffsets<NumInput, 1>) {
        super(false, "in" in savedData ? savedData : null, nodeOffsets)
        this._type = savedData.type
        if ("poseAs" in savedData) {
            this._poseAs = savedData.poseAs
        }
        if ("showAsUnknown" in savedData) {
            this._showAsUnknown = savedData.showAsUnknown ?? false
        }
    }

    toJSONBase() {
        return {
            type: this._type,
            ...super.toJSONBase(),
            showAsUnknown: (this._showAsUnknown) ? true : undefined,
            poseAs: this._poseAs,
        }
    }

    public get componentType() {
        return "Gate" as const
    }

    public get type() {
        return this._type
    }

    protected doSetType(newType: G) {
        this._type = newType
        this.setNeedsRecalc()
        this.setNeedsRedraw("gate type changed")
    }

    public get poseAs() {
        return this._poseAs
    }

    public set poseAs(newPoseAs: G | undefined) {
        if (newPoseAs !== this._poseAs) {
            this._poseAs = newPoseAs
            this.setNeedsRedraw("gate display changed")
        }
    }

    public get showAsUnknown() {
        return this._showAsUnknown
    }

    private doSetShowAsUnknown(newUnknown: boolean) {
        this._showAsUnknown = newUnknown
        this.setNeedsRedraw("display as unknown changed")
    }

    protected toStringDetails(): string {
        return this.type
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    protected propagateNewValue(newValue: TriState) {
        this.outputs[0].value = newValue
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const gateType = this._showAsUnknown
            ? Unset
            : this.poseAs ?? this.type
        this.drawGate(g, gateType, gateType !== this.type, ctx)
    }

    mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (mode >= Mode.FULL && e.altKey) {
            this.doSetShowAsUnknown(!this._showAsUnknown)
            return true
        }
        return false
    }

    protected drawGate(g: CanvasRenderingContext2D, type: G | unset, isFake: boolean, ctx: DrawContext) {
        const output = this.outputs[0]

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        const left = this.posX - width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2
        const pi2 = Math.PI / 2

        noFill()
        if (ctx.isMouseOver) {
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
        let nameDeltaX = 0
        const gateBorderColor: Color = (isFake && mode >= Mode.FULL) ? COLOR_DARK_RED : [COLOR_COMPONENT_BORDER, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_BORDER]
        strokeWeight(3)
        stroke(...gateBorderColor)

        const rightCircle = () => {
            gateRight += 5
            fill(COLOR_BACKGROUND)
            arc(gateRight, this.posY, 8, 8, 0, 0)
            noFill()
            gateRight += 4
        }
        const leftCircle = (up: boolean) => {
            arc(gateLeft - 5, this.posY - (up ? 1 : -1) * GRID_STEP, 8, 8, 0, 0)
        }
        const wireEnds = (shortUp = false, shortDown = false) => {
            stroke(COLOR_COMPONENT_BORDER)
            for (let i = 0; i < this.inputs.length; i++) {
                const input = this.inputs[i]
                const short = i === 0 ? shortUp : shortDown
                wireLineToComponent(input, gateLeft - 3 - (short ? 9 : 0), input.posYInParentTransform)
            }
            wireLineToComponent(output, gateRight + 3, this.posY)
        }

        switch (type) {
            case "NOT":
            case "BUF":
                line(gateLeft, top, gateLeft, bottom)
                line(gateLeft, top, gateRight, this.posY)
                line(gateLeft, bottom, gateRight, this.posY)
                if (type === "NOT") {
                    rightCircle()
                }
                wireEnds()
                nameDeltaX -= 6
                break

            case "AND":
            case "NAND":
            case "NIMPLY":
            case "RNIMPLY": {
                line(gateLeft, bottom, this.posX, bottom)
                line(gateLeft, top, this.posX, top)
                line(gateLeft, top, gateLeft, bottom)
                arc(this.posX, this.posY, gateWidth, height, -pi2, pi2)
                if (type === "NAND") {
                    rightCircle()
                }
                let shortUp = false, shortDown = false
                if (type === "NIMPLY") {
                    leftCircle(false)
                    shortDown = true
                } else if (type === "RNIMPLY") {
                    leftCircle(true)
                    shortUp = true
                }
                wireEnds(shortUp, shortDown)
                nameDeltaX -= 1
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
                if (type === "NOR" || type === "XNOR") {
                    rightCircle()
                }
                let shortUp = false, shortDown = false
                if (type === "IMPLY") {
                    leftCircle(true)
                    shortUp = true
                } else if (type === "RIMPLY") {
                    leftCircle(false)
                    shortDown = true
                }
                wireEnds(shortUp, shortDown)
                if (type === "XOR" || type === "XNOR") {
                    gateLeft = savedGateLeft
                    stroke(...gateBorderColor)
                    strokeWeight(3)
                    arc(gateLeft - 38, this.posY, 75, 75, -.55, .55)
                }
                nameDeltaX -= 1
                break
            }

            case "TXA":
            case "TXNA": {
                triangle(
                    gateLeft, top,
                    gateRight, this.posY,
                    gateLeft, this.posY,
                )
                line(gateLeft, this.posY, gateLeft, bottom)
                let shortLeft = false
                if (type === "TXNA") {
                    leftCircle(true)
                    shortLeft = true
                }
                wireEnds(shortLeft, false)
                break
            }

            case "TXB":
            case "TXNB": {
                triangle(
                    gateLeft, bottom,
                    gateRight, this.posY,
                    gateLeft, this.posY,
                )
                line(gateLeft, this.posY, gateLeft, top)
                let shortLeft = false
                if (type === "TXNB") {
                    leftCircle(false)
                    shortLeft = true
                }
                wireEnds(false, shortLeft)
                break
            }

            case "?":
                stroke(COLOR_UNSET)
                line(gateLeft, top, gateRight, top)
                line(gateLeft, bottom, gateRight, bottom)
                line(gateLeft, top, gateLeft, bottom)
                line(gateRight, top, gateRight, bottom)
                strokeWeight(0)
                wireEnds()

                ctx.inNonTransformedFrame(() => {
                    noStroke()
                    fill(COLOR_UNSET)
                    textSize(20)
                    textAlign(CENTER, CENTER)
                    textStyle(BOLD)
                    text('?', this.posX, this.posY)
                })
                break
        }

        if (options.showGateTypes && !isUnset(type)) {
            const gateShortName = this.gateTypeEnum.propsOf(type).shortName
            if (isDefined(gateShortName)) {
                noStroke()
                fill(...COLOR_GATE_NAMES)
                textSize(13)
                textAlign(CENTER, CENTER)
                textStyle(BOLD)
                const oldTransform = g.getTransform()
                g.translate(this.posX + nameDeltaX, this.posY)
                g.scale(0.65, 1)
                text(gateShortName, 0, 0)
                g.setTransform(oldTransform)
            }
        }
    }

    protected makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        return [
            ["start", this.makeReplaceByMenuItem()],
            ["mid", this.makePoseAsMenuItem()],
            ["mid", this.makeForceOutputsContextMenuItem()!],
        ]
    }

    protected abstract get gateTypeEnum(): RichStringEnum<G, GateProps>

    private makeReplaceByMenuItem(): ContextMenuItem {
        const enumDef = this.gateTypeEnum
        const otherTypes = enumDef.values.filter(t => t !== this._type && enumDef.propsOf(t).includeInContextMenu)
        return ContextMenuData.submenu("exchange", "Remplacer par", [
            ...otherTypes.map(newType => {
                const gateProps = enumDef.propsOf(newType)
                return ContextMenuData.item(undefined, "Porte " + gateProps.localName, () => {
                    this.doSetType(newType)
                })
            }),
            ContextMenuData.sep(),
            ContextMenuData.text("Changez entre les variantes avec Majuscule + double-clic sur la porte"),
        ])
    }

    private makePoseAsMenuItem(): ContextMenuItem {
        const enumDef = this.gateTypeEnum
        const otherTypes = enumDef.values.filter(t => t !== this._type && enumDef.propsOf(t).includeInPoseAs)
        const currentShowAsUnknown = this._showAsUnknown
        const currentPoseAs = this.poseAs
        return ContextMenuData.submenu("question-circle", "Afficher comme", [
            ContextMenuData.item(!currentShowAsUnknown && isUndefined(currentPoseAs) ? "check" : "none",
                `Porte ${enumDef.propsOf(this._type).localName} normale`, () => {
                    this.poseAs = undefined
                    this.doSetShowAsUnknown(false)
                }),
            ContextMenuData.item(currentShowAsUnknown ? "check" : "none",
                "Porte cachée avec «?»", () => {
                    this.poseAs = undefined
                    this.doSetShowAsUnknown(true)
                }),
            ContextMenuData.sep(),
            ...otherTypes.map(newType => {
                const gateProps = enumDef.propsOf(newType)
                return ContextMenuData.item(!currentShowAsUnknown && newType === currentPoseAs ? "check" : "none",
                    "Porte " + gateProps.localName, () => {
                        this.doSetShowAsUnknown(false)
                        this.poseAs = newType
                    })
            }),
        ])
    }

}



type Gate1Repr = GateRepr<1, Gate1Type>
export class Gate1 extends GateBase<Gate1Type, 1, Gate1Repr> {

    constructor(savedData: Gate1Repr | Gate1MandatoryParams) {
        super(savedData, {
            inOffsets: [[-4, 0, "w"]],
            outOffsets: [[+4, 0, "e"]],
        })
    }

    toJSON() {
        return super.toJSONBase()
    }

    protected get gateTypeEnum() {
        return Gate1Types
    }

    protected doRecalcValue(): TriState {
        const in0 = this.inputs[0].value
        if (isUnset(in0)) {
            return Unset
        }
        const gateProps = Gate1Types.propsOf(this.type)
        return gateProps.out(in0)
    }

    public makeTooltip() {
        if (this.showAsUnknown) {
            return div("Porte cachée")
        }

        const myIn = this.inputs[0].value
        const myOut = this.value

        const gateProps = Gate1Types.propsOf(this.type)

        const genTruthTableData = () => {
            const header = ["Entrée", "Sortie"]
            const rows: TruthTableRowData[] = []
            for (const in0 of [false, true]) {
                const matchesCurrent = myIn === in0
                const out = gateProps.out(in0)
                rows.push({ matchesCurrent, cells: [in0, out] })
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

        const header = (() => {
            switch (this.type) {
                case "NOT": return mods("Inverseur (porte ", b("NON"), ")")
                case "BUF": return mods("Buffer (porte ", b("OUI"), ")")
            }
        })()

        return makeGateTooltip(
            header,
            Gate1Types.propsOf(this.type).localDesc,
            explanation,
            makeTruthTable(genTruthTableData())
        )
    }

    mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClicked(e)) {
            return true // already handled
        }
        if (mode >= Mode.DESIGN) {
            this.doSetType(this.type === "BUF" ? "NOT" : "BUF")
            return true
        }
        return false
    }

}

type Gate2Repr = GateRepr<2, Gate2Type>
export class Gate2 extends GateBase<Gate2Type, 2, Gate2Repr> {

    constructor(savedData: Gate2Repr | Gate2MandatoryParams) {
        super(savedData, {
            inOffsets: [[-4, -1, "w"], [-4, +1, "w"]],
            outOffsets: [[+4, 0, "e"]],
        })
    }

    toJSON() {
        return super.toJSONBase()
    }

    protected get gateTypeEnum() {
        return Gate2Types
    }

    public makeTooltip() {
        if (this.showAsUnknown) {
            return div("Porte cachée")
        }

        const gateProps = Gate2Types.propsOf(this.type)
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
            gateProps.localDesc,
            explanation,
            makeTruthTable(genTruthTableData())
        )

    }

    protected doRecalcValue(): TriState {
        const in1 = this.inputs[0].value
        const in2 = this.inputs[1].value
        if (isUnset(in1) || isUnset(in2)) {
            return Unset
        }
        const gateProps = Gate2Types.propsOf(this.type)
        return gateProps.out(in1, in2)
    }

    mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClicked(e)) {
            return true // already handled
        }
        if (mode >= Mode.DESIGN) {
            // switch to IMPLY / NIMPLY variant
            const newType = (() => {
                switch (this.type) {
                    case "IMPLY": return "RIMPLY"
                    case "RIMPLY": return "IMPLY"

                    case "NIMPLY": return "RNIMPLY"
                    case "RNIMPLY": return "NIMPLY"

                    case "TXA": return "TXB"
                    case "TXB": return "TXNA"
                    case "TXNA": return "TXNB"
                    case "TXNB": return "TXA"

                    default: return undefined
                }
            })()
            if (isDefined(newType)) {
                this.doSetType(newType)
                return true
            }
        }
        return false
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
const makeGateTooltip = (title: Modifier, description: Modifier, explanation: Modifier, truthTable: Modifier): ModifierObject => {
    return tooltipContent(title, mods(div(description), div(explanation), div(truthTable)))
}

export const GateFactory = {

    make: <N extends FixedArraySizeNonZero>(savedData: GateRepr<N, GateType> | GateMandatoryParams<GateType>) => {
        if (Gate1Types.isValue(savedData.type)) {
            const sameSavedDataWithBetterTyping = { ...savedData, type: savedData.type }
            return new Gate1(sameSavedDataWithBetterTyping)
        } else {
            const sameSavedDataWithBetterTyping = { ...savedData, type: savedData.type }
            return new Gate2(sameSavedDataWithBetterTyping)
        }
    },

}