import { isDefined, isNotNull, isUndefined, isUnknown, Mode, LogicValue as LogicValue, typeOrUndefined } from "../utils"
import { Component, ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { drawWireLineToComponent, COLOR_MOUSE_OVER, COLOR_COMPONENT_BORDER, dist, triangle, circle, colorForBoolean, INPUT_OUTPUT_DIAMETER, drawComponentName, drawRoundValueCentered, GRID_STEP } from "../drawutils"
import { emptyMod, mods, tooltipContent } from "../htmlgen"
import { ContextMenuItem, ContextMenuItemPlacement, DrawContext, Orientation } from "./Drawable"
import { LogicEditor } from "../LogicEditor"
import { Node, NodeOut } from "./Node"

export const OutputBitDef =
    defineComponent(1, 0, t.type({
        name: typeOrUndefined(t.string),
    }, "OutputBit"))

type OutputBitRepr = typeof OutputBitDef.reprType

export class OutputBit extends ComponentBase<1, 0, OutputBitRepr, LogicValue> {

    private _name: string | undefined = undefined

    public constructor(editor: LogicEditor, savedData: OutputBitRepr | null) {
        super(editor, false, savedData, { inOffsets: [[-3, 0, "w"]] })
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
        return tooltipContent(undefined, mods("Sortie", isUnknown(this.value) ? " dont la valeur n’est pas déterminée" : emptyMod))
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

        g.fillStyle = colorForBoolean(this.value)
        g.lineWidth = 4
        g.beginPath()
        circle(g, this.posX, this.posY, INPUT_OUTPUT_DIAMETER)
        g.fill()
        g.stroke()

        ctx.inNonTransformedFrame(ctx => {
            if (isDefined(this._name)) {
                drawComponentName(g, ctx, this._name, this, true)
            }
            drawRoundValueCentered(g, this.value, this)
        })
    }

    protected override autoConnected(newLinks: [Node, Component, Node][]) {
        if (newLinks.length !== 1) {
            return
        }
        const [inNode, comp, outNode] = newLinks[0]
        if (outNode instanceof NodeOut) {
            if (isUndefined(this._name)) {
                const name = comp.getOutputNodeName(outNode)
                if (isDefined(name)) {
                    this.doSetName(name)
                }
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

    private doSetName(name: string | undefined) {
        this._name = name
        this.setNeedsRedraw("name changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        return [
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
        ]
    }

}
