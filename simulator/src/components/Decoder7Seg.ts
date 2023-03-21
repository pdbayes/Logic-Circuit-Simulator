import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, displayValuesFromArray, drawLabel, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { FixedArray, FixedArrayFillWith, isUndefined, isUnknown, LogicValue, Unknown } from "../utils"
import { ComponentBase, defineComponent, group, Repr } from "./Component"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"

export const Decoder7SegDef =
    defineComponent("decoder-7seg", {
        valueDefaults: {},
        size: { gridWidth: 4, gridHeight: 8 },
        makeNodes: () => ({
            ins: {
                I: group("w", [
                    [-3, -3, "A"],
                    [-3, -1, "B"],
                    [-3, +1, "C"],
                    [-3, +3, "D"],
                ]),
            },
            outs: {
                Out: group("e", [
                    [+3, -3, "a"],
                    [+3, -2, "b"],
                    [+3, -1, "c"],
                    [+3, 0, "d"],
                    [+3, +1, "e"],
                    [+3, +2, "f"],
                    [+3, +3, "g"],
                ]),
            },
        }),
        initialValue: () => FixedArrayFillWith(false as LogicValue, 7),
    })

type Decoder7SegRepr = Repr<typeof Decoder7SegDef>

export class Decoder7Seg extends ComponentBase<Decoder7SegRepr> {

    public constructor(editor: LogicEditor, savedData: Decoder7SegRepr | null) {
        super(editor, Decoder7SegDef, savedData)
    }

    public toJSON() {
        return {
            type: "decoder-7seg" as const,
            ...this.toJSONBase(),
        }
    }

    public get componentType() {
        return "ic" as const
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods(
            div(S.Components.Decoder7Seg.tooltip) // TODO better info
        ))
    }

    protected doRecalcValue(): FixedArray<LogicValue, 7> {
        const input = this.inputValues(this.inputs.I)
        const [__, value] = displayValuesFromArray(input, false)

        let output
        if (isUnknown(value)) {
            output = FixedArrayFillWith(Unknown, 7)
        } else {
            output = ((): FixedArray<LogicValue, 7> => {
                switch (value) {
                    case 0: return [true, true, true, true, true, true, false]
                    case 1: return [false, true, true, false, false, false, false]
                    case 2: return [true, true, false, true, true, false, true]
                    case 3: return [true, true, true, true, false, false, true]
                    case 4: return [false, true, true, false, false, true, true]
                    case 5: return [true, false, true, true, false, true, true]
                    case 6: return [true, false, true, true, true, true, true]
                    case 7: return [true, true, true, false, false, false, false]
                    case 8: return [true, true, true, true, true, true, true]
                    case 9: return [true, true, true, true, false, true, true]
                    case 10: return [true, true, true, false, true, true, true]
                    case 11: return [false, false, true, true, true, true, true]
                    case 12: return [true, false, false, true, true, true, false]
                    case 13: return [false, true, true, true, true, false, true]
                    case 14: return [true, false, false, true, true, true, true]
                    case 15: return [true, false, false, false, true, true, true]
                    default: return FixedArrayFillWith(Unknown, 7)
                }
            })()
        }

        return output
    }

    protected override propagateValue(newValue: FixedArray<LogicValue, 7>) {
        this.outputValues(this.outputs.Out, newValue)
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
