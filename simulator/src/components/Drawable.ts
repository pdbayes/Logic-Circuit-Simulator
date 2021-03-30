import { isNotNull } from "../utils"
import * as t from "io-ts"
import { GRID_STEP } from "../drawutils"
import { setCanvasNeedsRedraw } from "../simulator"


export abstract class Drawable {

    // private _needsRedraw = false

    protected constructor() {
        this.setNeedsRedraw()
    }

    protected setNeedsRedraw() {
        // this._needsRedraw = true
        setCanvasNeedsRedraw()
    }

    public draw(mouseOverComp: Drawable | null /*, __force: boolean*/) {
        // if (force || this._needsRedraw) {
        const isMouseOver = this === mouseOverComp
        // console.log("Drawing", this, isMouseOver)
        this.doDraw(isMouseOver)
        //     this._needsRedraw = false
        // }
    }

    protected abstract doDraw(isMouseOver: boolean): void

    public abstract isOver(x: number, y: number): boolean

    public get cursorWhenMouseover(): string | undefined {
        return undefined
    }

    toString(): string {
        return `${this.constructor.name}(${this.toStringDetails()})`
    }

    protected toStringDetails(): string {
        return ""
    }

    // Return { lockMouseOver: true } (default) to signal the component
    // wants to get all mouseDragged and the final mouseUp event. Useful to
    // return false to allow drag destinations to get a mouseUp
    public mouseDown(__: MouseEvent | TouchEvent): { lockMouseOver: boolean } {
        // empty default implementation
        return { lockMouseOver: true }
    }

    public mouseDragged(__: MouseEvent | TouchEvent) {
        // empty default implementation
    }

    public mouseUp(__: MouseEvent | TouchEvent) {
        // empty default implementation
    }

    public mouseDoubleClick(__: MouseEvent | TouchEvent) {
        // empty default implementation
    }

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

export abstract class DrawableWithPosition extends Drawable implements HasPosition {

    private _posX: number
    private _posY: number

    protected constructor(savedData: PositionSupportRepr | null) {
        super()

        // using null and not undefined to prevent subclasses from
        // unintentionally skipping the parameter

        if (isNotNull(savedData)) {
            // restoring from saved object
            this._posX = savedData.pos[0]
            this._posY = savedData.pos[1]
        } else {
            // creating new object
            this._posX = Math.max(0, mouseX)
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
