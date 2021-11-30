import { isUnset, TriState, Unset } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_MOUSE_OVER, GRID_STEP, drawWireLineToComponent } from "../drawutils"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"

const GRID_WIDTH = 7
const GRID_HEIGHT = 5

const INPUT_A = 0
const INPUT_B = 1
const INPUT_Cin = 2

const OUTPUT_S = 0
const OUTPUT_Cout = 1

export const AdderDef =
    defineComponent(3, 2, t.type({
        type: t.literal("adder"),
    }, "Adder"))

export type AdderRepr = typeof AdderDef.reprType

export class Adder extends ComponentBase<3, 2, AdderRepr, [TriState, TriState]> {

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
        return "IC" as const
    }

    protected override getInputName(i: number): string | undefined {
        switch (i) {
            case INPUT_A: return "A"
            case INPUT_B: return "B"
            case INPUT_Cin: return "Cin (retenue précédente)"
        }
        return undefined
    }

    protected override getOutputName(i: number): string | undefined {
        switch (i) {
            case OUTPUT_S: return "S (somme)"
            case OUTPUT_Cout: return "Cout (retenue)"
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

    protected doRecalcValue(): [TriState, TriState] {
        const a = this.inputs[INPUT_A].value
        const b = this.inputs[INPUT_B].value
        const cIn = this.inputs[INPUT_Cin].value

        if (isUnset(a) || isUnset(b) || isUnset(cIn)) {
            return [Unset, Unset]
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

    protected override propagateNewValue(newValue: [TriState, TriState]) {
        this.outputs[OUTPUT_S].value = newValue[OUTPUT_S]
        this.outputs[OUTPUT_Cout].value = newValue[OUTPUT_Cout]
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

        drawWireLineToComponent(g, this.inputs[INPUT_A], this.inputs[INPUT_A].posXInParentTransform, this.posY - height / 2 - 2, true)
        drawWireLineToComponent(g, this.inputs[INPUT_B], this.inputs[INPUT_B].posXInParentTransform, this.posY - height / 2 - 2, true)
        drawWireLineToComponent(g, this.inputs[INPUT_Cin], this.posX + width / 2 + 2, this.inputs[INPUT_Cin].posYInParentTransform, true)


        drawWireLineToComponent(g, this.outputs[OUTPUT_S], this.outputs[OUTPUT_S].posXInParentTransform, this.posY + height / 2 + 2, true)
        drawWireLineToComponent(g, this.outputs[OUTPUT_Cout], this.posX - width / 2 - 2, this.outputs[OUTPUT_Cout].posYInParentTransform, true)


        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.textAlign = "center"
            g.font = "11px sans-serif"

            let spacingTop = 8
            let spacingRight = 10
            let spacingBottom = 6
            let spacingLeft = 13

            if (Orientation.isVertical(this.orient)) {
                spacingTop -= 1
                spacingRight -= 0
                spacingBottom -= 0
                spacingLeft -= 3
            }

            g.fillText("A", ...ctx.rotatePoint(this.inputs[INPUT_A].posXInParentTransform, this.posY - height / 2 + spacingTop))
            g.fillText("B", ...ctx.rotatePoint(this.inputs[INPUT_B].posXInParentTransform, this.posY - height / 2 + spacingTop))
            g.fillText("Cin", ...ctx.rotatePoint(this.posX + width / 2 - spacingRight, this.inputs[INPUT_Cin].posYInParentTransform))

            g.fillText("S", ...ctx.rotatePoint(this.outputs[OUTPUT_S].posXInParentTransform, this.posY + height / 2 - spacingBottom))
            g.fillText("Cout", ...ctx.rotatePoint(this.posX - width / 2 + spacingLeft, this.outputs[OUTPUT_Cout].posYInParentTransform))

            g.fillStyle = COLOR_COMPONENT_BORDER
            g.font = "bold 30px sans-serif"
            g.fillText("+", this.posX, this.posY - 2)
        })
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        return [
            ["mid", this.makeForceOutputsContextMenuItem()!],
        ]
    }


}
