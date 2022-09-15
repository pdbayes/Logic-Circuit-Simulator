import { FixedArraySizeNonZero, isDefined, isString, isUndefined, isUnknown, Mode, RichStringEnum, LogicValue, Unknown, isHighImpedance } from "../utils"
import { ComponentBase, ComponentRepr, defineComponent, NodeVisuals } from "./Component"
import * as t from "io-ts"
import { circle, ColorString, COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_DARK_RED, COLOR_GATE_NAMES, COLOR_MOUSE_OVER, COLOR_UNSET, GRID_STEP, drawWireLineToComponent, PATTERN_STRIPED_GRAY } from "../drawutils"
import { asValue, b, cls, div, emptyMod, Modifier, ModifierObject, mods, table, tbody, td, th, thead, tooltipContent, tr } from "../htmlgen"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { LogicEditor } from "../LogicEditor"
import { TriStateBuffer, TriStateBufferDef } from "./TriStateBuffer"


type GateProps = {
    includeInContextMenu: boolean
    includeInPoseAs: boolean
    localName: string
    shortName: string | undefined
    localDesc: string
}


// Gates with one input

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

const Gate1MandatoryParams = t.type({
    type: t.keyof(Gate1Types_),
})
type Gate1MandatoryParams = t.TypeOf<typeof Gate1MandatoryParams>


// Gates with two inputs

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

const Gate2MandatoryParams = t.type({
    type: t.keyof(Gate2Types_),
})
type Gate2MandatoryParams = t.TypeOf<typeof Gate2MandatoryParams>



// Gates with three inputs

const Gate3Types_ = {
    AND3: {
        out: (in1: boolean, in2: boolean, in3: boolean) => in1 && in2 && in3,
        localName: "ET", shortName: "ET", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 lorsque les trois entrées valent 1.",
    },
    OR3: {
        out: (in1: boolean, in2: boolean, in3: boolean) => in1 || in2 || in3,
        localName: "OU", shortName: "OU", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 lorsqu’au moins une des troie entrées vaut 1.",
    },
    XOR3: {
        out: (in1: boolean, in2: boolean, in3: boolean) => (Number(in1) + Number(in2) + Number(in3)) % 2 === 1,
        localName: "OU-X", shortName: "OU-X", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 lorsqu’un nombre impair d’entrées valent 1.",
    },
    NAND3: {
        out: (in1: boolean, in2: boolean, in3: boolean) => !(in1 && in2 && in3),
        localName: "NON-ET", shortName: "N-ET", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "Porte ET inversée: la sortie vaut 1 à moins que les trois entrées ne valent 1.",
    },
    NOR3: {
        out: (in1: boolean, in2: boolean, in3: boolean) => !(in1 || in2 || in3),
        localName: "NON-OU", shortName: "N-OU", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "Porte OU inversée: la sortie vaut 1 lorsque les trois entrées valent 0.",
    },
    XNOR3: {
        out: (in1: boolean, in2: boolean, in3: boolean) => (Number(in1) + Number(in2) + Number(in3)) % 2 === 0,
        localName: "NON-OU-X", shortName: "N-OU-X", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "Porte OU-X inversée: la sortie vaut 1 lorsqu’un nombre pair d’entrées valent 1.",
    },
} as const

export const Gate3Types = RichStringEnum.withProps<GateProps & {
    out: (in1: boolean, in2: boolean, in3: boolean) => boolean
}>()(Gate3Types_)

export type Gate3Type = typeof Gate3Types.type

const Gate3MandatoryParams = t.type({
    type: t.keyof(Gate3Types_),
})
type Gate3MandatoryParams = t.TypeOf<typeof Gate3MandatoryParams>



// Gates with four inputs

const Gate4Types_ = {
    AND4: {
        out: (in1: boolean, in2: boolean, in3: boolean, in4: boolean) => in1 && in2 && in3 && in4,
        localName: "ET", shortName: "ET", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 lorsque les quatre entrées valent 1.",
    },
    OR4: {
        out: (in1: boolean, in2: boolean, in3: boolean, in4: boolean) => in1 || in2 || in3 || in4,
        localName: "OU", shortName: "OU", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 lorsqu’au moins une des quatre entrées vaut 1.",
    },
    XOR4: {
        out: (in1: boolean, in2: boolean, in3: boolean, in4: boolean) => (Number(in1) + Number(in2) + Number(in3) + Number(in4)) % 2 === 1,
        localName: "OU-X", shortName: "OU-X", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "La sortie vaut 1 lorsqu’un nombre impair d’entrées valent 1.",
    },
    NAND4: {
        out: (in1: boolean, in2: boolean, in3: boolean, in4: boolean) => !(in1 && in2 && in3 && in4),
        localName: "NON-ET", shortName: "N-ET", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "Porte ET inversée: la sortie vaut 1 à moins que les quatre entrées ne valent 1.",
    },
    NOR4: {
        out: (in1: boolean, in2: boolean, in3: boolean, in4: boolean) => !(in1 || in2 || in3 || in4),
        localName: "NON-OU", shortName: "N-OU", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "Porte OU inversée: la sortie vaut 1 lorsque les quatre entrées valent 0.",
    },
    XNOR4: {
        out: (in1: boolean, in2: boolean, in3: boolean, in4: boolean) => (Number(in1) + Number(in2) + Number(in3) + Number(in4)) % 2 === 0,
        localName: "NON-OU-X", shortName: "N-OU-X", includeInContextMenu: true, includeInPoseAs: true,
        localDesc: "Porte OU-X inversée: la sortie vaut 1 lorsqu’un nombre pair d’entrées valent 1.",
    },
} as const

export const Gate4Types = RichStringEnum.withProps<GateProps & {
    out: (in1: boolean, in2: boolean, in3: boolean, in4: boolean) => boolean
}>()(Gate4Types_)

export type Gate4Type = typeof Gate4Types.type

const Gate4MandatoryParams = t.type({
    type: t.keyof(Gate4Types_),
})
type Gate4MandatoryParams = t.TypeOf<typeof Gate4MandatoryParams>


// Putting all gates together

export type GateType = Gate2Type | Gate1Type | Gate3Type | Gate4Type
export const GateTypes = {
    isValue: (str: string | null | undefined): str is GateType => {
        return Gate2Types.isValue(str) || Gate1Types.isValue(str) || Gate3Types.isValue(str) || Gate4Types.isValue(str)
    },
}



type GateMandatoryParams<G extends GateType> = { type: G }

const Gate2Def = defineComponent(2, 1, Gate2MandatoryParams)
const Gate1Def = defineComponent(1, 1, Gate1MandatoryParams)
const Gate3Def = defineComponent(3, 1, Gate3MandatoryParams)
const Gate4Def = defineComponent(4, 1, Gate4MandatoryParams)

export const GateDef = t.union([
    Gate2Def.repr,
    Gate1Def.repr,
    Gate3Def.repr,
    Gate4Def.repr,
    TriStateBufferDef.repr,
], "Gate")


type GateRepr<N extends FixedArraySizeNonZero, G extends GateType> = ComponentRepr<N, 1> & GateMandatoryParams<G> & {
    poseAs?: G | undefined
    showAsUnknown: boolean | undefined
}

const GRID_WIDTH_1_2 = 7
const GRID_HEIGHT_1_2 = 4

const GRID_WIDTH_3 = 9
const GRID_HEIGHT_3 = 6

const GRID_WIDTH_4 = 11
const GRID_HEIGHT_4 = 8

export type Gate = GateBase<GateType, any, GateRepr<any, GateType>>

export abstract class GateBase<
    G extends GateType,
    NumInput extends FixedArraySizeNonZero,
    Repr extends GateRepr<NumInput, G>
> extends ComponentBase<NumInput, 1, Repr, LogicValue> {

    private _type: G
    private _poseAs: G | undefined = undefined
    private _showAsUnknown = false

    protected constructor(editor: LogicEditor, savedData: Repr | GateMandatoryParams<G>, nodeOffsets: NodeVisuals<NumInput, 1>) {
        super(editor, false, "in" in savedData ? savedData : null, nodeOffsets)
        this._type = savedData.type
        if ("poseAs" in savedData) {
            this._poseAs = savedData.poseAs
        }
        if ("showAsUnknown" in savedData) {
            this._showAsUnknown = savedData.showAsUnknown ?? false
        }
    }

    override toJSONBase() {
        return {
            type: this._type,
            ...super.toJSONBase(),
            showAsUnknown: (this._showAsUnknown) ? true : undefined,
            poseAs: this._poseAs,
        }
    }

    public get componentType() {
        return "gate" as const
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

    protected override toStringDetails(): string {
        return this.type
    }

    get unrotatedWidth() {
        return GRID_WIDTH_1_2 * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT_1_2 * GRID_STEP
    }

    protected override propagateValue(newValue: LogicValue) {
        this.outputs[0].value = newValue
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const gateType = this._showAsUnknown
            ? Unknown
            : this.poseAs ?? this.type
        this.drawGate(g, gateType, gateType !== this.type && !this._showAsUnknown, ctx)
    }

    override mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (this.editor.mode >= Mode.FULL && e.altKey) {
            this.doSetShowAsUnknown(!this._showAsUnknown)
            return true
        }
        return false
    }

    protected drawGate(g: CanvasRenderingContext2D, type: G | Unknown, isFake: boolean, ctx: DrawContext) {
        const output = this.outputs[0]

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        const top = this.posY - height / 2
        const bottom = this.posY + height / 2
        const pi2 = Math.PI / 2

        if (ctx.isMouseOver) {
            const frameWidth = 2
            const frameMargin = 2
            g.lineWidth = frameWidth
            g.strokeStyle = COLOR_MOUSE_OVER
            g.beginPath()
            g.rect(
                left - frameWidth - frameMargin,
                top - frameWidth - frameMargin,
                width + 2 * (frameWidth + frameMargin),
                height + 2 * (frameWidth + frameMargin)
            )
            g.stroke()
        }

        const gateWidth = (2 * Math.max(2, this.inputs.length)) * GRID_STEP
        let gateLeft = this.posX - gateWidth / 2
        let gateRight = this.posX + gateWidth / 2
        let nameDeltaX = 0
        const showAsFake = isFake && this.editor.mode >= Mode.FULL
        const gateBorderColor: ColorString = showAsFake ? COLOR_DARK_RED : COLOR_COMPONENT_BORDER
        const gateFill = showAsFake ? PATTERN_STRIPED_GRAY : COLOR_BACKGROUND
        g.lineWidth = 3
        g.strokeStyle = gateBorderColor
        g.fillStyle = gateFill

        const drawRightCircle = () => {
            gateRight += 5
            g.beginPath()
            circle(g, gateRight, this.posY, 8)
            g.fillStyle = COLOR_BACKGROUND
            g.fill()
            g.stroke()
            gateRight += 4
        }
        const drawLeftCircle = (up: boolean) => {
            g.beginPath()
            circle(g, gateLeft - 5, this.posY - (up ? 1 : -1) * GRID_STEP, 8)
            g.fillStyle = COLOR_BACKGROUND
            g.fill()
            g.stroke()
        }
        const drawWireEnds = (shortUp = false, shortDown = false, isORLike = false) => {
            const numInputs = this.inputs.length
            for (let i = 0; i < numInputs; i++) {
                const input = this.inputs[i]
                const short = i === 0 ? shortUp : shortDown
                let rightEnd = gateLeft - 1
                if (short) {
                    rightEnd -= 9
                }
                if (isORLike) {
                    if (numInputs === 3) {
                        rightEnd += 3
                        if (i === 1) {
                            rightEnd += 4
                        }
                    } else if (numInputs === 4) {
                        rightEnd += 3
                        if (i === 1 || i === 2) {
                            rightEnd += 8
                        }
                    }
                }
                drawWireLineToComponent(g, input, rightEnd, input.posYInParentTransform)
            }
            drawWireLineToComponent(g, output, gateRight + 1, this.posY)
        }

        g.beginPath()
        switch (type) {
            case "NOT":
            case "BUF":
                g.moveTo(gateLeft, top)
                g.lineTo(gateRight, this.posY)
                g.lineTo(gateLeft, bottom)
                g.closePath()
                g.fill()
                g.stroke()
                if (type === "NOT") {
                    drawRightCircle()
                }
                drawWireEnds()
                nameDeltaX -= 6
                break



            case "AND":
            case "AND3":
            case "AND4":
            case "NAND":
            case "NAND3":
            case "NAND4":
            case "NIMPLY":
            case "RNIMPLY": {
                g.moveTo(this.posX, bottom)
                g.lineTo(gateLeft, bottom)
                g.lineTo(gateLeft, top)
                g.lineTo(this.posX, top)
                g.arc(this.posX, this.posY, height / 2, -pi2, pi2)
                g.closePath()
                g.fill()
                g.stroke()
                if (type.startsWith("NAND")) {
                    drawRightCircle()
                }
                let shortUp = false, shortDown = false
                if (type === "NIMPLY") {
                    drawLeftCircle(false)
                    shortDown = true
                } else if (type === "RNIMPLY") {
                    drawLeftCircle(true)
                    shortUp = true
                }
                drawWireEnds(shortUp, shortDown)
                nameDeltaX -= 1
                break
            }



            case "OR":
            case "OR3":
            case "OR4":
            case "NOR":
            case "NOR3":
            case "NOR4":
            case "XOR":
            case "XOR3":
            case "XOR4":
            case "XNOR":
            case "XNOR3":
            case "XNOR4":
            case "IMPLY":
            case "RIMPLY": {
                g.beginPath()
                g.moveTo(gateLeft, top)
                g.lineTo(this.posX - 15, top)
                g.bezierCurveTo(this.posX + 10, top, gateRight - 5, this.posY - 8,
                    gateRight, this.posY)
                g.bezierCurveTo(gateRight - 5, this.posY + 8, this.posX + 10, bottom,
                    this.posX - 15, bottom)
                g.lineTo(gateLeft, bottom)
                g.quadraticCurveTo(this.posX - 8, this.posY, gateLeft, top)
                g.closePath()
                g.fill()
                g.stroke()
                const savedGateLeft = gateLeft
                gateLeft += 4
                if (type.startsWith("NOR") || type.startsWith("XNOR")) {
                    drawRightCircle()
                }
                let shortUp = false, shortDown = false
                if (type === "IMPLY") {
                    drawLeftCircle(true)
                    shortUp = true
                } else if (type === "RIMPLY") {
                    drawLeftCircle(false)
                    shortDown = true
                }
                if (type.startsWith("X")) {
                    gateLeft = savedGateLeft - 2
                    g.beginPath()
                    g.moveTo(savedGateLeft - 6, bottom)
                    g.quadraticCurveTo(this.posX - 14, this.posY, savedGateLeft - 6, top)
                    g.lineWidth = 3
                    g.strokeStyle = gateBorderColor
                    g.stroke()
                }
                drawWireEnds(shortUp, shortDown, true)
                nameDeltaX -= 1
                break
            }

            case "TXA":
            case "TXNA": {
                g.beginPath()
                g.moveTo(gateLeft, bottom)
                g.lineTo(gateLeft, top)
                g.lineTo(gateRight, this.posY)
                g.lineTo(gateLeft + 2, this.posY)
                g.fill()
                g.stroke()
                let shortLeft = false
                if (type === "TXNA") {
                    drawLeftCircle(true)
                    shortLeft = true
                }
                drawWireEnds(shortLeft, false)
                break
            }

            case "TXB":
            case "TXNB": {
                g.beginPath()
                g.moveTo(gateLeft, top)
                g.lineTo(gateLeft, bottom)
                g.lineTo(gateRight, this.posY)
                g.lineTo(gateLeft + 2, this.posY)
                g.fill()
                g.stroke()
                let shortLeft = false
                if (type === "TXNB") {
                    drawLeftCircle(false)
                    shortLeft = true
                }
                drawWireEnds(false, shortLeft)
                break
            }

            case "?":
                g.strokeStyle = COLOR_UNSET
                g.beginPath()
                g.moveTo(gateLeft, top)
                g.lineTo(gateRight, top)
                g.lineTo(gateRight, bottom)
                g.lineTo(gateLeft, bottom)
                g.closePath()
                g.fill()
                g.stroke()
                g.lineWidth = 0
                drawWireEnds()

                ctx.inNonTransformedFrame(() => {
                    g.fillStyle = COLOR_UNSET
                    g.textAlign = "center"
                    g.font = "bold 20px sans-serif"
                    g.fillText('?', this.posX, this.posY)
                })
                break
        }

        if (this.editor.options.showGateTypes && !isUnknown(type)) {
            const gateShortName = this.gateTypeEnum.propsOf(type).shortName
            if (isDefined(gateShortName)) {
                g.fillStyle = COLOR_GATE_NAMES
                g.textAlign = "center"
                g.font = "bold 13px sans-serif"
                const oldTransform = g.getTransform()
                g.translate(this.posX + nameDeltaX, this.posY)
                g.scale(0.65, 1)
                g.fillText(gateShortName, 0, 0)
                g.setTransform(oldTransform)
            }
        }
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        const items: [ContextMenuItemPlacement, ContextMenuItem][] = [
            ["start", this.makeReplaceByMenuItem()],
        ]
        if (this.editor.mode >= Mode.FULL) {
            items.push(
                ["mid", this.makePoseAsMenuItem()],
            )
            const forceOutputItem = this.makeForceOutputsContextMenuItem()
            if (isDefined(forceOutputItem)) {
                items.push(
                    ["mid", forceOutputItem]
                )
            }
        }
        return items
    }

    protected abstract get gateTypeEnum(): RichStringEnum<G, GateProps>

    private makeReplaceByMenuItem(): ContextMenuItem {
        const enumDef = this.gateTypeEnum
        const otherTypes = enumDef.values.filter(t => t !== this._type && enumDef.propsOf(t).includeInContextMenu)
        return ContextMenuData.submenu("replace", "Remplacer par", [
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
        return ContextMenuData.submenu("questioncircled", "Afficher comme", [
            ContextMenuData.item(!currentShowAsUnknown && isUndefined(currentPoseAs) ? "check" : "none",
                `Porte ${enumDef.propsOf(this._type).localName} normale`, () => {
                    this.poseAs = undefined
                    this.doSetShowAsUnknown(false)
                }),
            ContextMenuData.item(currentShowAsUnknown ? "check" : "none",
                "Porte inconnue (avec «?»)", () => {
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

    constructor(editor: LogicEditor, savedData: Gate1Repr | Gate1MandatoryParams) {
        super(editor, savedData, {
            ins: [[undefined, -4, 0, "w"]],
            outs: [[undefined, +4, 0, "e"]],
        })
    }

    toJSON() {
        return super.toJSONBase()
    }

    protected get gateTypeEnum() {
        return Gate1Types
    }

    protected doRecalcValue(): LogicValue {
        const in0 = this.inputs[0].value
        if (isUnknown(in0) || isHighImpedance(in0)) {
            return Unknown
        }
        const gateProps = Gate1Types.propsOf(this.type)
        return gateProps.out(in0)
    }

    public override makeTooltip() {
        if (this.showAsUnknown) {
            return div("Porte inconnue")
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

        const explanation = isUnknown(myIn)
            ? mods(desc + " une sortie indéterminée comme son entrée n’est pas connue. Sa table de vérité est:")
            : mods(desc + " une sortie de ", asValue(myOut), " car son entrée est ", asValue(myIn), ", selon la table de vérité suivante:")

        const header = (() => {
            switch (this.type) {
                case "NOT": return mods("Inverseur (porte ", b("NON"), ")")
                case "BUF": return mods("Buffer (porte ", b("OUI"), ")")
            }
        })()

        return makeGateTooltip(1,
            header,
            Gate1Types.propsOf(this.type).localDesc,
            explanation,
            makeTruthTable(genTruthTableData())
        )
    }

    override mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClicked(e)) {
            return true // already handled
        }
        if (this.editor.mode >= Mode.DESIGN) {
            this.doSetType(this.type === "BUF" ? "NOT" : "BUF")
            return true
        }
        return false
    }

}

type Gate2Repr = GateRepr<2, Gate2Type>
export class Gate2 extends GateBase<Gate2Type, 2, Gate2Repr> {

    constructor(editor: LogicEditor, savedData: Gate2Repr | Gate2MandatoryParams) {
        super(editor, savedData, {
            ins: [
                [undefined, -4, -1, "w", "In"],
                [undefined, -4, +1, "w", "In"],
            ],
            outs: [[undefined, +4, 0, "e"]],
        })
    }

    toJSON() {
        return super.toJSONBase()
    }

    protected get gateTypeEnum() {
        return Gate2Types
    }

    public override makeTooltip() {
        if (this.showAsUnknown) {
            return div("Porte inconnue")
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

        const gateIsUnspecified = isUnknown(myIn0) || isUnknown(myIn1)
        const explanation = gateIsUnspecified
            ? mods(desc + " une sortie indéterminée comme toutes ses entrées ne sont pas connues. Sa table de vérité est:")
            : mods(desc + " une sortie de ", asValue(myOut), " selon la table de vérité suivante:")

        return makeGateTooltip(2,
            mods("Porte ", b(gateProps.localName)),
            gateProps.localDesc,
            explanation,
            makeTruthTable(genTruthTableData())
        )

    }

    protected doRecalcValue(): LogicValue {
        const in1 = this.inputs[0].value
        const in2 = this.inputs[1].value
        if (isUnknown(in1) || isUnknown(in2) || isHighImpedance(in1) || isHighImpedance(in2)) {
            return Unknown
        }
        const gateProps = Gate2Types.propsOf(this.type)
        return gateProps.out(in1, in2)
    }

    override mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClicked(e)) {
            return true // already handled
        }
        if (this.editor.mode >= Mode.DESIGN) {
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



type Gate3Repr = GateRepr<3, Gate3Type>
export class Gate3 extends GateBase<Gate3Type, 3, Gate3Repr> {

    constructor(editor: LogicEditor, savedData: Gate3Repr | Gate3MandatoryParams) {
        super(editor, savedData, {
            ins: [
                [undefined, -5, -2, "w", "In"],
                [undefined, -5, 0, "w", "In"],
                [undefined, -5, +2, "w", "In"],
            ],
            outs: [[undefined, +5, 0, "e"]],
        })
    }

    toJSON() {
        return super.toJSONBase()
    }

    protected get gateTypeEnum() {
        return Gate3Types
    }

    override get unrotatedWidth() {
        return GRID_WIDTH_3 * GRID_STEP
    }

    override get unrotatedHeight() {
        return GRID_HEIGHT_3 * GRID_STEP
    }

    public override makeTooltip() {
        if (this.showAsUnknown) {
            return div("Porte inconnue")
        }

        const gateProps = Gate3Types.propsOf(this.type)
        const myIn0 = this.inputs[0].value
        const myIn1 = this.inputs[1].value
        const myIn2 = this.inputs[2].value
        const myOut = this.value

        const genTruthTableData = () => {
            const header = ["Entrée 1", "Entrée 2", "Entrée 3", "Sortie"]
            const rows: TruthTableRowData[] = []
            for (const in0 of [false, true]) {
                for (const in1 of [false, true]) {
                    for (const in2 of [false, true]) {
                        const matchesCurrent = myIn0 === in0 && myIn1 === in1 && myIn2 === in2
                        const out = gateProps.out(in0, in1, in2)
                        rows.push({ matchesCurrent, cells: [in0, in1, in2, out] })
                    }
                }
            }
            return [header, rows] as const
        }

        const nodeOut = this.outputs[0].value
        const desc = nodeOut === myOut
            ? "Actuellement, elle livre"
            : "Actuellement, elle devrait livrer"

        const gateIsUnspecified = isUnknown(myIn0) || isUnknown(myIn1)
        const explanation = gateIsUnspecified
            ? mods(desc + " une sortie indéterminée comme toutes ses entrées ne sont pas connues. Sa table de vérité est:")
            : mods(desc + " une sortie de ", asValue(myOut), " selon la table de vérité suivante:")

        return makeGateTooltip(3,
            mods("Porte ", b(gateProps.localName)),
            gateProps.localDesc,
            explanation,
            makeTruthTable(genTruthTableData())
        )

    }

    protected doRecalcValue(): LogicValue {
        const in0 = this.inputs[0].value
        const in1 = this.inputs[1].value
        const in2 = this.inputs[2].value
        if (isUnknown(in0) || isUnknown(in1) || isUnknown(in2) || isHighImpedance(in0) || isHighImpedance(in1) || isHighImpedance(in2)) {
            return Unknown
        }
        const gateProps = Gate3Types.propsOf(this.type)
        return gateProps.out(in0, in1, in2)
    }

}



type Gate4Repr = GateRepr<4, Gate4Type>
export class Gate4 extends GateBase<Gate4Type, 4, Gate4Repr> {

    constructor(editor: LogicEditor, savedData: Gate4Repr | Gate4MandatoryParams) {
        super(editor, savedData, {
            ins: [
                [undefined, -6, -3, "w", "In"],
                [undefined, -6, -1, "w", "In"],
                [undefined, -6, +1, "w", "In"],
                [undefined, -6, +3, "w", "In"],
            ],
            outs: [[undefined, +6, 0, "e"]],
        })
    }

    toJSON() {
        return super.toJSONBase()
    }

    protected get gateTypeEnum() {
        return Gate4Types
    }

    override get unrotatedWidth() {
        return GRID_WIDTH_4 * GRID_STEP
    }

    override get unrotatedHeight() {
        return GRID_HEIGHT_4 * GRID_STEP
    }

    public override makeTooltip() {
        // TODO extract this in superclass?
        if (this.showAsUnknown) {
            return div("Porte inconnue")
        }

        const gateProps = Gate4Types.propsOf(this.type)
        const myIn0 = this.inputs[0].value
        const myIn1 = this.inputs[1].value
        const myIn2 = this.inputs[2].value
        const myIn3 = this.inputs[3].value
        const myOut = this.value

        const genTruthTableData = () => {
            const header = ["Entrée 1", "Entrée 2", "Entrée 3", "Entrée 4", "Sortie"]
            const rows: TruthTableRowData[] = []
            for (const in0 of [false, true]) {
                for (const in1 of [false, true]) {
                    for (const in2 of [false, true]) {
                        for (const in3 of [false, true]) {
                            const matchesCurrent = myIn0 === in0 && myIn1 === in1 && myIn2 === in2 && myIn3 === in3
                            const out = gateProps.out(in0, in1, in2, in3)
                            rows.push({ matchesCurrent, cells: [in0, in1, in2, in3, out] })
                        }
                    }
                }
            }
            return [header, rows] as const
        }

        const nodeOut = this.outputs[0].value
        const desc = nodeOut === myOut
            ? "Actuellement, elle livre"
            : "Actuellement, elle devrait livrer"

        const gateIsUnspecified = isUnknown(myIn0) || isUnknown(myIn1)
        const explanation = gateIsUnspecified
            ? mods(desc + " une sortie indéterminée comme toutes ses entrées ne sont pas connues. Sa table de vérité est:")
            : mods(desc + " une sortie de ", asValue(myOut), " selon la table de vérité suivante:")

        return makeGateTooltip(4,
            mods("Porte ", b(gateProps.localName)),
            gateProps.localDesc,
            explanation,
            makeTruthTable(genTruthTableData())
        )
    }

    protected doRecalcValue(): LogicValue {
        const in0 = this.inputs[0].value
        const in1 = this.inputs[1].value
        const in2 = this.inputs[2].value
        const in3 = this.inputs[3].value
        if (isUnknown(in0) || isUnknown(in1) || isUnknown(in2) || isUnknown(in3) || isHighImpedance(in0) || isHighImpedance(in1) || isHighImpedance(in2) || isHighImpedance(in3)) {
            return Unknown
        }
        const gateProps = Gate4Types.propsOf(this.type)
        return gateProps.out(in0, in1, in2, in3)
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
const makeGateTooltip = (nInput: number, title: Modifier, description: Modifier, explanation: Modifier, truthTable: Modifier): ModifierObject => {
    const maxWidth = 200 + (Math.max(0, nInput - 2)) * 50
    return tooltipContent(title, mods(div(description), div(explanation), div(truthTable)), maxWidth)
}

export const GateFactory = {

    make: <N extends FixedArraySizeNonZero>(editor: LogicEditor, savedDataOrType: GateRepr<N, GateType> | string | undefined) => {
        let gateParams
        let blank = true
        if (isUndefined(savedDataOrType)) {
            gateParams = { type: "NAND" }
        } else if (isString(savedDataOrType)) {
            gateParams = { type: savedDataOrType }
        } else {
            gateParams = savedDataOrType
            blank = false
        }
        if (Gate1Types.isValue(gateParams.type)) {
            const sameSavedDataWithBetterTyping = { ...gateParams, type: gateParams.type }
            return new Gate1(editor, sameSavedDataWithBetterTyping)
        } else if (Gate2Types.isValue(gateParams.type)) {
            const sameSavedDataWithBetterTyping = { ...gateParams, type: gateParams.type }
            return new Gate2(editor, sameSavedDataWithBetterTyping)
        } else if (Gate3Types.isValue(gateParams.type)) {
            const sameSavedDataWithBetterTyping = { ...gateParams, type: gateParams.type }
            return new Gate3(editor, sameSavedDataWithBetterTyping)
        } else if (Gate4Types.isValue(gateParams.type)) {
            const sameSavedDataWithBetterTyping = { ...gateParams, type: gateParams.type }
            return new Gate4(editor, sameSavedDataWithBetterTyping)
        } else if (gateParams.type === "TRI") {
            return new TriStateBuffer(editor, blank ? null : savedDataOrType as any)
        }
        return undefined
    },

}
