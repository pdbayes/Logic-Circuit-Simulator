import { logicInput, logicOutput, gate, flipflop, logicClock, srLatch, wireMng } from "./simulator.js"
import { LogicInput } from "./circuit_components/LogicInput.js"
import { LogicOutput } from "./circuit_components/LogicOutput.js";
import { Clock } from "./circuit_components/Clock.js";
import { Gate } from "./circuit_components/Gate.js";
import { Integrated } from "./circuit_components/Integrated.js";
import { IC_type } from "./circuit_components/Enums.js";
import { FF_D_Single, FF_D_MasterSlave } from "./circuit_components/FF_D.js";
import { FF_T } from "./circuit_components/FF_T.js";
import { FF_JK } from "./circuit_components/FF_JK.js";
import { SR_LatchAsync, SR_LatchSync, SR_Latch } from "./circuit_components/SR_Latch.js";
import { nodeList } from "./circuit_components/Node.js";
import { stringify2 } from "./stringify2.js";

let eventHistory = [];

export class FileManager {

    constructor() {
        this.isLoadingState = false;
    }

    saveState() {
        /* TODO
        if(this.isLoadingState)
            return;
        
        eventHistory.unshift(FileManager.getJSON_Workspace());
        if (eventHistory.length > 10) {
            delete eventHistory[10];
            eventHistory.length = 10;
        }
        console.log(eventHistory);*/
    }

    loadFile(e) {

        //this.e = e;

        let file = e.target.files.item(0);

        let reader = new FileReader();

        const _this = this;
        reader.onload = function () {

            let contentFile = reader.result;
            //console.log(contentFile);

            _this.doLoadFromJsonString(contentFile);
        };
        reader.readAsText(file);
    }

    doLoadFromJsonString(content) {
        this.isLoadingState = true;

        flipflop.splice(0, flipflop.length);
        srLatch.splice(0, srLatch.length);
        gate.splice(0, gate.length);
        wireMng.wire.splice(0, wireMng.wire.length);
        logicClock.splice(0, logicClock.length);
        logicInput.splice(0, logicInput.length);
        logicOutput.splice(0, logicOutput.length);
        nodeList.splice(0, nodeList.length);

        const parsedContents = JSON.parse(content)

        // logic input
        if ("in" in parsedContents) {
            for (let i = 0; i < parsedContents.in.length; i++) {
                let parsedVals = parsedContents.in[i];

                const newObj = new LogicInput();
                if (parsedVals.name)
                    newObj.name = parsedVals.name
                newObj.posX = parsedVals.pos[0];
                newObj.posY = parsedVals.pos[1];
                newObj.value = !!(parsedVals.val);
                newObj.isSpawned = true;
                newObj.isSaved = true;
                newObj.nodeStartID = parsedVals.id;
                newObj.refreshNodes();

                logicInput.push(newObj);
            }
        }
        // console.log("logicInput", logicInput)

        // logic output
        if ("out" in parsedContents) {
            for (let i = 0; i < parsedContents.out.length; i++) {
                let parsedVals = parsedContents.out[i];

                const newObj = new LogicOutput();
                if (parsedVals.name)
                    newObj.name = parsedVals.name
                newObj.posX = parsedVals.pos[0];
                newObj.posY = parsedVals.pos[1];
                newObj.isSpawned = true;
                newObj.isSaved = true;
                newObj.nodeStartID = parsedVals.id;
                newObj.refreshNodes();

                logicOutput.push(newObj);
            }
        }
        // console.log("logicOutput", logicOutput)

        if ("clocks" in parsedContents) {
            for (let i = 0; i < parsedContents.clocks.length; i++) {
                let parsedVals = parsedContents.clocks[i];

                const newObj = new Clock()
                Object.assign(newObj, parsedVals); // TODO too generic
                newObj.refreshNodes();

                logicClock.push(newObj);
            }
        }
        // console.log("logicClock", logicClock)

        if ("gates" in parsedContents) {
            for (let i = 0; i < parsedContents.gates.length; i++) {
                let parsedVals = parsedContents.gates[i];

                const newObj = new Gate(parsedVals.type)
                newObj.posX = parsedVals.pos[0];
                newObj.posY = parsedVals.pos[1];
                newObj.isSpawned = true;
                newObj.isSaved = true;
                newObj.nodeStartID = parsedVals.id;
                newObj.refreshNodes();

                gate.push(newObj);
            }
        }
        // console.log("gate", gate)

        if ("srLatches" in parsedContents) {
            for (let i = 0; i < parsedContents.srLatches.length; i++) {
                let parsedVals = parsedContents.srLatches[i];

                let newObj = null;
                switch (parsedContents.srLatch[i].type) {
                    case IC_type.SR_LATCH_ASYNC:
                        newObj = new SR_LatchAsync(parsedVals.gateType,
                            parsedVals.stabilize)
                        srLatch.push();
                        break;
                    case IC_type.SR_LATCH_SYNC:
                        newObj = new SR_LatchSync(parsedVals.gateType,
                            parsedVals.stabilize)
                        break;
                }

                if (newObj) {
                    Object.assign(newObj, parsedVals); // TODO too generic
                    newObj.refreshNodes();

                    srLatch.push(newObj);
                }
            }
        }
        // console.log("srLatch", srLatch)

        if ("flipflops" in parsedContents) {
            for (let i = 0; i < parsedContents.flipflops.length; i++) {
                let parsedVals = parsedContents.flipflops[i];

                let newObj = null;
                switch (parsedContents.flipflop[i].type) {
                    case IC_type.FF_D_SINGLE:
                        newObj = new FF_D_Single(parsedContents.flipflop[i].type);
                        break;
                    case IC_type.FF_D_MASTERSLAVE:
                        newObj = new FF_D_MasterSlave(parsedContents.flipflop[i].type);
                        break;
                    case IC_type.FF_T:
                        newObj = new FF_T(parsedContents.flipflop[i].type);
                        break;
                    case IC_type.FF_JK:
                        newObj = new FF_JK(parsedContents.flipflop[i].type);
                        break;
                }

                if (newObj) {
                    Object.assign(newObj, parsedVals); // TODO too generic
                    newObj.refreshNodes();
                    flipflop.push(newObj);
                }
            }
        }
        // console.log("flipflop", flipflop)
        // console.log("nodeList", nodeList)

        if ("wires" in parsedContents) {
            for (let i = 0; i < parsedContents.wires.length; i++) {
                let parsedVals = parsedContents.wires[i];
                wireMng.addNode(nodeList[parsedVals[0]]);
                wireMng.addNode(nodeList[parsedVals[1]]);
            }
        }
        // console.log("wireMng.wire", wireMng.wire)
    }


    saveFile(e) {
        let jsonWorkspace = FileManager.getJSON_Workspace();
        let blob = new Blob([jsonWorkspace], { type: 'application/json' });
        saveProjectFile.href = URL.createObjectURL(blob);
    }

    static getJSON_Workspace() {
        let workspace = new Object();

        if (logicInput.length) workspace["in"] = logicInput;
        if (logicOutput.length) workspace["out"] = logicOutput;
        if (flipflop.length) workspace["flipflops"] = flipflop;
        if (logicClock.length) workspace["clocks"] = logicClock;
        if (gate.length) workspace["gates"] = gate;
        if (srLatch.length) workspace["srLatches"] = srLatch;
        if (wireMng.wire.length) workspace["wires"] = wireMng.wire;

        return stringify2(workspace, {
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
                        return undefined;
                }

                // other things which is not possible to export on JSON
                return value;
            }
        });
    }
}
