import * as t from "io-ts"
import JSON5 from "json5"
import { LogicEditor } from "./LogicEditor"
import { Serialization } from "./Serialization"
import { ALUDef } from "./components/ALU"
import { AdderDef } from "./components/Adder"
import { AdderArrayDef } from "./components/AdderArray"
import { Clock, ClockDef } from "./components/Clock"
import { ComparatorDef } from "./components/Comparator"
import { Component, ComponentBase, ComponentCategory, Params } from "./components/Component"
import { CounterDef } from "./components/Counter"
import { CustomComponentDef, CustomComponentDefRepr, CustomComponentPrefix } from "./components/CustomComponent"
import { DecoderDef } from "./components/Decoder"
import { Decoder16SegDef } from "./components/Decoder16Seg"
import { Decoder7SegDef } from "./components/Decoder7Seg"
import { DecoderBCD4Def } from "./components/DecoderBCD4"
import { DemuxDef } from "./components/Demux"
import { DrawableParent } from "./components/Drawable"
import { FlipflopDDef } from "./components/FlipflopD"
import { FlipflopJKDef } from "./components/FlipflopJK"
import { FlipflopTDef } from "./components/FlipflopT"
import { Gate1Def, GateNDef } from "./components/Gate"
import { GateArrayDef } from "./components/GateArray"
import { Gate1Types, GateNTypes } from "./components/GateTypes"
import { HalfAdderDef } from "./components/HalfAdder"
import { Input, InputDef } from "./components/Input"
import { InputRandomDef } from "./components/InputRandom"
import { LabelRectDef } from "./components/LabelRect"
import { LabelString, LabelStringDef } from "./components/LabelString"
import { LatchSRDef } from "./components/LatchSR"
import { MuxDef } from "./components/Mux"
import { Output, OutputDef } from "./components/Output"
import { Output16SegDef } from "./components/Output16Seg"
import { Output7SegDef } from "./components/Output7Seg"
import { OutputAsciiDef } from "./components/OutputAscii"
import { OutputBarDef } from "./components/OutputBar"
import { OutputDisplayDef } from "./components/OutputDisplay"
import { OutputShiftBufferDef } from "./components/OutputShiftBuffer"
import { PassthroughDef } from "./components/Passthrough"
import { RAMDef } from "./components/RAM"
import { ROMDef } from "./components/ROM"
import { RegisterDef } from "./components/Register"
import { ShiftRegisterDef } from "./components/ShiftRegister"
import { SwitchedInverterDef } from "./components/SwitchedInverter"
import { TriStateBufferDef } from "./components/TriStateBuffer"
import { TriStateBufferArrayDef } from "./components/TriStateBufferArray"
import { S } from "./strings"
import { JSONParseObject, isString, validateJson } from "./utils"

// Generic interface to instantiate components from scratch (possibly with params) or from JSON
type ComponentMaker<TParams extends Record<string, unknown>> = {
    isValid(): boolean,
    category: ComponentCategory,
    type: string | undefined,
    make(parent: DrawableParent, params?: TParams): Component,
    makeFromJSON(parent: DrawableParent, data: Record<string, unknown>): Component | undefined,
}

// Gate is special and needs its own ComponentMaker adapter
type GateParams = Params<typeof Gate1Def> | Params<typeof GateNDef> | { type: "TRI" }
const GateAdapter: ComponentMaker<GateParams> = {
    isValid: () => true,
    category: "gate",
    type: undefined,
    make: (editor, params) => {
        const type = params?.type ?? GateNDef.aults.type
        if (Gate1Types.includes(type)) {
            return Gate1Def.make(editor, params as Params<typeof Gate1Def>)
        } else if (GateNTypes.includes(type)) {
            return GateNDef.make(editor, params as Params<typeof GateNDef>)
        } else if (type === "TRI") {
            return TriStateBufferDef.make(editor)
        }
        // never reached
        throw new Error(`Invalid gate type ${type}`)
    },
    makeFromJSON: (editor, data) => {
        if (!isString(data.type)) {
            console.warn(`Missing gate type in ${data}`)
            return undefined
        }
        const type = data.type
        if (Gate1Types.includes(type)) {
            return Gate1Def.makeFromJSON(editor, data)
        } else if (GateNTypes.includes(type)) {
            return GateNDef.makeFromJSON(editor, data)
        } else if (type === "TRI") {
            return TriStateBufferDef.makeFromJSON(editor, data)
        }
        return undefined
    },
}

// All predefined components
const AllComponentDefs: ComponentMaker<any>[] = [
    // in
    InputDef,
    ClockDef,
    InputRandomDef,

    // out
    OutputDef,
    OutputDisplayDef,
    Output7SegDef,
    Output16SegDef,
    OutputAsciiDef,
    OutputBarDef,
    OutputShiftBufferDef,

    // gates
    GateAdapter,
    TriStateBufferDef,

    // ic
    SwitchedInverterDef,
    GateArrayDef,
    TriStateBufferArrayDef,
    HalfAdderDef,
    AdderDef,
    ComparatorDef,
    AdderArrayDef,
    ALUDef,
    MuxDef,
    DemuxDef,
    LatchSRDef,
    FlipflopJKDef,
    FlipflopTDef,
    FlipflopDDef,
    RegisterDef,
    ShiftRegisterDef,
    ROMDef,
    RAMDef,
    CounterDef,
    DecoderDef,
    Decoder7SegDef,
    Decoder16SegDef,
    DecoderBCD4Def,

    // labels
    LabelStringDef,
    LabelRectDef,

    // layout
    PassthroughDef,
]

// Data present in the HTMLElement of a component button
export type ButtonDataset = {
    category: ComponentCategory,
    type?: string,
    componentId?: string,
    params?: string,
}

export class ComponentFactory {

    public readonly editor: LogicEditor
    private readonly _predefinedComponents = new Map<string, ComponentMaker<any>>()
    private readonly _customComponents = new Map<string, CustomComponentDef>()

    public constructor(editor: LogicEditor) {
        this.editor = editor
        for (const maker of AllComponentDefs) {
            const key = maker.type !== undefined ? `${maker.category}.${maker.type}` : maker.category
            if (!maker.isValid()) {
                throw new Error(`Implementation missing for components of type '${key}'`)
            }
            // console.log(`Registering component for '${key}'`)
            if (this._predefinedComponents.has(key)) {
                throw new Error(`Duplicate component for components of type '${key}'`)
            }
            this._predefinedComponents.set(key, maker)
        }
    }


    // Component creation functions

    public makeFromJSON(parent: DrawableParent, category: string, obj_: unknown): Component | undefined {
        const obj = obj_ as Record<string, unknown>
        const type = isString(obj.type) ? obj.type : undefined
        const maker = this.getMaker(category, type)
        return maker?.makeFromJSON(parent, obj)
    }

    public makeFromButton(parent: DrawableParent, elem: HTMLElement) {
        const compDataset = elem.dataset as ButtonDataset
        const paramsStr = compDataset.params
        const maker = this.getMaker(compDataset.category, compDataset.type)
        const params = paramsStr === undefined ? undefined : JSON5.parse(paramsStr) as Record<string, unknown>
        return maker?.make(parent, params)

        // TODO further general component customisation based on editor options
        // const classId = compDataset.componentId
        // if (classId === undefined) {
        //     console.warn("No class ID linked to elem " + elem.outerHTML)
        // } else {
        //     const compConfig = editor.options.initParams?.[classId]
        //     if (compConfig !== undefined) {
        //         let val
        //         if ((val = compConfig.orient) !== undefined) {
        //             newComp.doSetOrient(val)
        //         }
        //     }

    }

    private getMaker(category: string, type?: string): ComponentMaker<any> | undefined {
        let maker
        if (type !== undefined) {
            if (type.startsWith(CustomComponentPrefix)) {
                const customId = type.substring(CustomComponentPrefix.length)
                maker = this._customComponents.get(customId)
            } else {
                // specific type
                maker = this._predefinedComponents.get(`${category}.${type}`)
                if (maker === undefined) {
                    // maybe a more generic maker handles it
                    maker = this._predefinedComponents.get(category)
                }
            }
        } else {
            // no type, use generic maker
            maker = this._predefinedComponents.get(category)
        }
        if (maker === undefined) {
            console.warn(`Unknown component for '${category}.${type}'`)
        }
        return maker
    }


    // Custom components handling

    public customDefs(): CustomComponentDef[] | undefined {
        if (this._customComponents.size === 0) {
            return undefined
        }
        return [...this._customComponents.values()]
    }

    public clearCustomDefs() {
        this._customComponents.clear()
    }

    public tryAddCustomDef(defRepr: CustomComponentDefRepr): ComponentMaker<any> | undefined {
        // Calling this may change the list of custom defs, we may need to update the UI
        const id = defRepr.id
        if (this._customComponents.has(id)) {
            console.warn(`Could not add custom component with duplicate id '${id}'`)
            return undefined
        }

        const def = new CustomComponentDef(defRepr)
        this._customComponents.set(id, def)
        return def
    }

    public tryLoadCustomDefsFrom(defs: unknown) {
        // Calling this may change the list of custom defs, we may need to update the UI
        if (defs === undefined) {
            return
        }
        const validatedDefs = validateJson(defs, t.array(CustomComponentDefRepr), "defs")
        if (validatedDefs !== undefined) {
            for (const validatedDef of validatedDefs) {
                this.tryAddCustomDef(validatedDef)
            }
        }
    }

    public hasCustomComponents() {
        return this._customComponents.size > 0
    }

    public tryMakeNewCustomComponent(editor: LogicEditor): undefined | string {
        const s = S.Components.Custom.messages

        const selectionAll = editor.cursorMovementMgr.currentSelection?.previouslySelectedElements
        if (selectionAll === undefined) {
            return s.EmptySelection
        }
        const selectedComps = [...selectionAll].filter((e): e is Component => e instanceof ComponentBase)
        if (selectedComps.length === 0) {
            return s.EmptySelection
        }

        const inputs = selectedComps.filter((e): e is Input => e instanceof Input)
        if (inputs.length === 0) {
            return s.NoInput
        }

        const outputs = selectedComps.filter((e): e is Output => e instanceof Output)
        if (outputs.length === 0) {
            return s.NoOutput
        }


        // Check that all inputs and outputs have names
        function checkNames(inOuts: Array<Input | Output>): boolean {
            const names = new Set<string>()
            for (const inOut of inOuts) {
                const name = (inOut as Input | Output).name
                if (!isString(name) || names.has(name)) {
                    return false
                }
                names.add(name)
            }
            return true
        }

        const namesValid = checkNames(inputs) && checkNames(outputs)
        if (!namesValid) {
            return s.InputsOutputsMustHaveNames
        }


        const componentsToInclude: Component[] = [...inputs, ...outputs]
        const queue: Component[] = []
        let comp

        // Go forward from inputs to keep all linked components.
        // We don't complain about linked components that are not in the selection
        // as we allow inputs to connect to other stuff as well.
        queue.push(...inputs)
        while ((comp = queue.shift()) !== undefined) {
            for (const node of comp.outputs._all) {
                for (const wire of node.outgoingWires) {
                    const otherComp = wire.endNode.component
                    if (selectedComps.includes(otherComp)
                        && !componentsToInclude.includes(otherComp)) {
                        componentsToInclude.push(otherComp)
                        queue.push(otherComp)
                    }
                }
            }
        }

        // Go backward from outputs to include all linked components
        // and make sure all necessary components are in the selection.
        queue.push(...outputs)
        const missingComponents: Component[] = []
        while ((comp = queue.shift()) !== undefined) {
            for (const node of comp.inputs._all) {
                const wire = node.incomingWire
                if (wire !== null) {
                    const otherComp = wire.startNode.component

                    if (!selectedComps.includes(otherComp)) {
                        // this component is missing from the selection
                        if (!missingComponents.includes(otherComp)) {
                            missingComponents.push(otherComp)
                        }
                    } else {
                        if (!componentsToInclude.includes(otherComp)) {
                            componentsToInclude.push(otherComp)
                            queue.push(otherComp)
                        }
                    }
                }
            }
        }

        if (missingComponents.length > 0) {
            const missingCompsStr = missingComponents.map(c => c.toString()).join(", ")
            return s.MissingComponents.expand({ list: missingCompsStr })
        }

        const uselessComponents = selectedComps.filter(c =>
            !componentsToInclude.includes(c)
            // allow disconnected comps that have no inputs or outputs, e.g. labels
            && (c.inputs._all.length !== 0 || c.outputs._all.length !== 0)
        )
        if (uselessComponents.length > 0) {
            const uselessCompsStr = uselessComponents.map(c => c.toString()).join(", ")
            return s.UselessComponents.expand({ list: uselessCompsStr })
        }

        if (componentsToInclude.some(c => c instanceof Clock)) {
            return s.CannotIncludeClock
        }

        let caption
        const labels = selectedComps.filter((e): e is LabelString => e instanceof LabelString)
        if (labels.length !== 1) {
            caption = window.prompt(s.EnterCaptionPrompt)
            if (caption === null) {
                return ""
            }
        } else {
            caption = labels[0].text
        }
        const id = makeIdentifier(caption)
        if (this._customComponents.has(id)) {
            return s.ComponentAlreadyExists.expand({ id })
        }

        // we have to stringify and parse because stringifying actually calls toJSON()
        const circuit =
            JSONParseObject(
                Serialization.stringifyObject(
                    Serialization.buildComponentsObject(componentsToInclude), true
                )
            ) as ReturnType<typeof Serialization.buildComponentsObject>

        const maker = this.tryAddCustomDef({ id, caption, circuit })
        if (maker === undefined) {
            return ""
        }

        const customComp = maker.make(editor)
        customComp.setSpawned()
        customComp.setPosition(editor.mouseX + customComp.unrotatedWidth / 2 - 5, editor.mouseY, true)
        editor.cursorMovementMgr.currentSelection = undefined
        editor.cursorMovementMgr.setCurrentMouseOverComp(customComp)

        return undefined // success
    }
}


function makeIdentifier(name: string): string {
    return name
        .trim()
        .normalize("NFKD")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/\./g, "")
}