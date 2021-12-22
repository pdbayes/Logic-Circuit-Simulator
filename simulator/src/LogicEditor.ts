// import { Component } from "./components/Component"
// import { WireManager } from "./components/Wire"
// import { isNotNull, Mode } from "./utils.js"

import { Component, ComponentState } from "./components/Component"
import { WireManager } from "./components/Wire"
import { CursorMovementManager } from "./CursorMovementManager"
import { COLOR_BACKGROUND, COLOR_BACKGROUND_UNUSED_REGION, COLOR_BORDER, COLOR_COMPONENT_BORDER, COLOR_GRID_LINES, GRID_STEP, strokeSingleLine } from "./drawutils"
import { gallery } from "./gallery"
import { div, cls, style, title, faglyph, attrBuilder, applyModifierTo, button, emptyMod, mods, raw } from "./htmlgen"
import { MoveManager } from "./MoveManager"
import { NodeManager } from "./NodeManager"
import { PersistenceManager } from "./PersistenceManager"
import { RecalcManager, RedrawManager } from "./RedrawRecalcManager"
import { Timeline, TimelineState } from "./Timeline"
import { copyToClipboard, getURLParameter, isDefined, isFalsyString, isNullOrUndefined, isTruthyString, isUndefined, RichStringEnum, setVisible } from "./utils"

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import LogicEditorTemplate from "../html/LogicEditorTemplate.html"
// // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// // @ts-ignore
// import LogicEditorCSS from "../css/LogicEditor.css"
// // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// // @ts-ignore
// import BootstrapCSS from "../../vendor/css/bootstrap.min.css"

enum Mode {
    STATIC,  // cannot interact in any way
    TRYOUT,  // can change inputs on predefined circuit
    CONNECT, // can additionnally move preexisting components around and connect them
    DESIGN,  // can additionally add components from left menu
    FULL,    // can additionally force output nodes to 'unset' state and draw undetermined dates
}

const MAX_MODE_WHEN_STANDALONE = Mode.FULL
const MAX_MODE_WHEN_EMBEDDED = Mode.DESIGN
const DEFAULT_MODE = Mode.DESIGN

const ATTRIBUTE_NAMES = {
    singleton: "singleton", // whether this is the only editor in the page
    mode: "mode",

    // these are mirrored in the display options
    showonly: "showonly",
    showgatetypes: "showgatetypes",
    showtooltips: "tooltips",

    data: "data",
} as const

const DEFAULT_DISPLAY_OPTIONS = {
    showOnly: undefined as undefined | Array<string>,
    showGateTypes: false,
    hideTooltips: false,
}

type DisplayOptions = typeof DEFAULT_DISPLAY_OPTIONS


export const MouseActions = RichStringEnum.withProps<{
    cursor: string | null
}>()({
    edit: { cursor: null },
    move: { cursor: "move" },
    delete: { cursor: "not-allowed" },
})
export type MouseAction = typeof MouseActions.type


export class LogicEditor extends HTMLElement {

    static _globalListenersInstalled = false

    static _allConnectedEditors: Array<LogicEditor> = []
    static get allConnectedEditors(): ReadonlyArray<LogicEditor> {
        return LogicEditor._allConnectedEditors
    }

    readonly wireMgr = new WireManager(this)
    readonly nodeMgr = new NodeManager()
    readonly timeline = new Timeline(this)
    readonly redrawMgr = new RedrawManager()
    readonly recalcMgr = new RecalcManager()
    readonly moveMgr = new MoveManager(this)
    readonly cursorMovementManager = new CursorMovementManager(this)

    readonly components: Component[] = []

    private _isStandalone = false
    private _maxInstanceMode: Mode = MAX_MODE_WHEN_EMBEDDED // can be set later
    private _mode: Mode = DEFAULT_MODE
    private _initialData: string | undefined = undefined
    private _options: DisplayOptions = { ...DEFAULT_DISPLAY_OPTIONS }

    private _currentMouseAction: MouseAction = "edit"
    private _toolCursor: string | null = null

    public root: ShadowRoot
    public readonly html: {
        canvasContainer: HTMLElement,
        mainCanvas: HTMLCanvasElement,
        tooltipElem: HTMLElement,
        tooltipContents: HTMLElement,
        mainContextMenu: HTMLElement,
    }
    private _baseTransform: DOMMatrix
    private _currentScale = 1
    public mouseX = -1000 // offscreen at start
    public mouseY = -1000

    constructor() {
        super()
        this.root = this.attachShadow({ mode: 'open' })
        this.root.appendChild(template.content.cloneNode(true) as HTMLElement)

        const html: typeof this.html = {
            canvasContainer: this.elemWithId("canvas-sim"),
            mainCanvas: this.elemWithId("mainCanvas"),
            tooltipElem: this.elemWithId("tooltip"),
            tooltipContents: this.elemWithId("tooltipContents"),
            mainContextMenu: this.elemWithId("mainContextMenu"),
        }
        this.html = html

        this._baseTransform = new DOMMatrix()
    }

    private elemWithId<E extends HTMLElement>(id: string) {
        let elem = this.root.querySelector(`#${id}`)
        if (elem === null) {
            elem = document.querySelector(`#${id}`)
            if (elem !== null) {
                console.log(`WARNING found elem with id ${id} in document rather than in shadow root`)
            }
        }
        if (elem === null) {
            console.log("root", this.root)
            throw new Error(`Could not find element with id '${id}'`)
        }
        return elem as E
    }

    static get observedAttributes() {
        return []
    }


    get mode() {
        return this._mode
    }

    get displayOptions(): Readonly<DisplayOptions> {
        return this._options
    }

    setPartialDisplayOptions(opts: Partial<DisplayOptions>) {
        this._options = { ...this._options, ...opts }
        this.redrawMgr.addReason("options changed", null)

        // const newOpts = { ...DEFAULT_OPTIONS }
        // if (isDefined(opts)) {
        //     for (const _k of Object.keys(newOpts)) {
        //         const k = _k as keyof WorkspaceOptions
        //         if (k in opts) {
        //             newOpts[k] = opts[k] as any // this assumes our value type is correct
        //         }
        //     }
        // }
        // options = newOpts
        // // console.log("New options are %o", options)
    }

    nonDefaultDisplayOptions(): undefined | Partial<DisplayOptions> {
        const nonDefaultOpts: Partial<DisplayOptions> = {}
        let set = false
        for (const [_k, v] of Object.entries(this._options)) {
            const k = _k as keyof DisplayOptions
            if (v !== DEFAULT_DISPLAY_OPTIONS[k]) {
                nonDefaultOpts[k] = v as any
                set = true
            }
        }
        return set ? nonDefaultOpts : undefined

    }


    setActiveTool(toolElement: HTMLElement) {
        const tool = toolElement.getAttribute("tool")
        if (isNullOrUndefined(tool)) {
            return
        }

        // Main edit buttons on the right
        if (MouseActions.isValue(tool)) {
            this.wrapHandler(() => {
                this.setCurrentMouseAction(tool)
            })()
            return
        }

        this.setCurrentMouseAction("edit")
        if (tool === "Reset") {
            this.wrapHandler(() => {
                this.tryLoadFromData()
            })()
            return
        }
    }

    setToolCursor(cursor: string | null) {
        this._toolCursor = cursor
    }

    private setCanvasWidth(w: number, h: number) {
        const f = window.devicePixelRatio ?? 1
        const mainCanvas = this.html.mainCanvas
        mainCanvas.setAttribute("width", String(w * f))
        mainCanvas.setAttribute("height", String(h * f))
        mainCanvas.style.setProperty("width", w + "px")
        mainCanvas.style.setProperty("height", h + "px")
        // we set it and return it so that we can set it in the constructor and make the compiler happy
        return this._baseTransform = new DOMMatrix(`scale(${f})`)
    }

    connectedCallback() {
        const canvasContainer = this.html.canvasContainer
        this._baseTransform = this.setCanvasWidth(canvasContainer.clientWidth, canvasContainer.clientHeight)
        this.trySetModeFromString(this.getAttribute(ATTRIBUTE_NAMES.mode))

        // TODO clear all redrawmanager
        // TODO add initial reason to redraw
        // draw

        this.cursorMovementManager.registerCanvasListenersOn(this.html.canvasContainer)
        this.cursorMovementManager.registerButtonListenersOn(this.root.querySelectorAll(".sim-component-button"))
        LogicEditor._allConnectedEditors.push(this)
        this.setup()
    }
    disconnectedCallback() {
        const insts = LogicEditor._allConnectedEditors
        insts.splice(insts.indexOf(this), 1)

        // TODO
        // this.cursorMovementManager.unregisterCanvasListenersOn(this.html.canvasContainer)
    }

    private setup() {
        // Transfer from URL param to attributes if we are in standalone mode
        this._isStandalone = !isFalsyString(this.getAttribute(ATTRIBUTE_NAMES.singleton))
        this._maxInstanceMode = this._isStandalone ? MAX_MODE_WHEN_STANDALONE : MAX_MODE_WHEN_EMBEDDED
        if (this._isStandalone) {
            const transferUrlParamToAttribute = (name: string) => {
                const value = getURLParameter(name)
                if (isDefined(value)) {
                    this.setAttribute(name, value)
                }
            }

            for (const attr of [
                ATTRIBUTE_NAMES.mode,
                ATTRIBUTE_NAMES.showonly,
                ATTRIBUTE_NAMES.showgatetypes,
                ATTRIBUTE_NAMES.showtooltips,
                ATTRIBUTE_NAMES.data,
            ]) {
                transferUrlParamToAttribute(attr)
            }

            window.addEventListener("keyup", this.wrapHandler(e => {
                switch (e.key) {
                    case "Escape":
                        this.tryDeleteComponentsWhere(comp => comp.state === ComponentState.SPAWNING)
                        this.wireMgr.tryCancelWire()
                        return

                    case "Backspace":
                    case "Delete":
                        this.tryDeleteComponentsWhere(comp => this.cursorMovementManager.currentMouseOverComp === comp)
                        return

                    case "e":
                        this.setCurrentMouseAction("edit")
                        return

                    case "d":
                        this.setCurrentMouseAction("delete")
                        return

                    case "m":
                        this.setCurrentMouseAction("move")
                        return
                }
            }))

            // make load function available globally
            window.load = this.wrapHandler((jsonString: any) => PersistenceManager.doLoadFromJson(this, jsonString))
        }

        // Load parameters from attributes
        const modeAttr = this.getAttribute(ATTRIBUTE_NAMES.mode)
        if (modeAttr !== null && modeAttr in Mode) {
            this._maxInstanceMode = (Mode as any)[modeAttr]
        }

        const showonlyAttr = this.getAttribute(ATTRIBUTE_NAMES.showonly)
        if (showonlyAttr !== null) {
            this._options.showOnly = showonlyAttr.toLowerCase().split(/[, +]+/).filter(x => x.trim())
        }

        const showgatetypesAttr = this.getAttribute(ATTRIBUTE_NAMES.showgatetypes)
        if (showgatetypesAttr !== null) {
            this._options.showGateTypes = isTruthyString(showgatetypesAttr)
        }

        const showtooltipsAttr = this.getAttribute(ATTRIBUTE_NAMES.showtooltips)
        if (showtooltipsAttr !== null) {
            this._options.hideTooltips = !isFalsyString(showtooltipsAttr)
        }

        const dataAttr = this.getAttribute(ATTRIBUTE_NAMES.data)
        if (dataAttr !== null) {
            this._initialData = dataAttr
        }

        const showModeChange = this._maxInstanceMode >= Mode.FULL
        if (showModeChange) {
            const modeChangeMenu = this.elemWithId("modeChangeMenu")!
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
                        this.copyLinkForMode(buttonMode)
                    })

                    const switchToModeDiv =
                        div(cls("btn btn-sm btn-outline-light sim-toolbar-button-right sim-mode-tool"),
                            style("display: flex; justify-content: space-between; align-items: center"),
                            attrBuilder("mode")(Mode[buttonMode]),
                            title(expl),
                            modeTitle,
                            copyLinkDiv
                        ).render()

                    switchToModeDiv.addEventListener("click", this.wrapHandler(() => this.trySetMode(buttonMode)))

                    return switchToModeDiv
                })
            ).applyTo(modeChangeMenu)
            setVisible(modeChangeMenu, true)
        }

        const timelineControls = this.elemWithId("timelineControls")!
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
        const playButton = makeTimelineButton("play", "Play", "Démarre l’écoulement du temps", () => this.timeline.play())
        const pauseButton = makeTimelineButton("pause", "Pause", "Arrête l’écoulement du temps", () => this.timeline.pause())
        const stepButton = makeTimelineButton("step-forward", undefined, "Avance au prochain événement", () => this.timeline.step())
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

        this.timeline.reset()
        this.timeline.onStateChanged = newState => setTimelineButtonsVisible(newState)
        setTimelineButtonsVisible(this.timeline.state)

        this.tryLoadFromData()
        // also triggers redraw, should be last thing called here
        this.trySetMode(this._maxInstanceMode)

        LogicEditor.installGlobalListeners()
    }

    static installGlobalListeners() {
        if (LogicEditor._globalListenersInstalled) {
            return
        }

        // make gallery available globally
        window.gallery = gallery

        window.addEventListener("mousemove", e => {
            // console.log({ x: e.clientX, y: e.clientY })
            for (const editor of LogicEditor._allConnectedEditors) {
                const canvasContainer = editor.html.canvasContainer
                if (isDefined(canvasContainer)) {
                    const canvasPos = canvasContainer.getBoundingClientRect()
                    // console.log(canvasContainer.getBoundingClientRect(), { x: e.clientX - canvasPos.left, y: e.clientY - canvasPos.top })
                    editor.mouseX = e.clientX - canvasPos.left
                    editor.mouseY = e.clientY - canvasPos.top
                }
            }
            // console.log("--")
        }, true)

        window.addEventListener("resize", () => {
            for (const editor of LogicEditor._allConnectedEditors) {
                const canvasContainer = editor.html.canvasContainer
                if (isDefined(canvasContainer)) {
                    editor.wrapHandler(() => {
                        editor.setCanvasWidth(canvasContainer.clientWidth, canvasContainer.clientHeight)
                        editor.redrawMgr.addReason("window resized", null)
                    })()
                }
            }
            registerPixelRatioListener()
        })

        let pixelRatioMediaQuery: undefined | MediaQueryList
        const registerPixelRatioListener = () => {
            if (isDefined(pixelRatioMediaQuery)) {
                pixelRatioMediaQuery.onchange = null
            }

            const queryString = `(resolution: ${window.devicePixelRatio}dppx)`
            pixelRatioMediaQuery = window.matchMedia(queryString)
            pixelRatioMediaQuery.onchange = () => {
                for (const editor of LogicEditor._allConnectedEditors) {
                    editor.wrapHandler(() => {
                        editor.redrawMgr.addReason("devicePixelRatio changed", null)
                    })()
                }
                registerPixelRatioListener()
            }
        }
        registerPixelRatioListener()

        LogicEditor._globalListenersInstalled = true
    }

    trySetMode(mode: Mode) {
        this.wrapHandler(() => {
            const wantedModeStr = Mode[mode]
            if (mode <= this._maxInstanceMode) {
                this._mode = mode

                // console.log(`Display/interaction is ${wantedModeStr}`)

                this.redrawMgr.addReason("mode changed", null)

                // update mode active button
                this.root.querySelectorAll(".sim-mode-tool").forEach((elem) => {
                    if (elem.getAttribute("mode") === wantedModeStr) {
                        elem.classList.add("active")
                    } else {
                        elem.classList.remove("active")
                    }
                })

                if (mode < Mode.CONNECT) {
                    this.setCurrentMouseAction("edit")
                }

                type LeftMenuDisplay = "show" | "hide" | "inactive"

                const showLeftMenu: LeftMenuDisplay =
                    (this._maxInstanceMode !== Mode.FULL)
                        ? (mode >= Mode.DESIGN) ? "show" : "hide"
                        : (mode >= Mode.DESIGN) ? "show" : "inactive"

                const showReset = mode >= Mode.TRYOUT
                const showRightEditControls = mode >= Mode.CONNECT
                const showRightMenu = showReset || showRightEditControls
                const showOnlyReset = showReset && !showRightEditControls

                setVisible(this.elemWithId("resetToolButton"), showReset)
                setVisible(this.elemWithId("resetToolButtonCaption"), !showOnlyReset)
                setVisible(this.elemWithId("resetToolButtonDummyCaption"), showOnlyReset)

                const showOnly = this._options.showOnly
                if (isDefined(showOnly)) {
                    const leftToolbar = this.elemWithId("leftToolbar")
                    const toolbarChildren = leftToolbar.children
                    let numVisibleInOut = 0
                    let numVisibleGates = 0
                    let numVisibleIC = 0
                    for (let i = 0; i < toolbarChildren.length; i++) {
                        const child = toolbarChildren[i] as HTMLElement
                        const compStr = child.getAttribute("data-component")?.toLowerCase()
                        const compType = child.getAttribute("data-type")?.toLowerCase()
                        const buttonID = (compType ?? compStr)
                        const visible = isUndefined(buttonID) || showOnly.includes(buttonID)
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
                    setVisible(this.elemWithId("inOutHeader"), showInOutHeader)
                    setVisible(this.elemWithId("gatesHeader"), showGatesHeader)
                    setVisible(this.elemWithId("icHeader"), showICHeader)
                    setVisible(this.elemWithId("inOut-gates-sep"), showInOutHeader && showGatesHeader)
                    setVisible(this.elemWithId("gates-ic-sep"), (showInOutHeader || showGatesHeader) && showICHeader)
                }

                const modifButtons = this.root.querySelectorAll("button.sim-modification-tool")
                for (let i = 0; i < modifButtons.length; i++) {
                    const but = modifButtons[i] as HTMLElement
                    setVisible(but, showRightEditControls)
                }

                const leftToolbar = this.elemWithId("leftToolbar")
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

                const showTxGates = mode >= Mode.FULL && (isUndefined(showOnly) || showOnly.includes("TX") || showOnly.includes("TXA"))
                const txGateButton = this.root.querySelector("button[data-type=TXA]") as HTMLElement
                setVisible(txGateButton, showTxGates)

                const rightToolbarContainer = this.elemWithId("rightToolbarContainer")
                setVisible(rightToolbarContainer, showRightMenu)
            } else {
                console.log(`Cannot switch to mode ${wantedModeStr} because we are capped by ${Mode[this._maxInstanceMode]}`)
            }
        })()
    }

    private trySetModeFromString(modeStr: string | null) {
        let mode: Mode = DEFAULT_MODE
        if (modeStr !== null && (modeStr = modeStr.toUpperCase()) in Mode) {
            mode = (Mode as any)[modeStr]
        }
        this.trySetMode(mode)
    }

    tryLoadFromData() {
        if (isUndefined(this._initialData)) {
            return
        }
        try {
            const decodedData = atob(this._initialData.replace(/-/g, "+").replace(/_/g, "/").replace(/%3D/g, "="))
            PersistenceManager.doLoadFromJson(this, decodeURIComponent(decodedData))
        } catch (e) {
            console.log(e)
        }
    }

    tryDeleteComponentsWhere(cond: (e: Component) => boolean) {
        let compDeleted = false
        const comps = this.components
        for (let i = 0; i < comps.length; i++) {
            const comp = comps[i]
            if (cond(comp)) {
                comp.destroy()
                comps.splice(i, 1)
                compDeleted = true
            }
        }
        if (compDeleted) {
            this.redrawMgr.addReason("component(s) deleted", null)
        }
    }

    private setCurrentMouseAction(action: MouseAction) {
        this._currentMouseAction = action
        this.setToolCursor(MouseActions.propsOf(action).cursor)

        const toolButtons = this.root.querySelectorAll(".sim-modification-tool")
        for (let i = 0; i < toolButtons.length; i++) {
            const toolButton = toolButtons[i] as HTMLElement
            const setActive = toolButton.getAttribute("tool") === action
            if (setActive) {
                toolButton.classList.add("active")
            } else {
                toolButton.classList.remove("active")
            }
        }

        this.cursorMovementManager.setHandlersFor(action)
        this.redrawMgr.addReason("mouse action changed", null)
    }

    updateCursor() {
        this.html.canvasContainer.style.cursor =
            this.moveMgr.areDrawablesMoving()
                ? "grabbing"
                : this._toolCursor
                ?? this.cursorMovementManager.currentMouseOverComp?.cursorWhenMouseover
                ?? "default"
    }


    offsetXYForContextMenu(e: MouseEvent | TouchEvent): [number, number] {
        const mainCanvas = this.html.mainCanvas
        if ("offsetX" in e && e.offsetX === 0 && e.offsetY === 0 && e.target === mainCanvas) {
            const canvasRect = mainCanvas.getBoundingClientRect()
            return [e.clientX - canvasRect.x, e.clientY - canvasRect.y]
        } else {
            return this.offsetXY(e)
        }
    }

    offsetXY(e: MouseEvent | TouchEvent): [number, number] {
        const [unscaledX, unscaledY] = (() => {
            const mainCanvas = this.html.mainCanvas
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
        const currentScale = this._currentScale
        return [unscaledX / currentScale, unscaledY / currentScale]
    }

    private guessCanvasHeight(): number {
        let lowestY = Number.NEGATIVE_INFINITY, highestY = Number.POSITIVE_INFINITY
        for (const comp of this.components) {
            const y = comp.posY
            if (y > lowestY) {
                lowestY = y
            }
            if (y < highestY) {
                highestY = y
            }
        }
        return highestY + lowestY // add lower margin equal to top margin
    }

    copyLinkForMode(mode: Mode) {
        if (this._mode > MAX_MODE_WHEN_EMBEDDED) {
            this._mode = MAX_MODE_WHEN_EMBEDDED
        }
        const modeStr = Mode[mode].toLowerCase()
        const json = PersistenceManager.buildWorkspaceJSON(this)
        console.log("JSON:\n" + json)
        const encodedJson = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "%3D")

        function linkForMode(mode: Mode): string {
            const loc = window.location
            return loc.protocol + "//" + loc.host + loc.pathname + "?mode=" + Mode[mode].toLowerCase() + "&data=" + encodedJson
        }
        const fullUrl = linkForMode(mode)
        console.log("Link: " + fullUrl)

        const modeParam = mode === MAX_MODE_WHEN_EMBEDDED ? "" : `:mode: ${modeStr}\n`

        const embedHeight = this.guessCanvasHeight()

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

        if (this._isStandalone) {
            history.replaceState(null, "", linkForMode(MAX_MODE_WHEN_STANDALONE))
        }
    }

    recalcAndDrawIfNeeded() {
        const __recalculated = this.recalcMgr.recalculateIfNeeded()

        if (this.wireMgr.isAddingWire) {
            this.redrawMgr.addReason("adding a wire", null)
        }

        const redrawReasons = this.redrawMgr.getReasonsAndClear()
        if (isUndefined(redrawReasons)) {
            return
        }

        // console.log("Drawing " + (__recalculated ? "with" : "without") + " recalc, reasons:\n    " + redrawReasons)

        const mainCanvas = this.html.mainCanvas
        const g = mainCanvas.getContext("2d")!
        const width = mainCanvas.width
        const height = mainCanvas.height
        g.setTransform(this._baseTransform)
        g.lineCap = "square"
        g.textBaseline = "middle"

        g.fillStyle = COLOR_BACKGROUND
        g.fillRect(0, 0, width, height)

        g.strokeStyle = COLOR_BORDER
        g.lineWidth = 2

        if (this._mode >= Mode.CONNECT || this._maxInstanceMode === MAX_MODE_WHEN_STANDALONE) {
            g.strokeRect(0, 0, width, height)
            if (this._maxInstanceMode === MAX_MODE_WHEN_STANDALONE && this._mode < this._maxInstanceMode) {
                const h = this.guessCanvasHeight()
                strokeSingleLine(g, 0, h, width, h)

                g.fillStyle = COLOR_BACKGROUND_UNUSED_REGION
                g.fillRect(0, h, width, height - h)
            }
        }

        const isMovingComponent = this.moveMgr.areDrawablesMoving()
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

        const currentScale = this._currentScale
        g.scale(currentScale, currentScale)

        g.strokeStyle = COLOR_COMPONENT_BORDER
        const currentMouseOverComp = this.cursorMovementManager.currentMouseOverComp
        this.wireMgr.draw(g, currentMouseOverComp)

        for (const comp of this.components) {
            comp.draw(g, currentMouseOverComp)
            comp.forEachNode((node) => {
                node.draw(g, currentMouseOverComp)
                return true
            })
        }

        const newRedrawReasons = this.redrawMgr.getReasonsAndClear()
        if (isDefined(newRedrawReasons)) {
            console.log("ERROR: unexpectedly found new reasons to redraw right after a redraw:\n    " + newRedrawReasons)
        }
    }

    wrapHandler<T extends unknown[], R>(f: (...params: T) => R): (...params: T) => R {
        return (...params: T) => {
            const result = f(...params)
            this.recalcAndDrawIfNeeded()
            return result
        }
    }
}


const template = document.createElement('template')
// template.innerHTML = "<style>\n" + LogicEditorCSS + "\n\n"+BootstrapCSS+"\n</style>\n\n" + LogicEditorTemplate
template.innerHTML = LogicEditorTemplate

window.customElements.define('logic-editor', LogicEditor)

// window.setModeClicked = function setModeClicked(e: HTMLElement) {
//     const buttonModeStr = e.getAttribute("mode") ?? "_unknown_"
//     if (buttonModeStr in Mode) {
//         const wantedMode = (Mode as any)[buttonModeStr]
//         trySetMode(wantedMode)
//     }
// }
