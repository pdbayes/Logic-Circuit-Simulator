import { isDefined, isNotNull, isUnset, Mode, TriState } from "../utils"
import { ComponentBase, defineComponent, INPUT_OUTPUT_DIAMETER, typeOrUndefined } from "./Component"
import * as t from "io-ts"
import { wireLine, fillForBoolean, roundValue, COLOR_MOUSE_OVER } from "../drawutils"
import { mode } from "../simulator"
import { emptyMod, mods, tooltipContent } from "../htmlgen"


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

    get width() {
        return INPUT_OUTPUT_DIAMETER
    }

    get height() {
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

    doDraw(isMouseOver: boolean) {

        const input = this.inputs[0]
        wireLine(input, this.posX, this.posY)

        if (isMouseOver) {
            stroke(...COLOR_MOUSE_OVER)
        } else {
            stroke(0)
        }
        fillForBoolean(this.value)
        strokeWeight(4)
        circle(this.posX, this.posY, INPUT_OUTPUT_DIAMETER)

        noStroke()
        fill(0)
        textSize(18)
        textStyle(ITALIC)
        textAlign(LEFT, CENTER)
        if (isDefined(this.name)) {
            text(this.name, this.posX + 21, this.posY)
        }

        roundValue(this)
    }

}
