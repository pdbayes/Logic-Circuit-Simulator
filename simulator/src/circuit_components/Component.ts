const GRID_STEP = 10

export abstract class Component {

    protected posX: number = mouseX
    protected posY: number = mouseY

    protected constructor(
    ) {
        // nothing else to do
    }

    protected snapToGrid() {
        this.posX = Math.round(this.posX / GRID_STEP) * GRID_STEP
        this.posY = Math.round(this.posY / GRID_STEP) * GRID_STEP
    }


}
