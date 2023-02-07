import { Component } from "./components/Component"
import { FixedArrayFillFactory } from "./utils"

export const ZIndexBackground = 0
export const ZIndexNormal = 1
export const ZIndexOverlay = 2

export type DrawZIndex = typeof ZIndexBackground | typeof ZIndexNormal | typeof ZIndexOverlay

export class ComponentList {

    // eslint-disable-next-line @typescript-eslint/semi
    private _componentsByZIndex = FixedArrayFillFactory((__i) => [] as Component[], 3);

    public *all() {
        for (const compList of this._componentsByZIndex) {
            for (const comp of compList) {
                yield comp
            }
        }
    }

    public *allInReversedZIndexOrder() {
        for (let i = this._componentsByZIndex.length - 1; i >= 0; i--) {
            const compList = this._componentsByZIndex[i]
            for (const comp of compList) {
                yield comp
            }
        }
    }

    public *withZIndex(zIndex: DrawZIndex) {
        for (const comp of this._componentsByZIndex[zIndex]) {
            yield comp
        }
    }

    public add(comp: Component) {
        const z = comp.drawZIndex
        this._componentsByZIndex[z].push(comp)
    }

    public tryDeleteWhere(cond: (e: Component) => boolean) {
        let compDeleted = false
        for (const compList of this._componentsByZIndex) {
            for (let i = 0; i < compList.length; i++) {
                const comp = compList[i]
                if (cond(comp)) {
                    comp.destroy()
                    compList.splice(i, 1)
                    compDeleted = true
                }
            }
        }
        return compDeleted
    }

    public clearAll() {
        for (const compList of this._componentsByZIndex) {
            compList.splice(0, compList.length)
        }
    }


}
