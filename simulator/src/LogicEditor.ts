import { Component, ComponentBase, ComponentState } from "./components/Component"
import { Waypoint, Wire, WireManager } from "./components/Wire"
import { CursorMovementManager, EditorSelection } from "./CursorMovementManager"
import { COLOR_BACKGROUND, COLOR_BACKGROUND_UNUSED_REGION, COLOR_BORDER, COLOR_COMPONENT_BORDER, COLOR_GRID_LINES, GRID_STEP, strokeSingleLine } from "./drawutils"
import { gallery } from "./gallery"
import { div, cls, style, title, attrBuilder, applyModifierTo, button, emptyMod, mods, raw, input, type, label, span, attr, a, href, target } from "./htmlgen"
import { MoveManager } from "./MoveManager"
import { NodeManager } from "./NodeManager"
import { PersistenceManager } from "./PersistenceManager"
import { RecalcManager, RedrawManager } from "./RedrawRecalcManager"
import { Timeline, TimelineState } from "./Timeline"
import { copyToClipboard, downloadBlob as downloadDataUrl, formatString, getURLParameter, isDefined, isEmbeddedInIframe, isFalsyString, isNotNull, isNull, isNullOrUndefined, isString, isTruthyString, isUndefined, KeysOfByType, RichStringEnum, setVisible, showModal, targetIsField } from "./utils"
import { Drawable, DrawableWithPosition, Orientation } from "./components/Drawable"
import { makeComponentMenuInto } from "./menuutils"
import dialogPolyfill from 'dialog-polyfill'

import * as pngMeta from 'png-metadata-writer'
import * as LZString from "lz-string"
import * as QRCode from "qrcode"
// import * as C2S from "canvas2svg"

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import LogicEditorTemplate from "../html/LogicEditorTemplate.html"

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import LogicEditorCSS from "../css/LogicEditor.css"

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import DialogPolyfillCSS from "../../node_modules/dialog-polyfill/dist/dialog-polyfill.css"
import { IconName, inlineSvgFor, isIconName, makeIcon } from "./images"


enum Mode {
    STATIC,  // cannot interact in any way
    TRYOUT,  // can change inputs on predefined circuit
    CONNECT, // can additionnally move preexisting components around and connect them
    DESIGN,  // can additionally add components from left menu
    FULL,    // can additionally force output nodes to 'unset' state and draw undetermined dates
}

const MAX_MODE_WHEN_SINGLETON = Mode.FULL
const MAX_MODE_WHEN_EMBEDDED = Mode.DESIGN
const DEFAULT_MODE = Mode.DESIGN

const ATTRIBUTE_NAMES = {
    singleton: "singleton", // whether this is the only editor in the page
    mode: "mode",

    // these are mirrored in the display options
    name: "name",
    showonly: "showonly",
    showgatetypes: "showgatetypes",
    showdisconnectedpins: "showdisconnectedpins",
    showtooltips: "tooltips",

    src: "src",
    data: "data",
} as const

const DEFAULT_EDITOR_OPTIONS = {
    name: undefined as string | undefined,
    showOnly: undefined as undefined | Array<string>,
    showGateTypes: false,
    showDisconnectedPins: false,
    hideWireColors: false,
    hideOutputColors: false,
    hideTooltips: false,
    propagationDelay: 100,
}

export type EditorOptions = typeof DEFAULT_EDITOR_OPTIONS


export const MouseActions = RichStringEnum.withProps<{
    cursor: string | null
}>()({
    edit: { cursor: null },
    move: { cursor: "move" },
    delete: { cursor: "not-allowed" },
})
export type MouseAction = typeof MouseActions.type

type InitialData = { _type: "url", url: string } | { _type: "json", json: string } | { _type: "compressed", str: string }

type HighlightedItems = { comps: Component[], wires: Wire[], start: number }

export type DrawParams = {
    drawTime: number,
    currentMouseOverComp: Drawable | null,
    currentSelection: EditorSelection | undefined,
    highlightedItems: HighlightedItems | undefined,
    highlightColor: string | undefined,
}
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
    readonly cursorMovementMgr = new CursorMovementManager(this)

    readonly components: Component[] = []

    private _isEmbedded = false
    private _isSingleton = false
    private _maxInstanceMode: Mode = MAX_MODE_WHEN_EMBEDDED // can be set later
    private _isDirty = false
    private _mode: Mode = DEFAULT_MODE
    private _initialData: InitialData | undefined = undefined
    private _options: EditorOptions = { ...DEFAULT_EDITOR_OPTIONS }

    private _currentMouseAction: MouseAction = "edit"
    private _toolCursor: string | null = null
    private _highlightedItems: HighlightedItems | undefined = undefined
    private _nextAnimationFrameHandle: number | null = null

    public root: ShadowRoot
    public readonly html: {
        rootDiv: HTMLDivElement,
        canvasContainer: HTMLElement,
        mainCanvas: HTMLCanvasElement,
        leftToolbar: HTMLElement,
        tooltipElem: HTMLElement,
        tooltipContents: HTMLElement,
        mainContextMenu: HTMLElement,
        hiddenPath: SVGPathElement,
        fileChooser: HTMLInputElement,
        optionsZone: HTMLElement,
        embedDialog: HTMLDialogElement,
        embedUrl: HTMLTextAreaElement,
        embedUrlQRCode: HTMLImageElement,
        embedIframe: HTMLTextAreaElement,
        embedWebcomp: HTMLTextAreaElement,
        embedMarkdown: HTMLTextAreaElement,
    }
    public optionsHtml: {
        nameField: HTMLInputElement,
        showGateTypesCheckbox: HTMLInputElement,
        showDisconnectedPinsCheckbox: HTMLInputElement,
        hideWireColorsCheckbox: HTMLInputElement,
        hideOutputColorsCheckbox: HTMLInputElement,
        hideTooltipsCheckbox: HTMLInputElement,
        propagationDelayField: HTMLInputElement,
        showUserDataLinkContainer: HTMLDivElement,
    } | undefined = undefined
    public userdata: any = undefined

    private _baseTransform: DOMMatrix
    private _baseDrawingScale = 1
    public mouseX = -1000 // offscreen at start
    public mouseY = -1000

    constructor() {
        super()

        this.root = this.attachShadow({ mode: 'open' })
        this.root.appendChild(template.content.cloneNode(true) as HTMLElement)

        const html: typeof this.html = {
            rootDiv: this.elemWithId("logicEditorRoot"),
            canvasContainer: this.elemWithId("canvas-sim"),
            mainCanvas: this.elemWithId("mainCanvas"),
            leftToolbar: this.elemWithId("leftToolbar"),
            tooltipElem: this.elemWithId("tooltip"),
            tooltipContents: this.elemWithId("tooltipContents"),
            mainContextMenu: this.elemWithId("mainContextMenu"),
            optionsZone: this.elemWithId("optionsZone"),
            hiddenPath: this.elemWithId("hiddenPath"),
            fileChooser: this.elemWithId("fileChooser"),
            embedDialog: this.elemWithId("embedDialog"),
            embedUrl: this.elemWithId("embedUrl"),
            embedUrlQRCode: this.elemWithId("embedUrlQRCode"),
            embedIframe: this.elemWithId("embedIframe"),
            embedWebcomp: this.elemWithId("embedWebcomp"),
            embedMarkdown: this.elemWithId("embedMarkdown"),
        }
        this.html = html
        dialogPolyfill.registerDialog(html.embedDialog)

        this._baseTransform = new DOMMatrix()
    }

    private elemWithId<E extends Element>(id: string) {
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

    get options(): Readonly<EditorOptions> {
        return this._options
    }

    setPartialOptions(opts: Partial<EditorOptions>) {
        const newOptions = { ...this._options, ...opts }
        this._options = newOptions
        let optionsHtml

        if (isDefined(optionsHtml = this.optionsHtml)) {
            this.setDocumentName(newOptions.name)
            optionsHtml.nameField.value = newOptions.name ?? ""
            optionsHtml.hideWireColorsCheckbox.checked = newOptions.hideWireColors
            optionsHtml.hideOutputColorsCheckbox.checked = newOptions.hideOutputColors
            optionsHtml.showGateTypesCheckbox.checked = newOptions.showGateTypes
            optionsHtml.showDisconnectedPinsCheckbox.checked = newOptions.showDisconnectedPins
            optionsHtml.hideTooltipsCheckbox.checked = newOptions.hideTooltips
            optionsHtml.propagationDelayField.valueAsNumber = newOptions.propagationDelay

            optionsHtml.showUserDataLinkContainer.style.display = isDefined(this.userdata) ? "initial" : "none"
        }

        this.redrawMgr.addReason("options changed", null)
    }

    private setDocumentName(name: string | undefined) {
        if (!this._isSingleton) {
            return
        }
        const defaultTitle = "Simulateur de systèmes logiques"
        if (isUndefined(name)) {
            document.title = defaultTitle
        } else {
            document.title = `${name} – ${defaultTitle}`
        }
    }

    nonDefaultOptions(): undefined | Partial<EditorOptions> {
        const nonDefaultOpts: Partial<EditorOptions> = {}
        let set = false
        for (const [_k, v] of Object.entries(this._options)) {
            const k = _k as keyof EditorOptions
            if (v !== DEFAULT_EDITOR_OPTIONS[k]) {
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

        if (tool === "save") {
            PersistenceManager.saveToFile(this)
            return
        }

        if (tool === "screenshot") {
            this.downloadSnapshotImage()
            return
        }

        if (tool === "open") {
            this.html.fileChooser.click()
            return
        }

        this.setCurrentMouseAction("edit")
        if (tool === "reset") {
            this.wrapHandler(() => {
                this.tryLoadFromData()
            })()
            return
        }
    }

    setToolCursor(cursor: string | null) {
        this._toolCursor = cursor
    }

    private setCanvasSize() {
        const { canvasContainer } = this.html
        const w = canvasContainer.clientWidth
        const h = canvasContainer.clientHeight
        const f = window.devicePixelRatio ?? 1
        const mainCanvas = this.html.mainCanvas
        mainCanvas.setAttribute("width", String(w * f))
        mainCanvas.setAttribute("height", String(h * f))
        mainCanvas.style.setProperty("width", w + "px")
        mainCanvas.style.setProperty("height", h + "px")
        this._baseDrawingScale = f
        this._baseTransform = new DOMMatrix(`scale(${f})`)
    }

    connectedCallback() {
        const { rootDiv, mainCanvas } = this.html

        const parentStyles = this.getAttribute("style")
        if (isNotNull(parentStyles)) {
            rootDiv.setAttribute("style", rootDiv.getAttribute("style") + parentStyles)
        }

        // TODO move this in SelectionMgr?
        mainCanvas.ondragenter = () => {
            return false
        }
        mainCanvas.ondragover = () => {
            return false
        }
        mainCanvas.ondragend = () => {
            return false
        }
        mainCanvas.ondrop = e => {
            if (isNull(e.dataTransfer)) {
                return false
            }

            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (isDefined(file)) {
                this.tryLoadFromFile(file)
            } else {
                const dataItems = e.dataTransfer.items
                if (isDefined(dataItems)) {
                    for (let i = 0; i < dataItems.length; i++) {
                        const dataItem = dataItems[i]
                        if (dataItem.kind === "string" && (dataItem.type === "application/json" || dataItem.type !== "text/plain")) {
                            dataItem.getAsString(content => {
                                e.dataTransfer!.dropEffect = "copy"
                                this.load(content)
                            })
                            break
                        }
                    }
                }
            }
            return false
        }

        // TODO clear all redrawmanager
        // TODO add initial reason to redraw
        // draw

        this.cursorMovementMgr.registerCanvasListenersOn(this.html.canvasContainer)
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
        this._isEmbedded = isEmbeddedInIframe()
        const singletonAttr = this.getAttribute(ATTRIBUTE_NAMES.singleton)
        this._isSingleton = !this._isEmbedded && singletonAttr !== null && !isFalsyString(singletonAttr)
        this._maxInstanceMode = this._isSingleton && !this._isEmbedded ? MAX_MODE_WHEN_SINGLETON : MAX_MODE_WHEN_EMBEDDED

        // Transfer from URL param to attributes if we are in singleton mode
        if (this._isSingleton || this._isEmbedded) {
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
                ATTRIBUTE_NAMES.showdisconnectedpins,
                ATTRIBUTE_NAMES.showtooltips,
                ATTRIBUTE_NAMES.data,
                ATTRIBUTE_NAMES.src,
            ]) {
                transferUrlParamToAttribute(attr)
            }

            const userParamPrefix = "user"
            const url = new URL(window.location.href)
            url.searchParams.forEach((value: string, key: string) => {
                if (key.startsWith(userParamPrefix)) {
                    key = key.substring(userParamPrefix.length)
                    if (key.startsWith(".")) {
                        key = key.substring(1)
                    }
                    if (key.length === 0) {
                        this.userdata = value
                    } else {
                        key = key[0].toLowerCase() + key.substring(1)
                        if (typeof this.userdata !== "object") {
                            this.userdata = {}
                        }
                        if (key in this.userdata) {
                            const oldValue = this.userdata[key]
                            if (Array.isArray(oldValue)) {
                                oldValue.push(value)
                            } else {
                                this.userdata[key] = [oldValue, value]
                            }
                        } else {
                            this.userdata[key] = value
                        }
                    }
                }
            })
            if (isDefined(this.userdata)) {
                console.log("Custom user data: ", this.userdata)
            }
        }

        if (this._isSingleton) {
            console.log("LogicEditor is in singleton mode")
            window.addEventListener("keyup", this.wrapHandler(e => {
                if (targetIsField(e)) {
                    return
                }
                switch (e.key) {
                    case "Escape":
                        this.tryDeleteComponentsWhere(comp => comp.state === ComponentState.SPAWNING)
                        this.wireMgr.tryCancelWire()
                        return

                    case "Backspace":
                    case "Delete": {
                        let selComp
                        if (isDefined(selComp = this.cursorMovementMgr.currentSelection?.previouslySelectedElements)) {
                            for (const comp of selComp) {
                                this.tryDeleteDrawable(comp)
                            }
                        } else if ((selComp = this.cursorMovementMgr.currentMouseOverComp) !== null) {
                            this.tryDeleteDrawable(selComp)
                        }
                        return
                    }

                    case "e":
                        this.setCurrentMouseAction("edit")
                        return

                    case "d":
                        this.setCurrentMouseAction("delete")
                        return

                    case "m":
                        this.setCurrentMouseAction("move")
                        return

                    case "ArrowRight":
                        this.trySetCurrentComponentOrientation("e", e)
                        return
                    case "ArrowLeft":
                        this.trySetCurrentComponentOrientation("w", e)
                        return
                    case "ArrowUp":
                        this.trySetCurrentComponentOrientation("n", e)
                        return
                    case "ArrowDown":
                        this.trySetCurrentComponentOrientation("s", e)
                        return
                }
            }))

            // TODO this should also work then not in singleton mode,
            // but it still requires listening for keydown on the window,
            // so we must know which was the lastest editor on screen to target
            // this to
            window.addEventListener("keydown", this.wrapHandler(e => {
                const ctrlOrCommand = e.ctrlKey || e.metaKey
                const keyLower = e.key.toLowerCase()
                const shift = e.shiftKey || (keyLower !== e.key)
                switch (keyLower) {
                    case "a":
                        if (ctrlOrCommand && this.mode >= Mode.CONNECT && !targetIsField(e)) {
                            this.cursorMovementMgr.selectAll()
                            e.preventDefault()
                        }
                        return

                    case "s":
                        if (ctrlOrCommand && this._isSingleton) {
                            this.saveCurrentStateToUrl()
                            e.preventDefault()
                        }
                        return

                    case "z":
                        if (ctrlOrCommand && !targetIsField(e)) {
                            if (shift) {
                                this.redo()
                            } else {
                                this.undo()
                            }
                            e.preventDefault()
                        }
                        return
                    case "y":
                        if (ctrlOrCommand && !targetIsField(e)) {
                            this.redo()
                            e.preventDefault()
                        }
                        return
                    case "x":
                        if (ctrlOrCommand && !targetIsField(e)) {
                            this.cut()
                            e.preventDefault()
                        }
                        return
                    // case "c":
                    // NO: this prevents the sharing code from being copied
                    // if (ctrlOrCommand && !targetIsField()) {
                    //     this.copy()
                    //     e.preventDefault()
                    // }
                    // return
                    case "v":
                        if (ctrlOrCommand && !targetIsField(e)) {
                            this.paste()
                            e.preventDefault()
                        }
                        return
                }

                const mouseOverComp = this.cursorMovementMgr.currentMouseOverComp
                if (mouseOverComp !== null) {
                    mouseOverComp.keyDown(e)
                }
            }))

            // make load function available globally
            window.load = this.load.bind(this)
            window.save = this.save.bind(this)
            window.highlight = this.highlight.bind(this)

            window.adjustedTime = () => {
                const nowAdjusted = this.timeline.adjustedTime()
                // console.log(nowAdjusted)
                return nowAdjusted
            }

            this.html.canvasContainer.appendChild(
                div(style("position: absolute; bottom: 0; right: 0; padding: 5px 3px 2px 5px; background-color: rgba(255,255,255,0.3); color: rgba(0,0,0,0.2); border-radius: 10px 0 0 0; font-size: 69%; font-style: italic;"),
                    "Développé par ",
                    a(style("color: inherit"),
                        href("https://github.com/jppellet/Logic-Circuit-Simulator"), target("_blank"),
                        "Jean-Philippe Pellet"
                    ),
                    ", ",
                    a(style("color: inherit"),
                        href("https://www.hepl.ch"), target("_blank"),
                        "HEP Vaud"
                    ),
                ).render()
            )

            window.onbeforeunload = e => {
                if (this._isSingleton && this._isDirty && this.mode >= Mode.CONNECT) {
                    e.preventDefault() // ask to save changes
                    e.returnValue = "Voulez-vous vraiment fermer la fenêtre sans prendre en compte les derniers changements?"
                }
            }
        }

        // Load parameters from attributes
        let modeAttr = this.getAttribute(ATTRIBUTE_NAMES.mode)
        if (modeAttr !== null && (modeAttr = modeAttr.toUpperCase()) in Mode) {
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

        const showdisconnectedpinsAttr = this.getAttribute(ATTRIBUTE_NAMES.showdisconnectedpins)
        if (showdisconnectedpinsAttr !== null) {
            this._options.showDisconnectedPins = isTruthyString(showdisconnectedpinsAttr)
        }

        const showtooltipsAttr = this.getAttribute(ATTRIBUTE_NAMES.showtooltips)
        if (showtooltipsAttr !== null) {
            this._options.hideTooltips = !isFalsyString(showtooltipsAttr)
        }

        let dataOrSrcRef
        if ((dataOrSrcRef = this.getAttribute(ATTRIBUTE_NAMES.data)) !== null) {
            this._initialData = { _type: "compressed", str: dataOrSrcRef }
        } else if ((dataOrSrcRef = this.getAttribute(ATTRIBUTE_NAMES.src)) !== null) {
            this._initialData = { _type: "url", url: dataOrSrcRef }
        } else {
            // try to load from the children of the light DOM,
            // but this has to be done later as it hasn't been parsed yet
            setTimeout(() => {
                const innerScriptElem = this.findLightDOMChild("script")
                if (innerScriptElem !== null) {
                    this._initialData = { _type: "json", json: innerScriptElem.innerHTML }
                    innerScriptElem.remove() // remove the data element to hide the raw data
                    // do this manually
                    this.tryLoadFromData()
                    this.doRedraw()
                }
            })
        }

        makeComponentMenuInto(this.html.leftToolbar, this._options.showOnly)

        this.cursorMovementMgr.registerButtonListenersOn(this.root.querySelectorAll(".sim-component-button"))

        const modifButtons = this.root.querySelectorAll("button.sim-modification-tool")
        for (let i = 0; i < modifButtons.length; i++) {
            const but = modifButtons[i] as HTMLElement
            but.addEventListener("click", () => {
                this.setActiveTool(but)
            })
        }

        const showModeChange = this._maxInstanceMode >= Mode.FULL
        if (showModeChange) {
            const modeChangeMenu: HTMLElement = this.elemWithId("modeChangeMenu")!
            div(cls("btn-group-vertical"),
                div(style("text-align: center; width: 100%; font-weight: bold; font-size: 80%; color: #666; padding: 2px;"),
                    "Mode",
                ),
                ...[Mode.FULL, Mode.DESIGN, Mode.CONNECT, Mode.TRYOUT, Mode.STATIC].map((buttonMode) => {
                    const [modeTitle, expl, addElem] = (() => {
                        switch (buttonMode) {
                            case Mode.FULL: {
                                const optionsDiv =
                                    div(cls("sim-mode-link"),
                                        title("Réglages"),
                                        makeIcon("settings")
                                    ).render()

                                optionsDiv.addEventListener("click", () => {
                                    setVisible(this.html.optionsZone, true)
                                })

                                return ["Admin", "En plus du mode complet, ce mode permet de rendre les entrées, les sorties des portes, voire les portes elles-mêmes indéterminées", optionsDiv]
                            }
                            case Mode.DESIGN: return ["Complet", "La totalité des actions de conception d’un circuit sont possible", emptyMod]
                            case Mode.CONNECT: return ["Connexion", "Il est possible de déplacer et de connecter des éléments déjà sur le canevas, mais pas d’en rajouter (le menu de gauche ne serait pas actif)", emptyMod]
                            case Mode.TRYOUT: return ["Test", "Il est seulement possible de changer les entrées pour tester un circuit préétabli", emptyMod]
                            case Mode.STATIC: return ["Statique", "Les éléments sont juste affichés; aucune interaction n’est possible", emptyMod]
                        }
                    })()

                    const copyLinkDiv =
                        div(cls("sim-mode-link"),
                            title("Copie un lien vers ce contenu dans ce mode"),
                            makeIcon("link"),
                        ).render()

                    copyLinkDiv.addEventListener("click", __ => {
                        this.shareSheetForMode(buttonMode)
                    })

                    const switchToModeDiv =
                        div(cls("btn btn-sm btn-outline-light sim-toolbar-button-right sim-mode-tool"),
                            style("display: flex; justify-content: space-between; align-items: center"),
                            attrBuilder("mode")(Mode[buttonMode]),
                            title(expl),
                            modeTitle,
                            addElem,
                            copyLinkDiv
                        ).render()

                    switchToModeDiv.addEventListener("click", this.wrapHandler(() => this.setMode(buttonMode)))

                    return switchToModeDiv
                })
            ).applyTo(modeChangeMenu)
            setVisible(modeChangeMenu, true)
        }

        this.html.embedUrlQRCode.addEventListener("click", __ => {
            // download
            const dataUrl = this.html.embedUrlQRCode.src
            const filename = (this.options.name ?? "circuit") + "_qrcode.png"
            downloadDataUrl(dataUrl, filename)
        })

        this.html.fileChooser.addEventListener("change", __ => {
            let files
            if ((files = this.html.fileChooser.files) !== null && files.length > 0) {
                this.tryLoadFromFile(files[0])
            }
        })

        const selectAllListener = (e: Event) => {
            const textArea = e.target as HTMLTextAreaElement
            textArea.focus()
            textArea.select()
            e.preventDefault()
        }
        for (const textArea of [this.html.embedUrl, this.html.embedIframe, this.html.embedWebcomp, this.html.embedMarkdown]) {
            textArea.addEventListener("pointerdown", selectAllListener)
            textArea.addEventListener("focus", selectAllListener)
        }


        const timelineControls: HTMLElement = this.elemWithId("timelineControls")!
        const makeTimelineButton = (icon: IconName, text: string | undefined, expl: string, action: () => unknown) => {
            const but =
                button(cls("btn btn-sm btn-outline-light sim-toolbar-button-right"),
                    isUndefined(text) ? style("text-align: center") : emptyMod,
                    title(expl),
                    makeIcon(icon, 20, 20),
                    isUndefined(text) ? raw("&nbsp;") : text,
                ).render()
            but.addEventListener("click", action)
            return but
        }
        const playButton = makeTimelineButton("play", "Play", "Démarre l’écoulement du temps", () => this.timeline.play())
        const pauseButton = makeTimelineButton("pause", "Pause", "Arrête l’écoulement du temps", () => this.timeline.pause())
        const stepButton = makeTimelineButton("step", undefined, "Avance au prochain événement", () => this.timeline.step())
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

        // Options
        const optionsZone = this.html.optionsZone
        optionsZone.querySelector("#closeOptions")?.addEventListener("click", () => {
            setVisible(optionsZone, false)
        })

        const makeCheckbox = <K extends KeysOfByType<EditorOptions, boolean>>(optionName: K, title: string, mouseover: string) => {
            const checkbox = input(type("checkbox")).render()
            if (this.options[optionName] === true) {
                checkbox.checked = true
            }
            checkbox.addEventListener("change", this.wrapHandler(() => {
                this._options[optionName] = checkbox.checked
                this.redrawMgr.addReason("option changed: " + optionName, null)
            }))
            optionsZone.appendChild(
                div(
                    style("height: 20px"),
                    label(checkbox, span(style("margin-left: 4px"), attr("title", mouseover), title))
                ).render()
            )
            return checkbox
        }

        const nameField = input(type("text"),
            style("margin-left: 4px"),
            attr("value", this.options.name ?? ""),
            attr("placeholder", "circuit"),
            attr("title", "Ceci sera le nom du fichier téléchargé."),
        ).render()
        nameField.addEventListener("change", () => {
            const newName = nameField.value
            this._options.name = newName.length === 0 ? undefined : newName
            this.setDocumentName(this._options.name)
        })
        optionsZone.appendChild(
            div(
                style("height: 20px; margin-bottom: 4px"),
                "Nom:", nameField
            ).render()
        )

        const hideWireColorsCheckbox = makeCheckbox("hideWireColors",
            "Cacher l’état des fils",
            "Si coché, les fils sont affichés avec une couleur neutre plutôt que de montrer s’ils véhiculent un 1 ou un 0."
        )
        const hideOutputColorsCheckbox = makeCheckbox("hideOutputColors",
            "Cacher l’état des sorties",
            "Si coché, les sorties sont affichées avec une couleur neutre. S’utilise volontiers avec l’option ci-dessus."
        )
        const showGateTypesCheckbox = makeCheckbox("showGateTypes",
            "Montrer type des portes",
            "Si coché, affiche sur les portes logique le nom de la fonction réalisée."
        )
        const showDisconnectedPinsCheckbox = makeCheckbox("showDisconnectedPins",
            "Toujours montrer les pattes",
            "Si non coché, les pattes non connectées des composants sont masquées dans les modes où les connexions du circuit ne peuvent pas être modifiées (et restent visibles sinon)."
        )
        const hideTooltipsCheckbox = makeCheckbox("hideTooltips",
            "Désactiver tooltips",
            "Si coché, les informations supplémentaires des tooltips (comme les tables de vérité) ne seront pas affichées."
        )

        const propagationDelayField = input(type("number"),
            style("margin: 0 4px; width: 4em"),
            attr("min", "0"), attr("step", "50"),
            attr("value", String(this.options.propagationDelay)),
            attr("title", "Un 1 ou un 0 imposé sur une connexion sera répercuté à l’autre bout de la connexion après ce délai de propagation."),
        ).render()
        propagationDelayField.addEventListener("change", () => {
            this._options.propagationDelay = propagationDelayField.valueAsNumber
        })
        optionsZone.appendChild(
            div(
                style("height: 20px"),
                "Propagation en", propagationDelayField, "ms"
            ).render()
        )

        const showUserdataLink = a("données liées", style("text-decoration: underline; cursor: pointer")).render()
        showUserdataLink.addEventListener("click", () => {
            alert("Les données suivantes sont exportées avec le circuit:\n\n" + JSON.stringify(this.userdata, undefined, 4))
        })
        const showUserDataLinkContainer = div(
            style("margin-top: 5px; display: none"),
            "Voir les ", showUserdataLink,
        ).render()
        optionsZone.appendChild(showUserDataLinkContainer)

        this.optionsHtml = {
            nameField,
            hideWireColorsCheckbox,
            hideOutputColorsCheckbox,
            showGateTypesCheckbox,
            showDisconnectedPinsCheckbox,
            hideTooltipsCheckbox,
            propagationDelayField,
            showUserDataLinkContainer,
        }

        // this is called once here to set the initial transform and size before the first draw, and again later
        this.setCanvasSize()

        this.tryLoadFromData()
        // also triggers redraw, should be last thing called here

        this.setModeFromString(this.getAttribute(ATTRIBUTE_NAMES.mode))

        // this is called a second time here because the canvas width may have changed following the mode change
        this.setCanvasSize()
        LogicEditor.installGlobalListeners()

        this.doRedraw()
    }

    private findLightDOMChild<K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] | null {
        tagName = tagName.toUpperCase() as any
        for (const child of Array.from(this.children)) {
            if (child.tagName === tagName) {
                return child as HTMLElementTagNameMap[K]
            }
        }
        return null
    }

    static installGlobalListeners() {
        if (LogicEditor._globalListenersInstalled) {
            return
        }

        window.formatString = formatString

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
                        editor.setCanvasSize()
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

    setMode(mode: Mode) {
        this.wrapHandler(() => {
            let wantedModeStr = Mode[mode]
            if (mode > this._maxInstanceMode) {
                mode = this._maxInstanceMode
                console.log(`Cannot switch to mode ${wantedModeStr} because we are capped by ${Mode[this._maxInstanceMode]}`)
                wantedModeStr = Mode[mode]
            }
            this._mode = mode

            // console.log(`Display/interaction is ${wantedModeStr} - ${mode}`)

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

            const showRightEditControls = mode >= Mode.CONNECT
            const modifButtons = this.root.querySelectorAll("button.sim-modification-tool")
            for (let i = 0; i < modifButtons.length; i++) {
                const but = modifButtons[i] as HTMLElement
                setVisible(but, showRightEditControls)
            }

            const showReset = mode >= Mode.TRYOUT
            const showRightMenu = showReset || showRightEditControls
            const showOnlyReset = showReset && !showRightEditControls
            const hideSettings = mode < Mode.FULL

            setVisible(this.elemWithId("resetToolButton"), showReset)
            setVisible(this.elemWithId("resetToolButtonCaption"), !showOnlyReset)
            setVisible(this.elemWithId("resetToolButtonDummyCaption"), showOnlyReset)

            if (hideSettings) {
                setVisible(this.html.optionsZone, false)
            }

            const leftToolbar = this.html.leftToolbar
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

            // const showTxGates = mode >= Mode.FULL && (isUndefined(showOnly) || showOnly.includes("TX") || showOnly.includes("TXA"))
            // const txGateButton = this.root.querySelector("button[data-type=TXA]") as HTMLElement
            // setVisible(txGateButton, showTxGates)

            const rightToolbarContainer: HTMLElement = this.elemWithId("rightToolbarContainer")
            setVisible(rightToolbarContainer, showRightMenu)
        })()
    }

    private setModeFromString(modeStr: string | null) {
        let mode: Mode = this._maxInstanceMode
        if (modeStr !== null && (modeStr = modeStr.toUpperCase()) in Mode) {
            mode = (Mode as any)[modeStr]
        }
        this.setMode(mode)
    }

    tryLoadFromFile(file: File) {
        if (file.type === "application/json" || file.type === "text/plain") {
            const reader = new FileReader()
            reader.onload = e => {
                const content = e.target?.result?.toString()
                if (isDefined(content)) {
                    this.load(content)
                }
            }
            reader.readAsText(file, "utf-8")
        } else if (file.type === "image/png") {
            const reader = new FileReader()
            reader.onload = e => {
                const content = e.target?.result
                if (content instanceof ArrayBuffer) {
                    const uintArray2 = new Uint8Array(content)
                    const pngMetadata = pngMeta.readMetadata(uintArray2)
                    const compressedJSON = pngMetadata.tEXt?.Description
                    if (isString(compressedJSON)) {
                        this._initialData = { _type: "compressed", str: compressedJSON }
                        this.tryLoadFromData()
                    }
                }
            }
            reader.readAsArrayBuffer(file)
        } else {
            console.log("Unsupported file type", file.type)
        }
    }

    tryLoadFromData() {
        if (isUndefined(this._initialData)) {
            return
        }

        if (this._initialData._type === "url") {
            // load from URL
            const url = this._initialData.url
            // will only work within the same domain for now
            fetch(url, { mode: "cors" }).then(response => response.text()).then(json => {
                console.log(`Loaded initial data from URL '${url}'`)
                this._initialData = { _type: "json", json }
                this.tryLoadFromData()
            })

            // TODO try fetchJSONP if this fails?

            return
        }

        let error: undefined | string = undefined

        if (this._initialData._type === "json") {
            // already decompressed
            try {
                error = PersistenceManager.doLoadFromJson(this, this._initialData.json)
            } catch (e) {
                error = String(e)
            }

        } else {
            let decodedData
            try {
                decodedData = LZString.decompressFromEncodedURIComponent(this._initialData.str)
                error = PersistenceManager.doLoadFromJson(this, decodedData!)
            } catch (e) {
                error = String(e)
            }

            if (isDefined(error)) {
                // try the old, uncompressed way of storing the data in the URL
                try {
                    decodedData = atob(this._initialData.str.replace(/-/g, "+").replace(/_/g, "/").replace(/%3D/g, "="))
                    error = PersistenceManager.doLoadFromJson(this, decodeURIComponent(decodedData))
                } catch (e) {
                    error = String(e)
                }
            }

            if (isUndefined(error) && isString(decodedData)) {
                // remember the decompressed/decoded value
                this._initialData = { _type: "json", json: decodedData }
            }
        }


        if (isDefined(error)) {
            console.log("ERROR could not not load initial data: " + error)
        }
    }

    load(jsonStringOrObject: string | Record<string, unknown>) {
        this.wrapHandler(
            (jsonStringOrObject: string | Record<string, unknown>) =>
                PersistenceManager.doLoadFromJson(this, jsonStringOrObject)
        )(jsonStringOrObject)
    }

    setDirty(__reason: string) {
        if (this.mode >= Mode.CONNECT) {
            // other modes can't be dirty
            this._isDirty = true
        }
    }

    tryDeleteDrawable(comp: Drawable) {
        if (comp instanceof ComponentBase) {
            this.tryDeleteComponentsWhere(c => c === comp)
        } else if (comp instanceof Wire) {
            this.wireMgr.deleteWire(comp)
        } else if (comp instanceof Waypoint) {
            comp.removeFromParent()
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
            return true
        }
        return false
    }

    trySetCurrentComponentOrientation(orient: Orientation, e: Event) {
        const currentMouseOverComp = this.cursorMovementMgr.currentMouseOverComp
        if (isDefined(currentMouseOverComp) && currentMouseOverComp instanceof DrawableWithPosition) {
            currentMouseOverComp.doSetOrient(orient)
            e.preventDefault()
        }
    }

    public setCurrentMouseAction(action: MouseAction) {
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

        this.cursorMovementMgr.setHandlersFor(action)
        this.redrawMgr.addReason("mouse action changed", null)
    }

    updateCursor() {
        this.html.canvasContainer.style.cursor =
            this.moveMgr.areDrawablesMoving()
                ? "grabbing"
                : this._toolCursor
                ?? this.cursorMovementMgr.currentMouseOverComp?.cursorWhenMouseover
                ?? "default"
    }

    lengthOfPath(svgPathDesc: string): number {
        const p = this.html.hiddenPath
        p.setAttribute("d", svgPathDesc)
        const length = p.getTotalLength()
        // console.log(`p=${svgPathDesc}, l=${length}`)
        return length
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
        const currentScale = 1 //this._currentScale
        return [unscaledX / currentScale, unscaledY / currentScale]
    }

    offsetXYForComponent(e: MouseEvent | TouchEvent, comp: Component): [number, number] {
        const offset = this.offsetXY(e)
        if (comp.orient === Orientation.default) {
            return offset
        }
        const [x, y] = offset
        const dx = x - comp.posX
        const dy = y - comp.posY
        switch (comp.orient) {
            case "e": return offset // done before anyway
            case "w": return [comp.posX - dx, comp.posY - dy]
            case "s": return [comp.posX - dy, comp.posY - dx]
            case "n": return [comp.posX + dy, comp.posY + dx]
        }
    }

    private guessAdequateCanvasSize(): [number, number] {
        let rightmostX = Number.NEGATIVE_INFINITY, leftmostX = Number.POSITIVE_INFINITY
        let lowestY = Number.NEGATIVE_INFINITY, highestY = Number.POSITIVE_INFINITY
        for (const comp of this.components) {
            const x = comp.posX
            if (x > rightmostX) {
                rightmostX = x
            }
            if (x < leftmostX) {
                leftmostX = x
            }
            const y = comp.posY
            if (y > lowestY) {
                lowestY = y
            }
            if (y < highestY) {
                highestY = y
            }
        }
        let w = rightmostX + leftmostX // add right margin equal to left margin
        if (isNaN(w)) {
            w = 300
        }
        let h = highestY + lowestY // add lower margin equal to top margin
        if (isNaN(h)) {
            h = 150
        }
        return [w, h]
    }

    async shareSheetForMode(mode: Mode) {
        if (this._mode > MAX_MODE_WHEN_EMBEDDED) {
            this._mode = MAX_MODE_WHEN_EMBEDDED
        }
        const modeStr = Mode[mode].toLowerCase()
        const [json, compressedUriSafeJson] = this.jsonStateAndCompressed()

        console.log("JSON:\n" + json)

        const fullUrl = this.fullUrlForMode(mode, compressedUriSafeJson)
        this.html.embedUrl.value = fullUrl

        const modeParam = mode === MAX_MODE_WHEN_EMBEDDED ? "" : `:mode: ${modeStr}\n`
        const embedHeight = this.guessAdequateCanvasSize()[1]

        const markdownBlock = `\`\`\`{logic}\n:height: ${embedHeight}\n${modeParam}\n${json}\n\`\`\``
        this.html.embedMarkdown.value = markdownBlock

        const iframeEmbed = `<iframe style="width: 100%; height: ${embedHeight}px; border: 0" src="${fullUrl}"></iframe>`
        this.html.embedIframe.value = iframeEmbed

        const webcompEmbed = `<div style="width: 100%; height: ${embedHeight}px">\n  <logic-editor mode="${Mode[mode].toLowerCase()}">\n    <script type="application/json">\n      ${json.replace(/\n/g, "\n      ")}\n    </script>\n  </logic-editor>\n</div>`
        this.html.embedWebcomp.value = webcompEmbed


        const dataUrl = await QRCode.toDataURL(fullUrl, { margin: 0, errorCorrectionLevel: 'L' })
        const qrcodeImg = this.html.embedUrlQRCode
        qrcodeImg.src = dataUrl

        this.saveToUrl(compressedUriSafeJson)

        if (!showModal(this.html.embedDialog)) {
            // alert("The <dialog> API is not supported by this browser")

            // TODO show the info some other way

            if (copyToClipboard(fullUrl)) {
                console.log("  -> Copied!")
            } else {
                console.log("  -> Could not copy!")
            }
        }
    }

    saveCurrentStateToUrl() {
        const [json, compressedUriSafeJson] = this.jsonStateAndCompressed()
        console.log(json)
        this.saveToUrl(compressedUriSafeJson)
    }

    save(): Record<string, unknown> {
        return PersistenceManager.buildWorkspaceAsObject(this)
    }

    saveToUrl(compressedUriSafeJson: string) {
        if (this._isSingleton) {
            history.pushState(null, "", this.fullUrlForMode(MAX_MODE_WHEN_SINGLETON, compressedUriSafeJson))
            this._isDirty = false
        }
    }

    private jsonStateAndCompressed(): [string, string] {
        const json = PersistenceManager.buildWorkspaceJSON(this)

        // We did this in the past, but now we're compressing things a bit
        // const encodedJson1 = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "%3D")

        // this can compress to like 40-50% of the original size
        const compressedUriSafeJson = LZString.compressToEncodedURIComponent(json)
        return [json, compressedUriSafeJson]
    }

    private fullUrlForMode(mode: Mode, compressedUriSafeJson: string): string {
        const loc = window.location
        return loc.protocol + "//" + loc.host + loc.pathname + "?mode=" + Mode[mode].toLowerCase() + "&data=" + compressedUriSafeJson
    }

    downloadSnapshotImage() {
        const f = window.devicePixelRatio ?? 1
        const borderWidth = 2
        let [width, height] = this.guessAdequateCanvasSize()
        width -= borderWidth
        height -= borderWidth
        width *= f
        height *= f

        const tmpCanvas = document.createElement('canvas')
        tmpCanvas.width = width
        tmpCanvas.height = height

        const g = tmpCanvas.getContext('2d')!
        g.drawImage(this.html.mainCanvas, borderWidth, borderWidth, width, height,
            0, 0, tmpCanvas.width, tmpCanvas.height)

        tmpCanvas.toBlob(async pngBareBlob => {
            if (pngBareBlob === null) {
                return
            }
            const [__, compressedUriSafeJson] = this.jsonStateAndCompressed()

            const pngBareData = new Uint8Array(await pngBareBlob.arrayBuffer())
            const pngChunks = pngMeta.extractChunks(pngBareData)
            pngMeta.insertMetadata(pngChunks, { "tEXt": { "Description": compressedUriSafeJson } })
            const pngCompletedBlob = new Blob([pngMeta.encodeChunks(pngChunks)], { type: "image/png" })

            const filename = (this.options.name ?? "circuit") + ".png"
            const url = URL.createObjectURL(pngCompletedBlob)
            downloadDataUrl(url, filename)

        }, "image/png")

        tmpCanvas.remove()


        // TODO this was an attempt at generating SVG rather than PNG
        // const svgCtx = new C2S(width, height)
        // this.doDrawWithContext(svgCtx)
        // const serializedSVG = svgCtx.getSerializedSvg()
        // console.log(serializedSVG)
    }

    recalcPropagateAndDrawIfNeeded() {
        if (this._nextAnimationFrameHandle !== null) {
            // an animation frame will be played soon anyway
            return
        }

        const __recalculated = this.recalcMgr.recalcAndPropagateIfNeeded()

        if (this.wireMgr.isAddingWire) {
            this.redrawMgr.addReason("adding a wire", null)
        }

        const redrawReasons = this.redrawMgr.getReasonsAndClear()
        if (isUndefined(redrawReasons)) {
            return
        }

        // console.log("Drawing " + (__recalculated ? "with" : "without") + " recalc, reasons:\n    " + redrawReasons)
        // console.log("Drawing")
        this.doRedraw()

        if (this.redrawMgr.hasReasons()) {
            // an animation is running
            this._nextAnimationFrameHandle = requestAnimationFrame(() => {
                this._nextAnimationFrameHandle = null
                this.recalcPropagateAndDrawIfNeeded()
            })
        }
    }

    highlight(refs: string | string[] | undefined) {
        if (isUndefined(refs)) {
            this._highlightedItems = undefined
            return
        }

        if (isString(refs)) {
            refs = [refs]
        }

        const highlightComps: Component[] = []
        for (const comp of this.components) {
            if (isDefined(comp.ref) && refs.includes(comp.ref)) {
                highlightComps.push(comp)
            }
        }

        const highlightWires: Wire[] = []
        for (const wire of this.wireMgr.wires) {
            if (isDefined(wire.ref) && refs.includes(wire.ref)) {
                highlightWires.push(wire)
            }
        }

        if (highlightComps.length === 0 && highlightWires.length === 0) {
            console.log(`Nothing to highlight for ref '${refs}'`)
            this._highlightedItems = undefined
            return
        }

        const start = this.timeline.unadjustedTime()
        this._highlightedItems = { comps: highlightComps, wires: highlightWires, start }
        this.redrawMgr.addReason("highlighting component", null)
        this.recalcPropagateAndDrawIfNeeded()
    }

    redraw() {
        this.setCanvasSize()
        this.redrawMgr.addReason("explicit redraw call", null)
        this.recalcPropagateAndDrawIfNeeded()
    }

    private doRedraw() {
        const g = this.html.mainCanvas.getContext("2d")!
        this.doDrawWithContext(g)
    }

    private doDrawWithContext(g: CanvasRenderingContext2D) {
        const mainCanvas = this.html.mainCanvas
        const baseDrawingScale = this._baseDrawingScale

        const width = mainCanvas.width / baseDrawingScale
        const height = mainCanvas.height / baseDrawingScale

        g.setTransform(this._baseTransform)
        g.lineCap = "square"
        g.textBaseline = "middle"

        // clear background
        g.fillStyle = COLOR_BACKGROUND
        g.fillRect(0, 0, width, height)


        // draw highlight
        const highlightRectFor = (comp: Component) => {
            const margin = 15
            let w = comp.unrotatedWidth + margin + margin
            let h = comp.unrotatedHeight + margin + margin
            if (Orientation.isVertical(comp.orient)) {
                const t = w
                w = h
                h = t
            }
            return new DOMRect(comp.posX - w / 2, comp.posY - h / 2, w, h)
        }

        const highlightedItems = this._highlightedItems
        let highlightColor: string | undefined = undefined
        if (isDefined(highlightedItems)) {
            const HOLD_TIME = 2000
            const FADE_OUT_TIME = 200
            const elapsed = this.timeline.unadjustedTime() - highlightedItems.start
            const highlightAlpha = (elapsed < HOLD_TIME) ? 1 : 1 - (elapsed - HOLD_TIME) / FADE_OUT_TIME
            if (highlightAlpha <= 0) {
                this._highlightedItems = undefined
            } else {

                g.beginPath()
                for (const comp of highlightedItems.comps) {
                    const highlightRect = highlightRectFor(comp)
                    g.moveTo(highlightRect.x, highlightRect.y)
                    g.lineTo(highlightRect.right, highlightRect.y)
                    g.lineTo(highlightRect.right, highlightRect.bottom)
                    g.lineTo(highlightRect.x, highlightRect.bottom)
                    g.closePath()
                }

                highlightColor = `rgba(255,255,120,${highlightAlpha})`
                g.shadowColor = highlightColor
                g.shadowBlur = 20
                g.shadowOffsetX = 0
                g.shadowOffsetY = 0
                g.fillStyle = highlightColor
                g.fill()

                g.shadowBlur = 0 // reset

                // will make it run until alpha is 0
                this.redrawMgr.addReason("highlight animation", null)
            }
        }

        // draw grid if moving comps
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

        // draw border according to mode
        if (this._mode >= Mode.CONNECT || this._maxInstanceMode === MAX_MODE_WHEN_SINGLETON) {
            g.strokeStyle = COLOR_BORDER
            g.lineWidth = 2
            g.strokeRect(0, 0, width, height)
            if (this._maxInstanceMode === MAX_MODE_WHEN_SINGLETON && this._mode < this._maxInstanceMode) {
                const h = this.guessAdequateCanvasSize()[1]
                strokeSingleLine(g, 0, h, width, h)

                g.fillStyle = COLOR_BACKGROUND_UNUSED_REGION
                g.fillRect(0, h, width, height - h)
            }
        }

        const drawTime = this.timeline.adjustedTime()
        // const currentScale = this._currentScale
        // g.scale(currentScale, currentScale)

        // draw wires
        g.strokeStyle = COLOR_COMPONENT_BORDER
        const currentMouseOverComp = this.cursorMovementMgr.currentMouseOverComp
        const drawParams: DrawParams = {
            drawTime,
            currentMouseOverComp,
            highlightedItems,
            highlightColor,
            currentSelection: undefined,
        }
        this.wireMgr.draw(g, drawParams) // never show wires as selected

        // draw components
        const currentSelection = this.cursorMovementMgr.currentSelection
        drawParams.currentSelection = currentSelection
        for (const comp of this.components) {
            comp.draw(g, drawParams)
            comp.forEachNode((node) => {
                node.draw(g, drawParams) // never show nodes as selected
                return true
            })
        }

        // draw selection
        let selRect
        if (isDefined(currentSelection) && isDefined(selRect = currentSelection.currentlyDrawnRect)) {
            g.lineWidth = 1.5
            g.strokeStyle = "rgb(100,100,255)"
            g.fillStyle = "rgba(100,100,255,0.2)"
            g.beginPath()
            g.rect(selRect.x, selRect.y, selRect.width, selRect.height)
            g.stroke()
            g.fill()
        }

    }


    undo() {
        // TODO stubs
        console.log("undo")
    }

    redo() {
        // TODO stubs
        console.log("redo")
    }

    cut() {
        // TODO stubs
        console.log("cut")
    }

    copy() {
        if (isUndefined(this.cursorMovementMgr.currentSelection)) {
            // copy URL
            copyToClipboard(window.location.href)
            return
        }
        // TODO stubs
        console.log("copy")
    }

    paste() {
        // TODO stubs
        console.log("paste")
    }


    wrapHandler<T extends unknown[], R>(f: (...params: T) => R): (...params: T) => R {
        return (...params: T) => {
            const result = f(...params)
            this.recalcPropagateAndDrawIfNeeded()
            return result
        }
    }
}

export class LogicStatic {

    highlight(diagramRefs: string | string[], componentRefs: string | string[]) {
        if (isString(diagramRefs)) {
            diagramRefs = [diagramRefs]
        }
        for (const diagramRef of diagramRefs) {
            const diagram = document.getElementById("logic_" + diagramRef)
            if (diagram === null) {
                console.log(`Cannot find logic diagram with reference '${diagramRef}'`)
                return
            }
            if (!(diagram instanceof LogicEditor)) {
                console.log(`Element with id '${diagramRef}' is not a logic editor`)
                return
            }
            diagram.highlight(componentRefs)
        }
    }

}

const template = (() => {
    const template = document.createElement('template')
    template.innerHTML = LogicEditorTemplate
    const styles = [LogicEditorCSS, DialogPolyfillCSS]
    template.content.querySelector("#inlineStyle")!.innerHTML = styles.join("\n\n\n")

    template.content.querySelectorAll("i.svgicon").forEach((_iconElem) => {
        const iconElem = _iconElem as HTMLElement
        const iconName = iconElem.dataset["icon"] ?? "question"
        if (isIconName(iconName)) {
            iconElem.innerHTML = inlineSvgFor(iconName)
        } else {
            console.log(`Unknown icon name '${iconName}'`)
        }
    })
    return template
})()
// cannot be in setup function because 'template' var is not assigned until that func returns
// and promotion of elems occurs during this 'customElements.define' call
window.customElements.define('logic-editor', LogicEditor)
window.Logic = new LogicStatic()
document.addEventListener("toggle", e => {
    if (!(e.target instanceof HTMLDetailsElement)) {
        return
    }
    if (e.target.open) {
        e.target.querySelectorAll("logic-editor").forEach(el => {
            if (el instanceof LogicEditor) {
                el.redraw()
            }
        })
    }
}, true)
