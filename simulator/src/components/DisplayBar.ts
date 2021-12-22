import { isNotNull, isUnset, TriState, typeOrUndefined, Unset } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_UNSET, drawWireLineToComponent, COLOR_MOUSE_OVER, GRID_STEP, pxToGrid, COLOR_COMPONENT_BORDER, COLOR_WIRE_BORDER, COLOR_LED_ON } from "../drawutils"
import { asValue, Modifier, mods, span, style, title, tooltipContent } from "../htmlgen"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { LogicEditor } from "../LogicEditor"


export const DisplayBarTypes = {
    v: null,
    h: null,
    px: null,
    PX: null,
} as const

type DisplayBarType = keyof typeof DisplayBarTypes


export const LedColors = {
    green: null,
    red: null,
    yellow: null,
} as const

type LedColor = keyof typeof LedColors


const DisplayBarDefaults = {
    display: "h" as DisplayBarType,
    color: "green" as LedColor,
    transparent: false,
}
const GRID_WIDTH = 10
const GRID_HEIGHT = 2


export const DisplayBarDef =
    defineComponent(1, 0, t.type({
        type: t.literal("bar"),
        display: t.keyof(DisplayBarTypes, "DisplayBarType"),
        color: typeOrUndefined(t.keyof(LedColors, "LedColor")),
        transparent: typeOrUndefined(t.boolean),
    }, "DisplayBar"))

type DisplayBarRepr = typeof DisplayBarDef.reprType

export class DisplayBar extends ComponentBase<1, 0, DisplayBarRepr, TriState> {

    private _display = DisplayBarDefaults.display
    private _color = DisplayBarDefaults.color
    private _transparent = DisplayBarDefaults.transparent

    public constructor(editor: LogicEditor, savedData: DisplayBarRepr | null) {
        super(editor, false, savedData, { inOffsets: [[0, 0, "w"]] })
        if (isNotNull(savedData)) {
            this.doSetDisplay(savedData.display)
            this._color = savedData.color ?? DisplayBarDefaults.color
            this._transparent = savedData.transparent ?? DisplayBarDefaults.transparent
        } else {
            this.updateInputOffsetX()
        }
    }

    toJSON() {
        return {
            type: "bar" as const,
            ...super.toJSONBase(),
            display: this._display,
            color: this._color === DisplayBarDefaults.color ? undefined : this._color,
            transparent: this._transparent === DisplayBarDefaults.transparent ? undefined : this._transparent,
        }
    }

    public get componentType() {
        return "out" as const
    }

    get unrotatedWidth() {
        return this.getWidthAndHeight()[0]
    }

    get unrotatedHeight() {
        return this.getWidthAndHeight()[1]
    }

    public override makeTooltip() {
        const expl: Modifier = (() => {
            switch (this.value) {
                case Unset: return "Son état est indéterminé car son entrée n’est pas connue."
                case true: return mods("Il est actuellement allumé car son entrée est de ", asValue(this.value), ".")
                case false: return mods("Il est actuellement éteint car son entrée est de ", asValue(this.value), ".")
            }
        })()
        return tooltipContent("Afficheur lumineux", expl)
    }

    public get display() {
        return this._display
    }

    protected doRecalcValue(): TriState {
        return this.inputs[0].value
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const input = this.inputs[0]
        const value = this.value

        g.strokeStyle = ctx.isMouseOver ? COLOR_MOUSE_OVER : COLOR_COMPONENT_BORDER
        g.lineWidth = 4

        const backColor = isUnset(value) ? COLOR_UNSET : (value) ? COLOR_LED_ON[this._color] : COLOR_WIRE_BORDER
        g.fillStyle = backColor
        const [w, h] = this.getWidthAndHeight()
        g.beginPath()
        g.rect(this.posX - w / 2, this.posY - h / 2, w, h)
        g.closePath()
        if (!this._transparent || value !== false) {
            g.fill()
        }
        g.stroke()

        drawWireLineToComponent(g, input, this.posX - w / 2 - 2, this.posY)
    }

    getWidthAndHeight() {
        switch (this._display) {
            case "h":
                return [GRID_WIDTH * GRID_STEP, GRID_HEIGHT * GRID_STEP] as const
            case "v":
                return [GRID_HEIGHT * GRID_STEP, GRID_WIDTH * GRID_STEP] as const
            case "px":
                return [GRID_HEIGHT * GRID_STEP, GRID_HEIGHT * GRID_STEP] as const
            case "PX":
                return [GRID_WIDTH * GRID_STEP, GRID_WIDTH * GRID_STEP] as const
        }
    }

    override mouseDoubleClicked(e: MouseEvent | TouchEvent) {
        if (super.mouseDoubleClicked(e)) {
            return true // already handled
        }
        this.doSetDisplay((() => {
            switch (this.display) {
                case "h":
                    return "v"
                case "v":
                    return "px"
                case "px":
                    return "PX"
                case "PX":
                    return "h"
            }
        })())
        return true
    }

    private doSetDisplay(newDisplay: DisplayBarType) {
        this._display = newDisplay
        this.updateInputOffsetX()
        this.setNeedsRedraw("display mode changed")
    }

    private doSetColor(color: LedColor) {
        this._color = color
        this.setNeedsRedraw("color changed")
    }

    private doSetTransparent(transparent: boolean) {
        this._transparent = transparent
        this.setNeedsRedraw("transparent changed")
    }

    private updateInputOffsetX() {
        const width = this.getWidthAndHeight()[0]
        this.inputs[0].gridOffsetX = -pxToGrid(width / 2) - 2
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const makeItemShowAs = (desc: string, display: DisplayBarType) => {
            const isCurrent = this._display === display
            const icon = isCurrent ? "check" : "none"
            const action = isCurrent ? () => undefined : () => this.doSetDisplay(display)
            return ContextMenuData.item(icon, desc, action)
        }

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
            ["mid", ContextMenuData.submenu("eye", "Affichage", [
                makeItemShowAs("Barre verticale", "v"),
                makeItemShowAs("Barre horizontale", "h"),
                makeItemShowAs("Petit carré", "px"),
                makeItemShowAs("Gros carré", "PX"),
                ContextMenuData.sep(),
                ContextMenuData.text("Changez l’affichage avec un double-clic sur le composant"),
            ])],
            ["mid", ContextMenuData.submenu("tint", "Couleur", [
                makeItemUseColor("Vert", "green"),
                makeItemUseColor("Rouge", "red"),
                makeItemUseColor("Jaune", "yellow"),
                ContextMenuData.sep(),
                itemTransparent,
            ])],
        ]
    }

}
