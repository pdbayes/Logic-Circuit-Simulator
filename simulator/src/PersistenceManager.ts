import { wireMgr, components, nonDefaultOptions, setOptions } from "./simulator"
import { LogicInput, LogicInputDef } from "./components/LogicInput"
import { LogicOutput, LogicOutputDef } from "./components/LogicOutput"
import { Clock, ClockDef } from "./components/Clock"
import { GateDef, GateFactory } from "./components/Gate"
import { stringifySmart } from "./stringifySmart"
import { WireRepr } from "./components/Wire"
import { DisplayDef, DisplayFactory } from "./components/Display"
import { NodeManager } from "./NodeManager"
import { isArray, isDefined, isString, isUndefined, keysOf } from "./utils"
import * as t from "io-ts"
import { PathReporter } from 'io-ts/PathReporter'
import { RecalcManager } from "./RedrawRecalcManager"
import { Timeline } from "./Timeline"
import { Component, ComponentTypes } from "./components/Component"
import { ICDef, ICFactory } from "./components/IC"

class _PersistenceManager {

    loadFile(e: Event) {
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
                this.doLoadFromJson(contentFile)
            }
        }
        reader.readAsText(file)
    }

    doLoadFromJson(content: string | any): boolean {
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
        NodeManager.clearAllLiveNodes()
        Timeline.reset()

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
            components.push(new LogicInput(d))
        )

        loadField("out", LogicOutputDef, (d) =>
            components.push(new LogicOutput(d))
        )

        loadField("displays", DisplayDef, (d) =>
            components.push(DisplayFactory.make(d))
        )

        loadField("clocks", ClockDef, (d) =>
            components.push(new Clock(d))
        )

        loadField("gates", GateDef, (d) =>
            components.push(GateFactory.make(d))
        )

        loadField("components", ICDef, (d) => {
            const comp = ICFactory.make(d)
            if (isDefined(comp)) {
                components.push(comp)
            }
        })

        // recalculating all the unconnected gates here allows
        // to avoid spurious circular dependency messages, as right
        // now all components are marked as needing recalculating
        RecalcManager.recalculateIfNeeded()

        loadField("wires", WireRepr, ([nodeID1, nodeID2, waypointsObj]) => {
            const node1 = NodeManager.findNode(nodeID1)
            const node2 = NodeManager.findNode(nodeID2)
            if (!isUndefined(node1) && !isUndefined(node2)) {
                wireMgr.addNode(node1)
                const completedWire = wireMgr.addNode(node2)
                if (isDefined(completedWire) && isDefined(waypointsObj)) {
                    completedWire.setWaypoints(waypointsObj.waypoints)
                }
                RecalcManager.recalculateIfNeeded()
            }
        })

        // also works with undefined
        setOptions(parsedContents.opts)
        delete parsedContents.opts

        const unhandledData = keysOf(parsedContents)
        if (unhandledData.length !== 0) {
            console.log("Unloaded data fields: " + unhandledData.join(", "))
        }

        return true
    }

    buildWorkspaceJSON() {
        const workspace: any = {
            "opts": nonDefaultOptions(),
        }

        for (const comp of components) {
            const fieldName = ComponentTypes.propsOf(comp.componentType).jsonFieldName
            let arr: Component[] = workspace[fieldName]
            if (isUndefined(arr)) {
                workspace[fieldName] = (arr = [])
            }
            arr.push(comp)
        }
        if (wireMgr.wires.length !== 0) {
            workspace.wires = wireMgr.wires
        }

        return stringifySmart(workspace, { maxLength: 85 })
    }

    saveToFile() {
        const workspaceJsonStr = this.buildWorkspaceJSON()
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
