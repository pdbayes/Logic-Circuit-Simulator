import { FixedArrayFill, FixedReadonlyArray, isDefined, isNotNull, LogicValue as LogicValue, typeOrUndefined } from "../utils"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_LED_ON, COLOR_MOUSE_OVER, COLOR_OFF_BACKGROUND, drawComponentName, drawLabel, drawWireLineToComponent, GRID_STEP } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div, span, title, style } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import * as t from "io-ts"
import { ComponentBase, defineComponent } from "./Component"
import { LedColor, ledColorForLogicValue, LedColors } from "./OutputBar"


export const Output7SegDef =
    defineComponent(8, 0, t.type({
        type: t.literal("7seg"),
        color: typeOrUndefined(t.keyof(LedColors, "LedColor")),
        transparent: typeOrUndefined(t.boolean),
        name: typeOrUndefined(t.string),
    }, "Ouput7Seg"))

const enum INPUT {
    a, b, c, d, e, f, g, p
}

const Output7SegDefaults = {
    color: "green" as LedColor,
    transparent: true,
}

const GRID_WIDTH = 8
const GRID_HEIGHT = 10

export type Output7SegRepr = typeof Output7SegDef.reprType

export class Output7Seg extends ComponentBase<8, 0, Output7SegRepr, FixedReadonlyArray<LogicValue, 8>> {

    private _color = Output7SegDefaults.color
    private _transparent = Output7SegDefaults.transparent
    private _name: string | undefined = undefined

    public constructor(editor: LogicEditor, savedData: Output7SegRepr | null) {
        super(editor, FixedArrayFill(false, 8), savedData, {
            inOffsets: [
                [-5, -4, "w"], [-5, -3, "w"], [-5, -2, "w"], [-5, -1, "w"],
                [-5, 0, "w"], [-5, +1, "w"], [-5, +2, "w"], [-5, +4, "w"],
            ],
        })
        if (isNotNull(savedData)) {
            this._color = savedData.color ?? Output7SegDefaults.color
            this._transparent = savedData.transparent ?? Output7SegDefaults.transparent
            this._name = savedData.name
        }
    }

    toJSON() {
        return {
            type: "7seg" as const,
            ...this.toJSONBase(),
            color: this._color === Output7SegDefaults.color ? undefined : this._color,
            transparent: this._transparent === Output7SegDefaults.transparent ? undefined : this._transparent,
            name: this._name,
        }
    }

    public get componentType() {
        return "out" as const
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP
    }

    get unrotatedHeight() {
        return GRID_HEIGHT * GRID_STEP
    }

    override getInputName(i: number): string | undefined {
        switch (i) {
            case INPUT.a: return "a"
            case INPUT.b: return "b"
            case INPUT.c: return "c"
            case INPUT.d: return "d"
            case INPUT.e: return "e"
            case INPUT.f: return "f"
            case INPUT.g: return "g"
            case INPUT.p: return "p"
        }
        return undefined
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods(
            div("Afficheur 7 segments")
        ))
    }

    protected doRecalcValue(): FixedReadonlyArray<LogicValue, 8> {
        return this.inputValues<8>([INPUT.a, INPUT.b, INPUT.c, INPUT.d, INPUT.e, INPUT.f, INPUT.g, INPUT.p])
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {

        const width = GRID_WIDTH * GRID_STEP
        const height = GRID_HEIGHT * GRID_STEP
        const left = this.posX - width / 2
        const right = left + width
        const top = this.posY - height / 2
        const bottom = top + height

        g.fillStyle = COLOR_BACKGROUND
        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 4

        g.beginPath()
        g.rect(this.posX - width / 2, this.posY - height / 2, width, height)
        g.fill()
        g.stroke()

        for (const input of this.inputs) {
            drawWireLineToComponent(g, input, this.posX - width / 2 - 2, input.posYInParentTransform)
        }

        const [a, b, c, d, e, f, gg, p] = this.value

        const hMargin = 20
        const vMargin = 10
        const strokeHalfWidth = 4
        const drawLeft = left + hMargin
        const drawRight = right - hMargin
        const drawTop = top + vMargin
        const drawBottom = bottom - vMargin

        const doFill = (v: LogicValue) => {
            if (!this._transparent || v !== false) {
                g.fillStyle = ledColorForLogicValue(v, this._color)
                g.fill()
            }
        }

        const drawH = (v: LogicValue, y: number) => {
            g.beginPath()
            g.moveTo(drawLeft + strokeHalfWidth, y)
            g.lineTo(drawLeft + strokeHalfWidth + strokeHalfWidth, y - strokeHalfWidth)
            g.lineTo(drawRight - strokeHalfWidth - strokeHalfWidth, y - strokeHalfWidth)
            g.lineTo(drawRight - strokeHalfWidth, y)
            g.lineTo(drawRight - strokeHalfWidth - strokeHalfWidth, y + strokeHalfWidth)
            g.lineTo(drawLeft + strokeHalfWidth + strokeHalfWidth, y + strokeHalfWidth)
            g.closePath()
            g.stroke()
            doFill(v)
        }

        const drawV = (v: LogicValue, x: number, yTop: number, yBottom: number) => {
            g.beginPath()
            g.moveTo(x, yTop)
            g.lineTo(x + strokeHalfWidth, yTop + strokeHalfWidth)
            g.lineTo(x + strokeHalfWidth, yBottom - strokeHalfWidth)
            g.lineTo(x, yBottom)
            g.lineTo(x - strokeHalfWidth, yBottom - strokeHalfWidth)
            g.lineTo(x - strokeHalfWidth, yTop + strokeHalfWidth)
            g.closePath()
            g.stroke()
            doFill(v)
        }

        g.strokeStyle = COLOR_OFF_BACKGROUND
        g.lineWidth = 1
        drawH(a, drawTop + strokeHalfWidth)
        drawV(b, drawRight - strokeHalfWidth, drawTop + strokeHalfWidth, this.posY)
        drawV(c, drawRight - strokeHalfWidth, this.posY, drawBottom - strokeHalfWidth)
        drawH(d, drawBottom - strokeHalfWidth)
        drawV(e, drawLeft + strokeHalfWidth, this.posY, drawBottom - strokeHalfWidth)
        drawV(f, drawLeft + strokeHalfWidth, drawTop + strokeHalfWidth, this.posY)
        drawH(gg, this.posY)

        g.beginPath()
        const radius = 1.3 * strokeHalfWidth
        g.arc(right - hMargin / 2, bottom - vMargin - radius / 2, radius, 0, 2 * Math.PI)
        g.stroke()
        doFill(p)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "12px sans-serif"

            this.inputs.forEach((input, i) => {
                drawLabel(ctx, this.orient, this.getInputName(i)!, "w", left, input)
            })

            if (isDefined(this._name)) {
                drawComponentName(g, ctx, this._name, this, true)
            }
        })
    }

    private doSetName(name: string | undefined) {
        this._name = name
        this.setNeedsRedraw("name changed")
    }

    private doSetColor(color: LedColor) {
        this._color = color
        this.setNeedsRedraw("color changed")
    }

    private doSetTransparent(transparent: boolean) {
        this._transparent = transparent
        this.setNeedsRedraw("transparent changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        // TODO merge with OutputBar
        const makeItemUseColor = (desc: string, color: LedColor) => {
            const isCurrent = this._color === color
            const icon = isCurrent ? "check" : "none"
            const action = isCurrent ? () => undefined : () => this.doSetColor(color)
            const cssColor = COLOR_LED_ON[color]
            return ContextMenuData.item(icon, span(title(desc), style(`display: inline-block; width: 140px; height: 16px; background-color: ${cssColor}; margin-right: 8px`)), action)
        }

        const itemTransparent = ContextMenuData.item(
            this._transparent ? "check" : "none",
            "Transparent si éteint",
            () => this.doSetTransparent(!this._transparent)
        )

        return [
            ["mid", ContextMenuData.submenu("palette", "Couleur", [
                makeItemUseColor("Vert", "green"),
                makeItemUseColor("Rouge", "red"),
                makeItemUseColor("Jaune", "yellow"), ContextMenuData.sep(),
                itemTransparent,

            ])],
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
        ]
    }


    override keyDown(e: KeyboardEvent): void {
        if (e.key === "Enter") {
            this.runSetNameDialog(this._name, this.doSetName.bind(this))
        }
    }

}
