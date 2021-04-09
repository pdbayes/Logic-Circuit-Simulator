import { createPopper, Instance as PopperInstance } from '@popperjs/core'

import { makeComponentFactoryForButton, MouseAction, setCurrentMouseAction } from "./menutools"
import { copyToClipboard, getURLParameter, isDefined, isFalsyString, isNotNull, isNull, isNullOrUndefined, isTruthyString, isUndefined, nonEmpty, TimeoutHandle } from "./utils"
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
import { applyModifierTo, attrBuilder, button, cls, div, emptyMod, faglyph, ModifierObject, mods, raw, style, title } from "./htmlgen"
import { GRID_STEP, guessCanvasHeight } from "./drawutils"
import { Node } from "./components/Node"
import { Drawable, DrawableWithPosition } from "./components/Drawable"
import { RecalcManager, RedrawManager } from './RedrawRecalcManager'
import { Timeline, TimelineState } from './Timeline'


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

const _movingComponents = new Set<Component>()

function changeMovingComponents(change: () => void) {
    const emptyBefore = _movingComponents.size === 0
    change()
    const emptyAfter = _movingComponents.size === 0
    if (emptyBefore !== emptyAfter) {
        updateCursor()
        RedrawManager.addReason("started or stopped moving components", null)
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
let mainCanvas: HTMLCanvasElement
let tooltipElem: HTMLElement
let initialData: string | undefined = undefined


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
const PARAM_TOOLTIPS = "tooltips"

let showTooltips = true

const trySetMode = wrapHandler((wantedMode: Mode) => {
    const wantedModeStr = Mode[wantedMode]
    if (wantedMode <= upperMode) {
        mode = wantedMode

        // console.log(`Display/interaction is ${wantedModeStr}`)

        RedrawManager.addReason("mode changed", null)

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

        const showLeftMenu: LeftMenuDisplay =
            (upperMode !== Mode.FULL)
                ? (mode >= Mode.DESIGN) ? "show" : "hide"
                : (mode >= Mode.DESIGN) ? "show" : "inactive"
        const showTxGates = mode >= Mode.FULL

        const showReset = mode >= Mode.TRYOUT
        const showRightEditControls = mode >= Mode.CONNECT
        const showRightMenu = showReset || showRightEditControls
        const showOnlyReset = showReset && !showRightEditControls

        setVisible(document.getElementById("resetToolButton")!, showReset)
        setVisible(document.getElementById("resetToolButtonCaption")!, !showOnlyReset)
        setVisible(document.getElementById("resetToolButtonDummyCaption")!, showOnlyReset)
        // 
        const showonlyStr = getURLParameter(PARAM_SHOW_ONLY)
        if (isDefined(showonlyStr)) {
            const showonly = showonlyStr.toUpperCase().split(/[, ]+/).filter(x => x.trim())
            const leftToolbar = document.getElementById("leftToolbar")!
            const toolbarChildren = leftToolbar.children
            for (let i = 0; i < toolbarChildren.length; i++) {
                const child = toolbarChildren[i] as HTMLElement
                const componentAttr = child.getAttribute("component")
                const typeAttr = child.getAttribute("type")
                const buttonID = typeAttr ?? componentAttr
                if (isNotNull(buttonID) && !showonly.includes(buttonID)) {
                    setVisible(child, false)
                }
            }
        }

        const modifButtons = document.querySelectorAll("button.sim-modification-tool")
        for (let i = 0; i < modifButtons.length; i++) {
            const but = modifButtons[i] as HTMLElement
            setVisible(but, showRightEditControls)
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

        const txGateButton = document.querySelector("button[data-type=TXA]") as HTMLElement
        setVisible(txGateButton, showTxGates)

        const rightToolbarContainer = document.getElementById("rightToolbarContainer")!
        setVisible(rightToolbarContainer, showRightMenu)

        if (isFalsyString(getURLParameter(PARAM_TOOLTIPS))) {
            showTooltips = false
        }

    } else {
        console.log(`Cannot switch to mode ${wantedModeStr} because we are capped by ${Mode[upperMode]}`)
    }
})

type MouseDownData = {
    comp: Drawable | Element
    fireMouseClickedOnFinish: boolean
    initialXY: [number, number]
}

let _currentMouseOverComp: Drawable | null = null
let _currentMouseOverPopper: PopperInstance | null = null
let _currentMouseDownData: MouseDownData | null = null
let _startHoverTimeoutHandle: TimeoutHandle | null = null
let _startDragTimeoutHandle: TimeoutHandle | null = null

function setStartDragTimeout(comp: Drawable, e: MouseEvent | TouchEvent) {
    _startDragTimeoutHandle = setTimeout(
        wrapHandler(() => {
            if (isNotNull(_currentMouseDownData)) {
                _currentMouseDownData.fireMouseClickedOnFinish = false
            }
            _currentHandlers.mouseDraggedOn(comp, e)
        }),
        300
    )
}

function clearStartDragTimeout() {
    if (isNotNull(_startDragTimeoutHandle)) {
        clearTimeout(_startDragTimeoutHandle)
        _startDragTimeoutHandle = null
    }
}

function clearHoverTimeoutHandle() {
    if (isNotNull(_startHoverTimeoutHandle)) {
        clearTimeout(_startHoverTimeoutHandle)
        _startHoverTimeoutHandle = null
    }
}

function setCurrentMouseOverComp(comp: Drawable | null) {
    if (comp !== _currentMouseOverComp) {
        clearPopperIfNecessary()
        clearHoverTimeoutHandle()

        _currentMouseOverComp = comp
        if (isNotNull(comp)) {
            _startHoverTimeoutHandle = setTimeout(function () {
                _currentHandlers.mouseHoverOn(comp)
                _startHoverTimeoutHandle = null
            }, 1200)
        }
        RedrawManager.addReason("mouseover changed", null)
        // console.log("Over component: ", newMouseOverComp)
    }
}

function updateMouseOver([x, y]: [number, number]) {
    function findMouseOver(): Drawable | null {
        if (mode > Mode.STATIC) {

            // easy optimization: maybe we're still over the
            // same component as before, so quickly check this
            if (isNotNull(_currentMouseOverComp)) {
                if (_currentMouseOverComp.isOver(x, y)) {
                    return _currentMouseOverComp
                }
            }

            // check if we're over components or their nodes
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

            // check if we're over a wire
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

function clearPopperIfNecessary() {
    if (isNotNull(_currentMouseOverPopper)) {
        _currentMouseOverPopper.destroy()
        _currentMouseOverPopper = null
        tooltipElem.style.display = "none"
    }
}

function makePopper(tooltipHtml: ModifierObject, rect: DOMRect) {
    const tooltipContents = document.getElementById("tooltipContents")!
    tooltipContents.innerHTML = ""
    tooltipHtml.applyTo(tooltipContents)
    tooltipElem.style.removeProperty("display")
    const canvas = document.getElementsByTagName("CANVAS")[0]
    _currentMouseOverPopper = createPopper({
        getBoundingClientRect() { return rect },
        contextElement: canvas,
    }, tooltipElem, {
        placement: 'right',
        modifiers: [{ name: 'offset', options: { offset: [4, 8] } }],
    })
    tooltipElem.setAttribute('data-show', '')
    _currentMouseOverPopper.update()
}

abstract class ToolHandlers {
    mouseHoverOn(__comp: Drawable) {
        // empty
    }
    mouseDownOn(__comp: Drawable, __e: MouseEvent | TouchEvent) {
        return { lockMouseOver: true }
    }
    mouseDraggedOn(__comp: Drawable, __e: MouseEvent | TouchEvent) {
        // empty
    }
    mouseUpOn(__comp: Drawable, __e: MouseEvent | TouchEvent) {
        // empty
    }
    mouseClickedOn(__comp: Drawable, __e: MouseEvent | TouchEvent) {
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
    mouseHoverOn(comp: Drawable) {
        clearPopperIfNecessary()
        if (!showTooltips) {
            return
        }
        const tooltip = comp.makeTooltip()
        const containerRect = canvasContainer.getBoundingClientRect()
        if (isDefined(tooltip)) {
            const [cx, cy, w, h] =
                comp instanceof DrawableWithPosition
                    ? [comp.posX, comp.posY, comp.width, comp.height]
                    : [mouseX, mouseY, 4, 4]
            const rect = new DOMRect(containerRect.x + cx - w / 2, containerRect.y + cy - h / 2, w, h)
            makePopper(tooltip, rect)
        }
    }
    mouseDownOn(comp: Drawable, e: MouseEvent | TouchEvent): { lockMouseOver: boolean } {
        return comp.mouseDown(e)
    }
    mouseDraggedOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseDragged(e)
    }
    mouseUpOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseUp(e)
    }
    mouseClickedOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseClicked(e)
    }
    mouseDoubleClickedOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseDoubleClicked(e)
    }
    mouseUpOnBackground(__e: MouseEvent | TouchEvent) {
        wireMgr.tryCancelWire()
    }
}

class _DeleteHandlers extends ToolHandlers {
    mouseClickedOn(comp: Drawable, __: MouseEvent) {
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
        // MouseEvent
        if (e.target === mainCanvas) {
            return [e.offsetX, e.offsetY]
        } else {
            const canvasRect = mainCanvas.getBoundingClientRect()
            const elemRect = (e.target as HTMLElement).getBoundingClientRect()
            return [
                Math.max(GRID_STEP * 2, e.offsetX + elemRect.x - canvasRect.x),
                Math.max(GRID_STEP * 2, e.offsetY + elemRect.y - canvasRect.y),
            ]
        }
    } else {
        const elemRect = (e.target as HTMLElement).getBoundingClientRect()
        const bodyRect = document.body.getBoundingClientRect()
        const touch = e.changedTouches[0]
        const offsetX = touch.pageX - (elemRect.left - bodyRect.left)
        const offsetY = touch.pageY - (elemRect.top - bodyRect.top)

        if (e.target === mainCanvas) {
            return [offsetX, offsetY]
        } else {
            const canvasRect = mainCanvas.getBoundingClientRect()
            return [
                Math.max(GRID_STEP * 2, offsetX + elemRect.x - canvasRect.x),
                Math.max(GRID_STEP * 2, offsetY + elemRect.y - canvasRect.y),
            ]
        }
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
    tooltipElem = document.getElementById("tooltip")!

    const p5canvas = createCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight, P2D)

    p5canvas.parent('canvas-sim')
    mainCanvas = canvasContainer.getElementsByTagName("canvas")[0]


    const mouseDownTouchStart = (e: MouseEvent | TouchEvent) => {
        clearHoverTimeoutHandle()
        clearPopperIfNecessary()
        if (isNull(_currentMouseDownData)) {
            const xy = offsetXY(e)
            updateMouseOver(xy)
            if (isNotNull(_currentMouseOverComp)) {
                // mouse down on component
                const { lockMouseOver } = _currentHandlers.mouseDownOn(_currentMouseOverComp, e)
                if (lockMouseOver) {
                    _currentMouseDownData = {
                        comp: _currentMouseOverComp,
                        fireMouseClickedOnFinish: true,
                        initialXY: xy,
                    }
                    setStartDragTimeout(_currentMouseOverComp, e)
                }
                RedrawManager.addReason("mousedown", null)
            } else {
                // mouse down on background
                _currentMouseDownData = {
                    comp: canvasContainer,
                    fireMouseClickedOnFinish: true,
                    initialXY: xy,
                }
                _currentHandlers.mouseDownOnBackground(e)
            }
            updateCursor()
        } else {
            // we got a mousedown while a component had programmatically
            // been determined as being mousedown'd; ignore
        }
    }

    const mouseMoveTouchMove = (e: MouseEvent | TouchEvent) => {
        if (isNotNull(_currentMouseDownData)) {
            if (_currentMouseDownData.comp instanceof Drawable) {
                // check if the drag is too small to be taken into account now
                // (e.g., touchmove is fired very quickly)
                const d = dist(...offsetXY(e), ..._currentMouseDownData.initialXY)
                // NaN is returned when no input point was specified and
                // dragging should then happen regardless
                if (isNaN(d) || d >= 5) {
                    // dragging component
                    clearStartDragTimeout()
                    _currentMouseDownData.fireMouseClickedOnFinish = false
                    _currentHandlers.mouseDraggedOn(_currentMouseDownData.comp, e)
                }
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
        const mouseUpTarget = _currentMouseDownData?.comp ?? _currentMouseOverComp
        if (mouseUpTarget instanceof Drawable) {
            // mouseup on component
            if (isNotNull(_startDragTimeoutHandle)) {
                clearTimeout(_startDragTimeoutHandle)
                _startDragTimeoutHandle = null
            }
            _currentHandlers.mouseUpOn(mouseUpTarget, e)
            if (_currentMouseDownData?.fireMouseClickedOnFinish ?? false) {
                if (isDoubleClick(mouseUpTarget, e)) {
                    _currentHandlers.mouseDoubleClickedOn(mouseUpTarget, e)
                } else {
                    _currentHandlers.mouseClickedOn(mouseUpTarget, e)
                }
            }

        } else {
            // mouseup on background
            _currentHandlers.mouseUpOnBackground(e)
        }
        _currentMouseDownData = null
        RedrawManager.addReason("mouseup", null)
    }

    canvasContainer.addEventListener("touchstart", wrapHandler((e) => {
        // console.log("canvas touchstart %o %o", offsetXY(e), e)
        if (mode >= Mode.CONNECT) {
            // prevent scrolling when we can connect
            e.preventDefault()
        }
        mouseDownTouchStart(e)
    }))
    canvasContainer.addEventListener("touchmove", wrapHandler((e) => {
        // console.log("canvas touchmove %o %o", offsetXY(e), e)
        if (mode >= Mode.CONNECT) {
            // prevent scrolling when we can connect
            e.preventDefault()
        }
        mouseMoveTouchMove(e)
    }))

    canvasContainer.addEventListener("touchend", wrapHandler((e) => {
        // console.log("canvas touchend %o %o", offsetXY(e), e, e.detail)
        // touchend should always be prevented, otherwise it may
        // generate mouse/click events
        e.preventDefault()
        mouseUpTouchEnd(e)
        setCurrentMouseOverComp(null)
    }))

    // canvasContainer.addEventListener("touchcancel", wrapHandler((e) => {
    //     // console.log("canvas touchcancel %o %o", offsetXY(e), e)
    // }))

    canvasContainer.addEventListener("mousedown", wrapHandler((e) => {
        // console.log("mousedown %o", e)
        mouseDownTouchStart(e)
    }))

    canvasContainer.addEventListener("mousemove", wrapHandler((e) => {
        // console.log("mousemove %o", e)
        mouseMoveTouchMove(e)
        updateCursor()
    }))

    canvasContainer.addEventListener("mouseup", wrapHandler((e) => {
        // console.log("mouseup %o", e)
        mouseUpTouchEnd(e)
        updateMouseOver([e.offsetX, e.offsetY])
        updateCursor()
    }))

    const compButtons = document.getElementsByClassName("sim-component-button")

    for (let i = 0; i < compButtons.length; i++) {
        const compButton = compButtons[i] as HTMLElement
        const factory = makeComponentFactoryForButton(compButton)

        const buttonMouseDownTouchStart = (e: MouseEvent | TouchEvent) => {
            e.preventDefault()
            const newComponent = factory()
            _currentMouseOverComp = newComponent
            const { lockMouseOver } = _currentHandlers.mouseDownOn(newComponent, e)
            if (lockMouseOver) {
                _currentMouseDownData = {
                    comp: _currentMouseOverComp,
                    fireMouseClickedOnFinish: false,
                    initialXY: [NaN, NaN],
                }
            }
            _currentHandlers.mouseDraggedOn(newComponent, e)
        }

        compButton.addEventListener("mousedown", wrapHandler((e) => {
            buttonMouseDownTouchStart(e)
        }))
        compButton.addEventListener("touchstart", wrapHandler((e) => {
            // console.log("button touchstart %o %o", offsetXY(e), e)
            buttonMouseDownTouchStart(e)
        }))
        compButton.addEventListener("touchmove", wrapHandler((e) => {
            // console.log("button touchmove %o %o", offsetXY(e), e)
            e.preventDefault()
            mouseMoveTouchMove(e)
        }))
        compButton.addEventListener("touchend", wrapHandler((e) => {
            // console.log("button touchend %o %o", offsetXY(e), e)
            e.preventDefault() // otherwise, may generate mouseclick, etc.
            mouseUpTouchEnd(e)
            setCurrentMouseOverComp(null)
        }))
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

                switchToModeDiv.addEventListener("click", wrapHandler(() => trySetMode(buttonMode)))

                return switchToModeDiv
            })
        ).applyTo(modeChangeMenu)

        setVisible(modeChangeMenu, true)
    }


    const timelineControls = document.getElementById("timelineControls")!
    const makeTimelineButton = (icon: string, text: string | undefined, expl: string, action: () => unknown) => {
        const but =
            button(cls("btn btn-sm btn-outline-light sim-toolbar-button-right"),
                isUndefined(text) ? style("text-align: center") : emptyMod,
                title(expl),
                faglyph(icon, style("width: 20px")), isUndefined(text) ? raw("&nbsp;") : text,
            ).render()
        but.addEventListener("click", action)
        return but
    }
    const playButton = makeTimelineButton("play", "Play", "Démarre l’écoulement du temps", () => Timeline.play())
    const pauseButton = makeTimelineButton("pause", "Pause", "Arrête l’écoulement du temps", () => Timeline.pause())
    const stepButton = makeTimelineButton("step-forward", undefined, "Avance au prochain événement", () => Timeline.step())
    applyModifierTo(timelineControls, mods(playButton, pauseButton, stepButton))

    const showTimelineButtons = true
    setVisible(timelineControls, showTimelineButtons)

    function setTimelineButtonsVisible(state: TimelineState) {
        if (state.hasCallbacks) {
            // show part of the interface
            setVisible(playButton, state.isPaused)
            setVisible(pauseButton, !state.isPaused)
            setVisible(stepButton, state.canStep)
        } else {
            // show nothing
            setVisible(playButton, false)
            setVisible(pauseButton, false)
            setVisible(stepButton, false)
        }
    }

    Timeline.reset()
    Timeline.onStateChanged = newState => setTimelineButtonsVisible(newState)
    setTimelineButtonsVisible(Timeline.state)

    const data = getURLParameter(PARAM_DATA)
    if (isDefined(data)) {
        initialData = data
        tryLoadFromData()
    }

    // also triggers redraw, should be last
    trySetMode(upperMode)
}
window.setup = setup

function setVisible(elem: HTMLElement, visible: boolean) {
    if (visible) {
        const prevDisplay = elem.getAttribute("data-prev-display")
        if (isNull(prevDisplay)) {
            if (elem.style.display === "none") {
                elem.style.removeProperty("display")
            } else {
                // not hidden
            }
        } else {
            elem.removeAttribute("data-prev-display")
            elem.style.display = prevDisplay
        }
    } else {
        const currentDisplay = elem.style.display
        if (currentDisplay.length !== 0 && currentDisplay !== "none") {
            elem.setAttribute("data-prev-display", currentDisplay)
        }
        elem.style.display = "none"
    }
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

export function wrapHandler<T extends unknown[], R>(f: (...params: T) => R): (...params: T) => R {
    return (...params: T) => {
        const result = f(...params)
        recalcAndDrawIfNeeded()
        return result
    }

    function recalcAndDrawIfNeeded() {
        const __recalculated = RecalcManager.recalculateIfNeeded()

        if (wireMgr.isAddingWire) {
            RedrawManager.addReason("adding a wire", null)
        }

        const redrawReasons = RedrawManager.getReasonsAndClear()
        if (isUndefined(redrawReasons)) {
            return
        }

        // console.log("Drawing " + (__recalculated ? "with" : "without") + " recalc, reasons:\n    " + redrawReasons)

        const g = mainCanvas.getContext("2d")!

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
        wireMgr.draw(g, _currentMouseOverComp)

        for (const elems of allComponents) {
            for (const elem of elems) {
                elem.draw(g, _currentMouseOverComp)
                elem.forEachNode((node) => {
                    node.draw(g, _currentMouseOverComp)
                    return true
                })
            }
        }

        const newRedrawReasons = RedrawManager.getReasonsAndClear()
        if (isDefined(newRedrawReasons)) {
            console.log("ERROR: unexpectedly found new reasons to redraw right after a redraw:\n    " + newRedrawReasons)
        }
    }
}

window.addEventListener("keydown", wrapHandler(e => {
    switch (e.key) {
        case "Alt": // option
            return NodeManager.tryConnectNodes()
    }
}))

window.addEventListener("keyup", wrapHandler(e => {
    switch (e.key) {
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
}))


window.addEventListener("resize", wrapHandler(__ => {
    resizeCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight)
    RedrawManager.addReason("window resized", null)
}))

window.setModeClicked = function setModeClicked(e: HTMLElement) {
    const buttonModeStr = e.getAttribute("mode") ?? "_unknown_"
    if (buttonModeStr in Mode) {
        const wantedMode = (Mode as any)[buttonModeStr]
        trySetMode(wantedMode)
    }
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
    let compDeleted = false
    for (const elems of allComponents) {
        for (let i = 0; i < elems.length; i++) {
            const elem = elems[i]
            if (cond(elem)) {
                elem.destroy()
                delete elems[i]
                elems.splice(i, 1)
                compDeleted = true
            }
        }
    }
    if (compDeleted) {
        RedrawManager.addReason("components deleted", null)
    }
}

// Expose functions as part of the in-browser command-line API
window.load = wrapHandler((jsonString: any) => PersistenceManager.doLoadFromJson(jsonString))

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

