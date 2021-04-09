import { Clock } from "./components/Clock"
import { logicInputs, logicOutputs, clocks, gates, tryLoadFromData, displays, setToolCursor, setHandlersFor } from "./simulator"
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

export const ComponentTypes = RichStringEnum.withProps<{
    make(elem: HTMLElement): Component,
    backingArray(): Component[],
}>()({
    "LogicInput": {
        make: () => new LogicInput(null),
        backingArray: () => logicInputs,
    },

    "LogicOutput": {
        make: () => new LogicOutput(null),
        backingArray: () => logicOutputs,
    },

    "DisplayNibble": {
        make: () => new DisplayNibble(null),
        backingArray: () => displays,
    },

    "DisplayAscii": {
        make: () => new DisplayAscii(null),
        backingArray: () => displays,
    },

    "DisplayBar": {
        make: () => new DisplayBar(null),
        backingArray: () => displays,
    },

    "Clock": {
        make: () => new Clock({ period: 2000, dutycycle: undefined, phase: undefined, showLabel: undefined }),
        backingArray: () => clocks,
    },

    "Gate": {
        make: (elem) => {
            const gateType = elem.dataset["type"]
            if (!GateTypes.isValue(gateType)) {
                throw new Error(`bad gate type: '${gateType}' - elem: ` + elem.outerHTML)
            }
            return GateFactory.make({ type: gateType })
        },
        backingArray: () => gates,
    },
})
export type ComponentType = typeof ComponentTypes.type


export function makeComponentFactoryForButton(elem: HTMLElement): () => Component {
    const compType = elem.dataset["component"]
    if (!ComponentTypes.isValue(compType)) {
        throw new Error(`bad component type: '${compType}'; expected one of: ` + ComponentTypes.values.join(", "))
    }
    const compDef = ComponentTypes.propsOf(compType)
    return () => {
        const newComp = compDef.make(elem)
        compDef.backingArray().push(newComp)
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
