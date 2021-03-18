import { logicInputs, logicOutputs, gates, flipflops, clocks, srLatches, wireMng, saveProjectFile, displays, displaysA, displaysB, isNullOrUndefined, isString, allComponents } from "./simulator.js"
import { LogicInput } from "./circuit_components/LogicInput.js"
import { LogicOutput } from "./circuit_components/LogicOutput.js"
import { Clock } from "./circuit_components/Clock.js"
import { Gate } from "./circuit_components/Gate.js"
import { ICType } from "./circuit_components/Enums.js"
import { FF_D_Single, FF_D_MasterSlave } from "./circuit_components/FF_D.js"
import { FF_T } from "./circuit_components/FF_T.js"
import { FF_JK } from "./circuit_components/FF_JK.js"
import { SR_LatchAsync, SR_LatchSync } from "./circuit_components/SR_Latch.js"
import { nodeList } from "./circuit_components/Node.js"
import { stringifySmart } from "./stringifySmart.js"
import { FourBitDisplay } from "./circuit_components/FourBitDisplay.js"
import { AsciiDisplay } from "./circuit_components/AsciiDisplay.js"
import { Wire } from "./circuit_components/Wire.js"
import { BarDisplay } from "./circuit_components/BarDisplay.js"

// let eventHistory = []

export class FileManager {

    public isLoadingState = false

    saveState() {
        // TODO
        // if(this.isLoadingState)
        //     return

        // eventHistory.unshift(FileManager.getJSON_Workspace())
        // if (eventHistory.length > 10) {
        //     delete eventHistory[10]
        //     eventHistory.length = 10
        // }
        // console.log(eventHistory)
    }

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
        this.isLoadingState = true

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
        wireMng.wire.splice(0, wireMng.wire.length)
        nodeList.splice(0, nodeList.length)

        type JsonReprOf<T extends { toJSON(): any }> = ReturnType<T["toJSON"]>

        if ("in" in parsedContents) {
            for (let i = 0; i < parsedContents.in.length; i++) {
                const parsedVals = parsedContents.in[i] as JsonReprOf<LogicInput>
                logicInputs.push(LogicInput.from(
                    parsedVals.id,
                    parsedVals.pos,
                    !!parsedVals.val,
                    parsedVals.name
                ))
            }
        }

        if ("out" in parsedContents) {
            for (let i = 0; i < parsedContents.out.length; i++) {
                const parsedVals = parsedContents.out[i] as JsonReprOf<LogicOutput>
                logicOutputs.push(LogicOutput.from(
                    parsedVals.id,
                    parsedVals.pos,
                    parsedVals.name,
                ))
            }
        }

        if ("displays" in parsedContents) {
            for (let i = 0; i < parsedContents.displays.length; i++) {
                const parsedVals = parsedContents.displays[i] as JsonReprOf<FourBitDisplay>
                displays.push(FourBitDisplay.from(
                    parsedVals.id,
                    parsedVals.pos,
                    parsedVals.radix,
                    parsedVals.name
                ))
            }
        }

        if ("displaysA" in parsedContents) {
            for (let i = 0; i < parsedContents.displaysA.length; i++) {
                const parsedVals = parsedContents.displaysA[i] as JsonReprOf<AsciiDisplay>
                displaysA.push(AsciiDisplay.from(
                    parsedVals.id,
                    parsedVals.pos,
                    parsedVals.name
                ))
            }
        }

        if ("displaysB" in parsedContents) {
            for (let i = 0; i < parsedContents.displaysB.length; i++) {
                const parsedVals = parsedContents.displaysB[i] as JsonReprOf<BarDisplay>
                displaysB.push(BarDisplay.from(
                    parsedVals.id,
                    parsedVals.pos,
                    parsedVals.display
                ))
            }
        }

        if ("clocks" in parsedContents) {
            for (let i = 0; i < parsedContents.clocks.length; i++) {
                const parsedVals = parsedContents.clocks[i]

                const newObj = new Clock(0, 0)// TODO fill real numbers
                Object.assign(newObj, parsedVals) // TODO too generic
                newObj.refreshNodes()

                clocks.push(newObj)
            }
        }

        if ("gates" in parsedContents) {
            for (let i = 0; i < parsedContents.gates.length; i++) {
                const parsedVals = parsedContents.gates[i] as JsonReprOf<Gate>
                gates.push(Gate.from(
                    parsedVals.type,
                    parsedVals.pos,
                    parsedVals.id,
                ))
            }
        }

        if ("srLatches" in parsedContents) {
            for (let i = 0; i < parsedContents.srLatches.length; i++) {
                const parsedVals = parsedContents.srLatches[i]

                let newObj = null
                switch (parsedContents.srLatch[i].type) {
                    case ICType.SR_LATCH_ASYNC:
                        newObj = new SR_LatchAsync(parsedVals.gateType,
                            parsedVals.stabilize)
                        srLatches.push()
                        break
                    case ICType.SR_LATCH_SYNC:
                        newObj = new SR_LatchSync(parsedVals.gateType,
                            parsedVals.stabilize)
                        break
                }

                if (newObj) {
                    Object.assign(newObj, parsedVals) // TODO too generic
                    newObj.refreshNodes()

                    srLatches.push(newObj)
                }
            }
        }

        if ("flipflops" in parsedContents) {
            for (let i = 0; i < parsedContents.flipflops.length; i++) {
                const parsedVals = parsedContents.flipflops[i]

                let newObj = null
                switch (parsedVals.type) {
                    case ICType.FF_D_SINGLE:
                        newObj = new FF_D_Single()
                        break
                    case ICType.FF_D_MASTERSLAVE:
                        newObj = new FF_D_MasterSlave()
                        break
                    case ICType.FF_T:
                        newObj = new FF_T(parsedVals.isNegativeEdgeTrig)
                        break
                    case ICType.FF_JK:
                        newObj = new FF_JK(parsedVals.isNegativeEdgeTrig)
                        break
                }

                if (newObj) {
                    Object.assign(newObj, parsedVals) // TODO too generic
                    newObj.refreshNodes()
                    flipflops.push(newObj)
                }
            }
        }

        if ("wires" in parsedContents) {
            for (let i = 0; i < parsedContents.wires.length; i++) {
                const parsedVals = parsedContents.wires[i] as JsonReprOf<Wire>
                if (isNullOrUndefined(parsedVals[1])) {
                    continue
                }
                wireMng.addNode(nodeList[parsedVals[0]])
                wireMng.addNode(nodeList[parsedVals[1]])
            }
        }

        return true
    }


    saveFile() {
        const jsonWorkspace = FileManager.getJSON_Workspace()
        const blob = new Blob([jsonWorkspace], { type: 'application/json' })
        if (saveProjectFile) {
            saveProjectFile.href = URL.createObjectURL(blob)
        }
    }

    static getJSON_Workspace() {
        const workspace: any = {}

        if (logicInputs.length) { workspace["in"] = logicInputs }
        if (logicOutputs.length) { workspace["out"] = logicOutputs }
        if (displays.length) { workspace["displays"] = displays }
        if (displaysA.length) { workspace["displaysA"] = displaysA }
        if (displaysB.length) { workspace["displaysB"] = displaysB }
        if (clocks.length) { workspace["clocks"] = clocks }
        if (flipflops.length) { workspace["flipflops"] = flipflops }
        if (gates.length) { workspace["gates"] = gates }
        if (srLatches.length) { workspace["srLatches"] = srLatches }
        if (wireMng.wire.length) { workspace["wires"] = wireMng.wire }

        console.log(workspace)

        const jsonStr = stringifySmart(workspace, {
            replacer: function (key, value) {
                // filter out the values of all these keys
                // TODO: should be done in toJSON() method
                switch (key) {
                    case "output":
                    case "input":
                    case "nodeSet":
                    case "nodeReset":
                    case "nodeClock":
                    case "nodeD":
                    case "nodeT":
                    case "nodeJ":
                    case "nodeK":
                    case "nodeQ":
                    case "nodeNotQ":
                    case "andGate_NotQ":
                    case "andGate_Q":
                    case "ff_D":
                    case "orGate":
                    case "gateSet":
                    case "gateReset":
                    case "asyncLatch":
                    case "master":
                    case "slave":
                    case "srLatchSync":
                    case "startNode":
                    case "endNode":
                        return undefined
                }

                // other things which is not possible to export on JSON
                return value
            },
        })

        console.log(jsonStr)

        return jsonStr
    }
}
