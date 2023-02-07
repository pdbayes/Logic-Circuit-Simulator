import * as t from "io-ts"
import { COLOR_COMPONENT_BORDER, COLOR_NODE_MOUSE_OVER, COLOR_UNKNOWN, drawWireLineToComponent, GRID_STEP } from "../drawutils"
import { div, mods, tooltipContent } from "../htmlgen"
import { LogicEditor } from "../LogicEditor"
import { S } from "../strings"
import { FixedArrayFill, FixedArrayFillFactory, FixedArraySize, FixedReadonlyArray, isDefined, isUndefined, LogicValue, Mode } from "../utils"
import { ComponentBase, ComponentRepr, defineComponent, NodeVisuals } from "./Component"
import { DrawContext } from "./Drawable"
import { NodeIn, NodeOut } from "./Node"
import { WireStyle } from "./Wire"


const GRID_WIDTH = 1

const GRID_HEIGHT_1 = 2
const GRID_HEIGHT_4 = 8
const GRID_UPPER_HEIGHT_8 = 4.5
const GRID_LOWER_HEIGHT_8 = 3.5

abstract class PassthroughBase<N extends FixedArraySize, Repr extends ComponentRepr<N, N>> extends ComponentBase<N, N, Repr, FixedReadonlyArray<LogicValue, N>> {

    protected readonly n: N

    protected constructor(editor: LogicEditor, n: N, savedData: Repr | null, nodeOffsets: NodeVisuals<N, N>) {
        super(editor, FixedArrayFill(false, n), savedData, nodeOffsets)
        this.n = n
    }

    public override destroy(): void {
        type SavedNodeProps = WireStyle | undefined
        type EndNodes = [NodeIn, SavedNodeProps][]

        const savedWireEnds: [NodeOut, EndNodes][] = []
        for (let i = 0; i < this.n; i++) {
            const nodeOut = this.inputs[i].incomingWire?.startNode
            if (isUndefined(nodeOut) || !(nodeOut instanceof NodeOut)) {
                continue
            }
            const nodeIns: EndNodes = []
            for (const wire of this.outputs[i].outgoingWires) {
                const endNode = wire.endNode
                if (endNode !== null) {
                    nodeIns.push([endNode, wire.style])
                }
            }
            if (nodeIns.length > 0) {
                savedWireEnds.push([nodeOut, nodeIns])
            }
        }

        super.destroy()

        if (savedWireEnds.length > 0) {
            console.log("restoring wires", savedWireEnds.length)
            const wireMgr = this.editor.wireMgr
            for (const [nodeOut, nodeIns] of savedWireEnds) {
                for (const [nodeIn, style] of nodeIns) {
                    console.log("adding back wire", nodeOut.parent, nodeIn.parent)
                    wireMgr.addNode(nodeOut)
                    const wire = wireMgr.addNode(nodeIn)
                    if (isUndefined(wire)) {
                        console.error("Failed to add wire back")
                        continue
                    }
                    // restore wire properties
                    if (isDefined(style)) {
                        wire.doSetStyle(style)
                    }
                }
            }
        }
    }

    public override get alwaysDrawMultiOutNodes() {
        return true
    }

    public get componentType() {
        return "layout" as const
    }

    get unrotatedWidth() {
        return GRID_WIDTH * GRID_STEP * 2
    }

    protected doRecalcValue(): FixedReadonlyArray<LogicValue, N> {
        const indices = FixedArrayFillFactory(i => i, this.n)
        return this.inputValues<N>(indices)
    }

    protected override propagateValue(newValue: FixedReadonlyArray<LogicValue, N>): void {
        let i = 0
        for (const v of newValue) {
            this.outputs[i++].value = v
        }
    }

    public override makeTooltip() {
        return tooltipContent(undefined, mods(
            div(S.Components.Passthrough.tooltip)
        ))
    }

    protected doDrawShared(g: CanvasRenderingContext2D, ctx: DrawContext, halfHeightUp: number, halfHeightDown: number) {
        const width = 3
        const left = this.posX - width / 2
        const right = left + width
        const mouseoverMargin = 4

        if (ctx.isMouseOver) {
            g.beginPath()
            g.rect(left - mouseoverMargin, this.posY - halfHeightUp - mouseoverMargin, width + mouseoverMargin + mouseoverMargin, halfHeightUp + halfHeightDown + mouseoverMargin + mouseoverMargin)
            g.fillStyle = COLOR_NODE_MOUSE_OVER
            g.strokeStyle = COLOR_NODE_MOUSE_OVER
            g.lineWidth = 1
            g.stroke()
            g.fill()

            g.strokeStyle = COLOR_COMPONENT_BORDER
            g.lineWidth = 3
        } else {
            g.strokeStyle = COLOR_UNKNOWN
            g.lineWidth = 4
        }

        if (this.editor.mode >= Mode.CONNECT) {
            g.beginPath()
            g.moveTo(this.posX, this.posY - halfHeightUp)
            g.lineTo(this.posX, this.posY + halfHeightDown)
            g.stroke()
        }

        for (const input of this.inputs) {
            drawWireLineToComponent(g, input, left + 2, input.posYInParentTransform)
        }

        for (const output of this.outputs) {
            drawWireLineToComponent(g, output, right - 2, output.posYInParentTransform)
        }

    }
}



export const Passthrough1Def =
    defineComponent(1, 1, t.type({
        type: t.literal("pass"),
    }, "Passthrough1"))


export type Passthrough1Repr = typeof Passthrough1Def.reprType

export class Passthrough1 extends PassthroughBase<1, Passthrough1Repr> {

    public constructor(editor: LogicEditor, savedData: Passthrough1Repr | null) {
        super(editor, 1, savedData, {
            ins: [
                [undefined, -1, 0, "w", "In"],
            ],
            outs: [
                [undefined, +1, 0, "e", "Out"],
            ],
        })
    }

    toJSON() {
        return {
            type: "pass" as const,
            ...this.toJSONBase(),
        }
    }

    get unrotatedHeight() {
        return GRID_HEIGHT_1 * GRID_STEP
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const halfHeight = GRID_STEP
        super.doDrawShared(g, ctx, halfHeight, halfHeight)
    }

}





export const Passthrough4Def =
    defineComponent(4, 4, t.type({
        type: t.literal("pass-4"),
    }, "Passthrough4"))


export type Passthrough4Repr = typeof Passthrough4Def.reprType

export class Passthrough4 extends PassthroughBase<4, Passthrough4Repr> {

    public constructor(editor: LogicEditor, savedData: Passthrough4Repr | null) {
        super(editor, 4, savedData, {
            ins: [
                [undefined, -1, -3, "w", "In"],
                [undefined, -1, -1, "w", "In"],
                [undefined, -1, +1, "w", "In"],
                [undefined, -1, +3, "w", "In"],
            ],
            outs: [
                [undefined, +1, -3, "e", "Out"],
                [undefined, +1, -1, "e", "Out"],
                [undefined, +1, +1, "e", "Out"],
                [undefined, +1, +3, "e", "Out"],
            ],
        })
    }

    toJSON() {
        return {
            type: "pass-4" as const,
            ...this.toJSONBase(),
        }
    }

    get unrotatedHeight() {
        return GRID_HEIGHT_4 * GRID_STEP
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        const halfHeight = GRID_HEIGHT_4 * GRID_STEP / 2
        super.doDrawShared(g, ctx, halfHeight, halfHeight)
    }

}


export const Passthrough8Def =
    defineComponent(8, 8, t.type({
        type: t.literal("pass-8"),
    }, "Passthrough8"))


export type Passthrough8Repr = typeof Passthrough8Def.reprType

export class Passthrough8 extends PassthroughBase<8, Passthrough8Repr> {

    public constructor(editor: LogicEditor, savedData: Passthrough8Repr | null) {
        super(editor, 8, savedData, {
            ins: [
                [undefined, -1, -4, "w", "In"],
                [undefined, -1, -3, "w", "In"],
                [undefined, -1, -2, "w", "In"],
                [undefined, -1, -1, "w", "In"],
                [undefined, -1, 0, "w", "In"],
                [undefined, -1, 1, "w", "In"],
                [undefined, -1, 2, "w", "In"],
                [undefined, -1, 3, "w", "In"],
            ],
            outs: [
                [undefined, +1, -4, "e", "Out"],
                [undefined, +1, -3, "e", "Out"],
                [undefined, +1, -2, "e", "Out"],
                [undefined, +1, -1, "e", "Out"],
                [undefined, +1, 0, "e", "Out"],
                [undefined, +1, 1, "e", "Out"],
                [undefined, +1, 2, "e", "Out"],
                [undefined, +1, 3, "e", "Out"],
            ],
        })
    }

    toJSON() {
        return {
            type: "pass-8" as const,
            ...this.toJSONBase(),
        }
    }

    get unrotatedHeight() {
        return (GRID_UPPER_HEIGHT_8 + GRID_UPPER_HEIGHT_8) * GRID_STEP
    }

    protected doDraw(g: CanvasRenderingContext2D, ctx: DrawContext) {
        super.doDrawShared(g, ctx, GRID_UPPER_HEIGHT_8 * GRID_STEP, GRID_LOWER_HEIGHT_8 * GRID_STEP)
    }

}
