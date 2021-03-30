import { Clock } from "./components/Clock"
import { logicInputs, logicOutputs, clocks, gates, tryLoadFromData, displays, setToolCursor, createdNewComponent, setHandlersFor } from "./simulator"
import { GateFactory, GateTypes } from "./components/Gate"
import { LogicInput } from "./components/LogicInput"
import { LogicOutput } from "./components/LogicOutput"
import { isNullOrUndefined, RichStringEnum } from "./utils"
import { DisplayNibble } from "./components/DisplayNibble"
import { DisplayAscii } from "./components/DisplayAscii"
import { DisplayBar } from "./components/DisplayBar"


export const MouseActions = RichStringEnum.withProps<{
    cursor: string | null
}>()({
    edit: { cursor: null },
    move: { cursor: "move" },
    delete: { cursor: "not-allowed" },
})
export type MouseAction = typeof MouseActions.type

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


export function activeTool(elTool: HTMLElement) {

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

    // Gates and other components
    if (elTool.getAttribute("isGate") !== null) {
        if (GateTypes.isValue(tool)) {
            createdNewComponent(GateFactory.make({ type: tool }), gates)
        } else {
            console.log(`WARN Tool ${tool} is not a recognized gate type`)
        }
        return
    }

    switch (tool) {
        case "LogicInput":
            createdNewComponent(new LogicInput(null), logicInputs)
            break

        case "LogicOutput":
            createdNewComponent(new LogicOutput(null), logicOutputs)
            break

        case "DisplayNibble":
            createdNewComponent(new DisplayNibble(null), displays)
            break

        case "DisplayAscii":
            createdNewComponent(new DisplayAscii(null), displays)
            break

        case "DisplayBar":
            createdNewComponent(new DisplayBar(null), displays)
            break

        case "Clock": {
            const period = parseInt((document.getElementsByClassName("period")[0] as HTMLInputElement).value)
            const dutycycle = parseInt((document.getElementsByClassName("duty-cycle")[0] as HTMLInputElement).value)
            createdNewComponent(new Clock({ period, dutycycle }), clocks)
            break
        }

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

    }

}
