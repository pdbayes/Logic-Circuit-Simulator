import { isDefined, isNotNull, isUndefined, typeOrUndefined } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { ColorString, COLOR_MOUSE_OVER, COLOR_RECTANGLE_BACKGROUND, COLOR_RECTANGLE_BORDER, COLOR_WIRE, GRID_STEP } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { LogicEditor } from "../LogicEditor"
import { DrawZIndex } from "../ComponentList"
import { span, style, title } from "../htmlgen"

export const RectangleColor = {
    grey: "grey",
    red: "red",
    blue: "blue",
    yellow: "yellow",
    green: "green",
    turquoise: "turquoise",
} as const

export type RectangleColor = keyof typeof RectangleColor



export const LabelRectDef =
    defineComponent(0, 0, t.type({
        type: t.literal("rect"),
        w: t.number,
        h: t.number,
        color: typeOrUndefined(t.keyof(RectangleColor)),
        strokeWidth: typeOrUndefined(t.number),
        noFill: typeOrUndefined(t.boolean),
        rounded: typeOrUndefined(t.boolean),
    }, "Rectangle"))

export type LabelRectRepr = typeof LabelRectDef.reprType

const LabelRectDefaults = {
    width: 10 * GRID_STEP,
    height: 10 * GRID_STEP,
    color: RectangleColor.yellow,
    strokeWidth: 2,
    noFill: false,
    rounded: false,
}

export class LabelRect extends ComponentBase<0, 0, LabelRectRepr, undefined> {

    private _w: number
    private _h: number
    private _color: RectangleColor
    private _strokeWidth: number
    private _noFill: boolean
    private _rounded: boolean

    public constructor(editor: LogicEditor, savedData: LabelRectRepr | null) {
        super(editor, undefined, savedData, {})
        if (isNotNull(savedData)) {
            this._w = savedData.w
            this._h = savedData.h
            this._color = savedData.color ?? LabelRectDefaults.color
            this._strokeWidth = savedData.strokeWidth ?? LabelRectDefaults.strokeWidth
            this._noFill = savedData.noFill ?? LabelRectDefaults.noFill
            this._rounded = savedData.rounded ?? LabelRectDefaults.rounded
        } else {
            this._w = LabelRectDefaults.width
            this._h = LabelRectDefaults.height
            this._color = LabelRectDefaults.color
            this._strokeWidth = LabelRectDefaults.strokeWidth
            this._noFill = LabelRectDefaults.noFill
            this._rounded = LabelRectDefaults.rounded
        }
    }

    toJSON() {
        return {
            type: "rect" as const,
            ...this.toJSONBase(),
            w: this._w,
            h: this._h,
            color: this._color,
            strokeWidth: this._strokeWidth,
            noFill: this._noFill === LabelRectDefaults.noFill ? undefined : this._noFill,
            rounded: this._rounded === LabelRectDefaults.rounded ? undefined : this._rounded,
        }
    }

    public get componentType() {
        return "label" as const
    }

    get unrotatedWidth() {
        return this._w
    }

    get unrotatedHeight() {
        return this._h
    }

    protected doRecalcValue(): undefined {
        return undefined
    }

    public override get drawZIndex(): DrawZIndex {
        return 0
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const width = this._w
        const height = this._h
        const left = this.posX - width / 2
        const top = this.posY - height / 2

        g.beginPath()
        if (this._rounded) {
            const r = 3 * this._strokeWidth
            g.moveTo(left + r, top)
            g.lineTo(left + width - r, top)
            g.quadraticCurveTo(left + width, top, left + width, top + r)
            g.lineTo(left + width, top + height - r)
            g.quadraticCurveTo(left + width, top + height, left + width - r, top + height)
            g.lineTo(left + r, top + height)
            g.quadraticCurveTo(left, top + height, left, top + height - r)
            g.lineTo(left, top + r)
            g.quadraticCurveTo(left, top, left + r, top)
        } else {
            g.rect(left, top, width, height)
        }
        g.closePath()

        if (!this._noFill) {
            g.fillStyle = COLOR_RECTANGLE_BACKGROUND[this._color]
            g.fill()
        }

        if (ctx.isMouseOver) {
            g.lineWidth = Math.max(3, this._strokeWidth)
            g.strokeStyle = COLOR_MOUSE_OVER
            g.stroke()
        } else if (this._strokeWidth > 0) {
            g.lineWidth = this._strokeWidth
            g.strokeStyle = COLOR_RECTANGLE_BORDER[this._color]
            g.stroke()
        }
    }

    private doSetColor(color: RectangleColor) {
        this._color = color
        this.setNeedsRedraw("color changed")
    }

    private doSetStrokeWidth(strokeWidth: number) {
        this._strokeWidth = strokeWidth
        this.setNeedsRedraw("stroke width changed")
    }

    private makeCurrentSizeString() {
        return `${this._w} × ${this._h}`
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        const currentSizeStr = this.makeCurrentSizeString()
        const setSizeItem = ContextMenuData.item("dimensions", `Taille (${currentSizeStr})…`, () => this.runSetSizeDialog(currentSizeStr))

        const makeSetStrokeWidthItem = (strokeWidth: number, desc: string) => {
            const isCurrent = this._strokeWidth === strokeWidth
            const icon = isCurrent ? "check" : "none"
            return ContextMenuData.item(icon, desc, () => this.doSetStrokeWidth(strokeWidth))
        }

        const makeItemUseColor = (desc: string, color: RectangleColor) => {
            const isCurrent = this._color === color
            const icon = isCurrent ? "check" : "none"
            const action = isCurrent ? () => undefined : () => this.doSetColor(color)
            if (isDefined(color)) {
                const fillColorProp = this._noFill ? "" : `background-color: ${COLOR_RECTANGLE_BACKGROUND[color]}; `
                const roundedProp = !this._rounded ? "" : "border-radius: 4px; "
                const borderColor = COLOR_RECTANGLE_BORDER[color]
                return ContextMenuData.item(icon, span(title(desc), style(`display: inline-block; width: 140px; height: 18px; ${fillColorProp}${roundedProp}margin-right: 8px; border: 2px solid ${borderColor}`)), action)
            } else {
                return ContextMenuData.item(icon, desc, action)
            }
        }

        const toggleRoundedItem = ContextMenuData.item(this._rounded ? "check" : "none", "Arrondi", () => {
            this._rounded = !this._rounded
            this.setNeedsRedraw("rounded changed")
        })

        const toggleNoFillItem = ContextMenuData.item(!this._noFill ? "check" : "none", "Avec couleur de fond", () => {
            this._noFill = !this._noFill
            this.setNeedsRedraw("nofill changed")
        })

        return [
            ["mid", setSizeItem],
            ["mid", ContextMenuData.submenu("palette", "Couleur", [
                toggleNoFillItem,
                ContextMenuData.sep(),
                makeItemUseColor("Jaune", RectangleColor.yellow),
                makeItemUseColor("Rouge", RectangleColor.red),
                makeItemUseColor("Vert", RectangleColor.green),
                makeItemUseColor("Bleu", RectangleColor.blue),
                makeItemUseColor("Bleu", RectangleColor.turquoise),
                makeItemUseColor("Bleu", RectangleColor.grey),
            ])],
            ["mid", ContextMenuData.submenu("strokewidth", "Bordure", [
                makeSetStrokeWidthItem(0, "Aucune bordure"),
                ContextMenuData.sep(),
                makeSetStrokeWidthItem(1, "Fine (1 pixel)"),
                makeSetStrokeWidthItem(2, "Moyenne (2 pixels)"),
                makeSetStrokeWidthItem(3, "Épaisse (3 pixels)"),
                makeSetStrokeWidthItem(5, "Très épaisse (5 pixels)"),
                makeSetStrokeWidthItem(10, "Énorme (10 pixels)"),
            ])],
            ["mid", toggleRoundedItem],
        ]
    }

    private runSetSizeDialog(currentSizeStr: string) {
        const promptReturnValue = window.prompt(`Entrez la taille de ce rectangle:`, currentSizeStr)
        if (promptReturnValue !== null) {
            let match
            if ((match = /^(?<w>\d*)(?:(?:\s+|(?: *[×x,;] *))(?<h>\d*))?$/.exec(promptReturnValue)) !== null) {
                const parse = (s: string | undefined, dflt: number) => {
                    if (isUndefined(s)) {
                        return dflt
                    }
                    const n = parseInt(s)
                    if (isNaN(n) || n <= 0) {
                        return dflt
                    }
                    return n
                }
                this._w = parse(match.groups?.w, this._w)
                this._h = parse(match.groups?.h, this._h)
                this.setNeedsRedraw("size changed")
            }
        }
    }

    override mouseDoubleClicked(__e: MouseEvent | TouchEvent): boolean {
        // TODO: implement dragging for resizing the rectangle
        // don't call super, which would rotate the rectangle, this is useless here
        this.runSetSizeDialog(this.makeCurrentSizeString())
        return true
    }

}
