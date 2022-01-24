import { createPopper, Instance as PopperInstance } from '@popperjs/core'
import { ContextMenuItem, Drawable, DrawableWithPosition } from "./components/Drawable"
import { LogicEditor, MouseAction } from './LogicEditor'
import { isDefined, isNotNull, isNull, isUndefined, Mode, TimeoutHandle } from "./utils"
import { Node } from "./components/Node"
import { applyModifiersTo, button, cls, faglyph, li, Modifier, ModifierObject, mods, span, type, ul } from './htmlgen'
import { ComponentBase } from './components/Component'
import { Waypoint, Wire } from './components/Wire'
import { ComponentFactory } from './ComponentFactory'
import { dist, setColorMouseOverIsDanger } from './drawutils'

type MouseDownData = {
    comp: Drawable | Element
    fireMouseClickedOnFinish: boolean
    initialXY: [number, number]
    triggeredContextMenu: boolean
}

export type EditorSelection = {
    allRects: DOMRect[],
    latestRect: DOMRect,
    visible: boolean
}


export class CursorMovementManager {

    public readonly editor: LogicEditor
    private _currentMouseOverComp: Drawable | null = null
    private _currentMouseOverPopper: PopperInstance | null = null
    private _currentMouseDownData: MouseDownData | null = null
    private _startHoverTimeoutHandle: TimeoutHandle | null = null
    private _startDragTimeoutHandle: TimeoutHandle | null = null
    private _currentHandlers: ToolHandlers
    private _lastTouchEnd: [Drawable, number] | undefined = undefined

    public _currentSelection: EditorSelection | undefined = undefined


    constructor(editor: LogicEditor) {
        this.editor = editor
        this._currentHandlers = new EditHandlers(editor)
    }

    public get currentMouseOverComp() {
        return this._currentMouseOverComp
    }

    public get currentMouseDownData() {
        return this._currentMouseDownData
    }

    setHandlersFor(action: MouseAction) {
        this._currentHandlers = (() => {
            switch (action) {
                case "edit": return new EditHandlers(this.editor)
                case "delete": return new DeleteHandlers(this.editor)
                case "move": return new MoveHandlers(this.editor)
            }
        })()
        setColorMouseOverIsDanger(action === "delete")
    }

    setStartDragTimeout(comp: Drawable, e: MouseEvent | TouchEvent) {
        this._startDragTimeoutHandle = setTimeout(
            this.editor.wrapHandler(() => {
                let fireDrag = true
                if (isNotNull(this._currentMouseDownData)) {
                    this._currentMouseDownData.fireMouseClickedOnFinish = false
                    if (this._currentMouseDownData.triggeredContextMenu) {
                        fireDrag = false
                    }
                }
                if (fireDrag) {
                    this._currentHandlers.mouseDraggedOn(comp, e)
                }
            }),
            300
        )
    }

    clearStartDragTimeout() {
        if (isNotNull(this._startDragTimeoutHandle)) {
            clearTimeout(this._startDragTimeoutHandle)
            this._startDragTimeoutHandle = null
        }
    }

    clearHoverTimeoutHandle() {
        if (isNotNull(this._startHoverTimeoutHandle)) {
            clearTimeout(this._startHoverTimeoutHandle)
            this._startHoverTimeoutHandle = null
        }
    }

    setCurrentMouseOverComp(comp: Drawable | null) {
        if (comp !== this._currentMouseOverComp) {
            this.clearPopperIfNecessary()
            this.clearHoverTimeoutHandle()

            this._currentMouseOverComp = comp
            if (isNotNull(comp)) {
                this._startHoverTimeoutHandle = setTimeout(() => {
                    this._currentHandlers.mouseHoverOn(comp)
                    this._startHoverTimeoutHandle = null
                }, 1200)
            }
            this.editor.redrawMgr.addReason("mouseover changed", null)
            // console.log("Over component: ", newMouseOverComp)
        }
    }

    updateMouseOver([x, y]: [number, number]) {
        const findMouseOver: () => Drawable | null = () => {
            if (this.editor.mode > Mode.STATIC) {

                // easy optimization: maybe we're still over the
                // same component as before, so quickly check this
                if (isNotNull(this._currentMouseOverComp)) {
                    if (this._currentMouseOverComp.isOver(x, y)) {
                        return this._currentMouseOverComp
                    }
                }

                // check if we're over components or their nodes
                for (const comp of this.editor.components) {
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
                for (const wire of this.editor.wireMgr.wires) {
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

        this.setCurrentMouseOverComp(findMouseOver())
    }


    clearPopperIfNecessary() {
        if (isNotNull(this._currentMouseOverPopper)) {
            this._currentMouseOverPopper.destroy()
            this._currentMouseOverPopper = null
            this.editor.html.tooltipElem.style.display = "none"
        }
    }

    makePopper(tooltipHtml: ModifierObject, rect: DOMRect) {
        const tooltipContents = this.editor.html.tooltipContents
        const tooltipElem = this.editor.html.tooltipElem
        tooltipContents.innerHTML = ""
        tooltipHtml.applyTo(tooltipContents)
        tooltipElem.style.removeProperty("display")
        const canvas = document.getElementsByTagName("CANVAS")[0]
        this._currentMouseOverPopper = createPopper({
            getBoundingClientRect() { return rect },
            contextElement: canvas,
        }, tooltipElem, {
            placement: 'right',
            modifiers: [{ name: 'offset', options: { offset: [4, 8] } }],
        })
        tooltipElem.setAttribute('data-show', '')
        this._currentMouseOverPopper.update()
    }

    registerCanvasListenersOn(canvasContainer: HTMLElement) {
        const editor = this.editor
        canvasContainer.addEventListener("touchstart", editor.wrapHandler((e) => {
            // console.log("canvas touchstart %o %o", offsetXY(e), e)
            if (this.editor.mode >= Mode.CONNECT) {
                // prevent scrolling when we can connect
                e.preventDefault()
            }
            this._mouseDownTouchStart(e)
        }))
        canvasContainer.addEventListener("touchmove", editor.wrapHandler((e) => {
            // console.log("canvas touchmove %o %o", offsetXY(e), e)
            if (this.editor.mode >= Mode.CONNECT) {
                // prevent scrolling when we can connect
                e.preventDefault()
            }
            this._mouseMoveTouchMove(e)
        }))

        canvasContainer.addEventListener("touchend", editor.wrapHandler((e) => {
            // console.log("canvas touchend %o %o", offsetXY(e), e, e.detail)
            // touchend should always be prevented, otherwise it may
            // generate mouse/click events
            e.preventDefault()
            this._mouseUpTouchEnd(e)
            this.setCurrentMouseOverComp(null)
        }))

        // canvasContainer.addEventListener("touchcancel", wrapHandler((e) => {
        //     // console.log("canvas touchcancel %o %o", offsetXY(e), e)
        // }))

        canvasContainer.addEventListener("mousedown", editor.wrapHandler((e) => {
            // console.log("mousedown %o", e)
            this._mouseDownTouchStart(e)
        }))

        canvasContainer.addEventListener("mousemove", editor.wrapHandler((e) => {
            // console.log("mousemove %o", e)
            this._mouseMoveTouchMove(e)
            this.editor.updateCursor()
        }))

        canvasContainer.addEventListener("mouseup", editor.wrapHandler((e) => {
            // console.log("mouseup %o", e)
            this._mouseUpTouchEnd(e)
            this.updateMouseOver([e.offsetX, e.offsetY])
            this.editor.updateCursor()
        }))

        canvasContainer.addEventListener("contextmenu", editor.wrapHandler((e) => {
            // console.log("contextmenu %o", e)
            e.preventDefault()
            if (this.editor.mode >= Mode.CONNECT && isNotNull(this._currentMouseOverComp)) {
                this._currentHandlers.contextMenuOn(this._currentMouseOverComp, e)
            }
        }))
    }

    private _mouseDownTouchStart(e: MouseEvent | TouchEvent) {
        this.clearHoverTimeoutHandle()
        this.clearPopperIfNecessary()
        if (isNull(this._currentMouseDownData)) {
            const xy = this.editor.offsetXY(e)
            this.updateMouseOver(xy)
            if (isNotNull(this._currentMouseOverComp)) {
                // mouse down on component
                const { lockMouseOver } = this._currentHandlers.mouseDownOn(this._currentMouseOverComp, e)
                if (lockMouseOver) {
                    this._currentMouseDownData = {
                        comp: this._currentMouseOverComp,
                        fireMouseClickedOnFinish: true,
                        initialXY: xy,
                        triggeredContextMenu: false,
                    }
                    this.setStartDragTimeout(this._currentMouseOverComp, e)
                }
                this.editor.redrawMgr.addReason("mousedown", null)
            } else {
                // mouse down on background
                this._currentMouseDownData = {
                    comp: this.editor.html.canvasContainer,
                    fireMouseClickedOnFinish: true,
                    initialXY: xy,
                    triggeredContextMenu: false,
                }
                this._currentHandlers.mouseDownOnBackground(e)
            }
            this.editor.updateCursor()
        } else {
            // we got a mousedown while a component had programmatically
            // been determined as being mousedown'd; ignore
        }
    }

    private _mouseMoveTouchMove(e: MouseEvent | TouchEvent) {
        if (isNotNull(this._currentMouseDownData)) {
            if (this._currentMouseDownData.triggeredContextMenu) {
                // cancel it all
                this._currentMouseDownData = null
            } else {
                if (this._currentMouseDownData.comp instanceof Drawable) {
                    // check if the drag is too small to be taken into account now
                    // (e.g., touchmove is fired very quickly)
                    const d = dist(...this.editor.offsetXY(e), ...this._currentMouseDownData.initialXY)
                    // NaN is returned when no input point was specified and
                    // dragging should then happen regardless
                    if (isNaN(d) || d >= 5) {
                        // dragging component
                        this.clearStartDragTimeout()
                        this._currentMouseDownData.fireMouseClickedOnFinish = false
                        this._currentHandlers.mouseDraggedOn(this._currentMouseDownData.comp, e)
                    }
                } else {
                    // dragging background
                    this._currentHandlers.mouseDraggedOnBackground(e)
                }
            }
        } else {
            // moving mouse or dragging without a locked component 
            this.updateMouseOver(this.editor.offsetXY(e))
        }
    }

    private _mouseUpTouchEnd(e: MouseEvent | TouchEvent) {
        // our target is either the locked component that
        // was clicked or the latest mouse over component
        const mouseUpTarget = this._currentMouseDownData?.comp ?? this._currentMouseOverComp
        if (mouseUpTarget instanceof Drawable) {
            // mouseup on component
            if (isNotNull(this._startDragTimeoutHandle)) {
                clearTimeout(this._startDragTimeoutHandle)
                this._startDragTimeoutHandle = null
            }
            this._currentHandlers.mouseUpOn(mouseUpTarget, e)
            if (this._currentMouseDownData?.fireMouseClickedOnFinish ?? false) {
                if (this.isDoubleClick(mouseUpTarget, e)) {
                    const handled = this._currentHandlers.mouseDoubleClickedOn(mouseUpTarget, e)
                    if (!handled) {
                        // no double click handler, so we trigger a normal click
                        this._currentHandlers.mouseClickedOn(mouseUpTarget, e)
                    }
                } else {
                    this._currentHandlers.mouseClickedOn(mouseUpTarget, e)
                }
            }

        } else {
            // mouseup on background
            this._currentHandlers.mouseUpOnBackground(e)
        }
        this._currentMouseDownData = null
        this.editor.redrawMgr.addReason("mouseup", null)
    }

    private isDoubleClick(clickedComp: Drawable, e: MouseEvent | TouchEvent) {
        if ("offsetX" in e) {
            return e.detail === 2
        } else {
            const oldLastTouchEnd = this._lastTouchEnd
            const now = new Date().getTime()
            this._lastTouchEnd = [clickedComp, now]
            if (!isDefined(oldLastTouchEnd)) {
                return false
            }
            const [lastComp, lastTime] = oldLastTouchEnd
            const elapsedTimeMillis = now - lastTime
            const isDoubleTouch = lastComp === clickedComp && elapsedTimeMillis > 0 && elapsedTimeMillis < 300
            if (isDoubleTouch) {
                this._lastTouchEnd = undefined
            }
            return isDoubleTouch
        }
    }

    registerButtonListenersOn(componentButtons: NodeListOf<HTMLElement>) {
        const editor = this.editor
        for (let i = 0; i < componentButtons.length; i++) {
            const compButton = componentButtons[i]
            const factory = ComponentFactory.makeFactoryForButton(compButton)

            const buttonMouseDownTouchStart = (e: MouseEvent | TouchEvent) => {
                this.editor.setCurrentMouseAction("edit")
                e.preventDefault()
                const newComponent = factory(editor)
                this._currentMouseOverComp = newComponent
                const { lockMouseOver } = this._currentHandlers.mouseDownOn(newComponent, e)
                if (lockMouseOver) {
                    this._currentMouseDownData = {
                        comp: this._currentMouseOverComp,
                        fireMouseClickedOnFinish: false,
                        initialXY: [NaN, NaN],
                        triggeredContextMenu: false,
                    }
                }
                this._currentHandlers.mouseDraggedOn(newComponent, e)
            }

            compButton.addEventListener("mousedown", editor.wrapHandler((e) => {
                buttonMouseDownTouchStart(e)
            }))
            compButton.addEventListener("touchstart", editor.wrapHandler((e) => {
                // console.log("button touchstart %o %o", offsetXY(e), e)
                buttonMouseDownTouchStart(e)
            }))
            compButton.addEventListener("touchmove", editor.wrapHandler((e) => {
                // console.log("button touchmove %o %o", offsetXY(e), e)
                e.preventDefault()
                this._mouseMoveTouchMove(e)
            }))
            compButton.addEventListener("touchend", editor.wrapHandler((e) => {
                // console.log("button touchend %o %o", offsetXY(e), e)
                e.preventDefault() // otherwise, may generate mouseclick, etc.
                this._mouseUpTouchEnd(e)
                this.setCurrentMouseOverComp(null)
            }))
        }
    }

}


abstract class ToolHandlers {

    public readonly editor: LogicEditor

    constructor(editor: LogicEditor) {
        this.editor = editor
    }

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
    mouseDoubleClickedOn(__comp: Drawable, __e: MouseEvent | TouchEvent): boolean {
        return false // false means unhandled
    }
    contextMenuOn(__comp: Drawable, __e: MouseEvent | TouchEvent): boolean {
        return false // false means unhandled
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

class EditHandlers extends ToolHandlers {

    private _contextMenuOpen = false

    constructor(editor: LogicEditor) {
        super(editor)
    }

    override mouseHoverOn(comp: Drawable) {
        const editor = this.editor
        editor.cursorMovementManager.clearPopperIfNecessary()
        if (editor.options.hideTooltips) {
            return
        }
        const tooltip = comp.makeTooltip()
        const containerRect = editor.html.canvasContainer.getBoundingClientRect()
        if (isDefined(tooltip)) {
            const [cx, cy, w, h] =
                comp instanceof DrawableWithPosition
                    ? [comp.posX, comp.posY, comp.width, comp.height]
                    : [editor.mouseX, editor.mouseY, 4, 4]
            const rect = new DOMRect(containerRect.x + cx - w / 2, containerRect.y + cy - h / 2, w, h)
            editor.cursorMovementManager.makePopper(tooltip, rect)
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
        return comp.mouseDoubleClicked(e)
    }
    override contextMenuOn(comp: Drawable, e: MouseEvent | TouchEvent) {
        // console.log("contextMenuOn: %o", comp)
        if (this._contextMenuOpen) {
            return true // already handled
        }

        const contextMenuData = comp.makeContextMenu()
        // console.log("asking for menu: %o got: %o", comp, contextMenuData)
        if (isDefined(contextMenuData)) {

            // console.log("setting triggered")
            const currentMouseDownData = this.editor.cursorMovementManager.currentMouseDownData
            if (isNotNull(currentMouseDownData)) {
                currentMouseDownData.triggeredContextMenu = true
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
                        but.addEventListener("click", this.editor.wrapHandler((itemEvent: MouseEvent | TouchEvent) => {
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

            const mainContextMenu = this.editor.html.mainContextMenu
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

            return true // handled
        }
        return false // unhandled
    }


    override mouseDownOnBackground(e: MouseEvent | TouchEvent) {
        const editor = this.editor
        const cursorMovementMgr = editor.cursorMovementManager
        const currentSelection = cursorMovementMgr._currentSelection
        if (isDefined(currentSelection)) {
            const allowSelection = editor.mode >= Mode.CONNECT
            if (e.shiftKey && allowSelection) {
                // augment selection
                const [left, top] = editor.offsetXY(e)
                const rect = new DOMRect(left, top, 1, 1)
                currentSelection.allRects.push(rect)
                currentSelection.latestRect = rect
                currentSelection.visible = true
            } else {
                // clear selection
                cursorMovementMgr._currentSelection = undefined
            }
            editor.redrawMgr.addReason("selection rect changed", null)
        }
    }
    override mouseDraggedOnBackground(e: MouseEvent | TouchEvent) {
        // TODO smarter selection handling:
        // - if shift key is pressed, add to selection, also individual component
        // - shift-click or drag inverses selection state
        const editor = this.editor
        const allowSelection = editor.mode >= Mode.CONNECT
        if (allowSelection) {
            const cursorMovementMgr = editor.cursorMovementManager
            const currentSelection = cursorMovementMgr._currentSelection
            const [x, y] = editor.offsetXY(e)
            if (isUndefined(currentSelection)) {
                const rect = new DOMRect(x, y, 1, 1)
                cursorMovementMgr._currentSelection = { allRects: [rect], latestRect: rect, visible: true }
            } else {
                const rect = currentSelection.latestRect
                rect.width = x - rect.x
                rect.height = y - rect.y
                editor.redrawMgr.addReason("selection rect changed", null)
            }
        }
    }

    override mouseUpOnBackground(__e: MouseEvent | TouchEvent) {
        const editor = this.editor
        editor.wireMgr.tryCancelWire()

        const cursorMovementMgr = editor.cursorMovementManager
        const currentSelection = cursorMovementMgr._currentSelection
        if (isDefined(currentSelection)) {
            currentSelection.visible = false
            editor.redrawMgr.addReason("selection rect changed", null)
        }
    }
}

class DeleteHandlers extends ToolHandlers {

    constructor(editor: LogicEditor) {
        super(editor)
    }

    override mouseClickedOn(comp: Drawable, __: MouseEvent) {
        this.editor.tryDeleteDrawable(comp)
    }
}

class MoveHandlers extends ToolHandlers {

    constructor(editor: LogicEditor) {
        super(editor)
    }

    override mouseDownOnBackground(e: MouseEvent) {
        for (const comp of this.editor.components) {
            comp.mouseDown(e)
        }
        for (const wire of this.editor.wireMgr.wires) {
            for (const waypoint of wire.waypoints) {
                waypoint.mouseDown(e)
            }
        }
    }
    override mouseDraggedOnBackground(e: MouseEvent) {
        for (const comp of this.editor.components) {
            comp.mouseDragged(e)
        }
        for (const wire of this.editor.wireMgr.wires) {
            for (const waypoint of wire.waypoints) {
                waypoint.mouseDragged(e)
            }
        }
    }
    override mouseUpOnBackground(e: MouseEvent) {
        for (const comp of this.editor.components) {
            comp.mouseUp(e)
        }
        for (const wire of this.editor.wireMgr.wires) {
            for (const waypoint of wire.waypoints) {
                waypoint.mouseUp(e)
            }
        }
    }
}
