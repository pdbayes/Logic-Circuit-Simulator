import * as t from "io-ts"
import { circle, colorForBoolean, COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, dist, drawComponentName, drawRoundValueCentered, drawWireLineToComponent, GRID_STEP, INPUT_OUTPUT_DIAMETER, triangle } from "../drawutils"
import { emptyMod, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { isDefined, isNotNull, isUndefined, isUnknown, LogicValue, Mode, toLogicValueRepr, Unknown } from "../utils"
import { Component, ComponentBase, ComponentName, ComponentNameRepr, defineComponent } from "./Component"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"
import { Node, NodeOut } from "./Node"

export const OutputBitDef =
    defineComponent(1, 0, t.type({
        name: ComponentNameRepr,
    }, "OutputBit"))

type OutputBitRepr = typeof OutputBitDef.reprType

export class OutputBit extends ComponentBase<1, 0, OutputBitRepr, LogicValue> {

    private _name: ComponentName = undefined

    public constructor(editor: LogicEditor, savedData: OutputBitRepr | null) {
        super(editor, false, savedData, { ins: [[undefined, -3, 0, "w"]] })
        if (isNotNull(savedData)) {
            this._name = savedData.name
        }
    }

    toJSON() {
        return {
            ...this.toJSONBase(),
            name: this._name,
        }
    }

    public get componentType() {
        return "out" as const
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
        return this.editor.mode >= Mode.CONNECT && dist(x, y, this.posX, this.posY) < INPUT_OUTPUT_DIAMETER / 2
    }

    public override makeTooltip() {
        const s = S.Components.OutputBit.tooltip
        return tooltipContent(undefined, mods(s.title, isUnknown(this.value) ? " " + s.WhoseValueIsUndefined : emptyMod))
    }

    protected doRecalcValue(): LogicValue {
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

        const valueToShow = this.editor.options.hideOutputColors ? Unknown : this.value
        g.fillStyle = colorForBoolean(valueToShow)
        g.lineWidth = 4
        g.beginPath()
        circle(g, this.posX, this.posY, INPUT_OUTPUT_DIAMETER)
        g.fill()
        g.stroke()

        ctx.inNonTransformedFrame(ctx => {
            if (isDefined(this._name)) {
                drawComponentName(g, ctx, this._name, toLogicValueRepr(valueToShow), this, true)
            }
            drawRoundValueCentered(g, valueToShow, this)
        })
    }

    protected override autoConnected(newLinks: [Node, Component, Node][]) {
        if (newLinks.length !== 1) {
            return
        }

        const [inNode, comp, outNode] = newLinks[0]
        if (outNode instanceof NodeOut) {
            if (isUndefined(this._name) && isDefined(outNode.name)) {
                this.doSetName(outNode.name)
            }
        }

        if (outNode.orient !== "w") {
            return
        }
        switch (Orientation.add(comp.orient, inNode.orient)) {
            case "e":
                // nothing to do
                return
            case "w":
                this.doSetOrient("w")
                this.setPosition(this.posX - GRID_STEP * 6, this.posY)
                return
            case "s":
                this.doSetOrient("s")
                this.setPosition(this.posX - GRID_STEP * 3, this.posY + GRID_STEP * 3)
                return
            case "n":
                this.doSetOrient("n")
                this.setPosition(this.posX - GRID_STEP * 3, this.posY - GRID_STEP * 3)
                return
        }
    }

    private doSetName(name: ComponentName) {
        this._name = name
        this.setNeedsRedraw("name changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        return [
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
        ]
    }


    override keyDown(e: KeyboardEvent): void {
        if (e.key === "Enter") {
            this.runSetNameDialog(this._name, this.doSetName.bind(this))
        }
    }

}
