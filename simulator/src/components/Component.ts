import { asArray, deepEquals, Expand, FixedArray, FixedArraySize, FixedArraySizeNonZero, FixedReadonlyArray, forceTypeOf, isArray, isNotNull, isNumber, isUndefined, Mode, RichStringEnum, toLogicValueRepr, LogicValue, LogicValueRepr, Unknown, HighImpedance, isDefined } from "../utils"
import { Node, NodeIn, NodeOut } from "./Node"
import { ContextMenuData, ContextMenuItem, ContextMenuItemPlacement, DrawableWithDraggablePosition, Orientation, PositionSupportRepr } from "./Drawable"
import * as t from "io-ts"
import { LogicEditor } from "../LogicEditor"


// Node IDs are just represented by a non-negative number
export const NodeID = t.number
export type NodeID = t.TypeOf<typeof NodeID>

// Input nodes are represented by just the ID; output nodes can be forced
// to a given value to bypass their naturally computed value
export const InputNodeRepr = t.type({ id: NodeID }, "InputNode")
export type InputNodeRepr = t.TypeOf<typeof InputNodeRepr>
export const OutputNodeRepr = t.intersection([t.type({ id: NodeID }), t.partial({ force: LogicValueRepr })], "OutputNode")
export type OutputNodeRepr = t.TypeOf<typeof OutputNodeRepr>

// Allows collapsing an array of 1 element into the element itself,
// used for compact JSON representation. Does not work well if T itself is
// an array
export const FixedArrayOrDirect = <T extends t.Mixed, N extends FixedArraySizeNonZero>(tpe: T, n: N) =>
    (n === 1) ? tpe : FixedArray<T, N>(tpe, n)
export type FixedArrayOrDirect<T, N extends FixedArraySizeNonZero> =
    N extends 1 ? T : FixedArray<T, N>


// Defines how the JSON looks like depending on the number of inputs and outputs.
// If only inputs or only outputs, all IDs are put into an "id" field.
// If both inputs and outputs are present, we have separate "in" and "out" fields.

// These are just 3 intermediate types
const OnlyInNodeIds = <N extends FixedArraySizeNonZero>(n: N) =>
    t.type({ id: FixedArrayOrDirect(t.union([NodeID, InputNodeRepr]), n) })
type OnlyInNodeIds<N extends FixedArraySizeNonZero> =
    { id: FixedArrayOrDirect<NodeID | InputNodeRepr, N> }

const OnlyOutNodeIds = <N extends FixedArraySizeNonZero>(n: N) =>
    t.type({ id: FixedArrayOrDirect(t.union([NodeID, OutputNodeRepr]), n) })
type OnlyOutNodeIds<N extends FixedArraySizeNonZero> =
    { id: FixedArrayOrDirect<NodeID | OutputNodeRepr, N> }

const InAndOutNodeIds = <N extends FixedArraySizeNonZero, M extends FixedArraySizeNonZero>(n: N, m: M) =>
    t.type({
        in: FixedArrayOrDirect(t.union([NodeID, InputNodeRepr]), n),
        out: FixedArrayOrDirect(t.union([NodeID, OutputNodeRepr]), m),
    })
type InAndOutNodeIds<N extends FixedArraySizeNonZero, M extends FixedArraySizeNonZero> = {
    in: FixedArrayOrDirect<NodeID | InputNodeRepr, N>
    out: FixedArrayOrDirect<NodeID | OutputNodeRepr, M>
}

// This is the final conditional type showing what the JSON representation
// will look like depending on number of inputs and outputs
export const NodeIDsRepr = <NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize>(numInputs: NumInputs, numOutputs: NumOutputs) =>
    numInputs > 0
        ? /* NumInputs != 0 */ (
            numOutputs > 0
                ? /* NumInputs != 0, NumOutputs != 0 */ InAndOutNodeIds(numInputs as FixedArraySizeNonZero, numOutputs as FixedArraySizeNonZero)
                : /* NumInputs != 0, NumOutputs == 0 */ OnlyInNodeIds(numInputs as FixedArraySizeNonZero)
        )
        : /* NumInputs == 0 */  (
            numOutputs > 0
                ? /* NumInputs == 0, NumOutputs != 0 */ OnlyOutNodeIds(numOutputs as FixedArraySizeNonZero)
                // eslint-disable-next-line @typescript-eslint/ban-types
                : /* NumInputs == 0, NumOutputs == 0 */ t.type({})
        )
export type NodeIDsRepr<NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize> =
    NumInputs extends FixedArraySizeNonZero
    ? /* NumInputs != 0 */ (
        NumOutputs extends FixedArraySizeNonZero
        ? /* NumInputs != 0, NumOutputs != 0 */ InAndOutNodeIds<NumInputs, NumOutputs>
        : /* NumInputs != 0, NumOutputs == 0 */ OnlyInNodeIds<NumInputs>
    )
    : /* NumInputs == 0 */  (
        NumOutputs extends FixedArraySizeNonZero
        ? /* NumInputs == 0, NumOutputs != 0 */ OnlyOutNodeIds<NumOutputs>
        // eslint-disable-next-line @typescript-eslint/ban-types
        : /* NumInputs == 0, NumOutputs == 0 */ {}
    )

// Tests

// type IDs_00 = Expand<NodeIDsRepr<0, 0>>
// type IDs_01 = Expand<NodeIDsRepr<0, 1>>
// type IDs_10 = Expand<NodeIDsRepr<1, 0>>
// type IDs_11 = Expand<NodeIDsRepr<1, 1>>
// type IDs_02 = Expand<NodeIDsRepr<0, 2>>
// type IDs_20 = Expand<NodeIDsRepr<2, 0>>
// type IDs_12 = Expand<NodeIDsRepr<1, 2>>
// type IDs_21 = Expand<NodeIDsRepr<2, 1>>
// type IDs_22 = Expand<NodeIDsRepr<2, 2>>

// A generic component is represented by its position
// and the representation of its nodes
export type ComponentRepr<NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize> =
    PositionSupportRepr & NodeIDsRepr<NumInputs, NumOutputs>

export const ComponentRepr = <NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize>(numInputs: NumInputs, numOutputs: NumOutputs) =>
    forceTypeOf(
        t.intersection([PositionSupportRepr, NodeIDsRepr(numInputs, numOutputs)], `Component(numInputs=${numInputs}, numOutputs=${numOutputs})`)
    ).toMoreSpecific<ComponentRepr<NumInputs, NumOutputs>>()

export function ExtendComponentRepr<NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize, T extends t.Mixed>(n: NumInputs, m: NumOutputs, savedData: T) {
    return t.intersection([ComponentRepr(n, m), savedData], savedData.name)
}

export type NodeOffset = [number, number, Orientation]

// Node offsets are not stored in JSON, but provided by the concrete
// subclasses to the Component superclass to indicate where to place
// the input and output nodes. Strong typing allows us to check the
// size of the passed arrays in the super() call.
export type NodeOffsets<NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize>
    // eslint-disable-next-line @typescript-eslint/ban-types
    = (NumInputs extends 0 ? {} : { inOffsets: FixedArray<NodeOffset, NumInputs> })
    // eslint-disable-next-line @typescript-eslint/ban-types
    & (NumOutputs extends 0 ? {} : { outOffsets: FixedArray<NodeOffset, NumOutputs> })


export enum ComponentState {
    SPAWNING,
    SPAWNED,
    DEAD
}

// Simplified, generics-free representation of a component
export type Component = ComponentBase<FixedArraySize, FixedArraySize, ComponentRepr<FixedArraySize, FixedArraySize>, unknown>



const ComponentTypes_ = {
    in: { jsonFieldName: "in" },
    out: { jsonFieldName: "out" },
    gate: { jsonFieldName: "gates" },
    ic: { jsonFieldName: "components" },
} as const

export const ComponentTypes = RichStringEnum.withProps<{
    jsonFieldName: string
}>()(ComponentTypes_)

export type ComponentType = typeof ComponentTypes.type
export type MainJsonFieldName = typeof ComponentTypes_[ComponentType]["jsonFieldName"]

export abstract class ComponentBase<
    NumInputs extends FixedArraySize, // statically know the number of inputs
    NumOutputs extends FixedArraySize, // statically know the number of outputs
    Repr extends ComponentRepr<NumInputs, NumOutputs>, // JSON representation, varies according to input/output number
    Value // usually TriState or number
    > extends DrawableWithDraggablePosition {

    private _state: ComponentState
    protected readonly inputs: FixedArray<NodeIn, NumInputs>
    protected readonly outputs: FixedArray<NodeOut, NumOutputs>

    protected constructor(
        editor: LogicEditor,
        private _value: Value,
        savedData: Repr | null,
        nodeOffsets: NodeOffsets<NumInputs, NumOutputs>) {
        super(editor, savedData)

        // hack to get around the inOffsets and outOffsets properties
        // being inferred as nonexistant (basically, the '"key" in savedData'
        // check fails to provide enough info for type narrowing)
        type NodeOffsetsKey = keyof NodeOffsets<1, 0> | keyof NodeOffsets<0, 1>
        function get(key: NodeOffsetsKey): ReadonlyArray<[number, number, Orientation]> {
            if (key in nodeOffsets) {
                return (nodeOffsets as any as NodeOffsets<1, 1>)[key]
            } else {
                return [] as const
            }
        }

        const inOffsets = get("inOffsets")
        const outOffsets = get("outOffsets")
        const numInputs = inOffsets.length as NumInputs
        const numOutputs = outOffsets.length as NumOutputs

        if (isNotNull(savedData)) {
            // restoring
            this._state = ComponentState.SPAWNED

        } else {
            // newly placed
            this._state = ComponentState.SPAWNING
            editor.moveMgr.setDrawableMoving(this)
        }

        // build node specs either from scratch if new or from saved data
        const [inputSpecs, outputSpecs] = this.nodeSpecsFromRepr(savedData, numInputs, numOutputs)

        // generate the input and output nodes
        this.inputs = this.makeNodes(inOffsets, inputSpecs, NodeIn) as FixedArray<NodeIn, NumInputs>
        this.outputs = this.makeNodes(outOffsets, outputSpecs, NodeOut) as FixedArray<NodeOut, NumOutputs>

        // setNeedsRecalc with a force propadation is needed:
        // * the forced propagation allows the current value (e.g. for InputBits)
        //   to be set to the outputs, if if the "new" value is the same as the current one
        // * setNeedsRecalc schedules a recalculation (e.g. for Gates)
        this.setNeedsRecalc(true)
    }

    public abstract toJSON(): Repr

    // typically used by subclasses to provide only their specific JSON,
    // splatting in the result of super.toJSONBase() in the object
    protected override toJSONBase(): ComponentRepr<NumInputs, NumOutputs> {
        return {
            ...super.toJSONBase(),
            ...this.buildNodesRepr(),
        }
    }

    // creates the input/output nodes based on array of offsets (provided
    // by subclass) and spec (either loaded from JSON repr or newly generated)
    private makeNodes<N extends Node>(
        offsets: readonly [number, number, Orientation][],
        specs: readonly (InputNodeRepr | OutputNodeRepr)[], node: new (
            editor: LogicEditor,
            nodeSpec: InputNodeRepr | OutputNodeRepr,
            parent: Component,
            _gridOffsetX: number,
            _gridOffsetY: number,
            relativePosition: Orientation,
        ) => N): readonly N[] {

        const nodes: N[] = []
        for (let i = 0; i < offsets.length; i++) {
            const gridOffset = offsets[i]
            nodes.push(new node(this.editor, specs[i], this, gridOffset[0], gridOffset[1], gridOffset[2]))
        }
        return nodes
    }

    // generates two arrays of normalized node specs either as loaded from
    // JSON or obtained with default values when _repr is null and we're
    // creating a new component from scratch
    private nodeSpecsFromRepr(_repr: NodeIDsRepr<NumInputs, NumOutputs> | null, numInputs: number, numOutputs: number): [InputNodeRepr[], OutputNodeRepr[]] {
        const inputSpecs: InputNodeRepr[] = []
        const outputSpecs: OutputNodeRepr[] = []
        const nodeMgr = this.editor.nodeMgr

        if (_repr === null) {
            // build default spec for nodes
            for (let i = 0; i < numInputs; i++) {
                inputSpecs.push({ id: nodeMgr.newID() })
            }
            for (let i = 0; i < numOutputs; i++) {
                outputSpecs.push({ id: nodeMgr.newID() })
            }

        } else {
            // parse from cast repr according to cases

            // the next two functions take either a single ID or an array of them and
            // generate the corresponding node specs from it
            const genOutSpecs = function (outReprs: FixedArrayOrDirect<NodeID | OutputNodeRepr, FixedArraySizeNonZero>) {
                const pushOne = (outRepr: NodeID | OutputNodeRepr) => outputSpecs.push(isNumber(outRepr)
                    ? { id: outRepr }
                    : { id: outRepr.id, force: outRepr.force }
                )
                if (isArray(outReprs)) {
                    for (const outRepr of outReprs) {
                        pushOne(outRepr)
                    }
                } else {
                    pushOne(outReprs)
                }
            }
            const genInSpecs = function (inReprs: FixedArrayOrDirect<NodeID | InputNodeRepr, FixedArraySizeNonZero>) {
                const pushOne = (inRepr: NodeID | InputNodeRepr) =>
                    inputSpecs.push({ id: isNumber(inRepr) ? inRepr : inRepr.id })
                if (isArray(inReprs)) {
                    for (const inRepr of inReprs) {
                        pushOne(inRepr)
                    }
                } else {
                    pushOne(inReprs)
                }
            }

            // manually distinguishing the cases where we have no inputs or no
            // outputs as we then have a more compact JSON representation
            if (numInputs !== 0) {
                if (numOutputs !== 0) {
                    // NumInputs != 0, NumOutputs != 0
                    const repr: InAndOutNodeIds<FixedArraySizeNonZero, FixedArraySizeNonZero> = _repr as any
                    genInSpecs(repr.in)
                    genOutSpecs(repr.out)
                } else {
                    // NumInputs != 0, NumOutputs == 0
                    const repr: OnlyInNodeIds<FixedArraySizeNonZero> = _repr as any
                    genInSpecs(repr.id)
                }
            } else if (numOutputs !== 0) {
                // NumInputs == 0, NumOutputs != 0
                const repr: OnlyOutNodeIds<FixedArraySizeNonZero> = _repr as any
                genOutSpecs(repr.id)
            }

            // id availability check
            for (const specs of [inputSpecs, outputSpecs]) {
                for (const spec of specs) {
                    nodeMgr.markIDUsed(spec.id)
                }
            }
        }

        return [inputSpecs, outputSpecs]
    }

    // from the known nodes, builds the JSON representation of them,
    // using the most compact form available
    private buildNodesRepr(): NodeIDsRepr<NumInputs, NumOutputs> {
        const numInputs = this.inputs.length as NumInputs
        const numOutputs = this.outputs.length as NumOutputs

        // these two functions return either an array of JSON
        // representations, or just the element skipping the array
        // if there is only one
        function inNodeReprs(nodes: readonly Node[]): FixedArrayOrDirect<NodeID, FixedArraySizeNonZero> {
            const reprOne = (node: Node) => node.id
            if (nodes.length === 1) {
                return reprOne(nodes[0])
            } else {
                return nodes.map(reprOne) as any
            }
        }
        function outNodeReprs(nodes: readonly Node[]): FixedArrayOrDirect<NodeID | OutputNodeRepr, FixedArraySizeNonZero> {
            const reprOne = (node: Node) => {
                if (isUndefined(node.forceValue)) {
                    return node.id
                } else {
                    return { id: node.id, force: toLogicValueRepr(node.forceValue) }
                }
            }
            if (nodes.length === 1) {
                return reprOne(nodes[0])
            } else {
                return nodes.map(reprOne) as any
            }
        }

        let result: any = {}

        // manually distinguishing the cases where we have no inputs or no
        // outputs as we then have a more compact JSON representation
        if (numInputs !== 0) {
            const inRepr = inNodeReprs(this.inputs)

            if (numOutputs !== 0) {
                // NumInputs != 0, NumOutputs != 0
                const outRepr = outNodeReprs(this.outputs)
                const repr: InAndOutNodeIds<FixedArraySizeNonZero, FixedArraySizeNonZero> =
                    { in: inRepr as any, out: outRepr as any }
                result = repr

            } else {
                // NumInputs != 0, NumOutputs == 0
                const repr: OnlyOutNodeIds<FixedArraySizeNonZero> = { id: inRepr as any }
                result = repr
            }
        } else if (numOutputs !== 0) {
            // NumInputs == 0, NumOutputs != 0
            const outRepr = outNodeReprs(this.outputs)
            const repr: OnlyOutNodeIds<FixedArraySizeNonZero> = { id: outRepr as any }
            result = repr
        }

        return result
    }

    protected setInputsPreferSpike(...inputs: number[]) {
        for (const i of inputs) {
            this.inputs[i]._prefersSpike = true
        }
    }

    public abstract get componentType(): ComponentType

    public getInputName(__i: number): string | undefined {
        return undefined
    }

    public getInputNodeName(node: NodeIn): string | undefined {
        for (let i = 0; i < this.inputs.length; i++) {
            if (this.inputs[i] === node) {
                return this.getInputName(i)
            }
        }
        return undefined
    }

    public getOutputName(__i: number): string | undefined {
        return undefined
    }

    public getOutputNodeName(node: NodeOut): string | undefined {
        for (let i = 0; i < this.outputs.length; i++) {
            if (this.outputs[i] === node) {
                return this.getOutputName(i)
            }
        }
        return undefined
    }

    public get state() {
        return this._state
    }

    public get allowsForcedOutputs() {
        return true
    }

    public forEachNode(f: (node: Node) => boolean): void {
        for (const node of this.inputs) {
            const goOn = f(node)
            if (!goOn) {
                return
            }
        }
        for (const node of this.outputs) {
            const goOn = f(node)
            if (!goOn) {
                return
            }
        }
    }

    public get value(): Value {
        return this._value
    }

    protected doSetValue(newValue: Value, forcePropagate = false) {
        const oldValue = this._value
        if (forcePropagate || !deepEquals(newValue, oldValue)) {
            this._value = newValue
            this.setNeedsRedraw("value changed")
            this.setNeedsPropagate()
        }
    }

    public recalcValue(forcePropagate: boolean) {
        this.doSetValue(this.doRecalcValue(), forcePropagate)
    }

    protected abstract doRecalcValue(): Value

    public propagateCurrentValue() {
        this.propagateValue(this._value)
    }

    protected propagateValue(__newValue: Value) {
        // by default, do nothing
    }

    protected inputValues<N extends FixedArraySize>(inds: FixedReadonlyArray<number, N>): FixedArray<LogicValue, N> {
        return inds.map(i => this.inputs[i].value) as any as FixedArray<LogicValue, N>
    }

    public setNeedsRecalc(forcePropagate = false) {
        this.editor.recalcMgr.enqueueForRecalc(this, forcePropagate)
    }

    private setNeedsPropagate() {
        this.editor.recalcMgr.enqueueForPropagate(this)
    }

    private updateNodePositions() {
        this.forEachNode((node) => {
            node.updatePositionFromParent()
            return true
        })
    }

    override mouseDown(e: MouseEvent | TouchEvent) {
        if (this.editor.mode >= Mode.CONNECT) {
            this.tryStartMoving(e)
        }
        return { lockMouseOver: true }
    }

    override mouseDragged(e: MouseEvent | TouchEvent) {
        if (this.editor.mode >= Mode.CONNECT) {
            this.updateWhileMoving(e)
        }
    }

    override mouseUp(__: MouseEvent | TouchEvent) {
        let wasSpawning = false
        if (this._state === ComponentState.SPAWNING) {
            this._state = ComponentState.SPAWNED
            wasSpawning = true
        }
        const wasMoving = this.tryStopMoving()
        if (wasSpawning || wasMoving) {
            const newLinks = this.editor.nodeMgr.tryConnectNodesOf(this)
            if (newLinks.length > 0) {
                this.autoConnected(newLinks)
            }
            this.editor.setDirty("moved component")
        }
    }

    protected autoConnected(__newLinks: [Node, Component, Node][]) {
        // by default, do nothing
    }

    protected override updateSelfPositionIfNeeded(x: number, y: number, snapToGrid: boolean, e: MouseEvent | TouchEvent): undefined | [number, number] {
        if (this._state === ComponentState.SPAWNING) {
            return this.trySetPosition(x, y, snapToGrid)
        }
        return super.updateSelfPositionIfNeeded(x, y, snapToGrid, e)
    }

    protected override positionChanged() {
        this.updateNodePositions()
    }

    override mouseDoubleClicked(e: MouseEvent | TouchEvent): boolean {
        if (this.editor.mode >= Mode.CONNECT && e.metaKey) {
            this.doSetOrient((() => {
                switch (this.orient) {
                    case "e": return "s"
                    case "s": return "w"
                    case "w": return "n"
                    case "n": return "e"
                }
            })())
            return true
        }
        return false
    }

    public override doSetOrient(orient: Orientation) {
        super.doSetOrient(orient)
        this.updateNodePositions()
    }

    destroy() {
        this._state = ComponentState.DEAD
        this.forEachNode((node) => {
            node.destroy()
            return true
        })
    }

    override get cursorWhenMouseover() {
        return "grab"
    }

    public override makeContextMenu(): ContextMenuData {
        const menuItems: ContextMenuData = []

        const baseItems = this.makeBaseContextMenu()
        const specificItems = this.makeComponentSpecificContextMenuItems()

        let lastWasSep = true
        function addItemsAt(placement: ContextMenuItemPlacement, items: [ContextMenuItemPlacement, ContextMenuItem][] | undefined, insertSep = false) {
            if (isUndefined(items)) {
                return
            }
            if (insertSep) {
                if (!lastWasSep) {
                    menuItems.push(ContextMenuData.sep())
                }
                lastWasSep = true
            }
            for (const [pl, it] of items) {
                if (pl === placement) {
                    menuItems.push(it)
                    lastWasSep = false
                }
            }
        }

        addItemsAt("start", specificItems)
        addItemsAt("start", baseItems)
        addItemsAt("mid", baseItems, true)
        addItemsAt("mid", specificItems)
        addItemsAt("end", baseItems, true)
        addItemsAt("end", specificItems)

        return menuItems
    }

    private makeBaseContextMenu(): [ContextMenuItemPlacement, ContextMenuItem][] {
        const setRefItems: [ContextMenuItemPlacement, ContextMenuItem][] =
            this.editor.mode < Mode.FULL ? [] : [
                ["end", this.makeSetRefContextMenuItem()],
                ["end", ContextMenuData.sep()],
            ]

        return [
            ["start", this.makeChangeOrientationContextMenuItem()],
            ...setRefItems,
            ["end", this.makeDeleteContextMenuItem()],
        ]
    }

    protected makeComponentSpecificContextMenuItems(): undefined | [ContextMenuItemPlacement, ContextMenuItem][] {
        return undefined
    }

    protected makeDeleteContextMenuItem(): ContextMenuItem {
        return ContextMenuData.item("trash-o", "Supprimer", () => {
            this.editor.tryDeleteComponentsWhere(c => c === this)
        }, true)
    }

    protected makeShowAsUnknownContextMenuItem(isUnknown: boolean, set: (newUnknown: boolean) => void): ContextMenuItem {
        return ContextMenuData.submenu("question-circle", "Cacher la fonction", [
            ...[false, true].map(newUnkown => ContextMenuData.item(newUnkown === isUnknown ? "check" : "none",
                newUnkown ? "Cacher avec «?»" : "Afficher normalement", () => {
                    set(newUnkown)
                })
            ),
            ContextMenuData.sep(),
            ContextMenuData.text("Changez entre normal ou caché avec Option + double-clic sur le composant"),
        ])
    }

    protected makeForceOutputsContextMenuItem(): undefined | ContextMenuItem {
        const numOutputs = this.outputs.length

        if (numOutputs === 0) {
            return undefined
        }

        function makeOutputItems(out: NodeOut): ContextMenuItem[] {
            const currentForceValue = out.forceValue
            return [undefined, Unknown, true, false, HighImpedance]
                .map(newForceValue => ContextMenuData.item(
                    currentForceValue === newForceValue ? "check" : "none",
                    (() => {
                        switch (newForceValue) {
                            case undefined: return "Sortie normale"
                            case Unknown: return "Forcer comme état inconnu"
                            case true: return "Forcer à 1"
                            case false: return "Forcer à 0"
                            case HighImpedance: return "Forcer à haute impédance"
                        }
                    })(),
                    () => {
                        out.forceValue = newForceValue
                    }
                ))
        }

        const footerItems = [
            ContextMenuData.sep(),
            ContextMenuData.text("Forcez une sortie avec Option + double-clic sur la sortie"),
        ]

        if (numOutputs === 1) {
            return ContextMenuData.submenu("exclamation", "Forcer la sortie", [
                ...makeOutputItems(this.outputs[0]!),
                ...footerItems,
            ])

        } else {
            const makeName = (i: number) => this.getOutputName(i) ?? "Sortie " + (i + 1)
            return ContextMenuData.submenu("exclamation", "Forcer une sortie", [
                ...asArray(this.outputs).map((out, i) => {
                    const icon = isDefined(out.forceValue) ? "exclamation" : "none"
                    return ContextMenuData.submenu(icon, makeName(i),
                        makeOutputItems(out)
                    )
                }),
                ...footerItems,
            ])
        }


    }

    protected makeSetNameContextMenuItem(currentName: string | undefined, handler: (newName: string | undefined) => void): ContextMenuItem {
        const caption = isUndefined(currentName) ? "Ajouter un nom…" : "Changer le nom…"
        return ContextMenuData.item("pencil", caption, () => this.runSetNameDialog(currentName, handler))
    }

    protected runSetNameDialog(currentName: string | undefined, handler: (newName: string | undefined) => void): void {
        const newName = window.prompt("Choisissez le nom à afficher ou laissez vide pour le supprimer:", currentName)
        if (newName !== null) {
            // OK button pressed
            const handlerArg = newName.length === 0 ? undefined : newName
            handler(handlerArg)
        }
    }

}


// type ReprType<Repr extends t.Mixed> = PartialWhereUndefinedRecursively<t.TypeOf<Repr>>
type ReprType<Repr extends t.Mixed> = Expand<t.TypeOf<Repr>>

export function defineComponent<NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize, T extends t.Mixed>(numInputs: NumInputs, numOutputs: NumOutputs, type: T) {
    const repr = t.intersection([ComponentRepr(numInputs, numOutputs), type], type.name)
    return {
        numInputs,
        numOutputs,
        repr,
        get reprType(): ReprType<typeof repr> { throw new Error() },
    } as const
}

export function extendComponent<NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize, T extends t.Mixed, U extends t.Mixed>(superDef: { numInputs: NumInputs, numOutputs: NumOutputs, repr: T }, subType: U) {
    const repr = t.intersection([superDef.repr, subType], subType.name)
    return {
        numInputs: superDef.numInputs,
        numOutputs: superDef.numOutputs,
        repr,
        get reprType(): ReprType<typeof repr> { throw new Error() },
    } as const
}
