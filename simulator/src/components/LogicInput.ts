import { isDefined, isNotNull, isUnset, Mode, toTriState, toTriStateRepr, TriState, TriStateRepr, Unset, typeOrUndefined } from "../utils"
import { ComponentBase, defineComponent, extendComponent } from "./Component"
import * as t from "io-ts"
import { drawWireLineToComponent, drawRoundValue, COLOR_MOUSE_OVER, COLOR_COMPONENT_BORDER, dist, triangle, circle, colorForBoolean, INPUT_OUTPUT_DIAMETER, drawComponentName } from "../drawutils"
import { mode } from "../simulator"
import { emptyMod, mods, tooltipContent } from "../htmlgen"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"

export const LogicInputBaseDef =
    defineComponent(0, 1, t.type({
        name: typeOrUndefined(t.string),
    }, "LogicInputBase"))

export type LogicInputBaseRepr = typeof LogicInputBaseDef.reprType

export abstract class LogicInputBase<Repr extends LogicInputBaseRepr> extends ComponentBase<0, 1, Repr, TriState> {

    private _name: string | undefined = undefined

    protected constructor(initialValue: TriState, savedData: Repr | null) {
        super(initialValue, savedData, { outOffsets: [[+3, 0, "e"]] })
        if (isNotNull(savedData)) {
            this._name = savedData.name
        }
    }

    override toJSONBase() {
        return {
            ...super.toJSONBase(),
            name: this._name,
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
            if (isDefined(this._name)) {
                drawComponentName(g, ctx, this._name, this, false)
            }
            drawRoundValue(g, this.value, this)
        })
    }

    protected doSetName(name: string | undefined) {
        this._name = name
        this.setNeedsRedraw("name changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        return [
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
        ]
    }

}


export const LogicInputDef =
    extendComponent(LogicInputBaseDef, t.type({
        val: TriStateRepr,
        isPushButton: typeOrUndefined(t.boolean),
    }, "LogicInput"))

export type LogicInputRepr = typeof LogicInputDef.reprType

const LogicInputDefaults = {
    isPushButton: false,
}


export class LogicInput extends LogicInputBase<LogicInputRepr> {

    private _isPushButton = LogicInputDefaults.isPushButton

    public constructor(savedData: LogicInputRepr | null) {
        super(
            // initial value may be given by saved data
            isNotNull(savedData) ? toTriState(savedData.val) : false,
            savedData,
        )
        if (isNotNull(savedData)) {
            this._isPushButton = savedData.isPushButton ?? LogicInputDefaults.isPushButton
        }

    }

    toJSON() {
        return {
            ...super.toJSONBase(),
            val: toTriStateRepr(this.value),
            isPushButton: (this._isPushButton !== LogicInputDefaults.isPushButton) ? this._isPushButton : undefined,
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
        if (this._isPushButton) {
            // do nothing for normal push button
            return false
        }

        this.doSetValue((() => {
            switch (this.value) {
                case true: return (mode >= Mode.FULL && e.altKey) ? Unset : false
                case false: return (mode >= Mode.FULL && e.altKey) ? Unset : true
                case Unset: return mode >= Mode.FULL ? false : Unset
            }
        })())
        return true
    }

    override mouseDown(e: MouseEvent | TouchEvent): { lockMouseOver: boolean } {
        if (this._isPushButton) {
            this.doSetValue(true)
        }
        return super.mouseDown(e)
    }

    override mouseUp(e: MouseEvent | TouchEvent) {
        const result = super.mouseUp(e)
        if (this._isPushButton) {
            this.doSetValue(false)
        }
        return result
    }


    private doSetIsPushButton(isPushButton: boolean) {
        this._isPushButton = isPushButton
        if (isPushButton) {
            this.doSetValue(false)
        }
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const makeItemBehaveAs = (desc: string, value: boolean) => {
            const isCurrent = this._isPushButton === value
            const icon = isCurrent ? "check" : "none"
            const action = isCurrent ? () => undefined : () => this.doSetIsPushButton(value)
            return ContextMenuData.item(icon, desc, action)
        }

        const newItems: [ContextMenuItemPlacement, ContextMenuItem][] = [
            ["mid", makeItemBehaveAs("Commutateur", false)],
            ["mid", makeItemBehaveAs("Poussoir", true)],
            ["mid", ContextMenuData.sep()],
        ]

        const superItems = super.makeComponentSpecificContextMenuItems()
        if (isDefined(superItems)) {
            newItems.push(...superItems)
        }

        return newItems
    }


}
