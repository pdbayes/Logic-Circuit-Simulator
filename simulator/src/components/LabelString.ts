import { isNotNull, typeOrUndefined } from "../utils"
import { ComponentBase, defineComponent } from "./Component"
import * as t from "io-ts"
import { COLOR_COMPONENT_BORDER, COLOR_MOUSE_OVER, GRID_STEP } from "../drawutils"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawContext } from "./Drawable"
import { LogicEditor } from "../LogicEditor"
import { DrawZIndex } from "../ComponentList"

export const LabelStringDef =
    defineComponent(0, 0, t.type({
        text: t.string,
        // align: typeOrUndefined(t.string), 
        font: typeOrUndefined(t.string),
    }, "Label"))

export type LabelStringRepr = typeof LabelStringDef.reprType

const LabelStringDefaults = {
    text: "Label",
    // align: "center" as const,
    font: "18px sans-serif",
}
export class LabelString extends ComponentBase<0, 0, LabelStringRepr, undefined> {

    private _text: string
    // private _align: CanvasTextAlign // causes issues with mouseovers and stuff
    private _font: string

    public constructor(editor: LogicEditor, savedData: LabelStringRepr | null) {
        super(editor, undefined, savedData, {})
        if (isNotNull(savedData)) {
            this._text = savedData.text
            // this._align = (savedData.align as CanvasTextAlign) ?? LabelStringDefaults.align
            this._font = savedData.font ?? LabelStringDefaults.font
        } else {
            this._text = LabelStringDefaults.text
            // this._align = LabelStringDefaults.align
            this._font = LabelStringDefaults.font
        }
    }

    toJSON() {
        return {
            ...this.toJSONBase(),
            text: this._text,
            // align: this._align === LabelStringDefaults.align ? undefined : this._align,
            font: this._font === LabelStringDefaults.font ? undefined : this._font,
        }
    }

    public get componentType() {
        return "label" as const
    }

    get unrotatedWidth() {
        return GRID_STEP * this._text.length
    }

    get unrotatedHeight() {
        return 2 * GRID_STEP
    }

    protected doRecalcValue(): undefined {
        return undefined
    }

    public override get drawZIndex(): DrawZIndex {
        return 2
    }

    doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        g.lineWidth = 3
        if (ctx.isMouseOver) {
            const width = this.unrotatedWidth
            const height = this.unrotatedHeight
            g.strokeStyle = COLOR_MOUSE_OVER
            g.beginPath()
            g.rect(this.posX - width / 2, this.posY - height / 2, width, height)
            g.stroke()
        }

        g.fillStyle = COLOR_COMPONENT_BORDER
        g.font = this._font
        g.textAlign = "center"
        g.textBaseline = "middle"
        g.fillText(this._text, this.posX, this.posY)
    }


    private doSetText(text: string) {
        this._text = text
        this.setNeedsRedraw("text changed")
    }

    private doSetFont(font: string) {
        this._font = font
        this.setNeedsRedraw("font changed")
    }

    protected override makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {

        const setFontItem = ContextMenuData.item("font", "Police…", () => {
            const promptReturnValue = window.prompt(`Entrez une spécification de police ou laissez vide pour la valeur par défaut (${LabelStringDefaults.font}):`, this._font === LabelStringDefaults.font ? "" : this._font)
            if (promptReturnValue !== null) {
                const newFont = promptReturnValue.length === 0 ? LabelStringDefaults.font : promptReturnValue
                this.doSetFont(newFont)
            }
        })

        const setTextItem = ContextMenuData.item("pen", "Changer le texte…", this.runSetTextDialog.bind(this))

        return [
            ["mid", setTextItem],
            ["mid", setFontItem],
        ]
    }

    private runSetTextDialog() {
        const promptReturnValue = window.prompt("Choisissez le texte à afficher:", this._text)
        if (promptReturnValue !== null) {
            // OK button pressed
            const newText = promptReturnValue.length === 0 ? LabelStringDefaults.text : promptReturnValue
            this.doSetText(newText)
        }
    }

    override keyDown(e: KeyboardEvent): void {
        if (e.key === "Enter") {
            this.runSetTextDialog()
        }
    }

}
