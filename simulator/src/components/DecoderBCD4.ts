import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, displayValuesFromArray, drawLabel, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { FixedArray, FixedArrayFillWith, isUndefined, isUnknown, LogicValue, Unknown } from "../utils"
import { ComponentBase, defineComponent, group, Repr } from "./Component"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"


export const DecoderBCD4Def =
    defineComponent("ic", "decoder-bcd4", {
        valueDefaults: {},
        size: { gridWidth: 5, gridHeight: 12 },
        makeNodes: () => ({
            ins: {
                I: group("w", [
                    [-4, -3, "D"],
                    [-4, -1, "C"],
                    [-4, +1, "B"],
                    [-4, +3, "A"],
                ]),
            },
            outs: {
                Z: group("e", [
                    [+4, -5],
                    [+4, -3],
                    [+4, -1],
                    [+4, +1],
                    [+4, +5],
                ]),
            },
        }),
        initialValue: () => FixedArrayFillWith(false as LogicValue, 5),
    })

type DecoderBCD4Repr = Repr<typeof DecoderBCD4Def>

export class DecoderBCD4 extends ComponentBase<DecoderBCD4Repr> {

    public constructor(editor: LogicEditor, savedData: DecoderBCD4Repr | null) {
        super(editor, DecoderBCD4Def, savedData)
    }

    public toJSON() {
        return {
            type: "decoder-bcd4" as const,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods(
            div(S.Components.DecoderBCD4.tooltip)
        ))
    }

    protected doRecalcValue(): FixedArray<LogicValue, 5> {
        const input = this.inputValues(this.inputs.I)
        const [__, value] = displayValuesFromArray(input, false)

        let output
        if (isUnknown(value)) {
            output = FixedArrayFillWith(Unknown, 5)
        } else {
            output = ((): FixedArray<LogicValue, 5> => {
                switch (value) {
                    case 0: return [false, false, false, false, false]
                    case 1: return [false, false, false, false, true]
                    case 2: return [false, false, false, true, false]
                    case 3: return [false, false, false, true, true]
                    case 4: return [false, false, true, false, false]
                    case 5: return [false, false, true, false, true]
                    case 6: return [false, false, true, true, false]
                    case 7: return [false, false, true, true, true]
                    case 8: return [false, true, false, false, false]
                    case 9: return [false, true, false, false, true]
                    case 10: return [true, false, false, false, false]
                    case 11: return [true, false, false, false, true]
                    case 12: return [true, false, false, true, false]
                    case 13: return [true, false, false, true, true]
                    case 14: return [true, false, true, false, false]
                    case 15: return [true, false, true, false, true]
                    default: return FixedArrayFillWith(Unknown, 5)
                }
            })()
        }

        return output
    }

    protected override propagateValue(newValue: LogicValue[]) {
        this.outputValues(this.outputs.Z, newValue, true)
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 4

        const width = this.unrotatedWidth
        const height = this.unrotatedHeight
        const left = this.posX - width / 2
        const right = left + width

        g.beginPath()
        g.rect(this.posX - width / 2, this.posY - height / 2, width, height)
        g.fill()
        g.stroke()

        for (const input of this.inputs._all) {
            drawWireLineToComponent(g, input, left - 2, input.posYInParentTransform)
        }

        for (const output of this.outputs._all) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform)
        }

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            this.inputs._all.forEach(input => {
                drawLabel(ctx, this.orient, input.name, "w", left, input)
            })
            this.outputs._all.forEach(output => {
                drawLabel(ctx, this.orient, output.name, "e", right, output)
            })

        })
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        const forceOutputItem = this.makeForceOutputsContextMenuItem()
        if (isUndefined(forceOutputItem)) {
            return []
        }
        return [
            ["mid", forceOutputItem],
        ]
    }


}
