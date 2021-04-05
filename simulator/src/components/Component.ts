import { addComponentNeedingRecalc, mode, modifierKeys, offsetXY, setComponentMoving, setComponentStoppedMoving } from "../simulator"
import { Expand, FixedArray, FixedArraySize, FixedArraySizeNonZero, forceTypeOf, isArray, isDefined, isNotNull, isNumber, isUndefined, Mode, toTriStateRepr, TriStateRepr } from "../utils"
import { Node, NodeIn, NodeOut } from "./Node"
import { NodeManager } from "../NodeManager"
import { DEFAULT_ORIENTATION, DrawableWithPosition, PositionSupportRepr } from "./Drawable"
import * as t from "io-ts"

// type HashSize1 = { readonly HasSize1: unique symbol }
// type H<N extends number, T> = { [K in `HasSize${N}`]: T }
interface HasSizeNBrand<__ extends number> {
    readonly HasSizeN: unique symbol // TODO check unique per N
}

const FixedArray = <T extends t.Mixed, N extends FixedArraySize>(tpe: T, n: N) =>
    t.brand(
        t.array(tpe, `array of size ${n}`),
        (arr): arr is t.Branded<[t.TypeOf<T>], HasSizeNBrand<N>> => arr.length === n,
        "HasSizeN"
    )


// Node IDs are just represented by a non-negative number
export const NodeID = t.number
export type NodeID = t.TypeOf<typeof NodeID>

// Input nodes are represented by just the ID; output nodes can be forced
// to a given value to bypass their naturally computed value
export const InputNodeRepr = t.type({ id: NodeID }, "InputNode")
export type InputNodeRepr = t.TypeOf<typeof InputNodeRepr>
export const OutputNodeRepr = t.intersection([t.type({ id: NodeID }), t.partial({ force: TriStateRepr })], "OutputNode")
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

// Node offsets are not stored in JSON, but provided by the concrete
// subclasses to the Component superclass to indicate where to place
// the input and output nodes. Strong typing allows us to check the
// size of the passed arrays in the super() call.
export type NodeOffsets<NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize>
    // eslint-disable-next-line @typescript-eslint/ban-types
    = (NumInputs extends 0 ? {} : { inOffsets: FixedArray<[number, number], NumInputs> })
    // eslint-disable-next-line @typescript-eslint/ban-types
    & (NumOutputs extends 0 ? {} : { outOffsets: FixedArray<[number, number], NumOutputs> })


export enum ComponentState {
    SPAWNING,
    SPAWNED,
    DEAD
}

// Simplified, generics-free representation of a component
export type Component = ComponentBase<FixedArraySize, FixedArraySize, ComponentRepr<FixedArraySize, FixedArraySize>, unknown>

export abstract class ComponentBase<
    NumInputs extends FixedArraySize, // statically know the number of inputs
    NumOutputs extends FixedArraySize, // statically know the number of outputs
    Repr extends ComponentRepr<NumInputs, NumOutputs>, // JSON representation, varies according to input/output number
    Value // usually TriState or number
    > extends DrawableWithPosition {

    private _state: ComponentState
    private _isMovingWithMouseOffset: undefined | [number, number] = undefined
    protected readonly inputs: FixedArray<NodeIn, NumInputs>
    protected readonly outputs: FixedArray<NodeOut, NumOutputs>

    protected constructor(
        private _value: Value,
        savedData: Repr | null,
        nodeOffsets: NodeOffsets<NumInputs, NumOutputs>) {
        super(savedData)

        // hack to get around the inOffsets and outOffsets properties
        // being inferred as nonexistant (basically, the '"key" in savedData'
        // check fails to provide enough info for type narrowing)
        type NodeOffsetsKey = keyof NodeOffsets<1, 0> | keyof NodeOffsets<0, 1>
        function get(key: NodeOffsetsKey): ReadonlyArray<[number, number]> {
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
            setComponentMoving(this)
        }

        // build node specs either from scratch if new or from saved data
        const [inputSpecs, outputSpecs] = this.nodeSpecsFromRepr(savedData, numInputs, numOutputs)

        // generate the input and output nodes
        this.inputs = this.makeNodes(inOffsets, inputSpecs, NodeIn) as FixedArray<NodeIn, NumInputs>
        this.outputs = this.makeNodes(outOffsets, outputSpecs, NodeOut) as FixedArray<NodeOut, NumOutputs>

        // both propagateNewValue and setNeedsRecalc are needed:
        // * propagateNewValue allows the current value (e.g. for LogicInputs)
        //   to be set to the outputs
        // * setNeedsRecalc schedules a recalculation (e.g. for Gates)
        this.propagateNewValue(_value)
        this.setNeedsRecalc()
    }

    public abstract toJSON(): Repr

    // typically used by subclasses to provide only their specific JSON,
    // splatting in the result of super.toJSONBase() in the object
    protected toJSONBase(): ComponentRepr<NumInputs, NumOutputs> {
        return {
            pos: [this.posX, this.posY] as const,
            orient: this.orient === DEFAULT_ORIENTATION ? undefined : this.orient,
            ...this.buildNodesRepr(),
        }
    }

    // creates the input/output nodes based on array of offsets (provided
    // by subclass) and spec (either loaded from JSON repr or newly generated)
    private makeNodes<N extends Node>(
        offsets: readonly [number, number][],
        specs: readonly (InputNodeRepr | OutputNodeRepr)[], node: new (
            nodeSpec: InputNodeRepr | OutputNodeRepr,
            parent: Component,
            _gridOffsetX: number,
            _gridOffsetY: number,
        ) => N): readonly N[] {

        const nodes: N[] = []
        for (let i = 0; i < offsets.length; i++) {
            const gridOffset = offsets[i]
            nodes.push(new node(specs[i], this, gridOffset[0], gridOffset[1]))
        }
        return nodes
    }

    // generates two arrays of normalized node specs either as loaded from
    // JSON or obtained with default values when _repr is null and we're
    // creating a new component from scratch
    private nodeSpecsFromRepr(_repr: NodeIDsRepr<NumInputs, NumOutputs> | null, numInputs: number, numOutputs: number): [InputNodeRepr[], OutputNodeRepr[]] {
        const inputSpecs: InputNodeRepr[] = []
        const outputSpecs: OutputNodeRepr[] = []

        if (_repr === null) {
            // build default spec for nodes
            for (let i = 0; i < numInputs; i++) {
                inputSpecs.push({ id: NodeManager.newID() })
            }
            for (let i = 0; i < numOutputs; i++) {
                outputSpecs.push({ id: NodeManager.newID() })
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
                    NodeManager.markIDUsed(spec.id)
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
                    return { id: node.id, force: toTriStateRepr(node.forceValue) }
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

    public get state() {
        return this._state
    }

    public get isMoving() {
        return isDefined(this._isMovingWithMouseOffset)
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

    protected doSetValue(newValue: Value) {
        const oldValue = this._value
        if (newValue !== oldValue) {
            this._value = newValue
            this.setNeedsRedraw("value changed")
            this.propagateNewValue(newValue)
        }
    }

    public recalcValue() {
        this.doSetValue(this.doRecalcValue())
    }

    protected abstract doRecalcValue(): Value

    protected propagateNewValue(__newValue: Value) {
        // by default, do nothing
    }

    public setNeedsRecalc() {
        addComponentNeedingRecalc(this)
    }

    private updatePositionIfNeeded(e: MouseEvent | TouchEvent): undefined | [number, number] {
        const newPos = this.updateSelfPositionIfNeeded(e)
        if (isDefined(newPos)) { // position changed
            this.updateNodePositions()
        }
        return newPos
    }

    private updateNodePositions() {
        this.forEachNode((node) => {
            node.updatePositionFromParent()
            return true
        })
    }

    private updateSelfPositionIfNeeded(e: MouseEvent | TouchEvent): undefined | [number, number] {
        const [x, y] = offsetXY(e)
        const snapToGrid = !modifierKeys.isCommandDown
        if (this._state === ComponentState.SPAWNING) {
            return this.setPosition(x, y, snapToGrid)
        }
        if (isDefined(this._isMovingWithMouseOffset)) {
            const [mouseOffsetX, mouseOffsetY] = this._isMovingWithMouseOffset
            return this.setPosition(x + mouseOffsetX, y + mouseOffsetY, snapToGrid)
        }
        return undefined
    }

    mouseDown(e: MouseEvent | TouchEvent) {
        if (mode >= Mode.CONNECT) {
            if (isUndefined(this._isMovingWithMouseOffset)) {
                const [offsetX, offsetY] = offsetXY(e)
                this._isMovingWithMouseOffset = [this.posX - offsetX, this.posY - offsetY]
            }
        }
        return { lockMouseOver: true }
    }

    mouseDragged(e: MouseEvent | TouchEvent) {
        if (mode >= Mode.CONNECT) {
            this.updatePositionIfNeeded(e)
            setComponentMoving(this)
        }
    }

    mouseUp(__: MouseEvent | TouchEvent) {
        if (this._state === ComponentState.SPAWNING) {
            // const snapToGrid = !modifierKeys.isCommandDown
            // this.setPosition(e.offsetX, e.offsetY, snapToGrid)
            this._state = ComponentState.SPAWNED
        } else if (isDefined(this._isMovingWithMouseOffset)) {
            this._isMovingWithMouseOffset = undefined
        }
        setComponentStoppedMoving(this)
    }

    mouseDoubleClick(e: MouseEvent | TouchEvent): boolean {
        if (mode >= Mode.CONNECT && e.metaKey) {
            this.setOrient((() => {
                switch (this.orient) {
                    case "e": return "s"
                    case "s": return "w"
                    case "w": return "n"
                    case "n": return "e"
                }
            })())
            this.updateNodePositions()
            return true
        }
        return false
    }

    destroy() {
        this._state = ComponentState.DEAD
        this.forEachNode((node) => {
            node.destroy()
            return true
        })
    }

    get cursorWhenMouseover() {
        return "grab"
    }

}

export function defineComponent<NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize, T extends t.Mixed>(numInputs: NumInputs, numOutputs: NumOutputs, type: T) {
    const repr = t.intersection([ComponentRepr(numInputs, numOutputs), type], type.name)
    return {
        numInputs,
        numOutputs,
        repr,
        get reprType(): Expand<t.TypeOf<typeof repr>> { throw new Error() },
    } as const
}

export function extendComponent<NumInputs extends FixedArraySize, NumOutputs extends FixedArraySize, T extends t.Mixed, U extends t.Mixed>(superDef: { numInputs: NumInputs, numOutputs: NumOutputs, repr: T }, subType: U) {
    const repr = t.intersection([superDef.repr, subType], subType.name)
    return {
        numInputs: superDef.numInputs,
        numOutputs: superDef.numOutputs,
        repr,
        get reprType(): Expand<t.TypeOf<typeof repr>> { throw new Error() },
    } as const
}


export const INPUT_OUTPUT_DIAMETER = 25
