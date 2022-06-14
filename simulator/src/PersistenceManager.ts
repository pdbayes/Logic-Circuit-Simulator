import { GateDef, GateFactory } from "./components/Gate"
import { stringifySmart } from "./stringifySmart"
import { Wire } from "./components/Wire"
import { isArray, isDefined, isString, isUndefined, keysOf } from "./utils"
import * as t from "io-ts"
import { PathReporter } from 'io-ts/PathReporter'
import { Component, ComponentTypes, MainJsonFieldName } from "./components/Component"
import { ICDef, ICFactory } from "./components/IC"
import { LogicEditor } from "./LogicEditor"
import { InputDef, InputFactory } from "./components/Inputs"
import { OutputDef, OutputFactory } from "./components/Outputs"

class _PersistenceManager {

    loadFile(editor: LogicEditor, e: Event) {
        const sourceElem = e.target as HTMLInputElement
        const file = sourceElem.files?.item(0)
        if (!file) {
            return
        }

        const reader = new FileReader()

        reader.onload = () => {
            const contentFile = reader.result
            //console.log(contentFile);
            if (isString(contentFile)) {
                this.doLoadFromJson(editor, contentFile)
            }
        }
        reader.readAsText(file)
    }

    doLoadFromJson(editor: LogicEditor, content: string | Record<string, unknown>): undefined | string { // string is an error
        const nodeMgr = editor.nodeMgr
        const wireMgr = editor.wireMgr
        const components = editor.components

        let parsedContents: Record<string, unknown>
        if (!isString(content)) {
            parsedContents = content
        } else {
            try {
                parsedContents = JSON.parse(content)
            } catch (err) {
                return "can't load this JSON - error " + err
            }
        }

        let jsonVersion = parsedContents["v"] ?? 0
        const savedVersion = jsonVersion
        if (jsonVersion === 0) {
            migrate0To1(parsedContents)
            jsonVersion = 1
        }
        if (jsonVersion === 1) {
            migrate1To2(parsedContents)
            jsonVersion = 2
        }
        if (jsonVersion === 2) {
            migrate2To3(parsedContents)
            jsonVersion = 3
        }
        if (jsonVersion !== savedVersion) {
            console.log(`Migrated data format from v${savedVersion} to v${jsonVersion}, consider upgrading the source`)
        }
        delete parsedContents["v"]

        for (const elem of components) {
            elem.destroy()
        }
        components.splice(0, components.length)
        wireMgr.clearAllWires()
        nodeMgr.clearAllLiveNodes()
        editor.timeline.reset()

        function loadField<T>(fieldName: MainJsonFieldName | "wires", repr: t.Type<T, any> | { repr: t.Type<T, any> }, process: (params: T) => any) {
            if (!(fieldName in parsedContents)) {
                return
            }
            const fieldValues = parsedContents[fieldName]
            delete parsedContents[fieldName]

            if (!isArray(fieldValues)) {
                return
            }
            if ("repr" in repr) {
                repr = repr.repr
            }
            for (const someDefinition of fieldValues) {
                const validated = repr.decode(someDefinition)
                switch (validated._tag) {
                    case "Left":
                        console.log(`ERROR while parsing ${repr.name} from %o -> %s: `, someDefinition, PathReporter.report(validated).join("; "))
                        break
                    case "Right":
                        process(validated.right)
                        break
                }
            }
        }

        type Factory<T> = {
            make: (editor: LogicEditor, savedDataOrType: T) => Component | undefined
        }

        function loadComponentField<T>(fieldName: MainJsonFieldName, repr: t.Type<T, any> | { repr: t.Type<T, any> }, factory: Factory<T>) {
            loadField(fieldName, repr, (d) => {
                const comp = factory.make(editor, d)
                if (isDefined(comp)) {
                    components.push(comp)
                }
            })
        }

        loadComponentField("in", InputDef, InputFactory)
        loadComponentField("out", OutputDef, OutputFactory)
        loadComponentField("gates", GateDef, GateFactory as any)
        loadComponentField("components", ICDef, ICFactory)

        // recalculating all the unconnected gates here allows
        // to avoid spurious circular dependency messages, as right
        // now all components are marked as needing recalculating
        const recalcMgr = editor.recalcMgr
        recalcMgr.recalcAndPropagateIfNeeded()

        loadField("wires", Wire.Repr, ([nodeID1, nodeID2, wireOptions]) => {
            const node1 = nodeMgr.findNode(nodeID1)
            const node2 = nodeMgr.findNode(nodeID2)
            if (!isUndefined(node1) && !isUndefined(node2)) {
                wireMgr.addNode(node1)
                const completedWire = wireMgr.addNode(node2)
                if (isDefined(completedWire) && isDefined(wireOptions)) {
                    completedWire.ref = wireOptions.ref
                    if (isDefined(wireOptions.via)) {
                        completedWire.setWaypoints(wireOptions.via)
                    }
                    if (isDefined(wireOptions.propagationDelay)) {
                        completedWire.customPropagationDelay = wireOptions.propagationDelay
                    }
                }
                recalcMgr.recalcAndPropagateIfNeeded()
            }
        })

        // load userdata, keeping already existing data
        if (isDefined(parsedContents.userdata)) {
            if (typeof editor.userdata === "object" && typeof parsedContents.userdata === "object") {
                // merge
                editor.userdata = {
                    ...parsedContents.userdata,
                    ...editor.userdata,
                }
            } else {
                // cannot merge, keep existing data
            }
            delete parsedContents.userdata
        }

        // also works with undefined
        // must be done AFTER setting user data to ensure the UI is updated accordingly
        editor.setPartialOptions(parsedContents.opts as any)
        delete parsedContents.opts

        const unhandledData = keysOf(parsedContents)
        if (unhandledData.length !== 0) {
            console.log("Unloaded data fields: " + unhandledData.join(", "))
        }

        return undefined // meaning no error
    }

    buildWorkspaceAsObject(editor: LogicEditor): Record<string, unknown> {
        return JSON.parse(this.buildWorkspaceJSON(editor))
    }

    buildWorkspaceJSON(editor: LogicEditor) {
        const workspace: any = {
            "v": 3,
            "opts": editor.nonDefaultOptions(),
        }

        if (isDefined(editor.userdata)) {
            workspace["userdata"] = editor.userdata
        }

        for (const comp of editor.components) {
            const fieldName = ComponentTypes.propsOf(comp.componentType).jsonFieldName
            let arr: Component[] = workspace[fieldName]
            if (isUndefined(arr)) {
                workspace[fieldName] = (arr = [])
            }
            arr.push(comp)
        }

        const wireMgr = editor.wireMgr
        if (wireMgr.wires.length !== 0) {
            workspace.wires = wireMgr.wires
        }

        return stringifySmart(workspace, { maxLength: 150 })
    }

    saveToFile(editor: LogicEditor) {
        const workspaceJsonStr = this.buildWorkspaceJSON(editor)
        const blob = new Blob([workspaceJsonStr], { type: 'application/json' })
        const filename = (editor.options.name ?? "circuit") + ".json"

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename

        const clickHandler = () => {
            setTimeout(() => {
                URL.revokeObjectURL(url)
                a.removeEventListener('click', clickHandler)
            }, 150)
        }

        a.addEventListener('click', clickHandler, false)
        a.click()
    }

}

export const PersistenceManager = new _PersistenceManager()


function migrate0To1(workspace: any) {
    // all displays are now out
    if ("displays" in workspace) {
        const displays = workspace.displays
        delete workspace.displays
        if (!("out" in workspace)) {
            workspace.out = []
        }
        for (const display of displays) {
            workspace.out.push(display)
        }
    }

    // all clocks are now in
    if ("clocks" in workspace) {
        const clocks = workspace.clocks
        delete workspace.clocks
        if (!("in" in workspace)) {
            workspace.in = []
        }
        for (const clock of clocks) {
            clock.type = "clock"
            workspace.in.push(clock)
        }
    }

    // flipflops have a different input node order
    if ("components" in workspace) {
        const components = workspace.components
        for (const comp of components) {
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            if (comp.type.startsWith("flipflop")) {
                // extract last three inputs
                const inputs: Array<number> = comp.in
                const lastThree = inputs.splice(-3)
                comp.in = [...lastThree, ...inputs]
            }
        }
    }
}


function migrate1To2(workspace: any) {
    // waypoints -> via
    if ("wires" in workspace) {
        const wires = workspace.wires
        if (Array.isArray(wires)) {
            for (const wire of wires) {
                if (Array.isArray(wire) && wire.length === 3) {
                    const wireOptions = wire[2]
                    if ("waypoints" in wireOptions) {
                        wireOptions.via = wireOptions.waypoints
                        delete wireOptions.waypoints
                    }
                }
            }
        }
    }
}

function migrate2To3(parsedContents: any) {
    // add new input to ALU
    let nextNewId = 1000 // TODO be smarter about this
    if ("components" in parsedContents) {
        const components = parsedContents.components
        if (Array.isArray(components)) {
            for (const comp of components) {
                if ("type" in comp && comp.type === "alu") {
                    if (Array.isArray(comp.in)) {
                        comp.in.push(nextNewId++)
                    }
                }
            }
        }
    }
}
