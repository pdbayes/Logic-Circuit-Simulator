import { Component } from "./components/Component"
import { Drawable } from "./components/Drawable"
import { Dict, isUndefined, isEmptyObject, isDefined, isNotNull } from "./utils"

class _RedrawManager {

    private _canvasRedrawReasons: Dict<unknown[]> = {}

    public addReason(reason: string, comp: Drawable | null) {
        const compObj = comp
        const compList = this._canvasRedrawReasons[reason]
        if (isUndefined(compList)) {
            this._canvasRedrawReasons[reason] = [compObj]
        } else {
            compList.push(compObj)
        }
    }

    public getReasonsAndClear(): string | undefined {
        if (isEmptyObject(this._canvasRedrawReasons)) {
            return undefined
        }

        const reasonParts: string[] = []
        for (const reason of Object.keys(this._canvasRedrawReasons)) {
            reasonParts.push(reason)
            const linkedComps = this._canvasRedrawReasons[reason]!
            reasonParts.push(" (", String(linkedComps.length), "×)", ": ")
            for (const comp of linkedComps) {
                if (isNotNull(comp)) {
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
        return reasonParts.join("")
    }
}
export const RedrawManager = new _RedrawManager()


class _RecalcManager {

    private _componentNeedingRecalc = new Set<Component>()

    public addComponentNeedingRecalc(comp: Component) {
        this._componentNeedingRecalc.add(comp)
        // console.log("Need recalc:", _componentNeedingRecalc)
    }

    public recalculateIfNeeded(): boolean {
        if (this._componentNeedingRecalc.size !== 0) {
            this.recalculate()
            return true
        }
        return false
    }

    private recalculate() {
        // const recalculated = new Set<Component>()

        let round = 1
        do {
            const toRecalc = new Set<Component>(this._componentNeedingRecalc)
            // console.log(`Recalc round ${round}: ` + [...toRecalc].map((c) => c.toString()).join(", "))
            this._componentNeedingRecalc.clear()
            toRecalc.forEach((comp) => {
                // if (!recalculated.has(comp)) {
                comp.recalcValue()
                //     recalculated.add(comp)
                // } else {
                //     console.log("ERROR circular dependency")
                // }
            })

            round++

            // TODO smarter circular dependency tracking
            if (round > 1000) {
                console.log("ERROR circular dependency")
                break
            }
        } while (this._componentNeedingRecalc.size !== 0)
    }

}

export const RecalcManager = new _RecalcManager()
