import * as p5 from "p5"

import { activeTool, MouseAction, setCurrentMouseAction } from "./menutools"
import { copyToClipboard, getURLParameter, isDefined, isNotNull, isNull, isNullOrUndefined, isTruthyString, isUndefined } from "./utils"
import { Wire, WireManager } from "./components/Wire"
import { Mode } from "./utils"
import { PersistenceManager } from "./PersistenceManager"
import { Gate } from "./components/Gate"
import { LogicInput } from "./components/LogicInput"
import { LogicOutput } from "./components/LogicOutput"
import { Clock } from "./components/Clock"
import { Component, ComponentBase, ComponentState } from "./components/Component"
import { Display } from "./components/Display"
import { NodeManager } from "./NodeManager"
import { attrBuilder, cls, div, faglyph, style, title } from "./htmlgen"
import { GRID_STEP, guessCanvasHeight } from "./drawutils"
import { Node } from "./components/Node"
import { Drawable } from "./components/Drawable"

// export type FF = FF_D | FF_JK | FF_T

export const ICImages: p5.Image[] = [] // integrated circuits images

export const gates: Gate[] = []
export const logicInputs: LogicInput[] = []
export const logicOutputs: LogicOutput[] = []
export const displays: Display[] = []
export const clocks: Clock[] = []
// export const srLatches: SR_Latch[] = []
// export const flipflops: FF[] = []

export const wireMgr = new WireManager()

export const allComponents: Component[][] = [gates, logicInputs, logicOutputs, displays, clocks/*, srLatches, flipflops*/]

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
const _movingComponents = new Set<Component>()

function changeMovingComponents(change: () => void) {
    const emptyBefore = _movingComponents.size === 0
    change()
    const emptyAfter = _movingComponents.size === 0
    if (emptyBefore !== emptyAfter) {
        updateCursor()
        setCanvasNeedsRedraw()
    }
}

export function setComponentMoving(comp: Component) {
    changeMovingComponents(() => {
        _movingComponents.add(comp)
    })
}
export function setComponentStoppedMoving(comp: Component) {
    changeMovingComponents(() => {
        _movingComponents.delete(comp)
    })
}

let _toolCursor: string | null = null
export function setToolCursor(cursor: string | null) {
    _toolCursor = cursor
}


let canvasContainer: HTMLElement
let initialData: string | undefined = undefined



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

        setCanvasNeedsRedraw()

        // update mode active button
        document.querySelectorAll(".sim-mode-tool").forEach((elem) => {
            if (elem.getAttribute("mode") === wantedModeStr) {
                elem.classList.add("active")
            } else {
                elem.classList.remove("active")
            }
        })

        if (mode < Mode.CONNECT) {
            setCurrentMouseAction("edit")
        }

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


let _canvasNeedsRedraw = true

export function setCanvasNeedsRedraw() {
    _canvasNeedsRedraw = true
}

const _componentNeedingRecalc = new Set<Component>()

export function addComponentNeedingRecalc(comp: Component) {
    _componentNeedingRecalc.add(comp)
    // console.log("Need recalc:", _componentNeedingRecalc)
}


let _currentMouseOverComp: Drawable | null = null
let _currentMouseDownComp: Drawable | Element | null = null
let _startDragTimeoutHandle: number | null = null

function setStartDragTimeout(comp: Drawable, e: MouseEvent | TouchEvent) {
    _startDragTimeoutHandle = setTimeout(function () {
        comp.mouseDragged(e)
    }, 300)
}

function clearStartDragTimeout() {
    if (isNotNull(_startDragTimeoutHandle)) {
        clearTimeout(_startDragTimeoutHandle)
        _startDragTimeoutHandle = null
    }
}

function setCurrentMouseOverComp(comp: Drawable | null) {
    if (comp !== _currentMouseOverComp) {
        _currentMouseOverComp = comp
        setCanvasNeedsRedraw()
        // console.log("Over component: ", newMouseOverComp)
    }
}

function updateMouseOver([x, y]: [number, number]) {
    function findMouseOver(): Drawable | null {
        if (mode > Mode.STATIC) {
            for (const elems of allComponents) {
                for (const elem of elems) {
                    let nodeOver: Node | null = null
                    elem.forEachNode((node) => {
                        if (node.isOver(x, y)) {
                            nodeOver = node
                            return false
                        }
                        return true
                    })
                    if (isNotNull(nodeOver)) {
                        return nodeOver
                    }
                    if (elem.isOver(x, y)) {
                        return elem
                    }
                }
            }

            for (const wire of wireMgr.wires) {
                if (wire.isOver(x, y)) {
                    return wire
                }
            }
        }
        return null
    }

    setCurrentMouseOverComp(findMouseOver())
}

function updateCursor() {
    canvasContainer.style.cursor =
        _movingComponents.size !== 0
            ? "grabbing"
            : _toolCursor
            ?? _currentMouseOverComp?.cursorWhenMouseover
            ?? "default"
}

export function createdNewComponent<C extends Component>(comp: C, array: C[]) {
    array.push(comp)
    _currentMouseOverComp = comp
    _currentMouseDownComp = comp
}



abstract class ToolHandlers {
    mouseDownOn(__comp: Drawable, __e: MouseEvent | TouchEvent) {
        return { lockMouseOver: true }
    }
    mouseDraggedOn(__comp: Drawable, __e: MouseEvent | TouchEvent) {
        // empty
    }
    mouseUpOn(__comp: Drawable, __e: MouseEvent | TouchEvent) {
        // empty
    }
    mouseDoubleClickedOn(__comp: Drawable, __e: MouseEvent | TouchEvent) {
        // empty
    }
    mouseDownOnBackground(__e: MouseEvent | TouchEvent) {
        // empty
    }
    mouseDraggedOnBackground(__e: MouseEvent | TouchEvent) {
        // empty
    }
    mouseUpOnBackground(__e: MouseEvent | TouchEvent) {
        // empty
    }
}

class _EditHandlers extends ToolHandlers {
    mouseDownOn(comp: Drawable, e: MouseEvent | TouchEvent): { lockMouseOver: boolean } {
        return comp.mouseDown(e)
    }
    mouseDraggedOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseDragged(e)
    }
    mouseUpOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseUp(e)
    }
    mouseDoubleClickedOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseDoubleClick(e)
    }
    mouseUpOnBackground(__e: MouseEvent | TouchEvent) {
        wireMgr.tryCancelWire()
    }
}

class _DeleteHandlers extends ToolHandlers {
    mouseUpOn(comp: Drawable, __: MouseEvent) {
        if (comp instanceof ComponentBase) {
            outer: for (const elems of allComponents) {
                for (let i = 0; i < elems.length; i++) {
                    if (elems[i] === comp) {
                        elems.splice(i, 1)
                        comp.destroy()
                        break outer
                    }
                }
            }
        } else if (comp instanceof Wire) {
            wireMgr.deleteWire(comp)
        }
    }
}


class _MoveHandlers extends ToolHandlers {
    mouseDownOnBackground(e: MouseEvent) {
        this.forAllElems((comp) => comp.mouseDown(e))
    }
    mouseDraggedOnBackground(e: MouseEvent) {
        this.forAllElems((comp) => comp.mouseDragged(e))
    }
    mouseUpOnBackground(e: MouseEvent) {
        this.forAllElems((comp) => comp.mouseUp(e))
    }

    private forAllElems(f: (comp: Component) => any) {
        for (const elems of allComponents) {
            for (const elem of elems) {
                f(elem)
            }
        }
    }

}

const EditHandlers = new _EditHandlers
const DeleteHandlers = new _DeleteHandlers
const MoveHandlers = new _MoveHandlers

let _currentHandlers = EditHandlers

export function setHandlersFor(action: MouseAction) {
    _currentHandlers = (() => {
        switch (action) {
            case "edit": return EditHandlers
            case "delete": return DeleteHandlers
            case "move": return MoveHandlers
        }
    })()
}

export function offsetXY(e: MouseEvent | TouchEvent): [number, number] {
    if ("offsetX" in e) {
        return [e.offsetX, e.offsetY]
    } else {
        const rect = (e.target as HTMLElement).getBoundingClientRect()
        const bodyRect = document.body.getBoundingClientRect()
        const touch = e.changedTouches[0]
        const x = touch.pageX - (rect.left - bodyRect.left)
        const y = touch.pageY - (rect.top - bodyRect.top)
        return [x, y]
    }
}

let _lastTouchEnd: [Drawable, number] | undefined = undefined
function isDoubleClick(clickedComp: Drawable, e: MouseEvent | TouchEvent) {
    if ("offsetX" in e) {
        return e.detail === 2
    } else {
        const oldLastTouchEnd = _lastTouchEnd
        const now = new Date().getTime()
        _lastTouchEnd = [clickedComp, now]
        if (!isDefined(oldLastTouchEnd)) {
            return false
        }
        const [lastComp, lastTime] = oldLastTouchEnd
        const elapsedTimeMillis = now - lastTime
        const isDoubleTouch = lastComp === clickedComp && elapsedTimeMillis > 0 && elapsedTimeMillis < 300
        if (isDoubleTouch) {
            _lastTouchEnd = undefined
        }
        return isDoubleTouch
    }
}

export function setup() {
    canvasContainer = document.getElementById("canvas-sim")!

    const p5canvas = createCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight, P2D)

    p5canvas.parent('canvas-sim')

    const mouseDownTouchStart = (e: MouseEvent | TouchEvent) => {
        if (isNull(_currentMouseDownComp)) {
            updateMouseOver(offsetXY(e))
            if (isNotNull(_currentMouseOverComp)) {
                // mouse down on component
                const { lockMouseOver } = _currentHandlers.mouseDownOn(_currentMouseOverComp, e)
                if (lockMouseOver) {
                    _currentMouseDownComp = _currentMouseOverComp
                    setStartDragTimeout(_currentMouseDownComp, e)
                }
                setCanvasNeedsRedraw()
            } else {
                // mouse down on background
                _currentMouseDownComp = canvasContainer
                _currentHandlers.mouseDownOnBackground(e)
            }
            updateCursor()
        } else {
            // we got a mousedown while a component had programmatically
            // been determined as being mousedown'd; ignore
        }
    }

    const mouseMoveTouchMove = (e: MouseEvent | TouchEvent) => {
        if (isNotNull(_currentMouseDownComp)) {
            if (_currentMouseDownComp instanceof Drawable) {
                // dragging component
                clearStartDragTimeout()
                _currentHandlers.mouseDraggedOn(_currentMouseDownComp, e)
            } else {
                // dragging background
                _currentHandlers.mouseDraggedOnBackground(e)
            }
        } else {
            // moving mouse or dragging without a locked component 
            updateMouseOver(offsetXY(e))
        }
    }

    const mouseUpTouchEnd = (e: MouseEvent | TouchEvent) => {
        // our target is either the locked component that
        // was clicked or the latest mouse over component
        const mouseUpTarget = _currentMouseDownComp ?? _currentMouseOverComp
        if (mouseUpTarget instanceof Drawable) {
            // mouseup on component
            if (isNotNull(_startDragTimeoutHandle)) {
                clearTimeout(_startDragTimeoutHandle)
                _startDragTimeoutHandle = null
            }
            _currentHandlers.mouseUpOn(mouseUpTarget, e)
            if (isDoubleClick(mouseUpTarget, e)) {
                _currentHandlers.mouseDoubleClickedOn(mouseUpTarget, e)
            }
        } else {
            // mouseup on background
            _currentHandlers.mouseUpOnBackground(e)
        }
        _currentMouseDownComp = null
        setCanvasNeedsRedraw()
    }

    canvasContainer.addEventListener("touchstart", (e) => {
        // console.log("touchstart %o %o", offsetXY(e), e)
        e.preventDefault()
        mouseDownTouchStart(e)
    })
    canvasContainer.addEventListener("touchmove", (e) => {
        // console.log("touchmove %o %o", offsetXY(e), e)
        e.preventDefault()
        mouseMoveTouchMove(e)
    })

    canvasContainer.addEventListener("touchend", (e) => {
        // console.log("touchend %o %o", offsetXY(e), e, e.detail)
        e.preventDefault()
        mouseUpTouchEnd(e)
        setCurrentMouseOverComp(null)
    })

    canvasContainer.addEventListener("touchcancel", (e) => {
        console.log("touchcancel %o %o", offsetXY(e), e)
    })

    canvasContainer.addEventListener("mousedown", (e) => {
        // console.log("mousedown %o", e)
        mouseDownTouchStart(e)
    })

    canvasContainer.addEventListener("mousemove", (e) => {
        // console.log("mousemove %o", e)
        mouseMoveTouchMove(e)
        updateCursor()
    })

    canvasContainer.addEventListener("mouseup", (e) => {
        // console.log("mouseup %o", e)
        mouseUpTouchEnd(e)
        updateMouseOver([e.offsetX, e.offsetY])
        updateCursor()
    })

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
    setCanvasNeedsRedraw()
}

export function recalculate() {
    const recalculated = new Set<Component>()

    let round = 1
    do {
        const toRecalc = new Set<Component>(_componentNeedingRecalc)
        console.log(`Recalc round ${round}: ` + [...toRecalc].map((c) => c.toString()).join(", "))
        _componentNeedingRecalc.clear()
        toRecalc.forEach((comp) => {
            if (!recalculated.has(comp)) {
                comp.recalcValue()
                recalculated.add(comp)
            } else {
                console.log("ERROR circular dependency")
            }
        })

        round++
    } while (_componentNeedingRecalc.size !== 0)
}

export function draw() {
    const needsRecalc = _componentNeedingRecalc.size !== 0
    if (needsRecalc) {
        recalculate()
    }
    if (!_canvasNeedsRedraw && !wireMgr.isAddingWire) {
        return
    }
    console.log("Drawing " + (needsRecalc ? "with" : "without") + " recalc")

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

    const isMovingComponent = _movingComponents.size > 0
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
    wireMgr.draw(_currentMouseOverComp)

    for (const elems of allComponents) {
        for (const elem of elems) {
            elem.draw(_currentMouseOverComp)
            elem.forEachNode((node) => {
                node.draw(_currentMouseOverComp)
                return true
            })
        }
    }

    _canvasNeedsRedraw = false
}

function keyUp(e: KeyboardEvent) {
    switch (e.key) {
        case "Shift":
            return NodeManager.tryConnectNodes()

        case "Escape":
            tryDeleteComponentsWhere(comp => comp.state === ComponentState.SPAWNING)
            wireMgr.tryCancelWire()
            return

        case "e":
            setCurrentMouseAction("edit")
            return

        case "d":
            setCurrentMouseAction("delete")
            return

        case "m":
            setCurrentMouseAction("move")
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

window.addEventListener("resize", windowResized)
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


window.load = (jsonString: any) => PersistenceManager.doLoadFromJson(jsonString)

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

