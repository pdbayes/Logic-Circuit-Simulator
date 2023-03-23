import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, drawLabel, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { isHighImpedance, isUnknown, LogicValue, Unknown } from "../utils"
import { ComponentBase, defineComponent, Repr } from "./Component"
import { DrawContext, MenuItems } from "./Drawable"

export const AdderDef =
    defineComponent("ic", "adder", {
        button: { imgWidth: 50 },
        valueDefaults: {},
        size: { gridWidth: 7, gridHeight: 5 },
        makeNodes: () => {
            const s = S.Components.Generic
            return {
                ins: {
                    A: [-2, -4, "n"],
                    B: [2, -4, "n"],
                    Cin: [5, 0, "e", () => s.InputCarryInDesc],
                },
                outs: {
                    S: [0, 4, "s", () => s.OutputSumDesc],
                    Cout: [-5, 0, "w", () => s.OutputCarryOutDesc],
                },
            }
        },
        initialValue: () => ({ s: false as LogicValue, cout: false as LogicValue }),
    })

type AdderRepr = Repr<typeof AdderDef>

export class Adder extends ComponentBase<AdderRepr> {

    public constructor(editor: LogicEditor, saved?: AdderRepr) {
        super(editor, AdderDef, saved)
    }

    public toJSON() {
        return {
            type: "adder" as const,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        const s = S.Components.Adder.tooltip
        return tooltipContent(s.title, mods(
            div(s.desc),
        ))
    }

    protected doRecalcValue() {
        const a = this.inputs.A.value
        const b = this.inputs.B.value
        const cIn = this.inputs.Cin.value

        if (isUnknown(a) || isUnknown(b) || isUnknown(cIn) || isHighImpedance(a) || isHighImpedance(b) || isHighImpedance(cIn)) {
            return { s: Unknown, cout: Unknown }
        }

        const sum = (+a) + (+b) + (+cIn)
        switch (sum) {
            case 0: return { s: false, cout: false }
            case 1: return { s: true, cout: false }
            case 2: return { s: false, cout: true }
            case 3: return { s: true, cout: true }
            default:
                console.log("ERROR: sum of adder is > 3")
                return { s: false, cout: false }
        }
    }

    protected override propagateValue(newValue: { s: LogicValue, cout: LogicValue }) {
        this.outputs.S.value = newValue.s
        this.outputs.Cout.value = newValue.cout
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight

        g.fillStyle = COLOR_BACKGROUND
        g.lineWidth = 3
        if (ctx.isMouseOver) {
            g.strokeStyle = COLOR_MOUSE_OVER
        } else {
            g.strokeStyle = COLOR_COMPONENT_BORDER
        }

        g.beginPath()
        g.rect(this.posX - width / 2, this.posY - height / 2, width, height)
        g.fill()
        g.stroke()

        drawWireLineToComponent(g, this.inputs.A, this.inputs.A.posXInParentTransform, this.posY - height / 2 - 2, true)
        drawWireLineToComponent(g, this.inputs.B, this.inputs.B.posXInParentTransform, this.posY - height / 2 - 2, true)
        drawWireLineToComponent(g, this.inputs.Cin, this.posX + width / 2 + 2, this.inputs.Cin.posYInParentTransform, true)


        drawWireLineToComponent(g, this.outputs.S, this.outputs.S.posXInParentTransform, this.posY + height / 2 + 2, true)
        drawWireLineToComponent(g, this.outputs.Cout, this.posX - width / 2 - 2, this.outputs.Cout.posYInParentTransform, true)


        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.textAlign = "center"
            g.font = "11px sans-serif"

            const top = this.posY - height / 2
            const bottom = this.posY + height / 2
            const right = this.posX + width / 2
            const left = this.posX - width / 2

            drawLabel(ctx, this.orient, "A", "n", this.inputs.A, top)
            drawLabel(ctx, this.orient, "B", "n", this.inputs.B, top)
            drawLabel(ctx, this.orient, "Cin", "e", right, this.inputs.Cin)

            drawLabel(ctx, this.orient, "S", "s", this.outputs.S, bottom)
            drawLabel(ctx, this.orient, "Cout", "w", left, this.outputs.Cout)

            g.fillStyle = COLOR_COMPONENT_BORDER
            g.font = "bold 30px sans-serif"
            g.textAlign = "center"
            g.textBaseline = "middle"
            g.fillText("+", this.posX, this.posY - 2)
        })
    }

    protected override makeComponentSpecificContextMenuItems(): MenuItems {
        return this.makeForceOutputsContextMenuItem()
    }


}
AdderDef.impl = Adder
