// import { Component } from "./components/Component"
// import { WireManager } from "./components/Wire"
// import { isNotNull, Mode } from "./utils.js"

import * as LZString from "lz-string"
import { Component, ComponentBase, ComponentState } from "./components/Component"
import { Waypoint, Wire, WireManager } from "./components/Wire"
import { CursorMovementManager } from "./CursorMovementManager"
import { ALPHA_HIGHLIGHT_OVERLAY, COLOR_BACKGROUND, COLOR_BACKGROUND_UNUSED_REGION, COLOR_BORDER, COLOR_COMPONENT_BORDER, COLOR_GRID_LINES, GRID_STEP, strokeSingleLine } from "./drawutils"
import { gallery } from "./gallery"
import { div, cls, style, title, faglyph, attrBuilder, applyModifierTo, button, emptyMod, mods, raw, input, type, label, span, attr, a, href, target } from "./htmlgen"
import { MoveManager } from "./MoveManager"
import { NodeManager } from "./NodeManager"
import { PersistenceManager } from "./PersistenceManager"
import { RecalcManager, RedrawManager } from "./RedrawRecalcManager"
import { Timeline, TimelineState } from "./Timeline"
import { copyToClipboard, downloadBlob as downloadDataUrl, getURLParameter, isDefined, isFalsyString, isNull, isNullOrUndefined, isString, isTruthyString, isUndefined, KeysOfByType, RichStringEnum, setVisible, showModal } from "./utils"

import { Drawable, DrawableWithPosition, Orientation } from "./components/Drawable"
import { makeComponentMenuInto } from "./menuutils"

import * as QRCode from "qrcode"

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import LogicEditorTemplate from "../html/LogicEditorTemplate.html"

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
    private _highlightedComponent: { comp: Component, start: number } | undefined = undefined
    private _nextAnimationFrameHandle: number | null = null

    public root: ShadowRoot
    public readonly html: {
        canvasContainer: HTMLElement,
        mainCanvas: HTMLCanvasElement,
        leftToolbar: HTMLElement,
        tooltipElem: HTMLElement,
        tooltipContents: HTMLElement,
        mainContextMenu: HTMLElement,
        hiddenPath: SVGPathElement,
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
            leftToolbar: this.elemWithId("leftToolbar"),
            tooltipElem: this.elemWithId("tooltip"),
            tooltipContents: this.elemWithId("tooltipContents"),
            mainContextMenu: this.elemWithId("mainContextMenu"),
            optionsZone: this.elemWithId("optionsZone"),
            hiddenPath: this.elemWithId("hiddenPath"),
            embedDialog: this.elemWithId("embedDialog"),
            embedUrl: this.elemWithId("embedUrl"),
            embedUrlQRCode: this.elemWithId("embedUrlQRCode"),
            embedIframe: this.elemWithId("embedIframe"),
            embedWebcomp: this.elemWithId("embedWebcomp"),
            embedMarkdown: this.elemWithId("embedMarkdown"),
        }
        this.html = html

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
        const { canvasContainer, mainCanvas } = this.html
        this._baseTransform = this.setCanvasWidth(canvasContainer.clientWidth, canvasContainer.clientHeight)

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
                const reader = new FileReader()
                reader.onload = e => {
                    const content = e.target?.result?.toString()
                    if (isDefined(content)) {
                        window.load(content)
                    }
                }
                reader.readAsText(file, "utf-8")
            } else {
                const dataItems = e.dataTransfer.items
                if (isDefined(dataItems)) {
                    for (let i = 0; i < dataItems.length; i++) {
                        const dataItem = dataItems[i]
                        if (dataItem.kind === "string" && (dataItem.type === "application/json" || dataItem.type !== "text/plain")) {
                            dataItem.getAsString(content => {
                                e.dataTransfer!.dropEffect = "copy"
                                window.load(content)
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
        this._isSingleton = !this._isEmbedded && !isFalsyString(this.getAttribute(ATTRIBUTE_NAMES.singleton))
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
            window.addEventListener("keyup", this.wrapHandler(e => {
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

            window.addEventListener("keydown", this.wrapHandler(e => {
                switch (e.key) {
                    case "a":
                        if (e.metaKey && this.mode >= Mode.CONNECT) {
                            this.cursorMovementMgr.selectAll()
                            e.preventDefault()
                        }
                        return

                    case "s":
                        if (e.metaKey && this._isSingleton) {
                            this.saveCurrentStateToUrl()
                            e.preventDefault()
                        }
                        return

                    case "z":
                        if (e.metaKey) {
                            if (e.shiftKey) {
                                redo()
                            } else {
                                undo()
                            }
                            e.preventDefault()
                        }
                        return
                    case "y":
                        if (e.metaKey) {
                            redo()
                            e.preventDefault()
                        }
                        return
                }
            }))

            // make load function available globally
            window.load = this.wrapHandler((jsonString: any) => PersistenceManager.doLoadFromJson(this, jsonString))
            window.adjustedTime = () => {
                const nowAdjusted = this.timeline.adjustedTime()
                // console.log(nowAdjusted)
                return nowAdjusted
            }

            this.html.canvasContainer.appendChild(
                div(style("position: absolute; bottom: 0; right: 0; padding: 5px 3px 2px 5px; background-color: rgba(255,255,255,0.3); border-radius: 10px 0 0 0;"),
                    a(style("color: rgba(0,0,0,0.2); font-size: 69%; font-style: italic;"),
                        href("https://github.com/jppellet/Logic-Circuit-Simulator"), target("_blank"),
                        "Développé par Jean-Philippe Pellet"
                    )
                ).render()
            )

            window.onbeforeunload = e => {
                if (this._isSingleton && this._isDirty) {
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

        const dataAttr = this.getAttribute(ATTRIBUTE_NAMES.data)
        if (dataAttr !== null) {
            this._initialData = { _type: "compressed", str: dataAttr }
        } else {
            const srcAttr = this.getAttribute(ATTRIBUTE_NAMES.src)
            if (srcAttr !== null) {
                this._initialData = { _type: "url", url: srcAttr }
            }
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
                                        faglyph("cog")
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
                            faglyph("link")
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

        this.tryLoadFromData()
        // also triggers redraw, should be last thing called here

        this.setModeFromString(this.getAttribute(ATTRIBUTE_NAMES.mode))
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
                error = PersistenceManager.doLoadFromJson(this, decodedData)
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
        const currentScale = this._currentScale
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

        const webcompEmbed = `<logic-editor mode="${Mode[mode].toLowerCase()}">\n  <script type="application/json">\n    ${json}\n  </script>\n</logic-editor>`
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
        const dataUrl = tmpCanvas.toDataURL()
        tmpCanvas.remove()

        const filename = (this.options.name ?? "circuit") + ".png"
        downloadDataUrl(dataUrl, filename)
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

    highlight(ref: string | undefined) {
        if (isUndefined(ref)) {
            this._highlightedComponent = undefined
            return
        }

        let highlightComp: Component | undefined = undefined
        for (const comp of this.components) {
            if (comp.ref === ref) {
                highlightComp = comp
            }
        }

        if (isUndefined(highlightComp)) {
            console.log(`Nothing to highlight for ref '${ref}'`)
            this._highlightedComponent = undefined
            return
        }

        const start = this.timeline.unadjustedTime()
        this._highlightedComponent = { comp: highlightComp, start }
        this.redrawMgr.addReason("highlighting component", null)
        console.log("bla", ref)
        this.recalcPropagateAndDrawIfNeeded()
    }

    private doRedraw() {

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

        if (this._mode >= Mode.CONNECT || this._maxInstanceMode === MAX_MODE_WHEN_SINGLETON) {
            g.strokeRect(0, 0, width, height)
            if (this._maxInstanceMode === MAX_MODE_WHEN_SINGLETON && this._mode < this._maxInstanceMode) {
                const h = this.guessAdequateCanvasSize()[1]
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

        const now = this.timeline.adjustedTime()
        const currentScale = this._currentScale
        g.scale(currentScale, currentScale)

        g.strokeStyle = COLOR_COMPONENT_BORDER
        const currentMouseOverComp = this.cursorMovementMgr.currentMouseOverComp
        this.wireMgr.draw(g, now, currentMouseOverComp, undefined) // never show wires as selected

        const currentSelection = this.cursorMovementMgr.currentSelection
        for (const comp of this.components) {
            comp.draw(g, now, currentMouseOverComp, currentSelection)
            comp.forEachNode((node) => {
                node.draw(g, now, currentMouseOverComp, undefined) // never show nodes as selected
                return true
            })
        }

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

        const highlightRectFor = (comp: Component) => {
            const margin = 20
            let w = comp.unrotatedWidth + margin + margin
            let h = comp.unrotatedHeight + margin + margin
            if (Orientation.isVertical(comp.orient)) {
                const t = w
                w = h
                h = t
            }
            return new DOMRect(comp.posX - w / 2, comp.posY - h / 2, w, h)
        }

        const highlightedComp = this._highlightedComponent
        if (isDefined(highlightedComp)) {
            const HOLD_TIME = 1000
            const FADE_OUT_TIME = 100
            const elapsed = this.timeline.unadjustedTime() - highlightedComp.start
            let alpha
            if (elapsed < HOLD_TIME) {
                alpha = ALPHA_HIGHLIGHT_OVERLAY
            } else {
                alpha = ALPHA_HIGHLIGHT_OVERLAY * (1 - (elapsed - HOLD_TIME) / FADE_OUT_TIME)
            }
            if (alpha <= 0) {
                this._highlightedComponent = undefined
            } else {
                const highlightRect = highlightRectFor(highlightedComp.comp)
                g.beginPath()
                g.moveTo(0, 0)
                g.lineTo(width, 0)
                g.lineTo(width, height)
                g.lineTo(0, height)
                g.closePath()

                g.moveTo(highlightRect.x, highlightRect.y)
                g.lineTo(highlightRect.x, highlightRect.bottom)
                g.lineTo(highlightRect.right, highlightRect.bottom)
                g.lineTo(highlightRect.right, highlightRect.top)
                g.closePath()

                g.fillStyle = `rgba(0,0,0,${alpha})`
                g.fill()

                const strokeWidth = 6
                g.lineWidth = strokeWidth
                g.lineCap = "butt"
                const maskedOut = g.fillStyle
                const transparent = "rgba(0,0,0,0)"

                const mkGrad = (x1: number, y1: number, x2: number, y2: number) => {
                    const grad = g.createLinearGradient(x1, y1, x2, y2)
                    grad.addColorStop(0, maskedOut)
                    grad.addColorStop(1, transparent)
                    return grad
                }

                g.beginPath()
                g.moveTo(highlightRect.x, highlightRect.y + strokeWidth / 2)
                g.lineTo(highlightRect.right, highlightRect.top + strokeWidth / 2)
                g.strokeStyle = mkGrad(highlightRect.x, highlightRect.y, highlightRect.x, highlightRect.y + strokeWidth)
                g.stroke()

                g.beginPath()
                g.moveTo(highlightRect.x, highlightRect.bottom - strokeWidth / 2)
                g.lineTo(highlightRect.right, highlightRect.bottom - strokeWidth / 2)
                g.strokeStyle = mkGrad(highlightRect.x, highlightRect.bottom, highlightRect.x, highlightRect.bottom - strokeWidth)
                g.stroke()

                g.beginPath()
                g.moveTo(highlightRect.x + strokeWidth / 2, highlightRect.top)
                g.lineTo(highlightRect.x + strokeWidth / 2, highlightRect.bottom)
                g.strokeStyle = mkGrad(highlightRect.left, highlightRect.top, highlightRect.left + strokeWidth, highlightRect.top)
                g.stroke()

                g.beginPath()
                g.moveTo(highlightRect.right - strokeWidth / 2, highlightRect.top)
                g.lineTo(highlightRect.right - strokeWidth / 2, highlightRect.bottom)
                g.strokeStyle = mkGrad(highlightRect.right, highlightRect.top, highlightRect.right - strokeWidth, highlightRect.top)
                g.stroke()

                this.redrawMgr.addReason("highlight animation", null)
            }
        }
    }

    wrapHandler<T extends unknown[], R>(f: (...params: T) => R): (...params: T) => R {
        return (...params: T) => {
            const result = f(...params)
            this.recalcPropagateAndDrawIfNeeded()
            return result
        }
    }
}


const template = document.createElement('template')
// template.innerHTML = "<style>\n" + LogicEditorCSS + "\n\n"+BootstrapCSS+"\n</style>\n\n" + LogicEditorTemplate
template.innerHTML = LogicEditorTemplate

window.customElements.define('logic-editor', LogicEditor)

function undo() {
    // TODO stubs
    console.log("undo")
}

function redo() {
    // TODO stubs
    console.log("redo")
}

function isEmbeddedInIframe(): boolean {
    try {
        return window.self !== window.top
    } catch (e) {
        return true
    }
}

