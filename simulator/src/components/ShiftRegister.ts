import { Either } from "fp-ts/lib/Either"
import { COLOR_COMPONENT_BORDER, drawLabel, drawWireLineToComponent } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { isHighImpedance, isUnknown, LogicValue, Unknown } from "../utils"
import { defineParametrizedComponent, Params, Repr } from "./Component"
import { DrawContextExt } from "./Drawable"
import { RegisterBase, RegisterBaseDef } from "./Register"

export const ShiftRegisterDef =
    defineParametrizedComponent("shift-register", true, true, {
        variantName: ({ bits }) => `shift-register-${bits}`,
        ...RegisterBaseDef,
        makeNodes: (params, defaults) => {
            const base = RegisterBaseDef.makeNodes(params, defaults)
            const lrYOffset = base.ins.Clock[1] - 2
            return {
                ins: {
                    ...base.ins,
                    D: [-5, 0, "w"],
                    LR: [-5, lrYOffset, "w"],
                },
                outs: base.outs,
            }
        },
    })

export type ShiftRegisterRepr = Repr<typeof ShiftRegisterDef>
export type ShiftRegisterParams = Params<typeof ShiftRegisterDef>

export class ShiftRegister extends RegisterBase<ShiftRegisterRepr, ShiftRegisterParams> {

    public constructor(editor: LogicEditor, initData: Either<ShiftRegisterParams, ShiftRegisterRepr>) {
        super(editor, ShiftRegisterDef, initData)
    }

    public toJSON() {
        return {
            type: "shift-register" as const,
            ...this.toJSONBase(),
        }
    }

    public override makeTooltip() {
        const s = S.Components.ShiftRegister.tooltip

        // TODO add explanation of shift register direction
        return tooltipContent(s.title, mods(
            div(s.desc.expand({ numBits: this.numBits })) // TODO more info egenrically from register
        ))
    }

    public makeStateAfterClock(): LogicValue[] {
        const dirIsRight = this.inputs.LR.value
        if (isUnknown(dirIsRight) || isHighImpedance(dirIsRight)) {
            return this.makeStateFromMainValue(Unknown)
        }
        const d = this.inputs.D.value
        const current = this.value
        const next = dirIsRight ? [...current.slice(1), d] : [d, ...current.slice(0, -1)]
        return next
    }

    protected override doDrawSpecificInputs(g: CanvasRenderingContext2D, left: number) {
        drawWireLineToComponent(g, this.inputs.D, left, this.inputs.D.posYInParentTransform, false)
        drawWireLineToComponent(g, this.inputs.LR, left, this.inputs.LR.posYInParentTransform, false)
    }

    protected override doDrawGenericCaption(g: CanvasRenderingContext2D) {
        g.font = `bold 15px sans-serif`
        g.fillStyle = COLOR_COMPONENT_BORDER
        g.textAlign = "center"
        g.textBaseline = "middle"
        g.fillText("Shift Reg.", this.posX, this.posY - 8)
        g.font = `11px sans-serif`
        g.fillText(`${this.numBits} bits`, this.posX, this.posY + 10)
    }

    protected override doDrawSpecificLabels(g: CanvasRenderingContext2D, ctx: DrawContextExt, left: number) {
        g.font = "12px sans-serif"
        drawLabel(ctx, this.orient, "D", "w", left, this.inputs.D)
        drawLabel(ctx, this.orient, "L̅R", "w", left, this.inputs.LR)
    }

}
