import { activeTool, currMouseAction } from "./menutools.js"
import { MouseAction } from "./circuit_components/Enums.js"
import { WireManager } from "./circuit_components/Wire.js";
import { FileManager } from "./FileManager.js"

export let gateIMG = []; // gates images
export let IC_IMG = []; // integrated circuits images
export let gate = [];
export let logicInput = [];
export let logicOutput = [];
export let logicClock = [];
export let srLatch = [];
export let flipflop = [];
export let wireMng;
export let colorMouseOver = [0, 0x7B, 0xFF];
export let fileManager = new FileManager();

let canvasContainer;
let initialData = null;

export function preload() {
    gateIMG.push(loadImage('simulator/img/LogicInput.svg'));// For testing usage
    gateIMG.push(loadImage('simulator/img/NOT.svg'));
    gateIMG.push(loadImage('simulator/img/AND.svg'));
    gateIMG.push(loadImage('simulator/img/NAND.svg'));
    gateIMG.push(loadImage('simulator/img/OR.svg'));
    gateIMG.push(loadImage('simulator/img/NOR.svg'));
    gateIMG.push(loadImage('simulator/img/XOR.svg'));
    gateIMG.push(loadImage('simulator/img/XNOR.svg'));

    IC_IMG.push(loadImage('simulator/img/SR_Latch.svg')); // For testing usage
    IC_IMG.push(loadImage('simulator/img/SR_Latch.svg'));
    IC_IMG.push(loadImage('simulator/img/SR_Latch_Sync.svg'));
    IC_IMG.push(loadImage('simulator/img/FF_D.svg'));
    IC_IMG.push(loadImage('simulator/img/FF_D_MS.svg'));
    IC_IMG.push(loadImage('simulator/img/FF_T.svg'));
    IC_IMG.push(loadImage('simulator/img/FF_JK.svg'));

}


function getURLParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
    return undefined
}

function isEmbeddedInIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

const PARAM_DATA = "data"
const PARAM_SHOW_ONLY = "showonly"
const PARAM_NO_CONTROLS = "nocontrols"

export function setup() {
    canvasContainer = document.getElementById("canvas-sim");

    let canvas = createCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight, P2D);

    canvas.parent('canvas-sim');

    wireMng = new WireManager();

    const leftToolbar = document.getElementById("leftToolbar");
    const toolbarChildren = leftToolbar.children;

    let showonly = getURLParameter(PARAM_SHOW_ONLY);
    if (showonly) {
        showonly = showonly.toUpperCase().split(/[, ]+/).filter(x => x.trim());
        for (let i = 0; i < toolbarChildren.length; i++) {
            const child = toolbarChildren[i]
            const tool = child.getAttribute("tool")
            if (child.tagName == "BUTTON" && tool && child.getAttribute("isGate") == "true" && !showonly.includes(tool)) {
                child.style.display = "none";
            }
        }
    } else {

    }

    const data = getURLParameter(PARAM_DATA)
    if (data) {
        initialData = data;
        tryLoadFromData();
    }

    let showControls = true;
    const nocontrols = getURLParameter(PARAM_NO_CONTROLS);
    if (nocontrols && (nocontrols == "1" || nocontrols.toLowerCase() == "true")) {
        showControls = false;
    }

    if (showControls) {

        document.getElementById("leftToolbar").style.display = null;
        const modifButtons = document.querySelectorAll("button.sim-modification-tool");
        for (let i = 0; i < modifButtons.length; i++) {
            modifButtons[i].style.display = null;
        }

        if (!isEmbeddedInIframe()) {
            const dumpJsonStructure = document.getElementById("dumpJsonStructure")
            // if (dumpJsonStructure) {
            dumpJsonStructure.setAttribute("style", "");
            dumpJsonStructure.addEventListener("click", (e) => {
                const humanJson = FileManager.getJSON_Workspace("  ");
                console.log("JSON:\n" + humanJson)
                const encodedJson = btoa(FileManager.getJSON_Workspace(0)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "%3D");
                const loc = window.location;
                window.history.replaceState(null, null, loc.protocol + "//" + loc.host + loc.pathname + "?data=" + encodedJson);
            }, false);
        }
    }

    document.getElementById("rightToolbarContainer").style.visibility = null;
}

export function tryLoadFromData() {
    if (!initialData)
        return;
    try {
        const decodedData = atob(initialData.replaceAll("-", "+").replaceAll("_", "/").replaceAll("%3D", "="));
        fileManager.doLoadFromJsonString(decodeURIComponent(decodedData));
    } catch (e) {
        console.trace(e);
    }
}

export function windowResized() {
    resizeCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight);
    // document.getElementsByClassName("tools")[0].style.height = canvHeight;
}

export function draw() {
    background(0xFF);
    fill(0xFF);

    stroke(200);
    strokeWeight(2);
    rect(0, 0, width, height);

    stroke(0);
    wireMng.draw();

    for (let i = 0; i < gate.length; i++)
        gate[i].draw();

    for (let i = 0; i < logicInput.length; i++)
        logicInput[i].draw();

    for (let i = 0; i < logicOutput.length; i++)
        logicOutput[i].draw();

    for (let i = 0; i < logicClock.length; i++)
        logicClock[i].draw();

    for (let i = 0; i < srLatch.length; i++)
        srLatch[i].draw();

    for (let i = 0; i < flipflop.length; i++)
        flipflop[i].draw();

    if (fileManager.isLoadingState)
        fileManager.isLoadingState = false;

}

/**
 * While mouse is pressed:
 *  
 */
export function mousePressed() {
    /** Check gate[] mousePressed funtion*/
    for (let i = 0; i < gate.length; i++)
        gate[i].mousePressed();

    for (let i = 0; i < logicInput.length; i++)
        logicInput[i].mousePressed();

    for (let i = 0; i < logicOutput.length; i++)
        logicOutput[i].mousePressed();

    for (let i = 0; i < logicClock.length; i++)
        logicClock[i].mousePressed();

    for (let i = 0; i < srLatch.length; i++)
        srLatch[i].mousePressed();

    for (let i = 0; i < flipflop.length; i++)
        flipflop[i].mousePressed();
}

export function mouseReleased() {
    for (let i = 0; i < gate.length; i++)
        gate[i].mouseReleased();

    for (let i = 0; i < logicInput.length; i++)
        logicInput[i].mouseReleased();

    for (let i = 0; i < logicOutput.length; i++)
        logicOutput[i].mouseReleased();

    for (let i = 0; i < logicClock.length; i++)
        logicClock[i].mouseReleased();

    for (let i = 0; i < srLatch.length; i++)
        srLatch[i].mouseReleased();

    for (let i = 0; i < flipflop.length; i++)
        flipflop[i].mouseReleased();
}

export function doubleClicked() {
    for (let i = 0; i < logicInput.length; i++)
        logicInput[i].doubleClicked();
}

/**
 * Override mouseClicked Function
 * 
 */
export function mouseClicked() {
    //Check current selected option
    if (currMouseAction == MouseAction.EDIT) {
        //If action is EDIT, check every class. 
        for (let i = 0; i < gate.length; i++)
            gate[i].mouseClicked();

        for (let i = 0; i < logicInput.length; i++)
            logicInput[i].mouseClicked();

        for (let i = 0; i < logicOutput.length; i++)
            logicOutput[i].mouseClicked();

        for (let i = 0; i < logicClock.length; i++)
            logicClock[i].mouseClicked();

        for (let i = 0; i < srLatch.length; i++)
            srLatch[i].mouseClicked();

        for (let i = 0; i < flipflop.length; i++)
            flipflop[i].mouseClicked();

    } else if (currMouseAction == MouseAction.DELETE) {
        //
        for (let i = 0; i < gate.length; i++) {
            if (gate[i].mouseClicked()) {
                gate[i].destroy();
                delete gate[i];
                gate.splice(i, 1);
            }
        }

        for (let i = 0; i < logicInput.length; i++) {
            if (logicInput[i].mouseClicked()) {
                logicInput[i].destroy();
                delete logicInput[i];
                logicInput.splice(i, 1);
            }
        }

        for (let i = 0; i < logicOutput.length; i++) {
            if (logicOutput[i].mouseClicked()) {
                logicOutput[i].destroy();
                delete logicOutput[i];
                logicOutput.splice(i, 1);
            }
        }

        for (let i = 0; i < logicClock.length; i++) {
            if (logicClock[i].mouseClicked()) {
                logicClock[i].destroy();
                delete logicClock[i];
                logicClock.splice(i, 1);
            }
        }

        for (let i = 0; i < srLatch.length; i++) {
            if (srLatch[i].mouseClicked()) {
                srLatch[i].destroy();
                delete srLatch[i];
                srLatch.splice(i, 1);
            }
        }

        for (let i = 0; i < flipflop.length; i++) {
            if (flipflop[i].mouseClicked()) {
                flipflop[i].destroy();
                delete flipflop[i];
                flipflop.splice(i, 1);
            }
        }
    }

    wireMng.mouseClicked();
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.windowResized = windowResized;
window.mousePressed = mousePressed;
window.mouseReleased = mouseReleased;
window.doubleClicked = doubleClicked;
window.mouseClicked = mouseClicked;

window.activeTool = activeTool;

const projectFile = document.getElementById("projectFile");
if (projectFile)
    projectFile.addEventListener("change", (e) => fileManager.loadFile(e), false);

const saveProjectFile = document.getElementById("saveProjectFile");
if (saveProjectFile)
    saveProjectFile.addEventListener("click", (e) => fileManager.saveFile(e), false);

/**
* Call FileManager.saveFile
*/
export function saveFile() {
    fileManager.saveFile();
}
