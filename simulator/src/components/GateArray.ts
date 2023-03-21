import { Either } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { circle, COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, COLOR_UNKNOWN, drawWireLineToComponent, GRID_STEP } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { ArrayFillWith, isDefined, isNotNull, LogicValue, Mode, typeOrUndefined, Unknown, validate } from "../utils"
import { ComponentBase, defineParametrizedComponent, groupVertical, Params, Repr } from "./Component"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { GateNType, GateNTypeRepr, GateNTypes } from "./GateTypes"


export const GateArrayDef =
    defineParametrizedComponent("ic", "gate-array", true, true, {
        variantName: ({ bits }) => `gate-array-${bits}`,
        repr: {
            bits: typeOrUndefined(t.number),
            subtype: GateNTypeRepr,
            showAsUnknown: typeOrUndefined(t.boolean),
        },
        valueDefaults: {
            subtype: "AND" as GateNType,
            showAsUnknown: false,
        },
        paramDefaults: {
            bits: 4,
        },
        validateParams: ({ bits }, defaults) => {
            const numBits = validate(bits, [2, 4, 8, 16], defaults.bits, "Gate array bits")
            return { numBits }
        },
        size: ({ numBits }) => {
            return { gridWidth: 4, gridHeight: 19 } // TODO var height
        },
        makeNodes: ({ numBits }) => ({
            ins: {
                A: groupVertical("w", -3, -5, numBits),
                B: groupVertical("w", -3, +5, numBits),
            },
            outs: {
                S: groupVertical("e", 3, 0, numBits),
            },
        }),
        initialValue: (savedData, { numBits }) => ArrayFillWith<LogicValue>(false, numBits),
    })


export type GateArrayRepr = Repr<typeof GateArrayDef>
export type GateArrayParams = Params<typeof GateArrayDef>

export class GateArray extends ComponentBase<GateArrayRepr> {

    public readonly numBits: number
    private _subtype: GateNType
    private _showAsUnknown: boolean

    public constructor(editor: LogicEditor, initData: Either<GateArrayParams, GateArrayRepr>) {
        const [params, savedData] = GateArrayDef.validate(initData)
        super(editor, GateArrayDef(params), savedData)

        this.numBits = params.numBits
        if (isNotNull(savedData)) {
            this._subtype = savedData.subtype
            this._showAsUnknown = savedData.showAsUnknown ?? GateArrayDef.aults.showAsUnknown
        } else {
            this._subtype = GateArrayDef.aults.subtype
            this._showAsUnknown = GateArrayDef.aults.showAsUnknown
        }
    }

    public toJSON() {
        return {
            type: "gate-array" as const,
            subtype: this._subtype,
            bits: this.numBits === GateArrayDef.aults.bits ? undefined : this.numBits,
            ...this.toJSONBase(),
            showAsUnknown: this._showAsUnknown === GateArrayDef.aults.showAsUnknown ? undefined : this._showAsUnknown,
        }
    }

    public override makeTooltip() {
        const s = S.Components.GateArray.tooltip
        const opDesc = S.Components.Gate[this._subtype][0]
        return tooltipContent(s.title, mods(
            div(s.desc.expand({ op: opDesc })),
        ))
    }

    protected doRecalcValue(): LogicValue[] {
        const out = GateNTypes.props[this._subtype].out

        const a = this.inputValues(this.inputs.A)
        const b = this.inputValues(this.inputs.B)

        const s = ArrayFillWith(Unknown as LogicValue, this.numBits)
        for (let i = 0; i < this.numBits; i++) {
            const ai = a[i]
            const bi = b[i]
            s[i] = out([ai, bi])
        }
        return s
    }

    protected override propagateValue(newValue: LogicValue[]) {
        this.outputValues(this.outputs.S, newValue)
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        const right = this.posX + width / 2
        let top = this.posY - height / 2
        let bottom = this.posY + height / 2

        // inputs
        for (const input of this.inputs._all) {
            drawWireLineToComponent(g, input, left, input.posYInParentTransform)
        }
        // outputs
        for (const output of this.outputs._all) {
            drawWireLineToComponent(g, output, right, output.posYInParentTransform)
        }


        // outline
        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 3

        g.beginPath()
        g.rect(left, top, width, height)
        g.fill()
        g.stroke()

        if (this._showAsUnknown) {
            ctx.inNonTransformedFrame(() => {
                g.fillStyle = COLOR_UNKNOWN
                g.textAlign = "center"
                g.font = "bold 20px sans-serif"
                g.fillText('?', this.posX, this.posY)
            })
        } else {
            // draw gate type
            g.lineWidth = 2
            g.strokeStyle = COLOR_COMPONENT_BORDER
            g.beginPath()

            top = this.posY - GRID_STEP
            bottom = this.posY + GRID_STEP
            let gateLeft = left + 10
            const gateRight = right - 10
            const pi2 = Math.PI / 2
            const type = this._subtype

            const drawRightCircle = () => {
                g.beginPath()
                circle(g, gateRight + 3, this.posY, 5)
                g.stroke()
            }
            const drawLeftCircle = (up: boolean) => {
                g.beginPath()
                circle(g, gateLeft - 3, this.posY - (up ? 1 : -1) * 4, 5)
                g.stroke()
            }


            switch (type) {
                case "AND":
                case "NAND":
                case "NIMPLY":
                case "RNIMPLY": {
                    g.moveTo(this.posX, bottom)
                    g.lineTo(gateLeft, bottom)
                    g.lineTo(gateLeft, top)
                    g.lineTo(this.posX, top)
                    g.arc(this.posX, this.posY, GRID_STEP, -pi2, pi2)
                    g.closePath()
                    g.stroke()
                    g.beginPath()
                    if (type.startsWith("NAND")) {
                        drawRightCircle()
                    }
                    if (type === "NIMPLY") {
                        drawLeftCircle(false)
                    } else if (type === "RNIMPLY") {
                        drawLeftCircle(true)
                    }
                    break
                }



                case "OR":
                case "NOR":
                case "XOR":
                case "XNOR":
                case "IMPLY":
                case "RIMPLY": {
                    g.beginPath()
                    g.moveTo(gateLeft, top)
                    g.lineTo(this.posX - 5, top)
                    g.bezierCurveTo(this.posX + 2, top, gateRight - 5, this.posY - 8,
                        gateRight, this.posY)
                    g.bezierCurveTo(gateRight - 5, this.posY + 8, this.posX + 2, bottom,
                        this.posX - 5, bottom)
                    g.lineTo(gateLeft, bottom)
                    g.quadraticCurveTo(this.posX - 4, this.posY, gateLeft, top)
                    g.closePath()
                    g.stroke()
                    const savedGateLeft = gateLeft
                    gateLeft += 2
                    if (type.startsWith("NOR") || type.startsWith("XNOR")) {
                        drawRightCircle()
                    }
                    if (type === "IMPLY") {
                        drawLeftCircle(true)
                    } else if (type === "RIMPLY") {
                        drawLeftCircle(false)
                    }
                    if (type.startsWith("X")) {
                        g.beginPath()
                        g.moveTo(savedGateLeft - 4, bottom)
                        g.quadraticCurveTo(this.posX - 8, this.posY, savedGateLeft - 4, top)
                        g.stroke()
                    }
                    break
                }

                case "TXA":
                case "TXNA": {
                    g.beginPath()
                    g.moveTo(gateLeft, bottom)
                    g.lineTo(gateLeft, top)
                    g.lineTo(gateRight, this.posY)
                    g.lineTo(gateLeft + 2, this.posY)
                    g.stroke()
                    if (type === "TXNA") {
                        drawLeftCircle(true)
                    }
                    break
                }

                case "TXB":
                case "TXNB": {
                    g.beginPath()
                    g.moveTo(gateLeft, top)
                    g.lineTo(gateLeft, bottom)
                    g.lineTo(gateRight, this.posY)
                    g.lineTo(gateLeft + 2, this.posY)
                    g.stroke()
                    if (type === "TXNB") {
                        drawLeftCircle(false)
                    }
                    break
                }
            }
        }

    }

    private doSetSubtype(newSubtype: GateNType) {
        this._subtype = newSubtype
        this.setNeedsRecalc()
        this.setNeedsRedraw("quad gate type changed")
    }

    private doSetShowAsUnknown(showAsUnknown: boolean) {
        this._showAsUnknown = showAsUnknown
        this.setNeedsRedraw("display as unknown changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        const s = S.Components.GateArray.contextMenu

        const typeItems: ContextMenuData = []
        for (const subtype of ["AND", "OR", "XOR", "NAND", "NOR", "XNOR"] as const) {
            const icon = this._subtype === subtype ? "check" : "none"
            typeItems.push(ContextMenuData.item(icon, subtype, () => {
                this.doSetSubtype(subtype)
            }))
        }

        const items: [ContextMenuItemPlacement, ContextMenuItem][] = [
            ["mid", ContextMenuData.submenu("settings", s.Type, typeItems)],
        ]

        if (this.editor.mode >= Mode.FULL) {
            const showAsUnknownItem = ContextMenuData.item(this._showAsUnknown ? "check" : "none", s.ShowAsUnknown, () => {
                this.doSetShowAsUnknown(!this._showAsUnknown)
            })

            items.push(
                ["mid", showAsUnknownItem],
            )
        }

        const forceOutputItem = this.makeForceOutputsContextMenuItem()
        if (isDefined(forceOutputItem)) {
            items.push(
                ["mid", ContextMenuData.sep()],
                ["mid", forceOutputItem]
            )
        }

        return items
    }

}
