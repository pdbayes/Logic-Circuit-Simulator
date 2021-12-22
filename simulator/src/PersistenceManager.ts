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

    doLoadFromJson(editor: LogicEditor, content: string | any): boolean {
        const nodeMgr = editor.nodeMgr
        const wireMgr = editor.wireMgr
        const components = editor.components

        let parsedContents: any
        if (!isString(content)) {
            parsedContents = content
        } else {
            try {
                parsedContents = JSON.parse(content)
            } catch (err) {
                console.log("Can't load this JSON, " + err)
                console.log(content)
                return false
            }
        }

        let jsonVersion = parsedContents["v"] ?? 0
        if (jsonVersion === 0) {
            migrate0To1(parsedContents)
            jsonVersion = 1
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
        loadComponentField("gates", GateDef, GateFactory)
        loadComponentField("components", ICDef, ICFactory)

        // recalculating all the unconnected gates here allows
        // to avoid spurious circular dependency messages, as right
        // now all components are marked as needing recalculating
        const recalcMgr = editor.recalcMgr
        recalcMgr.recalculateIfNeeded()

        loadField("wires", Wire.Repr, ([nodeID1, nodeID2, waypointsObj]) => {
            const node1 = nodeMgr.findNode(nodeID1)
            const node2 = nodeMgr.findNode(nodeID2)
            if (!isUndefined(node1) && !isUndefined(node2)) {
                wireMgr.addNode(node1)
                const completedWire = wireMgr.addNode(node2)
                if (isDefined(completedWire) && isDefined(waypointsObj)) {
                    completedWire.setWaypoints(waypointsObj.waypoints)
                }
                recalcMgr.recalculateIfNeeded()
            }
        })

        // also works with undefined
        editor.setPartialDisplayOptions(parsedContents.opts)
        delete parsedContents.opts

        const unhandledData = keysOf(parsedContents)
        if (unhandledData.length !== 0) {
            console.log("Unloaded data fields: " + unhandledData.join(", "))
        }

        return true
    }

    buildWorkspaceJSON(editor: LogicEditor) {
        const workspace: any = {
            "v": 1,
            "opts": editor.nonDefaultDisplayOptions(),
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
        const filename = "circuit.json"

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
    console.log("Migrating JSON from version 0 to 1")

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

