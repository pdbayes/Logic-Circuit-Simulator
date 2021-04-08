import { Component } from "./components/Component"
import { Drawable } from "./components/Drawable"
import { Dict, isUndefined, isEmptyObject, isDefined, isNotNull } from "./utils"

export const RedrawManager = (() => {
    let _canvasRedrawReasons: Dict<unknown[]> = {}

    return {
        addReason(reason: string, comp: Drawable | null) {
            const compObj = comp
            const compList = _canvasRedrawReasons[reason]
            if (isUndefined(compList)) {
                _canvasRedrawReasons[reason] = [compObj]
            } else {
                compList.push(compObj)
            }
        },

        getReasonsAndClear(): string | undefined {
            if (isEmptyObject(_canvasRedrawReasons)) {
                return undefined
            }

            const reasonParts: string[] = []
            for (const reason of Object.keys(_canvasRedrawReasons)) {
                reasonParts.push(reason)
                const linkedComps = _canvasRedrawReasons[reason]!
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

            _canvasRedrawReasons = {}

            return reasonParts.join("")
        },
    }
})()


export const RecalcManager = (() => {

    const _componentNeedingRecalc = new Set<Component>()

    function recalculate() {
        // const recalculated = new Set<Component>()

        let round = 1
        do {
            const toRecalc = new Set<Component>(_componentNeedingRecalc)
            console.log(`Recalc round ${round}: ` + [...toRecalc].map((c) => c.toString()).join(", "))
            _componentNeedingRecalc.clear()
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
        } while (_componentNeedingRecalc.size !== 0)
    }

    return {
        addComponentNeedingRecalc(comp: Component) {
            _componentNeedingRecalc.add(comp)
            // console.log("Need recalc:", _componentNeedingRecalc)
        },
        recalculateIfNeeded(): boolean {
            if (_componentNeedingRecalc.size !== 0) {
                recalculate()
                return true
            }
            return false
        },
    }
})()