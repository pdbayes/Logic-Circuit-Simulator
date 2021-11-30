import { LogicInput, LogicInputDef } from "./components/LogicInput"
import { LogicOutput, LogicOutputDef } from "./components/LogicOutput"
import { Clock, ClockDef } from "./components/Clock"
import { GateDef, GateFactory } from "./components/Gate"
import { stringifySmart } from "./stringifySmart"
import { Wire } from "./components/Wire"
import { DisplayDef, DisplayFactory } from "./components/Display"
import { isArray, isDefined, isString, isUndefined, keysOf } from "./utils"
import * as t from "io-ts"
import { PathReporter } from 'io-ts/PathReporter'
import { Component, ComponentTypes } from "./components/Component"
import { ICDef, ICFactory } from "./components/IC"
import { LogicEditor } from "./LogicEditor"

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

        for (const elem of components) {
            elem.destroy()
        }
        components.splice(0, components.length)
        wireMgr.clearAllWires()
        nodeMgr.clearAllLiveNodes()
        editor.timeline.reset()

        function loadField<T>(fieldName: string, repr: t.Type<T, any> | { repr: t.Type<T, any> }, process: (params: T) => any) {
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

        loadField("in", LogicInputDef, (d) =>
            components.push(new LogicInput(editor, d))
        )

        loadField("out", LogicOutputDef, (d) =>
            components.push(new LogicOutput(editor, d))
        )

        loadField("displays", DisplayDef, (d) =>
            components.push(DisplayFactory.make(editor, d))
        )

        loadField("clocks", ClockDef, (d) =>
            components.push(new Clock(editor, d))
        )

        loadField("gates", GateDef, (d) =>
            components.push(GateFactory.make(editor, d))
        )

        loadField("components", ICDef, (d) =>
            components.push(ICFactory.make(editor, d))
        )

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

        return stringifySmart(workspace, { maxLength: 85 })
    }
}

export const PersistenceManager = new _PersistenceManager()
