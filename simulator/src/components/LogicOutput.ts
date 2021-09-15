import { isDefined, isNotNull, isUnset, Mode, TriState, typeOrUndefined } from "../utils"
import { ComponentBase, defineComponent, INPUT_OUTPUT_DIAMETER } from "./Component"
import * as t from "io-ts"
import { drawWireLineToComponent, drawRoundValue, COLOR_MOUSE_OVER, COLOR_COMPONENT_BORDER, dist, triangle, circle, colorForBoolean } from "../drawutils"
import { mode } from "../simulator"
import { emptyMod, mods, tooltipContent } from "../htmlgen"
import { DrawContext } from "./Drawable"
import { NAME_POSITION_SETTINGS } from "./LogicInput"


export const LogicOutputDef =
    defineComponent(1, 0, t.type({
        name: typeOrUndefined(t.string),
    }, "LogicOutput"))

type LogicOutputRepr = typeof LogicOutputDef.reprType

export class LogicOutput extends ComponentBase<1, 0, LogicOutputRepr, TriState> {

    private readonly name: string | undefined = undefined

    public constructor(savedData: LogicOutputRepr | null) {
        super(false, savedData, { inOffsets: [[-3, 0, "w"]] })
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

    public get componentType() {
        return "LogicOutput" as const
    }

    protected override toStringDetails(): string {
        return "" + this.value
    }

    get unrotatedWidth() {
        return INPUT_OUTPUT_DIAMETER
    }

    get unrotatedHeight() {
        return INPUT_OUTPUT_DIAMETER
    }

    override isOver(x: number, y: number) {
        return mode >= Mode.CONNECT && dist(x, y, this.posX, this.posY) < INPUT_OUTPUT_DIAMETER / 2
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods("Sortie", isUnset(this.value) ? " dont la valeur n’est pas déterminée" : emptyMod))
    }

    protected doRecalcValue(): TriState {
        return this.inputs[0].value
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const input = this.inputs[0]
        drawWireLineToComponent(g, input, this.posX, this.posY)

        if (ctx.isMouseOver) {
            g.strokeStyle = COLOR_MOUSE_OVER
            g.fillStyle = COLOR_MOUSE_OVER
        } else {
            g.strokeStyle = COLOR_COMPONENT_BORDER
            g.fillStyle = COLOR_COMPONENT_BORDER
        }
        g.beginPath()
        triangle(g,
            this.posX - INPUT_OUTPUT_DIAMETER / 2 - 5, this.posY - 5,
            this.posX - INPUT_OUTPUT_DIAMETER / 2 - 5, this.posY + 5,
            this.posX - INPUT_OUTPUT_DIAMETER / 2 - 1, this.posY,
        )
        g.fill()
        g.stroke()

        g.fillStyle = colorForBoolean(this.value)
        g.lineWidth = 4
        g.beginPath()
        circle(g, this.posX, this.posY, INPUT_OUTPUT_DIAMETER)
        g.fill()
        g.stroke()

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_BORDER
            if (isDefined(this.name)) {
                const [hAlign, vAlign, deltaX] = (() => {
                    switch (this.orient) {
                        case "e": return NAME_POSITION_SETTINGS.right
                        case "w": return NAME_POSITION_SETTINGS.left
                        case "n": return NAME_POSITION_SETTINGS.top
                        case "s": return NAME_POSITION_SETTINGS.bottom
                    }
                })()
                g.textAlign = hAlign
                g.textBaseline = vAlign
                g.font = "italic 18px sans-serif"
                g.fillText(this.name, ...ctx.rotatePoint(this.posX + deltaX, this.posY))
                g.textBaseline = "middle"
            }
            drawRoundValue(g, this)
        })
    }

}
