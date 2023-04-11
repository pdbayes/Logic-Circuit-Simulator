import { Component } from "./components/Component"
import { Drawable } from "./components/Drawable"
import { Dict, isDefined, isUndefined } from "./utils"

export class RedrawManager {

    private _canvasRedrawReasons: Dict<unknown[]> = {}
    private _isEmpty = true

    public addReason(reason: string, comp: Drawable | null) {
        const compObj = comp
        const compList = this._canvasRedrawReasons[reason]
        if (isUndefined(compList)) {
            this._canvasRedrawReasons[reason] = [compObj]
        } else {
            compList.push(compObj)
        }
        this._isEmpty = false
    }

    public getReasonsAndClear(): string | undefined {
        if (this._isEmpty) {
            return undefined
        }

        const reasonParts: string[] = []
        for (const reason of Object.keys(this._canvasRedrawReasons)) {
            reasonParts.push(reason)
            const linkedComps = this._canvasRedrawReasons[reason]!
            reasonParts.push(" (", String(linkedComps.length), "×)", ": ")
            for (const comp of linkedComps) {
                if (comp !== null) {
                    const compAny = comp as any
                    reasonParts.push(compAny.constructor?.name ?? "Component")
                    if (isDefined(compAny.type)) {
                        reasonParts.push("_", compAny.type)
                    }
                    if (isDefined(compAny.name)) {
                        reasonParts.push("('", compAny.name, "')")
                    }
                    reasonParts.push("; ")
                }
            }
            reasonParts.pop()
            reasonParts.push("\n    ")
        }
        reasonParts.pop()

        this._canvasRedrawReasons = {}
        this._isEmpty = true
        return reasonParts.join("")
    }

    public hasReasons(): boolean {
        return !this._isEmpty
    }
}


export class RecalcManager {

    private _propagateQueue: Array<Component> = []
    private _recalcQueue: Array<[Component, boolean]> = []

    public enqueueForPropagate(comp: Component) {
        this._propagateQueue.push(comp)
    }

    public enqueueForRecalc(comp: Component, forcePropagate: boolean) {
        this._recalcQueue.push([comp, forcePropagate])
    }

    public queueIsEmpty(): boolean {
        return this._propagateQueue.length === 0 && this._recalcQueue.length === 0
    }

    public recalcAndPropagateIfNeeded(): boolean {
        if (this.queueIsEmpty()) {
            return false
        }
        this.recalcAndPropagate()
        return true
    }

    private recalcAndPropagate() {
        // We proceed as follows: first, we propagate (from input nodes to components)
        // all pending values. This marks some components as needing recalc, probably, and
        // doing all propagation beforehand allows to wait with recalc until all values are
        // propagated. Then, we recalc all components that need it, and then we loop until
        // no new propagation/recalc is needed. We may need several loops if propagation
        // times are set to 0, and we break out of the loop after a certain number of rounds
        // to avoid infinite loops (e.g., a NOT gate looping back to itself)

        let round = 0
        const roundLimit = 1000
        do {
            round++
            if (round >= roundLimit) {
                console.warn(`ERROR: Circular dependency; suspending updates after ${roundLimit} recalc/propagate rounds`)
                for (const comp of [...this._propagateQueue, ...this._recalcQueue.map((r) => r[0])]) {
                    comp.setInvalid()
                }
                this._propagateQueue = []
                this._recalcQueue = []
                break
            }

            // console.log(`Recalc/propagate round ${round}: ${this._propagateQueue.length} propagate, ${this._recalcQueue.length} recalc.`)

            const propagateQueue = this._propagateQueue
            this._propagateQueue = []
            // console.log(`  PROPAG (${propagateQueue.length}) – ` + propagateQueue.map((c) => c.toString()).join("; "))
            for (const comp of propagateQueue) {
                comp.propagateCurrentValue()
            }

            const recalcQueue = this._recalcQueue
            this._recalcQueue = []
            // console.log(`  RECALC (${recalcQueue.length}) – ` + recalcQueue.map((c) => c.toString()).join("; "))
            for (const [comp, forcePropagate] of recalcQueue) {
                comp.recalcValue(forcePropagate)
            }

        } while (!this.queueIsEmpty())

        // console.log(`Recalc/propagate done in ${round} rounds.`)
    }

}
