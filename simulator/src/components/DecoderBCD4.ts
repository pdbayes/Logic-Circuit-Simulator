import { FixedArrayFill, FixedReadonlyArray, isUnknown, LogicValue, Unknown } from "../utils"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, displayValuesFromArray, drawLabel, drawWireLineToComponent, GRID_STEP } from "../drawutils"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import * as t from "io-ts"
import { ComponentBase, defineComponent } from "./Component"

export const DecoderBCD4Def =
    defineComponent(4, 5, t.type({
        type: t.literal("decoder-bcd4"),
    }, "DecoderBCD4"))

const INPUT = {
    I: [0, 1, 2, 3] as const,
}

const OUTPUT = {
    B: [0, 1, 2, 3, 5] as const,
}

const GRID_WIDTH = 5
const GRID_HEIGHT = 12

export type DecoderBCD4Repr = typeof DecoderBCD4Def.reprType

export class DecoderBCD4 extends ComponentBase<4, 5, DecoderBCD4Repr, FixedReadonlyArray<LogicValue, 5>> {

    public constructor(editor: LogicEditor, savedData: DecoderBCD4Repr | null) {
        super(editor, FixedArrayFill(false, 5), savedData, {
            inOffsets: [[-4, -3, "w"], [-4, -1, "w"], [-4, +1, "w"], [-4, +3, "w"]],
            outOffsets: [[+4, -5, "e"], [+4, -3, "e"], [+4, -1, "e"], [+4, +1, "e"], [+4, +5, "e"]],
        })
    }

    toJSON() {
        return {
            type: "decoder-bcd4" as const,
            ...this.toJSONBase(),
        }
    }

    public get componentType() {
        return "ic" as const
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    override getInputName(i: number): string | undefined {
        switch (i) {
            case INPUT.I[0]: return "D"
            case INPUT.I[1]: return "C"
            case INPUT.I[2]: return "B"
            case INPUT.I[3]: return "A"
        }
        return undefined
    }

    override getOutputName(i: number): string | undefined {
        if (i < OUTPUT.B.length) {
            return "B" + i
        }
        return undefined
    }


    public override makeTooltip() {
        return tooltipContent(undefined, mods(
            div("Décodeur 4 bits vers BCD")
        ))
    }

    protected doRecalcValue(): FixedReadonlyArray<LogicValue, 5> {
        const input = this.inputValues<4>(INPUT.I)
        const [__, value] = displayValuesFromArray(input, false)

        let output
        if (isUnknown(value)) {
            output = FixedArrayFill(Unknown, 5)
        } else {
            output = (() => {
                switch (value) {
                    case 0: return [false, false, false, false, false] as const
                    case 1: return [false, false, false, false, true] as const
                    case 2: return [false, false, false, true, false] as const
                    case 3: return [false, false, false, true, true] as const
                    case 4: return [false, false, true, false, false] as const
                    case 5: return [false, false, true, false, true] as const
                    case 6: return [false, false, true, true, false] as const
                    case 7: return [false, false, true, true, true] as const
                    case 8: return [false, true, false, false, false] as const
                    case 9: return [false, true, false, false, true] as const
                    case 10: return [true, false, false, false, false] as const
                    case 11: return [true, false, false, false, true] as const
                    case 12: return [true, false, false, true, false] as const
                    case 13: return [true, false, false, true, true] as const
                    case 14: return [true, false, true, false, false] as const
                    case 15: return [true, false, true, false, true] as const
                    default: return FixedArrayFill(Unknown, 5)
                }
            })()
        }

        return output
    }

    protected override propagateValue(newValue: FixedReadonlyArray<LogicValue, 5>) {
        this.outputs.forEach((output, i) => {
            output.value = newValue[5 - i - 1]
        })
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 4

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        const left = this.posX - width / 2
        const right = left + width

        g.beginPath()
        g.rect(this.posX - width / 2, this.posY - height / 2, width, height)
        g.fill()
        g.stroke()

        for (const input of this.inputs) {
            drawWireLineToComponent(g, input, left - 2, input.posYInParentTransform)
        }

        for (const output of this.outputs) {
            drawWireLineToComponent(g, output, right + 2, output.posYInParentTransform)
        }

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            this.inputs.forEach((input, i) => {
                drawLabel(ctx, this.orient, this.getInputName(i)!, "w", left, input)
            })
            this.outputs.forEach((output, i) => {
                drawLabel(ctx, this.orient, this.getOutputName(i)!, "e", right, output)
            })

        })
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        return [
            ["mid", this.makeForceOutputsContextMenuItem()!],
        ]
    }


}
