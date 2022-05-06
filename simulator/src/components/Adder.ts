import { isHighImpedance, isUndefined, isUnknown, LogicValue, Unknown } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, GRID_STEP, drawWireLineToComponent, drawLabel } from "../drawutils"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"

const GRID_WIDTH = 7
const GRID_HEIGHT = 5

const enum INPUT {
    A, B, Cin
}

const enum OUTPUT {
    S, Cout
}

export const AdderDef =
    defineComponent(3, 2, t.type({
        type: t.literal("adder"),
    }, "Adder"))

export type AdderRepr = typeof AdderDef.reprType

export class Adder extends ComponentBase<3, 2, AdderRepr, [LogicValue, LogicValue]> {

    public constructor(editor: LogicEditor, savedData: AdderRepr | null) {
        super(editor, [false, false], savedData, {
            inOffsets: [[-2, -4, "n"], [2, -4, "n"], [5, 0, "e"]],
            outOffsets: [[0, 4, "s"], [-5, 0, "w"]],
        })
    }

    toJSON() {
        return {
            type: "adder" as const,
            ...this.toJSONBase(),
        }
    }

    public get componentType() {
        return "ic" as const
    }

    override getInputName(i: number): string | undefined {
        switch (i) {
            case INPUT.A: return "A"
            case INPUT.B: return "B"
            case INPUT.Cin: return "Cin (retenue précédente)"
        }
        return undefined
    }

    override getOutputName(i: number): string | undefined {
        switch (i) {
            case OUTPUT.S: return "S (somme)"
            case OUTPUT.Cout: return "Cout (retenue)"
        }
        return undefined
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    public override makeTooltip() {
        return tooltipContent("Additionneur", mods(
            div(`Additionne deux bits A et B et une retenue d’entrée Cin, et fournit un bit de somme S et une retenue de sortie Cout.`)
        ))
    }

    protected doRecalcValue(): [LogicValue, LogicValue] {
        const a = this.inputs[INPUT.A].value
        const b = this.inputs[INPUT.B].value
        const cIn = this.inputs[INPUT.Cin].value

        if (isUnknown(a) || isUnknown(b) || isUnknown(cIn) || isHighImpedance(a) || isHighImpedance(b) || isHighImpedance(cIn)) {
            return [Unknown, Unknown]
        }

        const sum = (+a) + (+b) + (+cIn)
        switch (sum) {
            case 0: return [false, false]
            case 1: return [true, false]
            case 2: return [false, true]
            case 3: return [true, true]
            default:
                console.log("ERROR: sum of adder is > 3")
                return [false, false]
        }
    }

    protected override propagateValue(newValue: [LogicValue, LogicValue]) {
        this.outputs[OUTPUT.S].value = newValue[OUTPUT.S]
        this.outputs[OUTPUT.Cout].value = newValue[OUTPUT.Cout]
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP

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

        drawWireLineToComponent(g, this.inputs[INPUT.A], this.inputs[INPUT.A].posXInParentTransform, this.posY - height / 2 - 2, true)
        drawWireLineToComponent(g, this.inputs[INPUT.B], this.inputs[INPUT.B].posXInParentTransform, this.posY - height / 2 - 2, true)
        drawWireLineToComponent(g, this.inputs[INPUT.Cin], this.posX + width / 2 + 2, this.inputs[INPUT.Cin].posYInParentTransform, true)


        drawWireLineToComponent(g, this.outputs[OUTPUT.S], this.outputs[OUTPUT.S].posXInParentTransform, this.posY + height / 2 + 2, true)
        drawWireLineToComponent(g, this.outputs[OUTPUT.Cout], this.posX - width / 2 - 2, this.outputs[OUTPUT.Cout].posYInParentTransform, true)


        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.textAlign = "center"
            g.font = "11px sans-serif"

            const top = this.posY - height / 2
            const bottom = this.posY + height / 2
            const right = this.posX + width / 2
            const left = this.posX - width / 2

            drawLabel(ctx, this.orient, "A", "n", this.inputs[INPUT.A], top)
            drawLabel(ctx, this.orient, "B", "n", this.inputs[INPUT.B], top)
            drawLabel(ctx, this.orient, "Cin", "e", right, this.inputs[INPUT.Cin])

            drawLabel(ctx, this.orient, "S", "s", this.outputs[OUTPUT.S], bottom)
            drawLabel(ctx, this.orient, "Cout", "w", left, this.outputs[OUTPUT.Cout])

            g.fillStyle = COLOR_COMPONENT_BORDER
            g.font = "bold 30px sans-serif"
            g.textAlign = "center"
            g.textBaseline = "middle"
            g.fillText("+", this.posX, this.posY - 2)
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
