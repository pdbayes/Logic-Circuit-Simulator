import { createPopper, Instance as PopperInstance } from '@popperjs/core'

import { makeComponentFactoryForButton, MouseAction, setCurrentMouseAction } from "./menutools"
import { copyToClipboard, getURLParameter, isDefined, isFalsyString, isNotNull, isNull, isNullOrUndefined, isUndefined, TimeoutHandle } from "./utils"
import { Waypoint, Wire, WireManager } from "./components/Wire"
import { Mode } from "./utils"
import { PersistenceManager } from "./PersistenceManager"
import { Component, ComponentBase, ComponentState } from "./components/Component"
import { applyModifiersTo, applyModifierTo, attrBuilder, button, cls, div, emptyMod, faglyph, li, Modifier, ModifierObject, mods, raw, span, style, title, type, ul } from "./htmlgen"
import { COLOR_BACKGROUND, COLOR_BACKGROUND_UNUSED_REGION, COLOR_BORDER, COLOR_COMPONENT_BORDER, COLOR_GRID_LINES, dist, GRID_STEP, guessCanvasHeight, setColorMouseOverIsDanger, strokeSingleLine } from "./drawutils"
import { Node } from "./components/Node"
import { ContextMenuItem, Drawable, DrawableWithPosition } from "./components/Drawable"
import { RecalcManager, RedrawManager } from './RedrawRecalcManager'
import { Timeline, TimelineState } from './Timeline'
import { gallery } from './gallery'


export const components: Component[] = []
export const wireMgr = new WireManager()


const MaxMode = Mode.FULL
const MaxEmbeddedMode = Mode.DESIGN

export let upperMode: Mode = isEmbeddedInIframe() ? MaxEmbeddedMode : MaxMode
export let mode: Mode = upperMode

const DEFAULT_OPTIONS = {
    showGateTypes: false,
}

type WorkspaceOptions = typeof DEFAULT_OPTIONS

export let options: WorkspaceOptions = { ...DEFAULT_OPTIONS }
export let mouseX = 0
export let mouseY = 0

export function nonDefaultOptions(): undefined | Partial<WorkspaceOptions> {
    const nonDefaultOpts: Partial<WorkspaceOptions> = {}
    let set = false
    for (const [_k, v] of Object.entries(options)) {
        const k = _k as keyof WorkspaceOptions
        if (v !== DEFAULT_OPTIONS[k]) {
            nonDefaultOpts[k] = v
            set = true
        }
    }
    return set ? nonDefaultOpts : undefined
}

export function setOptions(opts: Record<string, unknown> | undefined) {
    const newOpts = { ...DEFAULT_OPTIONS }
    if (isDefined(opts)) {
        for (const _k of Object.keys(newOpts)) {
            const k = _k as keyof WorkspaceOptions
            if (k in opts) {
                newOpts[k] = opts[k] as any // this assumes our value type is correct
            }
        }
    }
    options = newOpts
    // console.log("New options are %o", options)
    RedrawManager.addReason("options changed", null)
}


const _movingDrawables = new Set<DrawableWithPosition>()

function changeMovingDrawables(change: () => void) {
    const emptyBefore = _movingDrawables.size === 0
    change()
    const emptyAfter = _movingDrawables.size === 0
    if (emptyBefore !== emptyAfter) {
        updateCursor()
        RedrawManager.addReason("started or stopped moving drawables", null)
    }
}

export function setDrawableMoving(comp: DrawableWithPosition) {
    changeMovingDrawables(() => {
        _movingDrawables.add(comp)
    })
}
export function setDrawableStoppedMoving(comp: DrawableWithPosition) {
    changeMovingDrawables(() => {
        _movingDrawables.delete(comp)
    })
}

let _toolCursor: string | null = null
export function setToolCursor(cursor: string | null) {
    _toolCursor = cursor
}


let setupWasRun = false
let canvasContainer: HTMLElement
let mainCanvas: HTMLCanvasElement
let baseTransform: DOMMatrix
let tooltipElem: HTMLElement
let mainContextMenu: HTMLElement
let initialData: string | undefined = undefined
export const currentScale = 1

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

        const showReset = mode >= Mode.TRYOUT
        const showRightEditControls = mode >= Mode.CONNECT
        const showRightMenu = showReset || showRightEditControls
        const showOnlyReset = showReset && !showRightEditControls

        setVisible(document.getElementById("resetToolButton")!, showReset)
        setVisible(document.getElementById("resetToolButtonCaption")!, !showOnlyReset)
        setVisible(document.getElementById("resetToolButtonDummyCaption")!, showOnlyReset)
        // 
        const showonlyStr = getURLParameter(PARAM_SHOW_ONLY)
        let showonly: undefined | string[] = undefined
        if (isDefined(showonlyStr)) {
            showonly = showonlyStr.toLowerCase().split(/[, +]+/).filter(x => x.trim())
            // console.log("showonly", showonly)
            const leftToolbar = document.getElementById("leftToolbar")!
            const toolbarChildren = leftToolbar.children
            let numVisibleInOut = 0
            let numVisibleGates = 0
            let numVisibleIC = 0
            for (let i = 0; i < toolbarChildren.length; i++) {
                const child = toolbarChildren[i] as HTMLElement
                const compStr = child.getAttribute("data-component")?.toLowerCase()
                const compType = child.getAttribute("data-type")?.toLowerCase()
                const buttonID = (compType ?? compStr)
                const visible = isUndefined(buttonID) || showonly.includes(buttonID)
                // console.log("buttonID", buttonID, "visible", visible)
                if (visible) {
                    if (compStr === "gate") {
                        numVisibleGates++
                    } else if (compStr === "ic") {
                        numVisibleIC++
                    } else if (!isNullOrUndefined(compStr)) {
                        numVisibleInOut++
                    }
                }
                setVisible(child, visible)
            }
            const showInOutHeader = numVisibleInOut > 0
            const showGatesHeader = numVisibleGates > 0
            const showICHeader = numVisibleIC > 0
            setVisible(document.getElementById("inOutHeader")!, showInOutHeader)
            setVisible(document.getElementById("gatesHeader")!, showGatesHeader)
            setVisible(document.getElementById("icHeader")!, showICHeader)
            setVisible(document.getElementById("inOut-gates-sep")!, showInOutHeader && showGatesHeader)
            setVisible(document.getElementById("gates-ic-sep")!, (showInOutHeader || showGatesHeader) && showICHeader)
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

        const showTxGates = mode >= Mode.FULL && (isUndefined(showonly) || showonly.includes("TX") || showonly.includes("TXA"))
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
    triggeredContextMenu: boolean
}

let _currentMouseOverComp: Drawable | null = null
let _currentMouseOverPopper: PopperInstance | null = null
let _currentMouseDownData: MouseDownData | null = null
let _startHoverTimeoutHandle: TimeoutHandle | null = null
let _startDragTimeoutHandle: TimeoutHandle | null = null

function setStartDragTimeout(comp: Drawable, e: MouseEvent | TouchEvent) {
    _startDragTimeoutHandle = setTimeout(
        wrapHandler(() => {
            let fireDrag = true
            if (isNotNull(_currentMouseDownData)) {
                _currentMouseDownData.fireMouseClickedOnFinish = false
                if (_currentMouseDownData.triggeredContextMenu) {
                    fireDrag = false
                }
            }
            if (fireDrag) {
                _currentHandlers.mouseDraggedOn(comp, e)
            }
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
            for (const comp of components) {
                let nodeOver: Node | null = null
                comp.forEachNode((node) => {
                    if (node.isOver(x, y)) {
                        nodeOver = node
                        return false
                    }
                    return true
                })
                if (isNotNull(nodeOver)) {
                    return nodeOver
                }
                if (comp.isOver(x, y)) {
                    return comp
                }
            }

            // check if we're over a wire
            for (const wire of wireMgr.wires) {
                for (const waypoint of wire.waypoints) {
                    if (waypoint.isOver(x, y)) {
                        return waypoint
                    }
                }
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
        _movingDrawables.size !== 0
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
    contextMenuOn(__comp: Drawable, __e: MouseEvent | TouchEvent) {
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

    private _contextMenuOpen = false

    override mouseHoverOn(comp: Drawable) {
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
    override mouseDownOn(comp: Drawable, e: MouseEvent | TouchEvent): { lockMouseOver: boolean } {
        return comp.mouseDown(e)
    }
    override mouseDraggedOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseDragged(e)
    }
    override mouseUpOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseUp(e)
    }
    override mouseClickedOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseClicked(e)
    }
    override mouseDoubleClickedOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        comp.mouseDoubleClicked(e)
    }
    override contextMenuOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        // console.log("contextMenuOn: %o", comp)
        if (this._contextMenuOpen) {
            return
        }

        const contextMenuData = comp.makeContextMenu()
        // console.log("asking for menu: %o got: %o", comp, contextMenuData)
        if (isDefined(contextMenuData)) {

            // console.log("setting triggered")
            if (isNotNull(_currentMouseDownData)) {
                _currentMouseDownData.triggeredContextMenu = true
            }

            // console.log("building menu for %o", contextMenuData)

            const defToElem = (item: ContextMenuItem): HTMLElement => {
                function mkButton(spec: { icon?: string | undefined, caption: Modifier }, danger: boolean) {
                    return button(type("button"), cls(`menu-btn${(danger ? " danger" : "")}`),
                        isUndefined(spec.icon)
                            ? spec.caption
                            : mods(faglyph(spec.icon), span(cls("menu-text"), spec.caption))
                    )
                }

                switch (item._tag) {
                    case 'sep':
                        return li(cls("menu-separator")).render()
                    case 'text':
                        return li(cls("menu-item-static"), item.caption).render()
                    case "item": {
                        const but = mkButton(item, item.danger ?? false).render()
                        but.addEventListener("click", wrapHandler((itemEvent: MouseEvent | TouchEvent) => {
                            item.action(itemEvent, e)
                        }))
                        return li(cls("menu-item"), but).render()
                    }
                    case "submenu": {
                        return li(cls("menu-item submenu"),
                            mkButton(item, false),
                            ul(cls("menu"),
                                ...item.items.map(defToElem)
                            )
                        ).render()
                    }
                }
            }

            const items = contextMenuData.map(defToElem)

            applyModifiersTo(mainContextMenu, items)
            const em = e as MouseEvent
            mainContextMenu.style.left = em.pageX + 'px'
            mainContextMenu.style.top = em.pageY + 'px'
            mainContextMenu.classList.add("show-menu")
            this._contextMenuOpen = true

            const hideMenu = () => {
                mainContextMenu.classList.remove('show-menu')
                mainContextMenu.innerHTML = ""
                this._contextMenuOpen = false
            }

            const clickHandler = () => {
                hideMenu()
                document.removeEventListener("click", clickHandler)
            }

            setTimeout(() => {
                document.addEventListener("click", clickHandler, false)
            }, 200)
        }
    }
    override mouseUpOnBackground(__e: MouseEvent | TouchEvent) {
        wireMgr.tryCancelWire()
    }
}

export function tryDeleteComponentsWhere(cond: (e: Component) => boolean) {
    let compDeleted = false
    for (let i = 0; i < components.length; i++) {
        const comp = components[i]
        if (cond(comp)) {
            comp.destroy()
            components.splice(i, 1)
            compDeleted = true
        }
    }
    if (compDeleted) {
        RedrawManager.addReason("component(s) deleted", null)
    }
}

class _DeleteHandlers extends ToolHandlers {
    override mouseClickedOn(comp: Drawable, __: MouseEvent) {
        if (comp instanceof ComponentBase) {
            tryDeleteComponentsWhere(c => c === comp)
        } else if (comp instanceof Wire) {
            wireMgr.deleteWire(comp)
        } else if (comp instanceof Waypoint) {
            comp.removeFromParent()
        }
    }
}

class _MoveHandlers extends ToolHandlers {
    override mouseDownOnBackground(e: MouseEvent) {
        for (const comp of components) {
            comp.mouseDown(e)
        }
        for (const wire of wireMgr.wires) {
            for (const waypoint of wire.waypoints) {
                waypoint.mouseDown(e)
            }
        }
    }
    override mouseDraggedOnBackground(e: MouseEvent) {
        for (const comp of components) {
            comp.mouseDragged(e)
        }
        for (const wire of wireMgr.wires) {
            for (const waypoint of wire.waypoints) {
                waypoint.mouseDragged(e)
            }
        }
    }
    override mouseUpOnBackground(e: MouseEvent) {
        for (const comp of components) {
            comp.mouseUp(e)
        }
        for (const wire of wireMgr.wires) {
            for (const waypoint of wire.waypoints) {
                waypoint.mouseUp(e)
            }
        }
    }
}

const EditHandlers = new _EditHandlers
const DeleteHandlers = new _DeleteHandlers
const MoveHandlers = new _MoveHandlers

let _currentHandlers: ToolHandlers = EditHandlers

export function setHandlersFor(action: MouseAction) {
    _currentHandlers = (() => {
        switch (action) {
            case "edit": return EditHandlers
            case "delete": return DeleteHandlers
            case "move": return MoveHandlers
        }
    })()
    setColorMouseOverIsDanger(action === "delete")
}

export function offsetXYForContextMenu(e: MouseEvent | TouchEvent): [number, number] {
    if ("offsetX" in e && e.offsetX === 0 && e.offsetY === 0 && e.target === mainCanvas) {
        const canvasRect = mainCanvas.getBoundingClientRect()
        return [e.clientX - canvasRect.x, e.clientY - canvasRect.y]
    } else {
        return offsetXY(e)
    }
}

export function offsetXY(e: MouseEvent | TouchEvent): [number, number] {
    const [unscaledX, unscaledY] = (() => {
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
    })()
    return [unscaledX / currentScale, unscaledY / currentScale]
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

function setCanvasWidth(w: number, h: number) {
    const f = window.devicePixelRatio ?? 1
    mainCanvas.setAttribute("width", String(w * f))
    mainCanvas.setAttribute("height", String(h * f))
    mainCanvas.style.setProperty("width", w + "px")
    mainCanvas.style.setProperty("height", h + "px")
    baseTransform = new DOMMatrix(`scale(${f})`)
}

export function setup() {
    if (setupWasRun) {
        console.log("Skipping repeated setup")
        return
    }
    console.log("Running setup…")
    canvasContainer = document.getElementById("canvas-sim")!
    tooltipElem = document.getElementById("tooltip")!
    mainContextMenu = document.getElementById("mainContextMenu")!

    mainCanvas = document.createElement("canvas")
    setCanvasWidth(canvasContainer.clientWidth, canvasContainer.clientHeight)
    canvasContainer.appendChild(mainCanvas)


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
                        triggeredContextMenu: false,
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
                    triggeredContextMenu: false,
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
            if (_currentMouseDownData.triggeredContextMenu) {
                // cancel it all
                _currentMouseDownData = null
            } else {
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

    canvasContainer.addEventListener("contextmenu", wrapHandler((e) => {
        // console.log("contextmenu %o", e)
        e.preventDefault()
        if (mode >= Mode.CONNECT && isNotNull(_currentMouseOverComp)) {
            _currentHandlers.contextMenuOn(_currentMouseOverComp, e)
        }
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
                    triggeredContextMenu: false,
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

    window.addEventListener("mousemove", e => {
        const canvasPos = canvasContainer.getBoundingClientRect()
        mouseX = e.clientX - canvasPos.left
        mouseY = e.clientY - canvasPos.top
    }, true)

    // window.addEventListener("keydown", wrapHandler(e => {
    //     switch (e.key) {
    //         case "Alt": // option
    //             return NodeManager.tryConnectNodes()
    //     }
    // }))

    window.addEventListener("keyup", wrapHandler(e => {
        switch (e.key) {
            case "Escape":
                tryDeleteComponentsWhere(comp => comp.state === ComponentState.SPAWNING)
                wireMgr.tryCancelWire()
                return

            case "Backspace":
            case "Delete":
                tryDeleteComponentsWhere(comp => _currentMouseOverComp === comp)
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
        if (isUndefined(canvasContainer)) {
            setup()
        } else {
            setCanvasWidth(canvasContainer.clientWidth, canvasContainer.clientHeight)
            RedrawManager.addReason("window resized", null)
        }
    }))

    let pixelRatioMediaQuery: undefined | MediaQueryList
    function registerPixelRatioListener() {
        if (isDefined(pixelRatioMediaQuery)) {
            pixelRatioMediaQuery.onchange = null
        }

        const queryString = `(resolution: ${window.devicePixelRatio}dppx)`
        pixelRatioMediaQuery = window.matchMedia(queryString)
        pixelRatioMediaQuery.onchange = wrapHandler(() => {
            RedrawManager.addReason("devicePixelRatio changed", null)
            registerPixelRatioListener()
        })
    }
    registerPixelRatioListener()

    window.setModeClicked = function setModeClicked(e: HTMLElement) {
        const buttonModeStr = e.getAttribute("mode") ?? "_unknown_"
        if (buttonModeStr in Mode) {
            const wantedMode = (Mode as any)[buttonModeStr]
            trySetMode(wantedMode)
        }
    }
    window.gallery = gallery

    setupWasRun = true
}
window.addEventListener('DOMContentLoaded', () => {
    setup()
})

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
        const width = mainCanvas.width
        const height = mainCanvas.height
        g.setTransform(baseTransform)
        g.lineCap = "square"
        g.textBaseline = "middle"

        g.fillStyle = COLOR_BACKGROUND
        g.fillRect(0, 0, width, height)

        g.strokeStyle = COLOR_BORDER
        g.lineWidth = 2

        if (mode >= Mode.CONNECT || upperMode === MaxMode) {
            g.strokeRect(0, 0, width, height)
            if (upperMode === MaxMode && mode < upperMode) {
                const h = guessCanvasHeight()
                strokeSingleLine(g, 0, h, width, h)

                g.fillStyle = COLOR_BACKGROUND_UNUSED_REGION
                g.fillRect(0, h, width, height - h)
            }
        }

        const isMovingComponent = _movingDrawables.size > 0
        if (isMovingComponent) {
            g.strokeStyle = COLOR_GRID_LINES
            g.lineWidth = 1
            g.beginPath()
            for (let x = GRID_STEP; x < width; x += GRID_STEP) {
                g.moveTo(x, 0)
                g.lineTo(x, height)
            }
            for (let y = GRID_STEP; y < height; y += GRID_STEP) {
                g.moveTo(0, y)
                g.lineTo(width, y)
            }
            g.stroke()
        }

        g.scale(currentScale, currentScale)

        g.strokeStyle = COLOR_COMPONENT_BORDER
        wireMgr.draw(g, _currentMouseOverComp)

        for (const comp of components) {
            comp.draw(g, _currentMouseOverComp)
            comp.forEachNode((node) => {
                node.draw(g, _currentMouseOverComp)
                return true
            })
        }

        const newRedrawReasons = RedrawManager.getReasonsAndClear()
        if (isDefined(newRedrawReasons)) {
            console.log("ERROR: unexpectedly found new reasons to redraw right after a redraw:\n    " + newRedrawReasons)
        }
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

// Expose functions as part of the in-browser command-line API
window.load = wrapHandler((jsonString: any) => PersistenceManager.doLoadFromJson(jsonString))
window.setOptions = wrapHandler(setOptions)
