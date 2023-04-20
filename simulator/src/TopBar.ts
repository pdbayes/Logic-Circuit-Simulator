import { LogicEditor, MouseAction } from "./LogicEditor"
import { Serialization } from "./Serialization"
import { TimelineState } from "./Timeline"
import { UndoState } from "./UndoManager"
import { Modifier, a, attr, button, cls, div, emptyMod, i, input, mods, raw, span, style, title, type } from "./htmlgen"
import { IconName, inlineIconSvgFor } from "./images"
import { S } from "./strings"
import { Mode, UIDisplay, setActive, setDisplay, setEnabled, setVisible } from "./utils"

export class TopBar {

    private readonly root: HTMLDivElement
    private _showingCompactUI: boolean = false

    private readonly circuitNameLabel: HTMLSpanElement
    private readonly dirtyIndicator: HTMLSpanElement
    private readonly subcircuitChevron: HTMLSpanElement
    private readonly subcircuitNameLabel: HTMLSpanElement

    private readonly openButton: HTMLButtonElement
    private readonly closeSubcircuitButton: HTMLButtonElement
    private readonly undoButton: HTMLButtonElement
    private readonly redoButton: HTMLButtonElement
    private readonly downloadButton: HTMLButtonElement
    private readonly screenshotButton: HTMLButtonElement
    private readonly resetButton: HTMLButtonElement

    private readonly timelineButtonSep: HTMLElement
    private readonly pauseButton: HTMLButtonElement
    private readonly playButton: HTMLButtonElement
    private readonly stepButton: HTMLButtonElement
    private readonly timeLabel: HTMLSpanElement
    private _showingTimelineUI: boolean = false

    private readonly designButton: HTMLButtonElement
    private readonly deleteButton: HTMLButtonElement
    private readonly moveButton: HTMLButtonElement

    private readonly flexibleSep: HTMLElement

    private readonly zoomLevelInput: HTMLInputElement

    public constructor(
        public readonly editor: LogicEditor,
    ) {
        const s = S.TopBar

        this.circuitNameLabel = this.makeLink("", this.runSetNameDialog.bind(this))
        this.circuitNameLabel.style.fontSize = "12pt"
        this.dirtyIndicator = this.makeLabel("•")
        this.dirtyIndicator.style.margin = "0"
        this.dirtyIndicator.style.fontSize = "180%"
        this.subcircuitChevron = this.makeLabel("❯")
        this.subcircuitChevron.style.fontSize = "14pt"
        this.subcircuitNameLabel = this.makeLabel("")
        this.subcircuitNameLabel.style.fontWeight = "bolder"
        this.closeSubcircuitButton = this.makeButton("close", s.CloseCircuit,
            () => {/* TODO */ })

        this.undoButton = this.makeButtonWithLabel("undo", s.Undo,
            () => this.editor.undoMgr.undo())
        this.redoButton = this.makeButtonWithLabel("redo", s.Redo,
            () => this.editor.undoMgr.redoOrRepeat())

        this.resetButton = this.makeButtonWithLabel("reset", s.Reset,
            () => this.editor.resetCircuit())

        this.openButton = this.makeButtonWithLabel("open", s.Open,
            this.openHandler.bind(this))
        this.downloadButton = this.makeButtonWithLabel("download", s.Download,
            this.saveHandler.bind(this))
        this.screenshotButton = this.makeButtonWithLabel("screenshot", s.Screenshot,
            this.screenshotHandler.bind(this))

        this.timelineButtonSep = this.makeSep()
        this.pauseButton = this.makeButtonWithLabel("pause", s.TimelinePause,
            () => this.editor.timeline.pause())
        this.playButton = this.makeButtonWithLabel("play", s.TimelinePlay,
            () => this.editor.timeline.play())
        this.stepButton = this.makeButtonWithLabel("step", s.TimelineStep,
            () => this.editor.timeline.step())

        this.timeLabel = this.makeLabel(s.TimeLabel + "0")
        this.timeLabel.style.fontSize = "8pt"

        this.designButton = this.makeButtonWithLabel("edit", s.Design,
            () => this.editor.setCurrentMouseAction("edit"))
        this.deleteButton = this.makeButtonWithLabel("trash", s.Delete,
            () => this.editor.setCurrentMouseAction("delete"))
        this.moveButton = this.makeButtonWithLabel("move", s.Move,
            () => this.editor.setCurrentMouseAction("move"))

        this.flexibleSep = div(style("flex: auto")).render()

        this.zoomLevelInput = input(type("number"),
            style("margin: 0 2px 0 5px; width: 4em"),
            attr("min", "0"), attr("step", "10"),
            attr("value", String(editor.options.zoom)),
            attr("title", S.Settings.zoomLevel),
        ).render()
        this.zoomLevelInput.addEventListener("change",
            editor.wrapHandler(this.zoomLevelHandler.bind(this)))

        const zoomControl = this.makeLabel(mods(
            span(cls("btnLabel"), S.Settings.zoomLevelField[0]),
            this.zoomLevelInput, S.Settings.zoomLevelField[1]
        ))

        this.root =
            div(cls("topBar"), style("flex:none; height: 30px; padding: 3px 5px; display: flex; align-items: stretch;"),
                div(cls("path"), style("flex: none; display: flex; align-items: stretch; margin: 0; margin: -3px 5px -3px -5px; padding: 3px 5px"),
                    this.circuitNameLabel,
                    this.dirtyIndicator,
                    this.subcircuitChevron,
                    this.subcircuitNameLabel,
                    this.closeSubcircuitButton,
                ),

                this.makeSep(),
                this.undoButton,
                this.redoButton,

                this.makeSep(),
                this.resetButton,

                this.makeSep(),
                this.openButton,
                this.downloadButton,
                this.screenshotButton,

                this.timelineButtonSep,
                this.pauseButton,
                this.playButton,
                this.stepButton,
                this.timeLabel,

                this.makeSep(true),
                this.designButton,
                this.deleteButton,
                this.moveButton,

                this.flexibleSep,

                zoomControl,

            ).render()

        editor.html.centerCol.insertAdjacentElement("afterbegin", this.root)

        editor.undoMgr.onStateChanged = newState => this.setUndoButtonsEnabled(newState)
        this.setUndoButtonsEnabled(editor.undoMgr.state)

        editor.timeline.onStateChanged = newState => this.setTimelineButtonsVisible(newState)
        this.setTimelineButtonsVisible(editor.timeline.state)

        this.setDirty(false)

        window.addEventListener("resize", this.updateCompactMode.bind(this))

        this.setEditingSubcircuit(undefined)
        this.setCircuitName(editor.documentDisplayName)
        this.updateCompactMode()
    }


    // Handlers

    private runSetNameDialog() {
        const currentValue = this.editor.options.name ?? ""
        const newName = window.prompt(S.TopBar.SetCircuitName, currentValue)
        if (newName === null || newName === currentValue) {
            return
        }
        this.editor.setCircuitName(newName)
    }

    private openHandler() {
        this.editor.runFileChooser("text/plain|image/png|application/json", file => {
            this.editor.tryLoadFrom(file)
        })
    }

    private saveHandler(e: MouseEvent) {
        if (e.altKey && this.editor.factory.hasCustomComponents()) {
            Serialization.saveLibraryToFile(this.editor)
        } else {
            Serialization.saveCircuitToFile(this.editor)
        }
    }

    private screenshotHandler(e: MouseEvent) {
        const editor = this.editor
        if (e.altKey) {
            editor.download(editor.toSVG(true), ".svg")
        } else {
            editor.download(editor.toPNG(true), ".png")
        }
    }

    private zoomLevelHandler() {
        const zoom = this.zoomLevelInput.valueAsNumber
        this.editor.setZoomLevel(zoom)
    }


    // Visibility methods

    private updateCompactMode() {
        const getSepWidth = () => this.flexibleSep.getBoundingClientRect().width
        const MinSepWidth = 10
        const sepWidth = getSepWidth()
        if (!this._showingCompactUI) {
            if (sepWidth <= MinSepWidth) {
                // we need to shrink for sure
                this._showingCompactUI = true
                this.root.classList.add("compact")
            }
        } else {
            // can we expand? (if not, we'll stay in compact mode)
            if (sepWidth > MinSepWidth) {
                this.root.classList.remove("compact")
                if (getSepWidth() <= MinSepWidth) {
                    // we can't expand, so stay in compact mode
                    this.root.classList.add("compact")
                } else {
                    // keep being expanded
                    this._showingCompactUI = false
                }
            }
        }
    }

    public setButtonStateFromMode(state: { showComponentsAndEditControls: UIDisplay, showReset: boolean }, mode: Mode) {
        setDisplay(this.root, state.showComponentsAndEditControls)

        setVisible(this.resetButton, state.showReset)

        const showUndoRedo = mode >= Mode.CONNECT
        setVisible(this.undoButton, showUndoRedo)
        setVisible(this.redoButton, showUndoRedo)

        const showToolButtons = state.showComponentsAndEditControls === "show"
        setVisible(this.designButton, showToolButtons)
        setVisible(this.deleteButton, showToolButtons)
        setVisible(this.moveButton, showToolButtons)
        this.updateCompactMode()
    }

    public setCircuitName(name: string) {
        this.circuitNameLabel.textContent = name
        this.updateCompactMode()
    }

    public setZoomLevel(zoom: number) {
        this.zoomLevelInput.value = String(zoom)
    }

    public setDirty(dirty: boolean) {
        this.dirtyIndicator.style.visibility = dirty ? "visible" : "hidden"
        setEnabled(this.resetButton, dirty)
    }

    public setEditingSubcircuit(subcircuitName: string | undefined) {
        const showSubcircuitUI = subcircuitName !== undefined
        setVisible(this.subcircuitChevron, showSubcircuitUI)
        setVisible(this.subcircuitNameLabel, showSubcircuitUI)
        setVisible(this.closeSubcircuitButton, showSubcircuitUI)
        if (showSubcircuitUI) {
            this.circuitNameLabel.style.removeProperty("font-weight")
            this.subcircuitNameLabel.textContent = subcircuitName
        } else {
            this.circuitNameLabel.style.fontWeight = "bolder"
        }
        this.updateCompactMode()
    }

    private setTimelineButtonsVisible({ enablesPause, hasCallbacks, isPaused, nextStepDesc }: TimelineState) {
        const showTimelineUI = enablesPause || (this.editor.options.allowPausePropagation && hasCallbacks)
        this._showingTimelineUI = showTimelineUI
        if (showTimelineUI) {
            // show part of the interface
            setVisible(this.timelineButtonSep, true)
            setVisible(this.playButton, isPaused)
            setVisible(this.pauseButton, !isPaused)
            setVisible(this.stepButton, nextStepDesc !== undefined)
            this.stepButton.title = S.TopBar.TimelineStep[1] + "\n" + (nextStepDesc ?? "")
            setVisible(this.timeLabel, isPaused)
            this.updateTimeLabelIfNeeded()
        } else {
            // show nothing
            setVisible(this.timelineButtonSep, false)
            setVisible(this.playButton, false)
            setVisible(this.pauseButton, false)
            setVisible(this.stepButton, false)
            setVisible(this.timeLabel, false)
        }
        this.updateCompactMode()
    }

    private setUndoButtonsEnabled({ canUndo, canRedoOrRepeat }: UndoState) {
        setEnabled(this.undoButton, canUndo)
        setEnabled(this.redoButton, canRedoOrRepeat)
    }

    public updateTimeLabelIfNeeded() {
        if (!this._showingTimelineUI) {
            return
        }

        const t = this.editor.timeline.logicalTime()
        // make nice string from milliseconds
        const ms = t % 1000
        const s = Math.floor(t / 1000) % 60
        const m = Math.floor(t / 60000) % 60
        const h = Math.floor(t / 3600000)
        this.timeLabel.textContent = S.TopBar.TimeLabel + (h === 0 ? "" : h + ":") +
            (m < 10 ? "0" + m : m) + ":" +
            (s < 10 ? "0" + s : s) + "." +
            (ms < 100 ? (ms < 10 ? "00" : "0") : "") + ms
    }

    public setActiveTool(tool: MouseAction) {
        setActive(this.designButton, tool === "edit")
        setActive(this.deleteButton, tool === "delete")
        setActive(this.moveButton, tool === "move")
    }


    // Factory methods

    private makeButtonWithLabel(icon: IconName, labelTooltip: [Modifier, string], handler: (e: MouseEvent) => void): HTMLButtonElement {
        return this.makeButton(icon, labelTooltip[1], handler, labelTooltip[0])
    }

    private makeButton(icon: IconName, tooltip: string, handler: (e: MouseEvent) => void, label?: Modifier): HTMLButtonElement {
        const labelSpan = label === undefined ? emptyMod : span(cls("btnLabel"), label)
        const but =
            button(
                i(cls("svgicon"), raw(inlineIconSvgFor(icon))),
                title(tooltip),
                labelSpan
            ).render()
        but.addEventListener("click", this.editor.wrapHandler(handler))
        return but
    }

    private makeLabel(label: Modifier): HTMLSpanElement {
        return span(cls("barLabel"), label).render()
    }

    private makeLink(label: Modifier, handler: (e: MouseEvent) => void): HTMLSpanElement {
        const link = a(cls("barLabel"), label).render()
        link.addEventListener("click", this.editor.wrapHandler(handler))
        return link
    }

    private makeSep(fat: boolean = false): HTMLElement {
        const classes = fat ? "sep fat" : "sep"
        return div(cls(classes)).render()
    }

}

