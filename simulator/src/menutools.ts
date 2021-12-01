import { Clock } from "./components/Clock"
import { tryLoadFromData, setToolCursor, setHandlersFor, components, wrapHandler } from "./simulator"
import { GateFactory, GateTypes } from "./components/Gate"
import { LogicInput } from "./components/LogicInput"
import { LogicOutput } from "./components/LogicOutput"
import { isNullOrUndefined, isUndefined, RichStringEnum } from "./utils"
import { DisplayNibble } from "./components/DisplayNibble"
import { DisplayAscii } from "./components/DisplayAscii"
import { DisplayBar } from "./components/DisplayBar"
import { Component } from "./components/Component"
import { Adder } from "./components/Adder"
import { ALU } from "./components/ALU"
import { RedrawManager } from "./RedrawRecalcManager"
import { FlipflopD } from "./components/FlipflopD"
import { LatchSR } from "./components/LatchSR"


export const MouseActions = RichStringEnum.withProps<{
    cursor: string | null
}>()({
    edit: { cursor: null },
    move: { cursor: "move" },
    delete: { cursor: "not-allowed" },
})
export type MouseAction = typeof MouseActions.type

export const ComponentFactoryTypes = RichStringEnum.withProps<{
    make(elem: HTMLElement): Component,
}>()({
    "LogicInput": {
        make: () => new LogicInput(null),
    },

    "LogicOutput": {
        make: () => new LogicOutput(null),
    },

    "DisplayNibble": {
        make: () => new DisplayNibble(null),
    },

    "DisplayAscii": {
        make: () => new DisplayAscii(null),
    },

    "DisplayBar": {
        make: () => new DisplayBar(null),
    },

    "Clock": {
        make: () => new Clock({ period: 2000, dutycycle: undefined, phase: undefined, showLabel: undefined }),
    },

    "Gate": {
        make: (elem) => {
            const gateType = elem.dataset["type"]
            if (!GateTypes.isValue(gateType)) {
                throw new Error(`bad gate type: '${gateType}' - elem: ` + elem.outerHTML)
            }
            return GateFactory.make({ type: gateType })
        },
    },

    "IC": {
        make: (elem) => {
            const icType = elem.dataset["type"]
            if (isUndefined(icType)) {
                throw new Error(`undefined IC type - elem: ` + elem.outerHTML)
            }
            switch (icType) {
                case "Adder":
                    return new Adder(null)
                case "ALU":
                    return new ALU(null)
                case "LatchSR":
                    return new LatchSR(null)
                case "FlipflopD":
                default:
                    return new FlipflopD(null)
            }
        },
    },
})
export type ComponentFactoryType = typeof ComponentFactoryTypes.type


export function makeComponentFactoryForButton(elem: HTMLElement): () => Component {
    const compType = elem.dataset["component"]
    if (!ComponentFactoryTypes.isValue(compType)) {
        throw new Error(`bad component type: '${compType}'; expected one of: ` + ComponentFactoryTypes.values.join(", "))
    }
    const compDef = ComponentFactoryTypes.propsOf(compType)
    return () => {
        const newComp = compDef.make(elem)
        components.push(newComp)
        return newComp
    }
}


export let _currentMouseAction: MouseAction = "edit"

export function setCurrentMouseAction(action: MouseAction) {
    _currentMouseAction = action
    setToolCursor(MouseActions.propsOf(action).cursor)

    const toolButtons = document.getElementsByClassName("sim-modification-tool")
    for (let i = 0; i < toolButtons.length; i++) {
        const toolButton = toolButtons[i] as HTMLElement
        const setActive = toolButton.getAttribute("tool") === action
        if (setActive) {
            toolButton.classList.add("active")
        } else {
            toolButton.classList.remove("active")
        }
    }

    setHandlersFor(action)
    RedrawManager.addReason("mouse action changed", null)
}


function activeTool(elTool: HTMLElement) {

    const tool = elTool.getAttribute("tool")
    if (isNullOrUndefined(tool)) {
        return
    }

    // Main edit buttons on the right
    if (MouseActions.isValue(tool)) {
        wrapHandler(() => {
            setCurrentMouseAction(tool)
        })()

        return
    }

    setCurrentMouseAction("edit")
    if (tool === "Reset") {
        wrapHandler(() => {
            tryLoadFromData()
        })()
        return
    }

}
window.activeTool = activeTool
