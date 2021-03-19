export const GRID_STEP = 10

export function pxToGrid(x: number) {
    return Math.round(x / GRID_STEP)
}

export interface HasPosition {

    readonly posX: number
    readonly posY: number

}

export abstract class PositionSupport implements HasPosition {

    private _posX: number = mouseX
    private _posY: number = mouseY

    protected constructor(
    ) {
        // nothing else to do
    }

    public get posX() {
        return this._posX
    }

    public get posY() {
        return this._posY
    }

    protected updatePosition(posX: number, posY: number, snapToGrid: boolean) {
        if (snapToGrid) {
            posX = Math.round(posX / GRID_STEP) * GRID_STEP
            posY = Math.round(posY / GRID_STEP) * GRID_STEP
        }
        this._posX = posX
        this._posY = posY
        return [posX, posY] as const
    }

}

export abstract class Component extends PositionSupport {

}
