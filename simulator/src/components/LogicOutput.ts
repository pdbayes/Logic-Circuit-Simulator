import { isDefined, isNotNull, isUnset, Mode, TriState, typeOrUndefined } from "../utils"
import { ComponentBase, defineComponent, INPUT_OUTPUT_DIAMETER } from "./Component"
import * as t from "io-ts"
import { wireLineToComponent, fillForBoolean, roundValue, COLOR_MOUSE_OVER } from "../drawutils"
import { mode } from "../simulator"
import { emptyMod, mods, tooltipContent } from "../htmlgen"
import { DrawContext } from "./Drawable"


export const LogicOutputDef =
    defineComponent(1, 0, t.type({
        name: typeOrUndefined(t.string),
    }, "LogicOutput"))

type LogicOutputRepr = typeof LogicOutputDef.reprType

export class LogicOutput extends ComponentBase<1, 0, LogicOutputRepr, TriState> {

    private readonly name: string | undefined = undefined

    public constructor(savedData: LogicOutputRepr | null) {
        super(false, savedData, { inOffsets: [[-3, 0]] })
        if (isNotNull(savedData)) {
            this.name = savedData.name
        }
    }

    toJSON() {
        return {
            ...this.toJSONBase(),
            name: this.name,
        }
    }

    protected toStringDetails(): string {
        return "" + this.value
    }

    get unrotatedWidth() {
        return INPUT_OUTPUT_DIAMETER
    }

    get unrotatedHeight() {
        return INPUT_OUTPUT_DIAMETER
    }

    isOver(x: number, y: number) {
        return mode >= Mode.CONNECT && dist(x, y, this.posX, this.posY) < INPUT_OUTPUT_DIAMETER / 2
    }

    public makeTooltip() {
        return tooltipContent(undefined, mods("Sortie", isUnset(this.value) ? " dont la valeur n’est pas déterminée" : emptyMod))
    }

    protected doRecalcValue(): TriState {
        return this.inputs[0].value
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const input = this.inputs[0]
        wireLineToComponent(input, this.posX, this.posY)

        if (ctx.isMouseOver) {
            stroke(...COLOR_MOUSE_OVER)
            fill(...COLOR_MOUSE_OVER)
        } else {
            stroke(0)
            fill(0)
        }
        triangle(
            this.posX - INPUT_OUTPUT_DIAMETER / 2 - 5, this.posY - 5,
            this.posX - INPUT_OUTPUT_DIAMETER / 2 - 5, this.posY + 5,
            this.posX - INPUT_OUTPUT_DIAMETER / 2 - 1, this.posY,
        )
        fillForBoolean(this.value)
        strokeWeight(4)
        circle(this.posX, this.posY, INPUT_OUTPUT_DIAMETER)

        ctx.inNonTransformedFrame(ctx => {
            noStroke()
            fill(0)
            textSize(18)
            textStyle(ITALIC)
            textAlign(LEFT, CENTER)
            if (isDefined(this.name)) {
                text(this.name, ...ctx.rotatePoint(this.posX + 21, this.posY))
            }
            roundValue(this)
        })
    }

}
