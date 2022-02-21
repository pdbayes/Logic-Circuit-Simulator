import { FixedArrayFill, FixedReadonlyArray, isDefined, isNotNull, LogicValue as LogicValue, typeOrUndefined } from "../utils"
import { COLOR_BACKGROUND, COLOR_COMPONENT_BORDER, COLOR_COMPONENT_INNER_LABELS, COLOR_LED_ON, COLOR_MOUSE_OVER, COLOR_OFF_BACKGROUND, drawComponentName, drawLabel, drawWireLineToComponent, GRID_STEP } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { tooltipContent, mods, div, span, title, style } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import * as t from "io-ts"
import { ComponentBase, defineComponent } from "./Component"
import { LedColor, ledColorForLogicValue, LedColors } from "./OutputBar"


export const Output16SegDef =
    defineComponent(17, 0, t.type({
        type: t.literal("16seg"),
        color: typeOrUndefined(t.keyof(LedColors, "LedColor")),
        transparent: typeOrUndefined(t.boolean),
        name: typeOrUndefined(t.string),
    }, "Ouput16Seg"))

const enum INPUT {
    a1, a2, b, c, d2, d1, e, f, g1, g2, h, i, j, k, l, m, p
}

const Output16SegDefaults = {
    color: "green" as LedColor,
    transparent: true,
}

const GRID_WIDTH = 8
const GRID_HEIGHT = 10

export type Output16SegRepr = typeof Output16SegDef.reprType

export class Output16Seg extends ComponentBase<17, 0, Output16SegRepr, FixedReadonlyArray<LogicValue, 17>> {

    private _color = Output16SegDefaults.color
    private _transparent = Output16SegDefaults.transparent
    private _name: string | undefined = undefined

    public constructor(editor: LogicEditor, savedData: Output16SegRepr | null) {
        super(editor, FixedArrayFill(false, 17), savedData, {
            inOffsets: [
                [-5, -4, "w"],
                [-6, -3.5, "w"],
                [-5, -3, "w"],
                [-6, -2.5, "w"],
                [-5, -2, "w"],
                [-6, -1.5, "w"],
                [-5, -1, "w"],
                [-6, -0.5, "w"],
                [-5, 0, "w"],
                [-6, 0.5, "w"],
                [-5, +1, "w"],
                [-6, +1.5, "w"],
                [-5, +2, "w"],
                [-6, +2.5, "w"],
                [-5, +3, "w"],
                [-6, +3.5, "w"],
                [-5, +4, "w"],
            ],
        })
        if (isNotNull(savedData)) {
            this._color = savedData.color ?? Output16SegDefaults.color
            this._transparent = savedData.transparent ?? Output16SegDefaults.transparent
            this._name = savedData.name
        }
    }

    toJSON() {
        return {
            type: "16seg" as const,
            ...this.toJSONBase(),
            color: this._color === Output16SegDefaults.color ? undefined : this._color,
            transparent: this._transparent === Output16SegDefaults.transparent ? undefined : this._transparent,
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
            case INPUT.a1: return "a1"
            case INPUT.a2: return "a2"
            case INPUT.b: return "b"
            case INPUT.c: return "c"
            case INPUT.d2: return "d2"
            case INPUT.d1: return "d1"
            case INPUT.e: return "e"
            case INPUT.f: return "f"
            case INPUT.g1: return "g1"
            case INPUT.g2: return "g2"
            case INPUT.h: return "h"
            case INPUT.i: return "i"
            case INPUT.j: return "j"
            case INPUT.k: return "k"
            case INPUT.l: return "l"
            case INPUT.m: return "m"
            case INPUT.p: return "p"
        }
        return undefined
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods(
            div("Afficheur 16 segments")
        ))
    }

    protected doRecalcValue(): FixedReadonlyArray<LogicValue, 17> {
        return this.inputValues<17>([INPUT.a1, INPUT.a2, INPUT.b, INPUT.c, INPUT.d2, INPUT.d1, INPUT.e, INPUT.f, INPUT.g1, INPUT.g2, INPUT.h, INPUT.i, INPUT.j, INPUT.k, INPUT.l, INPUT.m, INPUT.p])
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

        const [a1, a2, b, c, d2, d1, e, f, g1, g2, h, i, j, k, l, m, p] = this.value

        const vMargin = 10
        const strokeHalfWidth = 3
        const drawLeft = left + 18
        const drawRight = right - 10
        const drawCenterX = (drawLeft + drawRight) / 2
        const drawTop = top + vMargin
        const drawBottom = bottom - vMargin

        const doFill = (v: LogicValue) => {
            if (!this._transparent || v !== false) {
                g.fillStyle = ledColorForLogicValue(v, this._color)
                g.fill()
            }
        }

        const drawH = (v: LogicValue, xLeft: number, xRight: number, y: number) => {
            g.beginPath()
            g.moveTo(xLeft, y)
            g.lineTo(xLeft + strokeHalfWidth, y - strokeHalfWidth)
            g.lineTo(xRight - strokeHalfWidth, y - strokeHalfWidth)
            g.lineTo(xRight, y)
            g.lineTo(xRight - strokeHalfWidth, y + strokeHalfWidth)
            g.lineTo(xLeft + strokeHalfWidth, y + strokeHalfWidth)
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

        const dx = strokeHalfWidth * 1.41
        const dy = strokeHalfWidth * 1.41

        const drawBackslash = (v: LogicValue, xLeft: number, yTop: number, xRight: number, yBottom: number) => {
            g.beginPath()
            g.moveTo(xLeft, yTop)
            g.lineTo(xLeft + dx, yTop)
            g.lineTo(xRight, yBottom - dy)
            g.lineTo(xRight, yBottom)
            g.lineTo(xRight - dx, yBottom)
            g.lineTo(xLeft, yTop + dy)
            g.closePath()
            g.stroke()
            doFill(v)
        }

        const drawSlash = (v: LogicValue, xLeft: number, yBottom: number, xRight: number, yTop: number) => {
            g.beginPath()
            g.moveTo(xLeft, yBottom)
            g.lineTo(xLeft, yBottom - dy)
            g.lineTo(xRight - dx, yTop)
            g.lineTo(xRight, yTop)
            g.lineTo(xRight, yTop + dy)
            g.lineTo(xLeft + dx, yBottom)
            g.closePath()
            g.stroke()
            doFill(v)
        }

        g.strokeStyle = COLOR_OFF_BACKGROUND
        g.lineWidth = 1
        drawH(a1, drawLeft + strokeHalfWidth, drawCenterX, drawTop + strokeHalfWidth)
        drawH(a2, drawCenterX, drawRight - strokeHalfWidth, drawTop + strokeHalfWidth)
        drawV(b, drawRight - strokeHalfWidth, drawTop + strokeHalfWidth, this.posY)
        drawV(c, drawRight - strokeHalfWidth, this.posY, drawBottom - strokeHalfWidth)
        drawH(d1, drawLeft + strokeHalfWidth, drawCenterX, drawBottom - strokeHalfWidth)
        drawH(d2, drawCenterX, drawRight - strokeHalfWidth, drawBottom - strokeHalfWidth)
        drawV(e, drawLeft + strokeHalfWidth, this.posY, drawBottom - strokeHalfWidth)
        drawV(f, drawLeft + strokeHalfWidth, drawTop + strokeHalfWidth, this.posY)
        drawH(g1, drawLeft + strokeHalfWidth, drawCenterX, this.posY)
        drawH(g2, drawCenterX, drawRight - strokeHalfWidth, this.posY)
        drawV(i, drawCenterX, drawTop + strokeHalfWidth, this.posY)
        drawV(l, drawCenterX, this.posY, drawBottom - strokeHalfWidth)
        const slashTop = drawTop + strokeHalfWidth + strokeHalfWidth
        const slashBottom = drawBottom - strokeHalfWidth - strokeHalfWidth
        drawBackslash(h, drawLeft + strokeHalfWidth + strokeHalfWidth, slashTop, drawCenterX - strokeHalfWidth, this.posY - strokeHalfWidth)
        drawSlash(j, drawCenterX + strokeHalfWidth, this.posY - strokeHalfWidth, drawRight - strokeHalfWidth - strokeHalfWidth, slashTop)
        drawSlash(k, drawLeft + strokeHalfWidth + strokeHalfWidth, slashBottom, drawCenterX - strokeHalfWidth, this.posY + strokeHalfWidth)
        drawBackslash(m, drawCenterX + strokeHalfWidth, this.posY + strokeHalfWidth, drawRight - strokeHalfWidth - strokeHalfWidth, slashBottom)

        g.beginPath()
        const radius = 1.3 * strokeHalfWidth
        g.arc(right - 8, bottom - 7 - radius / 2, radius, 0, 2 * Math.PI)
        g.stroke()
        doFill(p)

        ctx.inNonTransformedFrame(ctx => {
            g.fillStyle = COLOR_COMPONENT_INNER_LABELS
            g.font = "7px sans-serif"

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
            ["mid", ContextMenuData.submenu("tint", "Couleur", [
                makeItemUseColor("Vert", "green"),
                makeItemUseColor("Rouge", "red"),
                makeItemUseColor("Jaune", "yellow"), ContextMenuData.sep(),
                itemTransparent,

            ])],
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
        ]
    }

}
