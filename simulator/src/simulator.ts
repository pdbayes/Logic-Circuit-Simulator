import * as p5 from "p5"

import { activeTool, currMouseAction } from "./menutools.js"
import { copyToClipboard, getURLParameter, isDefined, isNullOrUndefined, isTruthyString, isUndefined, isUnset, MouseAction } from "./utils.js"
import { WireManager } from "./components/Wire.js"
import { Mode, TriState } from "./utils.js"
import { PersistenceManager } from "./PersistenceManager.js"
import { Gate } from "./components/Gate.js"
import { LogicInput } from "./components/LogicInput.js"
import { LogicOutput } from "./components/LogicOutput.js"
import { Clock } from "./components/Clock.js"
import { Node } from "./components/Node.js"
import { Component, ComponentState } from "./components/Component.js"
import { Display } from "./components/Display.js"
import { GRID_STEP, HasPosition } from "./components/Position.js"
import { NodeManager } from "./NodeManager.js"
import { attrBuilder, cls, div, faglyph, style, title } from "./htmlgen.js"

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

export const allComponents: Component[][] = [gates, logicInputs, logicOutputs, displays, clocks/*, srLatches, flipflops*/]
export const wireMng = new WireManager()

export const colorMouseOver: Color = [0, 0x7B, 0xFF]

const MaxMode = Mode.FULL
const MaxEmbeddedMode = Mode.DESIGN

export let upperMode: Mode = isEmbeddedInIframe() ? MaxEmbeddedMode : MaxMode
export let mode: Mode = upperMode

export const modifierKeys = {
    isShiftDown: false,
    isCommandDown: false,
    isOptionDown: false,
    isControlDown: false,
}
const movingComponents = new Set<Component>()

export function startedMoving(comp: Component) {
    movingComponents.add(comp)
}
export function stoppedMoving(comp: Component) {
    movingComponents.delete(comp)
}

let toolCursor: string | undefined = undefined
export function setToolCursor(cursor: string) {
    toolCursor = cursor
}
export function clearToolCursor() {
    toolCursor = undefined
}



let canvasContainer: HTMLElement
let initialData: string | undefined = undefined

export const COLOR_FULL: Color = [255, 193, 7]
export const COLOR_EMPTY: Color = [52, 58, 64]
export const COLOR_UNSET: Color = [152, 158, 164]

export function colorForBoolean(value: TriState): Color {
    return isUnset(value) ? COLOR_UNSET : value ? COLOR_FULL : COLOR_EMPTY
}

export function fillForBoolean(value: TriState): Color {
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
    const f = x0 < x1 ? 1 : -1
    line(x0 - f, y0, x1 + f, y1)
}

export function roundValue(comp: HasPosition & { value: TriState }) {
    const value = comp.value
    textSize(18)
    textAlign(CENTER, CENTER)

    if (isUnset(value)) {
        fill(255)
        textStyle(BOLD)
        text('?', comp.posX, comp.posY)
    } else if (value) {
        textStyle(BOLD)
        text('1', comp.posX, comp.posY)
    } else {
        fill(255)
        textStyle(NORMAL)
        text('0', comp.posX, comp.posY)
    }
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

function trySetMode(wantedMode: Mode) {
    const wantedModeStr = Mode[wantedMode]
    if (wantedMode <= upperMode) {
        mode = wantedMode
        console.log(`Display/interaction is ${wantedModeStr}`)

        // update mode active button
        document.querySelectorAll(".sim-mode-tool").forEach((elem) => {
            if (elem.getAttribute("mode") === wantedModeStr) {
                elem.classList.add("active")
            } else {
                elem.classList.remove("active")
            }
        })

        type LeftMenuDisplay = "show" | "hide" | "inactive"

        const showReset = mode >= Mode.TRYOUT
        const showRightEditControls = mode >= Mode.CONNECT
        const showLeftMenu: LeftMenuDisplay =
            (upperMode !== Mode.FULL)
                ? (mode >= Mode.DESIGN) ? "show" : "hide"
                : (mode >= Mode.DESIGN) ? "show" : "inactive"
        const showRightMenu = showReset || showRightEditControls

        if (!showReset) {
            document.getElementById("resetToolButton")!.style.display = "none"
        } else {
            document.getElementById("resetToolButton")!.style.removeProperty("display")
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

        const modifButtons = document.querySelectorAll("button.sim-modification-tool")
        for (let i = 0; i < modifButtons.length; i++) {
            const but = modifButtons[i] as HTMLElement
            if (showRightEditControls) {
                but.style.removeProperty("display")
            } else {
                but.style.display = "none"
            }
        }

        const leftToolbar = document.getElementById("leftToolbar")!
        switch (showLeftMenu) {
            case "hide":
                leftToolbar.style.removeProperty("visibility")
                leftToolbar.style.display = "none"
                break
            case "show":
                leftToolbar.style.removeProperty("visibility")
                leftToolbar.style.removeProperty("display")
                break
            case "inactive":
                leftToolbar.style.visibility = "hidden"
                leftToolbar.style.removeProperty("display")
                break
        }


        if (showRightMenu) {
            document.getElementById("rightToolbarContainer")!.style.removeProperty("visibility")
        } else {
            document.getElementById("rightToolbarContainer")!.style.visibility = "hidden"
        }

    } else {
        console.log(`Cannot switch to mode ${wantedModeStr} because we are capped by ${Mode[upperMode]}`)
    }

}

export function setup() {
    canvasContainer = document.getElementById("canvas-sim")!

    const canvas = createCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight, P2D)

    canvas.parent('canvas-sim')

    const data = getURLParameter(PARAM_DATA)
    if (isDefined(data)) {
        initialData = data
        tryLoadFromData()
    }

    const maybeMode = getURLParameter(PARAM_MODE, "").toUpperCase()
    if (maybeMode in Mode) {
        upperMode = (Mode as any)[maybeMode]
    }

    const showModeChange = upperMode >= Mode.FULL

    if (showModeChange) {
        const modeChangeMenu = document.getElementById("modeChangeMenu")!

        div(cls("btn-group-vertical"),
            div(style("text-align: center; width: 100%; font-weight: bold; font-size: 80%; color: #666; padding: 2px;"),
                "Mode",
            ),
            ...[Mode.FULL, Mode.DESIGN, Mode.CONNECT, Mode.TRYOUT, Mode.STATIC].map((buttonMode) => {
                const [modeTitle, expl] = (() => {
                    switch (buttonMode) {
                        case Mode.FULL: return ["Admin", "En plus du mode complet, ce mode permet de rendre les entrées, les sorties des portes, voire les portes elles-mêmes indéterminées"]
                        case Mode.DESIGN: return ["Complet", "La totalité des actions de conception d’un circuit sont possible"]
                        case Mode.CONNECT: return ["Connexion", "Il est possible de déplacer et de connecter des éléments déjà sur le canevas, mais pas d’en rajouter (le menu de gauche ne serait pas actif)"]
                        case Mode.TRYOUT: return ["Test", "Il est seulement possible de changer les entrées pour tester un circuit préétabli"]
                        case Mode.STATIC: return ["Statique", "Les éléments sont juste affichés; aucune interaction n’est possible"]
                    }
                })()

                const copyLinkDiv =
                    div(cls("sim-mode-link"),
                        title("Copie un lien vers ce contenu dans ce mode"),
                        faglyph("link")
                    ).render()

                copyLinkDiv.addEventListener("click", () => {
                    copyLinkForMode(buttonMode)
                })

                const switchToModeDiv =
                    div(cls("btn btn-sm btn-outline-light sim-toolbar-button-right sim-mode-tool"),
                        style("display: flex; justify-content: space-between; align-items: center"),
                        attrBuilder("mode")(Mode[buttonMode]),
                        title(expl),
                        modeTitle,
                        copyLinkDiv
                    ).render()

                switchToModeDiv.addEventListener("click", () => trySetMode(buttonMode))

                return switchToModeDiv
            })
        ).applyTo(modeChangeMenu)


        modeChangeMenu.style.removeProperty("visibility")
    }

    trySetMode(upperMode)

}

export function tryLoadFromData() {
    if (isUndefined(initialData)) {
        return
    }
    try {
        const decodedData = atob(initialData.replace(/-/g, "+").replace(/_/g, "/").replace(/%3D/g, "="))
        PersistenceManager.doLoadFromJson(decodeURIComponent(decodedData))
    } catch (e) {
        console.log(e)
    }
}

export function windowResized() {
    resizeCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight)
    // document.getElementsByClassName("tools")[0].style.height = canvHeight;
}

export function draw() {
    strokeCap(PROJECT)

    background(0xFF)
    fill(0xFF)

    stroke(200)
    strokeWeight(2)
    if (mode >= Mode.CONNECT || upperMode === MaxMode) {
        rect(0, 0, width, height)
        if (upperMode === MaxMode && mode < upperMode) {
            const h = guessCanvasHeight()
            line(0, h, width, h)
            fill(0xEE)
            rect(0, h, width, height - h)
        }
    }

    const isMovingComponent = movingComponents.size > 0
    if (isMovingComponent) {
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

    let newCursor: string | undefined = isMovingComponent ? "grabbing" : toolCursor
    for (const elems of allComponents) {
        for (const elem of elems) {
            elem.draw()
            newCursor ??= elem.cursor
        }
    }

    document.getElementById("canvas-sim")!.style.cursor = newCursor ?? "default"
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
    for (const elems of allComponents) {
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

function keyUp(e: KeyboardEvent) {
    switch (e.key) {
        case "Shift":
            return NodeManager.tryConnectNodes()

        case "Escape":
            tryDeleteComponentsWhere(comp => comp.state === ComponentState.SPAWNING)
            wireMng.tryCancelWire()
            return
    }
}

function modifierKeyWatcher(e: KeyboardEvent) {
    modifierKeys.isShiftDown = e.shiftKey
    modifierKeys.isCommandDown = e.metaKey
    modifierKeys.isOptionDown = e.altKey
    modifierKeys.isControlDown = e.ctrlKey
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

window.addEventListener("keydown", modifierKeyWatcher)
window.addEventListener("keyup", modifierKeyWatcher)

window.activeTool = activeTool

window.setModeClicked = function setModeClicked(e: HTMLElement) {
    const buttonModeStr = e.getAttribute("mode") ?? "_unknown_"
    if (buttonModeStr in Mode) {
        const wantedMode = (Mode as any)[buttonModeStr]
        trySetMode(wantedMode)
    }
}

const projectFile = document.getElementById("projectFile")
if (projectFile) {
    projectFile.addEventListener("change", (e) => PersistenceManager.loadFile(e), false)
}

export const saveProjectFile = document.getElementById("saveProjectFile") as HTMLAnchorElement | null
if (saveProjectFile) {
    saveProjectFile.addEventListener("click", () => PersistenceManager.saveFile(), false)
}

function guessCanvasHeight(): number {
    let lowestY = Number.NEGATIVE_INFINITY, highestY = Number.POSITIVE_INFINITY
    for (const elems of allComponents) {
        for (const elem of elems) {
            const y = elem.posY
            if (y > lowestY) {
                lowestY = y
            }
            if (y < highestY) {
                highestY = y
            }
        }
    }
    return highestY + lowestY // add lower margin equal to top margin
}

function copyLinkForMode(mode: Mode) {
    if (mode > MaxEmbeddedMode) {
        mode = MaxEmbeddedMode
    }
    const modeStr = Mode[mode].toLowerCase()
    const json = PersistenceManager.buildWorkspaceJSON()
    console.log("JSON:\n" + json)
    const encodedJson = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "%3D")

    function linkForMode(mode: Mode): string {
        const loc = window.location
        return loc.protocol + "//" + loc.host + loc.pathname + "?mode=" + Mode[mode].toLowerCase() + "&data=" + encodedJson
    }
    const fullUrl = linkForMode(mode)
    console.log("Link: " + fullUrl)

    const modeParam = mode === MaxEmbeddedMode ? "" : `:mode: ${modeStr}\n`

    const embedHeight = guessCanvasHeight()

    const block = `\`\`\`{logic}
:height: ${embedHeight}
${modeParam}
${json}
\`\`\``

    console.log(block)

    if (copyToClipboard(block)) {
        console.log("  -> Copied!")
    } else {
        console.log("  -> Could not copy!")
    }
    history.replaceState(null, "", linkForMode(MaxMode))
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

export function inRect(centerX: number, centerY: number, width: number, height: number, pointX: number, pointY: number): boolean {
    const w2 = width / 2
    const h2 = height / 2
    return pointX >= centerX - w2 && pointX < centerX + w2 &&
        pointY >= centerY - h2 && pointY < centerY + h2
}

window.loadFromJson = (jsonString: any) => PersistenceManager.doLoadFromJson(jsonString)

const menu = document.querySelector('.menu') as HTMLElement

function showMenu(x: number, y: number) {
    menu.style.left = x + 'px'
    menu.style.top = y + 'px'
    menu.classList.add('show-menu')
}

function hideMenu() {
    menu.classList.remove('show-menu')
}

function onContextMenu(e: MouseEvent) {
    e.preventDefault()
    showMenu(e.pageX, e.pageY)
    document.addEventListener('click', onClick, false)
}

function onClick() {
    hideMenu()
    document.removeEventListener('click', onClick)
}

document.addEventListener('contextmenu', onContextMenu, false)

