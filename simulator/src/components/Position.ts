import { isNotNull } from "../utils.js"
import * as t from "io-ts"

export const GRID_STEP = 10

export function pxToGrid(x: number) {
    return Math.round(x / GRID_STEP)
}

// implemented by components with no array to hold the members
// for direct access for performance
export interface HasPosition {

    readonly posX: number
    readonly posY: number

}

// for compact JSON repr, pos is an array
export const PositionSupportRepr = t.type({
    pos: t.readonly(t.tuple([t.number, t.number])),
})
export type PositionSupportRepr = t.TypeOf<typeof PositionSupportRepr>

export abstract class PositionSupport implements HasPosition {

    private _posX: number
    private _posY: number

    protected constructor(savedData: PositionSupportRepr | null) {
        // using null and not undefined to prevent subclasses from
        // unintentionally skipping the parameter

        if (isNotNull(savedData)) {
            // restoring from saved object
            this._posX = savedData.pos[0]
            this._posY = savedData.pos[1]
        } else {
            // creating new object
            this._posX = mouseX
            this._posY = mouseY
        }
    }

    public get posX() {
        return this._posX
    }

    public get posY() {
        return this._posY
    }

    protected setPosition(posX: number, posY: number, snapToGrid: boolean): undefined | [number, number] {
        if (snapToGrid) {
            posX = Math.round(posX / GRID_STEP) * GRID_STEP
            posY = Math.round(posY / GRID_STEP) * GRID_STEP
        }
        if (posX !== this._posX || posY !== this.posY) {
            this._posX = posX
            this._posY = posY
            return [posX, posY]
        }
        return undefined
    }

}
