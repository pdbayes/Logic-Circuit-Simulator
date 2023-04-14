import { saveAs } from 'file-saver'
import { CurrentFormatVersion, migrateData } from './DataMigration'
import { LogicEditor } from "./LogicEditor"
import { Component, ComponentCategories, JsonFieldsComponents, MainJsonFieldName } from "./components/Component"
import { type CustomComponentDefRepr } from './components/CustomComponent'
import { DrawableParent } from './components/Drawable'
import { Wire } from "./components/Wire"
import { stringifySmart } from "./stringifySmart"
import { JSONParseObject, isArray, isDefined, isString, isUndefined, keysOf, validateJson } from "./utils"

class _PersistenceManager {

    // Library

    public saveLibraryToFile(editor: LogicEditor) {
        const jsonStr = this.stringifyObject(this.buildLibraryObject(editor), false)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const filename = (editor.options.name ?? "circuit") + ".lib.json"
        saveAs(blob, filename)
    }

    public loadLibrary(editor: LogicEditor, content: string) {
        const parsed = JSONParseObject(content)
        migrateData(parsed)
        editor.factory.tryLoadCustomDefsFrom(parsed.defs)
        editor.updateCustomComponentButtons()
    }


    // Circuit

    public saveCircuitToFile(editor: LogicEditor) {
        const jsonStr = this.stringifyObject(this.buildCircuitObject(editor), false)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const filename = (editor.options.name ?? "circuit") + ".json"
        saveAs(blob, filename)
    }

    public loadCircuit(
        parent: DrawableParent, content: string | Record<string, unknown>,
        opts?: {
            isUndoRedoAction?: boolean,
            immediateWirePropagation?: boolean,
            skipMigration?: boolean
        }): undefined | string { // string is an error
        const nodeMgr = parent.nodeMgr
        const wireMgr = parent.wireMgr
        const components = parent.components

        let parsed: Record<string, unknown>
        if (!isString(content)) {
            parsed = { ...content } // copy
        } else {
            try {
                parsed = JSONParseObject(content)
            } catch (err) {
                console.error(err)
                return "can't load this JSON - error “" + err + `”, length = ${content.length}, JSON:\n` + content
            }
        }


        if (!(opts?.skipMigration ?? false)) {
            migrateData(parsed)
        }
        delete parsed["v"]

        if (parent.isMainEditor()) {
            parent.factory.clearCustomDefs()
            parent.factory.tryLoadCustomDefsFrom(parsed.defs)
            delete parsed.defs
        }

        for (const elem of components.all()) {
            elem.destroy()
        }
        components.clearAll()
        wireMgr.clearAllWires()
        nodeMgr.clearAllLiveNodes()
        if (parent.isMainEditor()) {
            parent.timeline.reset()
        }

        function loadField(fieldName: MainJsonFieldName | "wires", process: (obj: unknown) => any) {
            if (!(fieldName in parsed)) {
                return
            }
            const objects = parsed[fieldName]
            delete parsed[fieldName]

            if (!isArray(objects)) {
                return
            }
            for (const obj of objects) {
                process(obj)
            }
        }

        const factory = parent.editor.factory
        for (const category of ComponentCategories) {
            const fieldName = ComponentCategories.props[category].jsonFieldName
            loadField(fieldName, obj => {
                factory.makeFromJSON(parent, category, obj)
            })
        }

        // recalculating all the unconnected gates here allows
        // to avoid spurious circular dependency messages, as right
        // now all components are marked as needing recalculating
        const recalcMgr = parent.recalcMgr
        recalcMgr.recalcAndPropagateIfNeeded()

        const immediateWirePropagation = opts?.immediateWirePropagation ?? false
        loadField("wires", obj => {
            const wireData = validateJson(obj, Wire.Repr, "wire")
            if (isUndefined(wireData)) {
                return
            }

            const [nodeID1, nodeID2, wireOptions] = wireData
            const node1 = nodeMgr.findNode(nodeID1)
            const node2 = nodeMgr.findNode(nodeID2)
            if (!isUndefined(node1) && !isUndefined(node2) && node1.isOutput() && !node2.isOutput()) {
                const completedWire = wireMgr.addWire(node1, node2, false)
                if (isDefined(completedWire)) {
                    if (isDefined(wireOptions)) {
                        completedWire.ref = wireOptions.ref
                        if (isDefined(wireOptions.via)) {
                            completedWire.setWaypoints(wireOptions.via)
                        }
                        if (isDefined(wireOptions.propagationDelay)) {
                            completedWire.customPropagationDelay = wireOptions.propagationDelay
                        }
                        if (isDefined(wireOptions.style)) {
                            completedWire.doSetStyle(wireOptions.style)
                        }
                    }

                    if (immediateWirePropagation) {
                        completedWire.customPropagationDelay = 0
                    }
                }
                recalcMgr.recalcAndPropagateIfNeeded()
            }
        })

        if (parent.isMainEditor()) {
            // load userdata, keeping already existing data
            if (isDefined(parsed.userdata)) {
                if (typeof parent.userdata === "object" && typeof parsed.userdata === "object") {
                    // merge
                    parent.userdata = {
                        ...parsed.userdata,
                        ...parent.userdata,
                    }
                } else {
                    // cannot merge, keep existing data
                }
                delete parsed.userdata
            }

            // also works with undefined
            // must be done AFTER setting user data to ensure the UI is updated accordingly
            parent.setPartialOptions(parsed.opts as any)
            delete parsed.opts

            const isUndoRedoAction = opts?.isUndoRedoAction ?? false
            if (!isUndoRedoAction) {
                parent.undoMgr.takeSnapshot()
            }

            parent.updateCustomComponentButtons()
        }

        const unhandledData = keysOf(parsed)
        if (unhandledData.length !== 0) {
            console.log("Unloaded data fields: " + unhandledData.join(", "))
        }

        return undefined // meaning no error
    }

    public buildCircuitObject(editor: LogicEditor): Record<string, unknown> {
        const dataObject: Record<string, unknown> = {
            "v": CurrentFormatVersion,
            "opts": editor.nonDefaultOptions(),
            "defs": editor.factory.customDefs(),
        }

        if (isDefined(editor.userdata)) {
            dataObject["userdata"] = editor.userdata
        }

        this.buildComponentReprsInto(dataObject, editor.components.all(), editor.wireMgr.wires)
        return dataObject
    }

    public buildLibraryObject(editor: LogicEditor): Record<string, unknown> {
        return {
            "v": CurrentFormatVersion,
            "defs": editor.factory.customDefs(),
        }
    }

    public buildComponentsObject(components: readonly Component[]): Record<string, unknown[]> {
        const dataObject: Record<string, unknown[]> = {}

        // collect all wires that connect to components within the list
        const wires: Wire[] = []
        for (const comp of components) {
            for (const nodeIn of comp.inputs._all) {
                const wire = nodeIn.incomingWire
                if (wire !== null && components.includes(wire.startNode.component)) {
                    wires.push(wire)
                }
            }
        }
        this.buildComponentReprsInto(dataObject, components, wires)
        return dataObject
    }

    private buildComponentReprsInto(dataObject: Record<string, unknown>, components: Iterable<Component>, wires: readonly Wire[]): void {
        for (const comp of components) {
            const fieldName = ComponentCategories.props[comp.category].jsonFieldName
            let arr = dataObject[fieldName]
            if (isUndefined(arr)) {
                dataObject[fieldName] = (arr = [comp])
            } else if (isArray(arr)) {
                arr.push(comp)
            }
        }
        if (wires.length !== 0) {
            dataObject.wires = wires
        }
        // TODO: better way of representing the wires, along these lines:
        // const nodeName = (node: Node) => {
        //     const group = node.group
        //     if (isUndefined(group)) {
        //         return node.shortName
        //     }
        //     const nodeIndex = group.nodes.indexOf(node as any)
        //     return `${group.name}[${nodeIndex}]`
        // }

        // const wires: Record<string, Record<string, string>> = {}

        // for (const comp of componentsToInclude) {
        //     const ref = componentToRef.get(comp)!
        //     for (const node of comp.inputs._all) {
        //         const wire = node.incomingWire
        //         if (wire !== null) {
        //             const nodeInName = nodeName(node)
        //             const nodeOut = wire.startNode
        //             const otherComp = nodeOut.component
        //             const sourceRef = `${componentToRef.get(otherComp)!}.${nodeName(nodeOut)}`;

        //             (wires[ref] ?? (wires[ref] = {}))[nodeInName] = sourceRef
        //         }
        //     }
        // }
    }

    public removeShowOnlyFrom(dataObject: Record<string, unknown>): void {
        const opts = dataObject.opts as any
        if (typeof opts === "object" && opts !== null && Object.prototype.hasOwnProperty.call(opts, "showOnly")) {
            delete opts.showOnly
        }
    }

    public stringifyObject(_dataObject: Readonly<Record<string, unknown>>, compact: boolean): string {

        // TODO: refactor this to not touch input object and not do this "delete dataObject.key" thing
        if (compact) {
            return JSON.stringify(_dataObject)
        }

        // Custom stringifier to have always one component per line and
        // spaces after commas

        const dataObject = { ..._dataObject }

        const parts: string[] = []

        stringifyCompactReprTo(parts, dataObject, "v")
        stringifyCompactReprTo(parts, dataObject, "opts")
        stringifyCompactReprTo(parts, dataObject, "userdata")

        const defs = dataObject.defs
        if (isDefined(defs) && isArray(defs)) {
            const defparts: string[] = []
            for (const def of defs as Partial<CustomComponentDefRepr>[]) {
                const circuit = def.circuit!
                delete def.circuit
                let subpart = stringifySmart(def, { maxLength: Infinity })
                def.circuit = circuit
                const compparts: string[] = []
                stringifyComponentAndWiresReprsTo(compparts, { ...circuit }, true)
                const circuitRepr = compparts.length === 0 ? "{}" : "{\n      " + compparts.join(",\n      ") + "\n    }"
                subpart = subpart.slice(0, subpart.length - 1) + `, "circuit": ` + circuitRepr + "}"
                defparts.push(subpart)
            }
            parts.push(`"defs": [\n    ` + defparts.join(",\n    ") + "\n  ]")
        }
        delete dataObject.defs

        stringifyComponentAndWiresReprsTo(parts, dataObject, false)

        // loop though the remaining fields
        const unprocessedFields = keysOf(dataObject)
        if (unprocessedFields.length !== 0) {
            console.error("ERROR: unprocessed fields in stringified JSON: " + unprocessedFields.join(", "))
        }

        return "{\n  " + parts.join(",\n  ") + "\n}"
    }

}

function stringifyCompactReprTo(parts: string[], container: Record<string, unknown>, key: string) {
    const value = container[key]
    if (isDefined(value)) {
        parts.push(`"${key}": ${stringifySmart(value, { maxLength: Infinity })}`)
    }
    delete container[key]
}

function stringifyComponentAndWiresReprsTo(parts: string[], container: Record<string, unknown>, inDef: boolean) {
    const innerIndent = "  ".repeat(inDef ? 4 : 2)
    const outerIndent = "  ".repeat(inDef ? 3 : 1)
    for (const jsonField of JsonFieldsComponents) {
        const arr = container[jsonField]
        if (isDefined(arr) && isArray(arr)) {
            const subparts: string[] = []
            for (const comp of arr) {
                subparts.push(stringifySmart(comp, { maxLength: Infinity }))
            }
            parts.push(`"${jsonField}": [\n${innerIndent}` + subparts.join(`,\n${innerIndent}`) + `\n${outerIndent}]`)
            delete container[jsonField]
        }
    }
    stringifyCompactReprTo(parts, container, "wires")
}

export const PersistenceManager = new _PersistenceManager()
