import * as t from "io-ts"
import { ComponentList } from "../ComponentList"
import { LogicEditor } from "../LogicEditor"
import { NodeManager } from "../NodeManager"
import { PersistenceManager } from "../PersistenceManager"
import { RecalcManager } from "../RedrawRecalcManager"
import { COLOR_COMPONENT_BORDER } from "../drawutils"
import { ArrayFillUsing, ArrayFillWith, LogicValue, isArray, isDefined, isString, isUndefined, templateLiteral, validateJson } from "../utils"
import { Component, ComponentBase, ComponentRepr, NodeDesc, NodeGroupDesc, NodeInDesc, NodeOutDesc, NodeRec, defineComponent, groupHorizontal, groupVertical } from "./Component"
import { DrawContext, DrawableParent, GraphicsRendering, MenuItems, Orientation, Orientations } from "./Drawable"
import { Input, InputRepr } from "./Input"
import { NodeIn, NodeOut } from "./Node"
import { Output, OutputRepr } from "./Output"
import { WireManager } from "./Wire"

type CustomComponentNodeSpec = {
    isIn: boolean,
    name: string,
    orient: Orientation,
    numBits: number,
}

// How custom components are identied
export const CustomComponentPrefix = "custom-"

export const CustomComponentDefRepr = t.type({
    id: t.string,
    caption: t.string,
    circuit: t.record(t.string, t.array(t.unknown)),
})

export type CustomComponentDefRepr = t.TypeOf<typeof CustomComponentDefRepr>

export class CustomComponentDef {

    public readonly id: string
    public readonly caption: string
    public readonly circuit: Record<string, unknown[]>
    public readonly gridWidth: number
    public readonly gridHeight: number
    public readonly ins: CustomComponentNodeSpec[]
    public readonly outs: CustomComponentNodeSpec[]
    public readonly numBySide: Record<Orientation, number> = { n: 0, e: 0, s: 0, w: 0 }
    public readonly numInputs: number
    public readonly numOutputs: number

    public toJSON(): CustomComponentDefRepr {
        return {
            id: this.id,
            caption: this.caption,
            circuit: this.circuit,
        }
    }

    public constructor(data: CustomComponentDefRepr) {
        this.id = data.id
        this.caption = data.caption
        this.circuit = data.circuit
        const numInOut = (obj: unknown, isIn: boolean): [CustomComponentNodeSpec[], number] => {
            let num = 0
            const names: CustomComponentNodeSpec[] = []
            if (isArray(obj)) {
                const arr = obj as Array<InputRepr | OutputRepr>
                for (const inOutRepr of arr) {
                    const name = isString(inOutRepr.name) ? inOutRepr.name : "n/a"
                    let orient = Orientations.includes(inOutRepr.orient) ? inOutRepr.orient : Orientation.default
                    orient = isIn ? Orientation.invert(orient) : orient
                    const numBits = inOutRepr.bits ?? 1
                    this.numBySide[orient] += numBits
                    num += numBits
                    const spec: CustomComponentNodeSpec = { isIn, name, orient, numBits }
                    names.push(spec)
                }
            }
            return [names, num]
        }
        [this.ins, this.numInputs] = numInOut(this.circuit.in, true);
        [this.outs, this.numOutputs] = numInOut(this.circuit.out, false)
        // TODO: find a way to keep these nodes in the same vertical/horizontal order as they were in the original circuit. This is quite a bit easier once we have a flat representation of all components in the JSON so that we can interleave inputs and outputs

        const spacing = 2
        const margin = 1.5
        const minSize = 1.5 * this.caption.length + 2
        this.gridWidth = Math.ceil(Math.max(minSize, (Math.max(this.numBySide.s, this.numBySide.n) - 1) * spacing + 2 * margin))
        this.gridHeight = Math.ceil(Math.max(minSize, (Math.max(this.numBySide.e, this.numBySide.w) - 1) * spacing + 2 * margin))
    }

    // ComponentMaker interface
    public isValid() { return true }
    public get category() { return "ic" as const }
    public get type() { return `${CustomComponentDef}${this.id}` }

    public make(parent: DrawableParent): Component {
        const comp = new CustomComponent(parent, this)
        parent.components.add(comp)
        return comp
    }

    public makeFromJSON(parent: DrawableParent, data: Record<string, unknown>): Component | undefined {
        const validated = validateJson(data, CustomComponentRepr, "CustomComponent")
        if (isUndefined(validated)) {
            return undefined
        }
        const comp = new CustomComponent(parent, this, validated)
        parent.components.add(comp)
        return comp
    }

    // ComponentDef creation
    public toStandardDef() {
        return defineComponent("ic", CustomComponentPrefix + this.id, {
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

export const CustomComponentRepr =
    t.intersection([ComponentRepr(true, true), t.type({
        type: templateLiteral<`${typeof CustomComponentPrefix}${string}`>(new RegExp(`^${CustomComponentPrefix}.*`)),
    })])

export type CustomComponentRepr = t.TypeOf<typeof CustomComponentRepr>


export class CustomComponent extends ComponentBase<CustomComponentRepr, LogicValue[]> implements DrawableParent {

    public readonly def: CustomComponentDef
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

    public constructor(parent: DrawableParent, def: CustomComponentDef, saved?: CustomComponentRepr) {
        super(parent, def.toStandardDef(), saved)
        this.def = def
        this.numInputs = this.inputs._all.length
        this.numOutputs = this.outputs._all.length

        const error = PersistenceManager.loadCircuit(this, def.circuit, { immediateWirePropagation: true, skipMigration: true })
        if (isDefined(error)) {
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
        return {
            type: `${CustomComponentPrefix}${this.def.id}` as const,
            ...this.toJSONBase(),
        }
    }

    protected override makeClone(setSpawning: boolean): CustomComponent {
        const repr = this.toNodelessJSON()
        const clone = new CustomComponent(this.parent, this.def, repr)
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
            g.fillText(this.def.caption, this.posX, this.posY)
        })
    }

    protected override makeComponentSpecificContextMenuItems(): MenuItems {
        return this.makeForceOutputsContextMenuItem()
    }

}
