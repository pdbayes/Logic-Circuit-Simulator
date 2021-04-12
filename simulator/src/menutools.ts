import { Clock } from "./components/Clock"
import { tryLoadFromData, setToolCursor, setHandlersFor, components } from "./simulator"
import { GateFactory, GateTypes } from "./components/Gate"
import { LogicInput } from "./components/LogicInput"
import { LogicOutput } from "./components/LogicOutput"
import { isNullOrUndefined, RichStringEnum } from "./utils"
import { DisplayNibble } from "./components/DisplayNibble"
import { DisplayAscii } from "./components/DisplayAscii"
import { DisplayBar } from "./components/DisplayBar"
import { Component } from "./components/Component"


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
}


function activeTool(elTool: HTMLElement) {

    const tool = elTool.getAttribute("tool")
    if (isNullOrUndefined(tool)) {
        return
    }

    // Main edit buttons on the right
    if (MouseActions.isValue(tool)) {
        setCurrentMouseAction(tool)
        return
    }

    setCurrentMouseAction("edit")
    if (tool === "Reset") {
        tryLoadFromData()
        return
    }


    // switch (tool) {
    // case "SR_Latch": {
    //     let el = document.getElementsByClassName("SR_Latch-gate")[0] as HTMLSelectElement
    //     const gateType = el.options[el.selectedIndex].text
    //     el = document.getElementsByClassName("SR_Latch-sync")[0] as HTMLSelectElement
    //     const _syncType = el.selectedIndex
    //     const stabilize = (document.getElementsByClassName("SR_stabilize")[0] as HTMLInputElement).checked
    //     if (_syncType === SyncType.ASYNC) {
    //         srLatches.push(new SR_LatchAsync(SR_Latch.convertToType(gateType), stabilize))
    //     } else {
    //         srLatches.push(new SR_LatchSync(SR_Latch.convertToType(gateType), stabilize))
    //     }
    //     break
    // }

    // case "FF_D": {
    //     const el = document.getElementsByClassName("FF_D-Setting")[0] as HTMLSelectElement
    //     const isMasterSlave = el.selectedIndex // because is 0 or 1
    //     if (isMasterSlave) { flipflops.push(new FF_D_MasterSlave()) }
    //     else { flipflops.push(new FF_D_Single()) }
    //     break
    // }

    // case "FF_T": {
    //     const el = document.getElementsByClassName("FF_T-Setting")[0] as HTMLSelectElement
    //     const isNegativeEdgeTrig = el.selectedIndex // because is 0 or 1
    //     if (isNegativeEdgeTrig) { flipflops.push(new FF_T(true)) }
    //     else { flipflops.push(new FF_T(false)) }
    //     break
    // }

    // case "FF_JK": {
    //     const el = document.getElementsByClassName("FF_JK-Setting")[0] as HTMLSelectElement
    //     const isNegativeEdgeTrig = el.selectedIndex // because is 0 or 1
    //     if (isNegativeEdgeTrig) { flipflops.push(new FF_JK(true)) }
    //     else { flipflops.push(new FF_JK(false)) }
    //     break
    // }

    // }

}
window.activeTool = activeTool
