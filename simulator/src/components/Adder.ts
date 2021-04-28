import { isUnset, TriState, Unset } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_MOUSE_OVER, GRID_STEP, wireLineToComponent } from "../drawutils"
import { DrawContext, isOrientationVertical } from "./Drawable"
import { tooltipContent, mods, div } from "../htmlgen"

const GRID_WIDTH = 6
const GRID_HEIGHT = 8

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

    public constructor(savedData: AdderRepr | null) {
        super([false, false], savedData, {
            inOffsets: [[-4, -2, "w"], [-4, 2, "w"], [0, -5, "n"]],
            outOffsets: [[4, 0, "e"], [0, 5, "s"]],
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

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    public makeTooltip() {
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

    protected propagateNewValue(newValue: [TriState, TriState]) {
        this.outputs[OUTPUT_S].value = newValue[OUTPUT_S]
        this.outputs[OUTPUT_Cout].value = newValue[OUTPUT_Cout]
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        fill(0xFF)

        if (ctx.isMouseOver) {
            stroke(...COLOR_MOUSE_OVER)
        } else {
            stroke(0)
        }

        strokeWeight(4)

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        rect(this.posX - width / 2, this.posY - height / 2, width, height)

        wireLineToComponent(this.inputs[0], this.posX - width / 2 - 2, this.inputs[0].posYInParentTransform)
        wireLineToComponent(this.inputs[1], this.posX - width / 2 - 2, this.inputs[1].posYInParentTransform)
        wireLineToComponent(this.inputs[2], this.inputs[2].posXInParentTransform, this.posY - height / 2 - 2)


        wireLineToComponent(this.outputs[0], this.posX + width / 2 + 2, this.outputs[0].posYInParentTransform)
        wireLineToComponent(this.outputs[1], this.outputs[1].posXInParentTransform, this.posY + height / 2 + 2)


        ctx.inNonTransformedFrame(ctx => {
            noStroke()

            fill(0xAA)
            textSize(13)
            textStyle(NORMAL)
            textAlign(CENTER, CENTER)

            let spacingLeft = 8
            let spacingRight = 8
            let spacingTop = 9
            let spacingBottom = 8

            if (isOrientationVertical(this.orient)) {
                spacingLeft += 2
                spacingRight += 1
                spacingTop += 4
                spacingBottom += 9
            }

            text("A", ...ctx.rotatePoint(this.posX - width / 2 + spacingLeft, this.inputs[INPUT_A].posYInParentTransform))
            text("B", ...ctx.rotatePoint(this.posX - width / 2 + spacingLeft, this.inputs[INPUT_B].posYInParentTransform))
            text("Cin", ...ctx.rotatePoint(this.inputs[INPUT_Cin].posXInParentTransform, this.posY - height / 2 + spacingTop))

            text("S", ...ctx.rotatePoint(this.posX + width / 2 - spacingRight, this.outputs[OUTPUT_S].posYInParentTransform))
            text("Cout", ...ctx.rotatePoint(this.outputs[OUTPUT_Cout].posXInParentTransform, this.posY + height / 2 - spacingBottom))

            fill(0)
            textSize(30)
            textStyle(BOLD)
            textAlign(CENTER, CENTER)
            text("+", this.posX, this.posY)
        })
    }

}
