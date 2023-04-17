import * as t from "io-ts"
import { ComponentList } from "../ComponentList"
import { LogicEditor } from "../LogicEditor"
import { NodeManager } from "../NodeManager"
import { RecalcManager } from "../RedrawRecalcManager"
import { Serialization } from "../Serialization"
import { COLOR_COMPONENT_BORDER } from "../drawutils"
import { ArrayFillUsing, ArrayFillWith, LogicValue, isString, typeOrUndefined, validateJson } from "../utils"
import { Component, ComponentBase, ComponentRepr, NodeDesc, NodeGroupDesc, NodeInDesc, NodeOutDesc, NodeRec, defineComponent, groupHorizontal, groupVertical } from "./Component"
import { DrawContext, DrawableParent, GraphicsRendering, MenuItems, Orientation, Orientations } from "./Drawable"
import { Input } from "./Input"
import { NodeIn, NodeOut } from "./Node"
import { Output } from "./Output"
import { Wire, WireManager } from "./Wire"

type CustomComponentNodeSpec = {
    isIn: boolean,
    name: string,
    orient: Orientation,
    numBits: number,
}

// How custom components are identied in their type
export const CustomComponentPrefix = "custom-"

// How custom component definitions are stored in JSON
export const CustomComponentDefRepr = t.type({
    id: t.string,
    caption: t.string,
    circuit: t.type({
        components: typeOrUndefined(t.record(t.string, t.record(t.string, t.unknown))),
        wires: typeOrUndefined(t.array(Wire.Repr)),
    }),
})

export type CustomComponentDefRepr = t.TypeOf<typeof CustomComponentDefRepr>
type CircuitRepr = CustomComponentDefRepr["circuit"]


export class CustomComponentDef {

    public readonly customId: string
    public readonly caption: string
    public readonly circuit: CircuitRepr
    public readonly gridWidth: number
    public readonly gridHeight: number
    public readonly ins: CustomComponentNodeSpec[]
    public readonly outs: CustomComponentNodeSpec[]
    public readonly numBySide: Record<Orientation, number> = { n: 0, e: 0, s: 0, w: 0 }
    public readonly numInputs: number
    public readonly numOutputs: number

    public toJSON(): CustomComponentDefRepr {
        return {
            id: this.customId,
            caption: this.caption,
            circuit: this.circuit,
        }
    }

    public constructor(data: CustomComponentDefRepr) {
        this.customId = data.id
        this.caption = data.caption
        this.circuit = data.circuit

        const collectInOut = (reprs: Record<string, Record<string, unknown>>): [CustomComponentNodeSpec[], number, CustomComponentNodeSpec[], number] => {
            const ins: CustomComponentNodeSpec[] = []
            let totalIn = 0
            const outs: CustomComponentNodeSpec[] = []
            let totalOut = 0
            for (const inOutRepr of Object.values(reprs)) {
                const isIn = inOutRepr.type === "in"
                const isOut = inOutRepr.type === "out"
                if (isIn || isOut) {
                    const name = isString(inOutRepr.name) ? inOutRepr.name : "n/a"
                    let orient = Orientations.includes(inOutRepr.orient) ? inOutRepr.orient : Orientation.default
                    orient = isIn ? Orientation.invert(orient) : orient
                    const numBits = Number(inOutRepr.bits ?? 1)
                    this.numBySide[orient] += numBits
                    const spec: CustomComponentNodeSpec = { isIn, name, orient, numBits }
                    if (isIn) {
                        totalIn += numBits
                        ins.push(spec)
                    } else {
                        totalOut += numBits
                        outs.push(spec)
                    }
                }
            }
            return [ins, totalIn, outs, totalOut]
        }
        [this.ins, this.numInputs, this.outs, this.numOutputs] = collectInOut(this.circuit.components ?? {})

        const spacing = 2
        const margin = 1.5
        const minSize = 1.5 * this.caption.length + 2
        this.gridWidth = Math.ceil(Math.max(minSize, (Math.max(this.numBySide.s, this.numBySide.n) - 1) * spacing + 2 * margin))
        this.gridHeight = Math.ceil(Math.max(minSize, (Math.max(this.numBySide.e, this.numBySide.w) - 1) * spacing + 2 * margin))
    }

    // ComponentMaker interface
    public isValid() { return true }
    public get category() { return "ic" as const }
    public get type() { return `${CustomComponentDef}${this.customId}` }

    public make(parent: DrawableParent): Component {
        const comp = new CustomComponent(parent, this)
        parent.components.add(comp)
        return comp
    }

    public makeFromJSON(parent: DrawableParent, data: Record<string, unknown>): Component | undefined {
        const validated = validateJson(data, CustomComponentRepr, "CustomComponent")
        if (validated === undefined) {
            return undefined
        }
        const comp = new CustomComponent(parent, this, validated)
        parent.components.add(comp)
        return comp
    }

    // ComponentDef creation
    public toStandardDef() {
        return defineComponent(CustomComponentPrefix + this.customId, {
            idPrefix: this.customId,
            button: { imgWidth: 50 },
            valueDefaults: {},
            size: { gridWidth: this.gridWidth, gridHeight: this.gridHeight },
            makeNodes: ({ gridWidth, gridHeight }) => {
                const right = gridWidth / 2 + 1
                const left = -right
                const bottom = gridHeight / 2 + 1
                const top = -bottom
                const starts: Record<Orientation, number> = {
                    n: this.numBySide.n - 1,
                    e: -(this.numBySide.e - 1),
                    s: this.numBySide.s - 1,
                    w: -(this.numBySide.w - 1),
                }
                const counts: Record<Orientation, number> = { n: 0, e: 0, s: 0, w: 0 }
                const make = (spec: CustomComponentNodeSpec): NodeDesc | NodeGroupDesc<NodeDesc> => {
                    const { orient, numBits } = spec
                    const [x, y] = (() => {
                        const f = Orientation.isVertical(orient) ? -1 : 1
                        const nextPos = starts[orient] + f * (counts[orient] + (numBits - 1) / 2) * 2
                        switch (orient) {
                            case "e": return [right, nextPos]
                            case "w": return [left, nextPos]
                            case "n": return [nextPos, top]
                            case "s": return [nextPos, bottom]
                        }
                    })()
                    counts[orient] += numBits
                    return numBits === 1
                        ? [x, y, orient]
                        : Orientation.isVertical(orient)
                            ? groupHorizontal(orient, x, y, numBits)
                            : groupVertical(orient, x, y, numBits)
                }

                const ins: NodeRec<NodeInDesc> = {}
                const outs: NodeRec<NodeOutDesc> = {}
                const sortedSpecs = [...this.ins, ...this.outs]
                //.sort((a, b) => a.sortIndex - b.sortIndex)
                // console.log(sortedSpecs)
                for (const spec of sortedSpecs) {
                    (spec.isIn ? ins : outs)[spec.name] = make(spec)
                }
                return { ins, outs }
            },
            initialValue: () => ArrayFillWith(false as LogicValue, this.numOutputs),
        })
    }
}

export const CustomComponentRepr = ComponentRepr(true, true)

export type CustomComponentRepr = t.TypeOf<typeof CustomComponentRepr>


export class CustomComponent extends ComponentBase<CustomComponentRepr, LogicValue[]> implements DrawableParent {

    public readonly customDef: CustomComponentDef
    public readonly numInputs: number
    public readonly numOutputs: number

    public readonly wireMgr: WireManager = new WireManager(this)
    public readonly recalcMgr = new RecalcManager()
    public readonly nodeMgr = new NodeManager()
    public readonly components = new ComponentList()

    public isMainEditor(): this is LogicEditor { return false }
    public get editor() { return this.parent.editor }
    public get mode() { return this.parent.mode }
    public get options() { return this.parent.options }
    public get timeline() { return this.parent.timeline }

    private _subcircuitInputs: NodeOut[] = []
    private _subcircuitOutputs: NodeIn[] = []

    public constructor(parent: DrawableParent, customDef: CustomComponentDef, saved?: CustomComponentRepr) {
        super(parent, customDef.toStandardDef(), saved)
        this.customDef = customDef
        this.numInputs = this.inputs._all.length
        this.numOutputs = this.outputs._all.length

        const error = Serialization.loadCircuit(this, customDef.circuit, { immediateWirePropagation: true, skipMigration: true })
        if (error !== undefined) {
            console.error("Failed to load custom component:", error)
            this.setInvalid()
        }

        let iIn = 0
        for (const comp of this.components.all()) {
            // assume they have been kept in the right order
            if (comp instanceof Input) {
                const nodes = comp.outputs._all
                this._subcircuitInputs.push(...nodes)
                const num = nodes.length
                if (num === 1 && comp.isLinkedToSomeClock) {
                    this.inputs._all[iIn].isClock = true
                }
                for (let i = 0; i < num; i++) {
                    this.inputs._all[iIn + i].prefersSpike = comp.isPushButton
                }
                iIn += num
            } else if (comp instanceof Output) {
                this._subcircuitOutputs.push(...comp.inputs._all)
            }
        }
    }

    public toJSON() {
        return this.toJSONBase()
    }

    protected override jsonType() {
        return CustomComponentPrefix + this.customDef.customId
    }

    protected override makeClone(setSpawning: boolean): CustomComponent {
        const repr = this.toNodelessJSON()
        const clone = new CustomComponent(this.parent, this.customDef, repr)
        this.parent.components.add(clone)
        if (setSpawning) {
            clone.setSpawning()
        }
        return clone
    }

    protected doRecalcValue(): LogicValue[] {
        for (let i = 0; i < this.numInputs; i++) {
            this._subcircuitInputs[i].value = this.inputs._all[i].value
        }
        this.recalcMgr.recalcAndPropagateIfNeeded()
        const outputs = ArrayFillUsing(i => this._subcircuitOutputs[i].value, this.numOutputs)
        return outputs
    }

    protected override propagateValue(newValue: LogicValue[]) {
        this.outputValues(this.outputs._all, newValue)
    }

    // TODO tooltip

    protected override doDraw(g: GraphicsRendering, ctx: DrawContext): void {
        super.doDrawDefault(g, ctx, () => {
            g.font = `bold 18px sans-serif`
            g.fillStyle = COLOR_COMPONENT_BORDER
            g.textAlign = "center"
            g.textBaseline = "middle"
            g.fillText(this.customDef.caption, this.posX, this.posY)
        })
    }

    protected override makeComponentSpecificContextMenuItems(): MenuItems {
        return this.makeForceOutputsContextMenuItem()
    }

}
