import { logicInputs, logicOutputs, gates, clocks, saveProjectFile, displays, allComponents, wireMgr, recalculate } from "./simulator"
import { LogicInput, LogicInputDef } from "./components/LogicInput"
import { LogicOutput, LogicOutputDef } from "./components/LogicOutput"
import { Clock, ClockDef } from "./components/Clock"
import { GateDef, GateFactory } from "./components/Gate"
import { stringifySmart } from "./stringifySmart"
import { WireRepr } from "./components/Wire"
import { DisplayDef, DisplayFactory } from "./components/Display"
import { NodeManager } from "./NodeManager"
import { isArray, isString, isUndefined, keysOf } from "./utils"
import * as t from "io-ts"
import { PathReporter } from 'io-ts/PathReporter'

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

        for (const elems of allComponents) {
            elems.splice(0, elems.length)
        }
        wireMgr.clearAllWires()
        NodeManager.clearAllLiveNodes()

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
            logicInputs.push(new LogicInput(d))
        )

        loadField("out", LogicOutputDef, (d) =>
            logicOutputs.push(new LogicOutput(d))
        )

        loadField("displays", DisplayDef, (d) =>
            displays.push(DisplayFactory.make(d))
        )

        loadField("clocks", ClockDef, (d) =>
            clocks.push(new Clock(d))
        )

        loadField("gates", GateDef, (d) =>
            gates.push(GateFactory.make(d))
        )

        // recalculating all the unconnected gates here allows
        // to avoid spurious circular dependency messages, as right
        // now all components are marked as needing recalculating
        recalculate()

        loadField("wires", WireRepr, ([nodeID1, nodeID2]) => {
            const node1 = NodeManager.findNode(nodeID1)
            const node2 = NodeManager.findNode(nodeID2)
            if (!isUndefined(node1) && !isUndefined(node2)) {
                wireMgr.addNode(node1)
                wireMgr.addNode(node2)
                recalculate()
            }
        })

        const unhandledData = keysOf(parsedContents)
        if (unhandledData.length !== 0) {
            console.log("Unloaded data fields: " + unhandledData.join(", "))
        }

        return true
    }

    saveFile() {
        const jsonWorkspace = this.buildWorkspaceJSON()
        const blob = new Blob([jsonWorkspace], { type: 'application/json' })
        if (saveProjectFile) {
            saveProjectFile.href = URL.createObjectURL(blob)
        }
    }

    buildWorkspaceJSON() {
        const workspace: any = {}

        function add(array: readonly any[], fieldName: string) {
            if (array.length !== 0) {
                workspace[fieldName] = array
            }
        }

        add(logicInputs, "in")
        add(logicOutputs, "out")
        add(displays, "displays")
        add(clocks, "clocks")
        add(gates, "gates")
        // add(flipflops, "flipflops")
        // add(srLatches, "srLatches")
        add(wireMgr.wires, "wires")

        const jsonStr = stringifySmart(workspace, { maxLength: 85 })
        // console.log(jsonStr)
        return jsonStr
    }
}

export const PersistenceManager = new _PersistenceManager()
