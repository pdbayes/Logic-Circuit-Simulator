import * as p5 from "p5"

import { activeTool, currMouseAction } from "./menutools.js"
import { MouseAction } from "./circuit_components/Enums.js"
import { WireManager } from "./circuit_components/Wire.js"
import { Mode } from "./circuit_components/Enums.js"
import { FileManager } from "./FileManager.js"
import { Gate } from "./circuit_components/Gate.js"
import { LogicInput } from "./circuit_components/LogicInput.js"
import { LogicOutput } from "./circuit_components/LogicOutput.js"
import { Clock } from "./circuit_components/Clock.js"
import { Node } from "./circuit_components/Node.js"
import { Component, ComponentState, GRID_STEP, tryConnectNodes } from "./circuit_components/Component.js"
import { Display } from "./circuit_components/Display.js"

export type Color = [number, number, number]
// export type FF = FF_D | FF_JK | FF_T

export const ICImages: p5.Image[] = [] // integrated circuits images

export const gates: Gate[] = []
export const logicInputs: LogicInput[] = []
export const logicOutputs: LogicOutput[] = []
export const displays: Display[] = []
export const clocks: Clock[] = []
// export const srLatches: SR_Latch[] = []
// export const flipflops: FF[] = []

export const allComponents = [gates, logicInputs, logicOutputs, displays, clocks/*, srLatches, flipflops*/]
export const allComponentsWithDoubleClick = [logicInputs, displays]
export const wireMng = new WireManager()

export const colorMouseOver: Color = [0, 0x7B, 0xFF]
export const fileManager = new FileManager()

export let mode = Mode.FULL
export let isCmdDown = false
const movingComponents = new Set<Component>()

export function startedMoving(comp: Component) {
    movingComponents.add(comp)
}
export function stoppedMoving(comp: Component) {
    movingComponents.delete(comp)
}

let canvasContainer: HTMLElement
let initialData: string | undefined = undefined

export const COLOR_FULL: Color = [255, 193, 7]
export const COLOR_EMPTY: Color = [52, 58, 64]

export function colorForBoolean(value: boolean): Color {
    return value ? COLOR_FULL : COLOR_EMPTY
}

export function fillForBoolean(value: boolean): Color {
    const c = colorForBoolean(value)
    fill(...c)
    return c
}

export function fillForFraction(fraction: number): Color {
    const c: Color = [
        (COLOR_FULL[0] - COLOR_EMPTY[0]) * fraction + COLOR_EMPTY[0],
        (COLOR_FULL[1] - COLOR_EMPTY[1]) * fraction + COLOR_EMPTY[1],
        (COLOR_FULL[2] - COLOR_EMPTY[2]) * fraction + COLOR_EMPTY[2],
    ]
    fill(...c)
    return c
}

export function wireLine(node: Node, x1: number, y1: number) {
    const x0 = node.posX
    const y0 = node.posY

    stroke(80)
    strokeWeight(4)
    line(x0, y0, x1, y1)

    stroke(...colorForBoolean(node.value))
    strokeWeight(2)
    line(x0, y0, x1, y1)
}


export function preload() {
    ICImages.push(loadImage('simulator/img/SR_Latch.svg')) // For testing usage
    ICImages.push(loadImage('simulator/img/SR_Latch.svg'))
    ICImages.push(loadImage('simulator/img/SR_Latch_Sync.svg'))
    ICImages.push(loadImage('simulator/img/FF_D.svg'))
    ICImages.push(loadImage('simulator/img/FF_D_MS.svg'))
    ICImages.push(loadImage('simulator/img/FF_T.svg'))
    ICImages.push(loadImage('simulator/img/FF_JK.svg'))
}


function getURLParameter<T>(sParam: string, defaultValue: T): string | T
function getURLParameter(sParam: string, defaultValue?: undefined): string | undefined
function getURLParameter(sParam: string, defaultValue: any) {
    const sPageURL = window.location.search.substring(1)
    const sURLVariables = sPageURL.split('&')
    for (let i = 0; i < sURLVariables.length; i++) {
        const sParameterName = sURLVariables[i].split('=')
        if (sParameterName[0] === sParam) {
            return sParameterName[1]
        }
    }
    return defaultValue
}

function isTruthyString(str: string | null | undefined): boolean {
    return !isNullOrUndefined(str) && (str === "1" || str.toLowerCase() === "true")
}

function isEmbeddedInIframe(): boolean {
    try {
        return window.self !== window.top
    } catch (e) {
        return true
    }
}

const PARAM_DATA = "data"
const PARAM_SHOW_ONLY = "showonly"
const PARAM_MODE = "mode"

export function setup() {
    canvasContainer = document.getElementById("canvas-sim")!

    const canvas = createCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight, P2D)

    canvas.parent('canvas-sim')

    canvasContainer.addEventListener("mousemove", (e) => {
        if (e.metaKey !== isCmdDown) {
            isCmdDown = e.metaKey
        }
    }, true)

    const data = getURLParameter(PARAM_DATA)
    if (isDefined(data)) {
        initialData = data
        tryLoadFromData()
    }


    const maybeMode = getURLParameter(PARAM_MODE, "").toUpperCase()
    if (maybeMode in Mode) {
        mode = (Mode as any)[maybeMode]
        console.log("Mode: " + maybeMode)
    }

    const showReset = mode >= Mode.TRYOUT
    const showRightEditControls = mode >= Mode.CONNECT
    const showLeftMenu = mode >= Mode.FULL
    const showRightMenu = showReset || showRightEditControls

    if (!showReset) {
        document.getElementById("resetToolButton")!.style.display = "none"
    }


    const showonlyStr = getURLParameter(PARAM_SHOW_ONLY)
    if (isDefined(showonlyStr)) {
        const showonly = showonlyStr.toUpperCase().split(/[, ]+/).filter(x => x.trim())
        const leftToolbar = document.getElementById("leftToolbar")!
        const toolbarChildren = leftToolbar.children
        for (let i = 0; i < toolbarChildren.length; i++) {
            const child = toolbarChildren[i] as HTMLElement
            const tool = child.getAttribute("tool")
            if (child.tagName === "BUTTON" && !isNullOrUndefined(tool) && isTruthyString(child.getAttribute("isGate")) && !showonly.includes(tool)) {
                child.style.display = "none"
            }
        }
    }

    if (showRightEditControls) {
        const modifButtons = document.querySelectorAll("button.sim-modification-tool")
        for (let i = 0; i < modifButtons.length; i++) {
            const but = modifButtons[i] as HTMLElement
            but.style.removeProperty("display")
        }
    }


    if (showLeftMenu) {
        document.getElementById("leftToolbar")!.style.removeProperty("display")
        if (!isEmbeddedInIframe()) {
            const dumpJsonStructure = document.getElementById("dumpJsonStructure")!
            // if (dumpJsonStructure) {
            dumpJsonStructure.setAttribute("style", "")
            dumpJsonStructure.addEventListener("click", () => {
                const json = FileManager.getJSON_Workspace()
                console.log("JSON:\n" + json)
                const encodedJson = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "%3D")
                const loc = window.location
                history.replaceState(null, "", loc.protocol + "//" + loc.host + loc.pathname + "?data=" + encodedJson)
            }, false)
        }

    }

    if (showRightMenu) {
        document.getElementById("rightToolbarContainer")!.style.removeProperty("visibility")
    }
}

export function tryLoadFromData() {
    if (isUndefined(initialData)) {
        return
    }
    try {
        const decodedData = atob(initialData.replace(/-/g, "+").replace(/_/g, "/").replace(/%3D/g, "="))
        fileManager.doLoadFromJson(decodeURIComponent(decodedData))
    } catch (e) {
        console.trace(e)
    }
}

export function windowResized() {
    resizeCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight)
    // document.getElementsByClassName("tools")[0].style.height = canvHeight;
}

export function draw() {
    background(0xFF)
    fill(0xFF)

    stroke(200)
    strokeWeight(2)
    if (mode >= Mode.CONNECT) {
        rect(0, 0, width, height)
    }

    if (movingComponents.size > 0) {
        stroke(240)
        strokeWeight(1)
        for (let x = GRID_STEP; x < width; x += GRID_STEP) {
            line(x, 0, x, height)
        }
        for (let y = GRID_STEP; y < height; y += GRID_STEP) {
            line(0, y, width, y)
        }
    }

    stroke(0)
    wireMng.draw()

    for (const elems of allComponents) {
        for (const elem of elems) {
            elem.draw()
        }
    }
    if (fileManager.isLoadingState) {
        fileManager.isLoadingState = false
    }

}

export function mousePressed() {
    for (const elems of allComponents) {
        for (const elem of elems) {
            elem.mousePressed()
        }
    }
}

export function mouseReleased() {
    for (const elems of allComponents) {
        for (const elem of elems) {
            elem.mouseReleased()
        }
    }
}

export function doubleClicked() {
    for (const elems of allComponentsWithDoubleClick) {
        for (const elem of elems) {
            elem.doubleClicked()
        }
    }
}

export function mouseClicked() {
    if (currMouseAction === MouseAction.EDIT) {
        for (const elems of allComponents) {
            for (const elem of elems) {
                elem.mouseClicked()
            }
        }

    } else if (currMouseAction === MouseAction.DELETE) {
        tryDeleteComponentsWhere(comp => comp.mouseClicked())
    }

    wireMng.mouseClicked()
}

export function keyUp(e: KeyboardEvent) {
    switch (e.key) {
        case "Shift":
            return tryConnectNodes()

        case "Escape":
            tryDeleteComponentsWhere(comp => comp.state === ComponentState.SPAWNING)
            wireMng.tryCancelWire()
            return
    }
}


window.preload = preload
window.setup = setup
window.draw = draw
window.windowResized = windowResized
window.mousePressed = mousePressed
window.mouseReleased = mouseReleased
window.doubleClicked = doubleClicked
window.mouseClicked = mouseClicked

window.addEventListener("keyup", keyUp)

window.activeTool = activeTool

const projectFile = document.getElementById("projectFile")
if (projectFile) {
    projectFile.addEventListener("change", (e) => fileManager.loadFile(e), false)
}

export const saveProjectFile = document.getElementById("saveProjectFile") as HTMLAnchorElement | null
if (saveProjectFile) {
    saveProjectFile.addEventListener("click", () => fileManager.saveFile(), false)
}

function tryDeleteComponentsWhere(cond: (e: Component) => boolean) {
    for (const elems of allComponents) {
        for (let i = 0; i < elems.length; i++) {
            const elem = elems[i]
            if (cond(elem)) {
                elem.destroy()
                delete elems[i]
                elems.splice(i, 1)
            }
        }
    }
}

export function saveFile() {
    fileManager.saveFile()
}

export function any(bools: boolean[]): boolean {
    for (let i = 0; i < bools.length; i++) {
        if (bools[i]) {
            return true
        }
    }
    return false
}

export function isUndefined(v: any): v is undefined {
    return typeof v === "undefined"
}

export function isDefined<T>(v: T | undefined): v is T {
    return typeof v !== "undefined"
}

export function isNullOrUndefined(v: any): v is null | undefined {
    return isUndefined(v) || v === null
}

export function isNotNull<T>(v: T | null): v is T {
    return v !== null
}

export function isString(v: any): v is string {
    return typeof v === "string"
}

export type NodeArrayOfLength<T extends number> =
    T extends 0 ? readonly []
    : T extends 1 ? readonly [Node]
    : T extends 2 ? readonly [Node, Node]
    : T extends 3 ? readonly [Node, Node, Node]
    : T extends 4 ? readonly [Node, Node, Node, Node]
    : T extends 5 ? readonly [Node, Node, Node, Node, Node]
    : T extends 6 ? readonly [Node, Node, Node, Node, Node, Node]
    : T extends 7 ? readonly [Node, Node, Node, Node, Node, Node, Node]
    : T extends 8 ? readonly [Node, Node, Node, Node, Node, Node, Node, Node]
    : []


export function inRect(centerX: number, centerY: number, width: number, height: number, pointX: number, pointY: number): boolean {
    const w2 = width / 2
    const h2 = height / 2
    return pointX >= centerX - w2 && pointX < centerX + w2 &&
        pointY >= centerY - h2 && pointY < centerY + h2
}

window.loadFromJson = (jsonString: any) => fileManager.doLoadFromJson(jsonString)
