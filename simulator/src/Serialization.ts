import { saveAs } from 'file-saver'
import * as t from "io-ts"
import JSON5 from "json5"
import * as json5util from "json5/lib/util"
import { CurrentFormatVersion, migrateData } from './DataMigration'
import { LogicEditor } from "./LogicEditor"
import { type Component } from "./components/Component"
import { type CustomComponentDefRepr } from './components/CustomComponent'
import { DrawableParent } from './components/Drawable'
import { Wire } from "./components/Wire"
import { JSONParseObject, isArray, isRecord, isString, keysOf, validateJson } from "./utils"


export type Circuit = CommonFields & {
    opts?: Record<string, unknown>,
    userdata?: string | Record<string, unknown> | undefined
} & ComponentAndWires

export type Library = CommonFields

type CommonFields = {
    v: typeof CurrentFormatVersion,
    defs?: CustomComponentDefRepr[],
}

type WireRepr = t.TypeOf<typeof Wire.Repr>
export type ComponentAndWires = {
    components?: Record<string, Record<string, unknown>>,
    wires?: WireRepr[],
}

class _Serialization {

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
        parent: DrawableParent,
        content: string | Record<string, unknown>,
        opts?: {
            isUndoRedoAction?: boolean,
            immediateWirePropagation?: boolean,
            skipMigration?: boolean
        }
    ): undefined | string { // string is an error

        const nodeMgr = parent.nodeMgr
        const wireMgr = parent.wireMgr
        const components = parent.components

        let parsed: Record<string, unknown>
        if (!isString(content)) {
            parsed = { ...content } // copy
        } else {
            try {
                parsed = JSONParseObject(content)
                if (!(opts?.skipMigration ?? false)) {
                    migrateData(parsed)
                }
                delete parsed.v
            } catch (err) {
                console.error(err)
                return "can't load this JSON - error “" + err + `”, length = ${content.length}, JSON:\n` + content
            }
        }

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

        const factory = parent.editor.factory
        const compReprs = parsed.components
        if (isArray(compReprs)) {
            // parse using ids from attributes
            for (const compRepr of compReprs as unknown[]) {
                factory.makeFromJSON(parent, compRepr)
            }
        } else if (isRecord(compReprs)) {
            // parse using ids from keys
            for (const [id, compRepr] of Object.entries(compReprs)) {
                if (isRecord(compRepr)) {
                    compRepr.ref = id
                    factory.makeFromJSON(parent, compRepr)
                } else {
                    console.error(`Invalid non-object component repr: '${compRepr}'`)
                }
            }
        }
        delete parsed.components

        // recalculating all the unconnected gates here allows
        // to avoid spurious circular dependency messages, as right
        // now all components are marked as needing recalculating
        const recalcMgr = parent.recalcMgr
        recalcMgr.recalcAndPropagateIfNeeded()

        const immediateWirePropagation = opts?.immediateWirePropagation ?? false
        for (const obj of (isArray(parsed.wires) ? parsed.wires as unknown[] : [])) {
            const wireData = validateJson(obj, Wire.Repr, "wire")
            if (wireData === undefined) {
                return
            }

            const [nodeID1, nodeID2, wireOptions] = wireData
            const node1 = nodeMgr.findNode(nodeID1)
            const node2 = nodeMgr.findNode(nodeID2)
            if (node1 !== undefined && node2 !== undefined && node1.isOutput() && !node2.isOutput()) {
                const completedWire = wireMgr.addWire(node1, node2, false)
                if (completedWire !== undefined) {
                    if (wireOptions !== undefined) {
                        completedWire.doSetValidatedId(wireOptions.ref)
                        if (wireOptions.via !== undefined) {
                            completedWire.setWaypoints(wireOptions.via)
                        }
                        if (wireOptions.propagationDelay !== undefined) {
                            completedWire.customPropagationDelay = wireOptions.propagationDelay
                        }
                        if (wireOptions.style !== undefined) {
                            completedWire.doSetStyle(wireOptions.style)
                        }
                    }

                    if (immediateWirePropagation) {
                        completedWire.customPropagationDelay = 0
                    }
                }
                recalcMgr.recalcAndPropagateIfNeeded()
            }
        }
        delete parsed.wires

        if (parent.isMainEditor()) {
            // load userdata, keeping already existing data
            if (parsed.userdata !== undefined) {
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

    public buildCircuitObject(editor: LogicEditor): Circuit {
        const dataObject: Circuit = {
            v: CurrentFormatVersion,
            opts: editor.nonDefaultOptions(),
            defs: editor.factory.customDefs(),
            userdata: editor.userdata,
        }

        this.buildComponentReprsInto(dataObject, editor.components.all(), editor.wireMgr.wires)
        return dataObject
    }

    public buildLibraryObject(editor: LogicEditor): Library {
        return {
            v: CurrentFormatVersion,
            defs: editor.factory.customDefs(),
        }
    }

    public buildComponentsObject(components: readonly Component[]): ComponentAndWires {
        const dataObject: ComponentAndWires = {}

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

    private buildComponentReprsInto(dataObject: ComponentAndWires, components: Iterable<Component>, wires: readonly Wire[]): void {
        for (const comp of components) {
            if (dataObject.components === undefined) {
                dataObject.components = {}
            }

            const id = comp.ref
            if (id === undefined) {
                console.error("Skipping component with no id: " + comp)
                continue
            }

            if (dataObject.components[id] !== undefined) {
                console.error("Skipping component with duplicate id: " + comp)
            }

            const compRepr = comp.toJSON()
            dataObject.components[id] = compRepr
        }
        if (wires.length !== 0) {
            dataObject.wires = wires.map(w => w.toJSON())
        }
        // TODO: better way of representing the wires, along these lines:
        // const nodeName = (node: Node) => {
        //     const group = node.group
        //     if (group === undefined) {
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

    public removeShowOnlyFrom(dataObject: Circuit): void {
        if (dataObject.opts !== undefined) {
            delete dataObject.opts.showOnly
        }
    }

    public stringifyObject(_dataObject: Partial<Circuit>, compact: boolean): string {

        // TODO: refactor this to not touch input object and not do this "delete dataObject.key" thing
        if (compact) {
            return JSON5.stringify(_dataObject)
        }

        // Custom stringifier to have always one component per line and
        // spaces after commas

        const dataObject = { ..._dataObject }

        const parts: string[] = []

        stringifyCompactReprTo(parts, dataObject, "v")
        stringifyCompactReprTo(parts, dataObject, "opts")
        stringifyCompactReprTo(parts, dataObject, "userdata")

        const defs = dataObject.defs
        if (defs !== undefined && isArray(defs)) {
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

        return "{ //JSON5\n  " + parts.join(",\n  ") + "\n}"
    }

}

export const Serialization = new _Serialization()


function stringifyCompactReprTo<TRec extends Record<string, unknown>>(parts: string[], container: TRec, key: keyof TRec & string) {
    const value = container[key]
    if (value !== undefined) {
        parts.push(`${stringifyKey(key)}: ${stringifySmart(value, { maxLength: Infinity })}`)
    }
    delete container[key]
}

function stringifyComponentAndWiresReprsTo(parts: string[], container: ComponentAndWires, inDef: boolean) {
    const innerIndent = "  ".repeat(inDef ? 4 : 2)
    const outerIndent = "  ".repeat(inDef ? 3 : 1)
    const comps = container.components
    let entries
    if (comps !== undefined) {

        if (isArray(comps) && comps.length !== 0) {
            // array style
            const subparts: string[] = []
            for (const compRepr of comps) {
                subparts.push(stringifySmart(compRepr, { maxLength: Infinity }))
            }
            parts.push(`components: [\n${innerIndent}` + subparts.join(`,\n${innerIndent}`) + `,\n${outerIndent}]`)

        } else if ((entries = Object.entries(comps)).length !== 0) {
            // object style
            const subparts: string[] = []
            for (const [id, compRepr] of entries) {
                delete compRepr.ref
                subparts.push(`${stringifyKey(id)}: ${stringifySmart(compRepr, { maxLength: Infinity })}`)
            }
            parts.push(`components: {\n${innerIndent}` + subparts.join(`,\n${innerIndent}`) + `,\n${outerIndent}}`)
        }
    }
    delete container.components
    stringifyCompactReprTo(parts, container, "wires")
}


// Note: This regex matches even invalid JSON strings, but since we’re
// working on the output of `JSON.stringify` we know that only valid strings
// are present (unless the user supplied a weird `options.indent` but in
// that case we don’t care since the output would be invalid anyway).
const stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g

export function stringifySmart(
    passedObj: any,
    options?: {
        replacer?: (this: any, key: string, value: any) => any,
        indent?: number | string,
        maxLength?: number
    }
): string {

    options ??= {}
    const indent: string = JSON.stringify([1], undefined, options.indent ?? 2).slice(2, -3)
    const maxLength: number =
        indent === ""
            ? Infinity
            : options.maxLength ?? 80

    let replacer = options.replacer

    return (function _stringify(obj: any, currentIndent: string, reserved: number): string {
        if (obj !== undefined && typeof obj.toJSON === "function") {
            obj = obj.toJSON()
        }

        const string = JSON5.stringify(obj, replacer)

        if (string === undefined) {
            return string
        }

        let length = maxLength - currentIndent.length - reserved

        if (string.length <= length) {
            const prettified = string.replace(
                stringOrChar,
                function (match, stringLiteral) {
                    return stringLiteral ?? match + " "
                }
            )
            if (prettified.length <= length) {
                return prettified
            }
        }

        if (replacer !== null) {
            obj = JSON5.parse(string)
            replacer = undefined
        }

        if (typeof obj === "object" && obj !== null) {
            const nextIndent = currentIndent + indent
            const items: string[] = []
            let index = 0

            let start: string
            let end: string
            if (Array.isArray(obj)) {
                start = "["
                end = "]"
                length = obj.length
                for (; index < length; index++) {
                    items.push(
                        _stringify(obj[index], nextIndent, index === length - 1 ? 0 : 1) ||
                        "null"
                    )
                }
            } else {
                start = "{"
                end = "}"
                const keys = Object.keys(obj)
                length = keys.length
                for (; index < length; index++) {
                    const key = keys[index]
                    const keyPart = stringifyKey(key) + ": "
                    const value = _stringify(
                        obj[key],
                        nextIndent,
                        keyPart.length + (index === length - 1 ? 0 : 1)
                    )
                    if (value !== undefined) {
                        items.push(keyPart + value)
                    }
                }
            }

            if (items.length > 0) {
                return [start, indent + items.join(",\n" + nextIndent), end].join(
                    "\n" + currentIndent
                )
            }
        }

        return string
    })(passedObj, "", 0)
}

// Adapted from JSON5 (https://github.com/json5/json5), MIT license
function stringifyKey(key: string): string {
    if (key.length === 0) {
        return quoteString(key)
    }

    const firstChar = String.fromCodePoint(key.codePointAt(0)!)
    if (!json5util.isIdStartChar(firstChar)) {
        return quoteString(key)
    }

    for (let i = firstChar.length; i < key.length; i++) {
        if (!json5util.isIdContinueChar(String.fromCodePoint(key.codePointAt(i)!))) {
            return quoteString(key)
        }
    }

    return key
}

const replacements: Record<string, string> = {
    "'": "\\'",
    '"': '\\"',
    '\\': '\\\\',
    '\b': '\\b',
    '\f': '\\f',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\v': '\\v',
    '\0': '\\0',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
}

function quoteString(value: string): string {
    const quotes = {
        "'": 0.1,
        '"': 0.2,
    }

    let product = ''

    for (let i = 0; i < value.length; i++) {
        const c = value[i]
        switch (c) {
            case "'":
            case '"':
                quotes[c]++
                product += c
                continue

            case '\0':
                if (json5util.isDigit(value[i + 1])) {
                    product += '\\x00'
                    continue
                }
        }

        if (replacements[c] !== undefined) {
            product += replacements[c]
            continue
        }

        if (c < ' ') {
            const hexString = c.charCodeAt(0).toString(16)
            product += '\\x' + ('00' + hexString).substring(hexString.length)
            continue
        }
        product += c
    }

    const quoteChar = keysOf(quotes).reduce(function (a, b) { return (quotes[a] < quotes[b]) ? a : b })
    product = product.replace(new RegExp(quoteChar, 'g'), replacements[quoteChar])
    return quoteChar + product + quoteChar
}