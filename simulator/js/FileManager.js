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

let eventHistory = [];

export class FileManager {

    constructor() {
        this.isLoadingState = false;
    }

    saveState() {
        /* TODO
        if(this.isLoadingState)
            return;
        
        eventHistory.unshift(FileManager.getJSON_Workspace("\t"));
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
        // logicInput.length = 0
        if ("logicInput" in parsedContents) {
            for (let i = 0; i < parsedContents.logicInput.length; i++) {
                let parsedVals = parsedContents.logicInput[i];

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

        // logic output
        // logicOutput.length = 0
        if ("logicOutput" in parsedContents) {
            for (let i = 0; i < parsedContents.logicOutput.length; i++) {
                let parsedVals = parsedContents.logicOutput[i];

                const newObj = new LogicOutput();
                if (parsedVals.name)
                    newObj.name = parsedVals.name
                newObj.posX = parsedVals.pos[0];
                newObj.posY = parsedVals.pos[1];
                newObj.value = !!(parsedVals.val);
                newObj.isSpawned = true;
                newObj.isSaved = true;
                newObj.nodeStartID = parsedVals.id;
                newObj.refreshNodes();

                logicOutput.push(newObj);
            }
        }

        // logicClock.length = 0
        if ("logicClock" in parsedContents) {
            for (let i = 0; i < parsedContents.logicClock.length; i++) {
                let parsedVals = parsedContents.logicClock[i];

                const newObj = new Clock()
                Object.assign(newObj, parsedVals); // TODO too generic
                newObj.refreshNodes();

                logicClock.push(newObj);
            }
        }

        // gate.length = 0
        if ("gate" in parsedContents) {
            for (let i = 0; i < parsedContents.gate.length; i++) {
                let parsedVals = parsedContents.gate[i];

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

        // srLatch.length = 0
        if ("srLatch" in parsedContents) {
            for (let i = 0; i < parsedContents.srLatch.length; i++) {
                let parsedVals = parsedContents.srLatch[i];

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

        // flipflop.length = 0
        if ("flipflop" in parsedContents) {
            for (let i = 0; i < parsedContents.flipflop.length; i++) {
                let parsedVals = parsedContents.flipflop[i];

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

        if ("wire" in parsedContents) {
            for (let i = 0; i < parsedContents.wire.length; i++) {
                let parsedVals = parsedContents.wire[i];
                wireMng.addNode(nodeList[parsedVals[0]]);
                wireMng.addNode(nodeList[parsedVals[1]]);
            }
        }
    }


    saveFile(e) {
        let jsonWorkspace = FileManager.getJSON_Workspace("\t");
        let blob = new Blob([jsonWorkspace], { type: 'application/json' });
        saveProjectFile.href = URL.createObjectURL(blob);
    }

    static getJSON_Workspace(jsonSep) {
        let workspace = new Object();

        if (logicInput.length) workspace["logicInput"] = logicInput;
        if (logicOutput.length) workspace["logicOutput"] = logicOutput;
        if (flipflop.length) workspace["flipflop"] = flipflop;
        if (logicClock.length) workspace["logicClock"] = logicClock;
        if (gate.length) workspace["gate"] = gate;
        if (srLatch.length) workspace["srLatch"] = srLatch;
        if (wireMng.wire.length) workspace["wire"] = wireMng.wire;

        let jsonWorkspace = JSON.stringify(workspace,
            function (key, value) {
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
            }, jsonSep);
        return jsonWorkspace;
    }
}
