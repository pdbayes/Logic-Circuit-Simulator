import { isDefined, isNotNull, isUnset, Mode, toTriState, toTriStateRepr, TriState, TriStateRepr, Unset, typeOrUndefined } from "../utils"
import { ComponentBase, defineComponent, extendComponent, INPUT_OUTPUT_DIAMETER } from "./Component"
import * as t from "io-ts"
import { drawWireLineToComponent, drawRoundValue, COLOR_MOUSE_OVER, COLOR_COMPONENT_BORDER, dist, triangle, circle, colorForBoolean } from "../drawutils"
import { mode } from "../simulator"
import { emptyMod, mods, tooltipContent } from "../htmlgen"
import { DrawContext } from "./Drawable"

export const LogicInputBaseDef =
    defineComponent(0, 1, t.type({
        name: typeOrUndefined(t.string),
    }, "LogicInputBase"))

export type LogicInputBaseRepr = typeof LogicInputBaseDef.reprType

export const NAME_POSITION_SETTINGS = {
    right: ["start", "middle", 20],
    left: ["end", "middle", 22],
    top: ["center", "bottom", 18],
    bottom: ["center", "top", 18],
} as const

export abstract class LogicInputBase<Repr extends LogicInputBaseRepr> extends ComponentBase<0, 1, Repr, TriState> {

    protected readonly name: string | undefined = undefined

    protected constructor(initialValue: TriState, savedData: Repr | null) {
        super(initialValue, savedData, { outOffsets: [[+3, 0, "e"]] })
        if (isNotNull(savedData)) {
            this.name = savedData.name
        }
    }

    override toJSONBase() {
        return {
            ...super.toJSONBase(),
            name: this.name,
        }
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
        return mode >= Mode.TRYOUT && dist(x, y, this.posX, this.posY) < INPUT_OUTPUT_DIAMETER / 2
    }

    override get allowsForcedOutputs() {
        return false
    }

    protected override propagateNewValue(newValue: TriState) {
        this.outputs[0].value = newValue
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        drawWireLineToComponent(g, this.outputs[0], this.posX, this.posY)

        if (ctx.isMouseOver) {
            g.strokeStyle = COLOR_MOUSE_OVER
            g.fillStyle = COLOR_MOUSE_OVER
        } else {
            g.strokeStyle = COLOR_COMPONENT_BORDER
            g.fillStyle = COLOR_COMPONENT_BORDER
        }
        g.beginPath()
        triangle(g,
            this.posX + INPUT_OUTPUT_DIAMETER / 2 - 1, this.posY - 7,
            this.posX + INPUT_OUTPUT_DIAMETER / 2 - 1, this.posY + 7,
            this.posX + INPUT_OUTPUT_DIAMETER / 2 + 5, this.posY,
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
                        case "e": return NAME_POSITION_SETTINGS.left
                        case "w": return NAME_POSITION_SETTINGS.right
                        case "n": return NAME_POSITION_SETTINGS.bottom
                        case "s": return NAME_POSITION_SETTINGS.top
                    }
                })()
                g.textAlign = hAlign
                g.textBaseline = vAlign
                g.font = "italic 18px sans-serif"
                g.fillText(this.name, ...ctx.rotatePoint(this.posX - deltaX, this.posY))
                g.textBaseline = "middle"
            }
            drawRoundValue(g, this)
        })
    }

}


export const LogicInputDef =
    extendComponent(LogicInputBaseDef, t.type({
        val: TriStateRepr,
    }, "LogicInput"))

export type LogicInputRepr = typeof LogicInputDef.reprType

export class LogicInput extends LogicInputBase<LogicInputRepr> {

    public constructor(savedData: LogicInputRepr | null) {
        super(
            // initial value may be given by saved data
            isNotNull(savedData) ? toTriState(savedData.val) : false,
            savedData,
        )
    }

    toJSON() {
        return {
            ...super.toJSONBase(),
            val: toTriStateRepr(this.value),
        }
    }

    public get componentType() {
        return "LogicInput" as const
    }

    override get cursorWhenMouseover() {
        return "pointer"
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods("Entrée", isUnset(this.value) ? " dont la valeur n’est pas déterminée" : emptyMod))
    }

    protected doRecalcValue(): TriState {
        // this never changes on its own, just upon user interaction
        return this.value
    }

    override mouseClicked(e: MouseEvent | TouchEvent) {
        this.doSetValue((() => {
            switch (this.value) {
                case true: return (mode >= Mode.FULL && e.altKey) ? Unset : false
                case false: return (mode >= Mode.FULL && e.altKey) ? Unset : true
                case Unset: return mode >= Mode.FULL ? false : Unset
            }
        })())
        return true
    }

}
