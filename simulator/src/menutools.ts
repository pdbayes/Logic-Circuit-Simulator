import { Clock } from "./circuit_components/Clock.js"
import { logicInputs, logicOutputs, clocks, gates, tryLoadFromData, displays, isNullOrUndefined } from "./simulator.js"
import { GateFactory, GateTypes } from "./circuit_components/Gate.js"
import { LogicInput } from "./circuit_components/LogicInput.js"
import { LogicOutput } from "./circuit_components/LogicOutput.js"
import { MouseAction } from "./circuit_components/Enums.js"
import { NibbleDisplay } from "./circuit_components/NibbleDisplay.js"
import { AsciiDisplay } from "./circuit_components/AsciiDisplay.js"
import { BarDisplay } from "./circuit_components/BarDisplay.js"

export let currMouseAction = MouseAction.EDIT


export function activeTool(elTool: HTMLElement) {

    const tool = elTool.getAttribute("tool")
    if (isNullOrUndefined(tool)) {
        return
    }

    switch (tool) {
        case "Reset":
            tryLoadFromData()
            return
    }

    resetElements()
    if (elTool.getAttribute("isGate") !== null) {
        if (GateTypes.isValue(tool)) {
            gates.push(GateFactory.make({ type: tool }))
        } else {
            console.log(`WARN Tool ${tool} is not a recognized gate type`)
        }
        return
    }

    switch (tool) {
        case "Edit":
            break

        case "Move":
            currMouseAction = MouseAction.MOVE
            document.getElementById("canvas-sim")!.style.cursor = "move"
            break

        case "Delete":
            currMouseAction = MouseAction.DELETE
            break

        case "LogicInput":
            logicInputs.push(new LogicInput(null))
            break

        case "LogicOutput":
            logicOutputs.push(new LogicOutput(null))
            break

        case "NibbleDisplay":
            displays.push(new NibbleDisplay(null))
            break

        case "AsciiDisplay":
            displays.push(new AsciiDisplay(null))
            break

        case "BarDisplay":
            displays.push(new BarDisplay(null))
            break

        case "Clock": {
            const period = parseInt((document.getElementsByClassName("period")[0] as HTMLInputElement).value)
            const dutycycle = parseInt((document.getElementsByClassName("duty-cycle")[0] as HTMLInputElement).value)
            clocks.push(new Clock({ period, dutycycle }))
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

    elTool.classList.add('active')

}

function resetElements() {
    currMouseAction = MouseAction.EDIT
    const activeElements = document.getElementsByClassName("active")

    for (let i = 0; i < activeElements.length; i++) {
        activeElements[i].classList.remove('active')
    }
    document.getElementById("canvas-sim")!.style.cursor = "default"
}

/**
 * Reset Element
 * then set current action to EDIT 
 */
export function backToEdit() {
    resetElements()
    document.getElementsByClassName("Edit")[0].classList.add("active")
    currMouseAction = MouseAction.EDIT
}
