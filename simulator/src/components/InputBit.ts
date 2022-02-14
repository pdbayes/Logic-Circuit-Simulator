import { isDefined, isNotNull, isUnset, Mode, toLogicState, toLogicStateRepr, LogicState, LogicStateRepr, Unset, typeOrUndefined, isUndefined, HighImpedance } from "../utils"
import { Component, ComponentBase, defineComponent, extendComponent } from "./Component"
import * as t from "io-ts"
import { drawWireLineToComponent, COLOR_MOUSE_OVER, COLOR_COMPONENT_BORDER, dist, triangle, circle, colorForBoolean, INPUT_OUTPUT_DIAMETER, drawComponentName, drawRoundValueCentered, GRID_STEP } from "../drawutils"
import { emptyMod, mods, tooltipContent } from "../htmlgen"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"
import { LogicEditor } from "../LogicEditor"
import { Node, NodeIn } from "./Node"

export const InputBitBaseDef =
    defineComponent(0, 1, t.type({
        name: typeOrUndefined(t.string),
    }, "InputBitBase"))

export type InputBitBaseRepr = typeof InputBitBaseDef.reprType

export abstract class InputBitBase<Repr extends InputBitBaseRepr> extends ComponentBase<0, 1, Repr, LogicState> {

    private _name: string | undefined = undefined

    protected constructor(editor: LogicEditor, initialValue: LogicState, savedData: Repr | null) {
        super(editor, initialValue, savedData, { outOffsets: [[+3, 0, "e"]] })
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
        return this.editor.mode >= Mode.TRYOUT && dist(x, y, this.posX, this.posY) < INPUT_OUTPUT_DIAMETER / 2
    }

    override get allowsForcedOutputs() {
        return false
    }

    protected override propagateValue(newValue: LogicState) {
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
            if (isDefined(this._name)) {
                drawComponentName(g, ctx, this._name, this, false)
            }
            drawRoundValueCentered(g, this.value, this)
        })
    }

    protected override autoConnected(newLinks: [Node, Component, Node][]) {
        if (newLinks.length !== 1) {
            return
        }
        const [outNode, comp, inNode] = newLinks[0]
        if (inNode instanceof NodeIn && this instanceof InputBit) {
            if (inNode._prefersSpike) {
                this.doSetIsPushButton(true)
            }
            if (isUndefined(this._name)) {
                const name = comp.getInputNodeName(inNode)
                if (isDefined(name)) {
                    this.doSetName(name)
                }
            }
        }
        if (outNode.orient !== "e") {
            return
        }
        switch (Orientation.add(comp.orient, inNode.orient)) {
            case "w":
                // nothing to do
                return
            case "e":
                this.doSetOrient("w")
                this.setPosition(this.posX + GRID_STEP * 6, this.posY)
                return
            case "s":
                this.doSetOrient("n")
                this.setPosition(this.posX + GRID_STEP * 3, this.posY + GRID_STEP * 3)
                return
            case "n":
                this.doSetOrient("s")
                this.setPosition(this.posX + GRID_STEP * 3, this.posY - GRID_STEP * 3)
                return
        }
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


export const InputBitDef =
    extendComponent(InputBitBaseDef, t.type({
        val: LogicStateRepr,
        isPushButton: typeOrUndefined(t.boolean),
    }, "InputBit"))

export type InputBitRepr = typeof InputBitDef.reprType

const InputBitDefaults = {
    isPushButton: false,
}


export class InputBit extends InputBitBase<InputBitRepr> {

    static nextValue(value: LogicState, mode: Mode, altKey: boolean): LogicState {
        switch (value) {
            case true: return (mode >= Mode.FULL && altKey) ? Unset : false
            case false: return (mode >= Mode.FULL && altKey) ? Unset : true
            case Unset: return mode >= Mode.FULL ? (altKey ? HighImpedance : false) : Unset
            case HighImpedance: return mode >= Mode.FULL ? (altKey ? Unset : false) : HighImpedance
        }
    }

    private _isPushButton = InputBitDefaults.isPushButton

    public constructor(editor: LogicEditor, savedData: InputBitRepr | null) {
        super(
            editor,
            // initial value may be given by saved data
            isNotNull(savedData) ? toLogicState(savedData.val) : false,
            savedData,
        )
        if (isNotNull(savedData)) {
            this._isPushButton = savedData.isPushButton ?? InputBitDefaults.isPushButton
        }

    }

    toJSON() {
        return {
            ...super.toJSONBase(),
            val: toLogicStateRepr(this.value),
            isPushButton: (this._isPushButton !== InputBitDefaults.isPushButton) ? this._isPushButton : undefined,
        }
    }

    public get componentType() {
        return "in" as const
    }

    override get cursorWhenMouseover() {
        return "pointer"
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods("Entrée", isUnset(this.value) ? " dont la valeur n’est pas déterminée" : emptyMod))
    }

    protected doRecalcValue(): LogicState {
        // this never changes on its own, just upon user interaction
        return this.value
    }

    override mouseClicked(e: MouseEvent | TouchEvent) {
        if (this._isPushButton) {
            // do nothing for normal push button
            return false
        }

        console.log("bl")

        this.doSetValue(InputBit.nextValue(this.value, this.editor.mode, e.altKey))
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


    public doSetIsPushButton(isPushButton: boolean) {
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
