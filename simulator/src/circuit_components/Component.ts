import { backToEdit, currMouseAction } from "../menutools.js"
import { isCmdDown, isDefined, isNotNull, isUndefined, mode, NodeArrayOfLength, startedMoving, stoppedMoving, wireMng } from "../simulator.js"
import { Mode, MouseAction } from "./Enums.js"
import { ConnectionState, Node } from "./Node.js"

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
export interface ComponentRepr {
    readonly id: number
    readonly pos: readonly [number, number]
}

export abstract class PositionSupport implements HasPosition {

    private _posX: number
    private _posY: number

    protected constructor(savedData: ComponentRepr | null) {
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

export enum ComponentState {
    SPAWNING,
    SPAWNED,
    DEAD
}


export type IDGen = () => number

const allLiveNodes: Node[] = []

export function addLiveNode(node: Node) {
    allLiveNodes[node.id] = node
}

export function removeLiveNode(node: Node) {
    delete allLiveNodes[node.id]
}

export function clearLiveNodes() {
    allLiveNodes.splice(0, allLiveNodes.length)
}

export function findNode(nodeID: number): Node | undefined {
    return allLiveNodes[nodeID]
}

export function tryConnectNodes() {
    let exitOnNextComponent = false
    for (const node of allLiveNodes) {
        if (node.acceptsMoreConnections) {
            const component = node.parent
            if (component.state === ComponentState.SPAWNING || component.isMoving) {
                exitOnNextComponent = true
                const nodeX = node.posX
                const nodeY = node.posY
                for (const other of allLiveNodes) {
                    if (other !== node && other.posX === nodeX && other.posY === nodeY && other.acceptsMoreConnections) {
                        wireMng.addNode(node)
                        wireMng.addNode(other)
                        return
                    }
                }
            } else if (exitOnNextComponent) {
                return
            }
        }
    }
}

const nodeIDManager = (() => {
    let nextNodeId = 0
    return {
        setNext(newNextNodeId: number) {
            if (newNextNodeId < nextNodeId) {
                console.log(`WARN: New next node ID ${newNextNodeId} is smaller than current one ${nextNodeId}`)
            }
            nextNodeId = newNextNodeId
        },
        genID: function () {
            return nextNodeId++
        },
    }
})()


export type Component = ComponentBase<any, any, any>

export abstract class ComponentBase<
    NumInput extends number,
    NumOutputs extends number,
    Repr extends ComponentRepr> extends PositionSupport {

    private readonly firstNodeID: number
    private _state: ComponentState
    private _isMovingWithMouseOffset: undefined | [number, number] = undefined
    protected readonly inputs: NodeArrayOfLength<NumInput>
    protected readonly outputs: NodeArrayOfLength<NumOutputs>

    protected constructor(savedData: Repr | null) {
        super(savedData)

        if (isNotNull(savedData)) {
            this._state = ComponentState.SPAWNED
            nodeIDManager.setNext(savedData.id)
        } else {
            this._state = ComponentState.SPAWNING
            startedMoving(this)
        }

        [this.inputs, this.outputs] = this.makeNodes(nodeIDManager.genID)
        this.firstNodeID = (() => {
            if (this.inputs.length > 0) {
                return (this.inputs as NodeArrayOfLength<1>)[0].id
            }
            if (this.outputs.length > 0) {
                return (this.outputs as NodeArrayOfLength<1>)[0].id
            }
            return -1
        })()
    }

    protected abstract makeNodes(genID: IDGen): readonly [NodeArrayOfLength<NumInput>, NodeArrayOfLength<NumOutputs>]

    public abstract toJSON(): Repr

    protected toJSONBase(): ComponentRepr {
        return {
            id: this.firstNodeID,
            pos: [this.posX, this.posY] as const,
        }
    }

    private get allNodes(): Node[] {
        return [...this.inputs, ...this.outputs]
    }

    public get state() {
        return this._state
    }

    public get isMoving() {
        return isDefined(this._isMovingWithMouseOffset)
    }

    protected updatePositionIfNeeded(): undefined | [number, number] {
        const newPos = this.updateSelfPositionIfNeeded()
        const posChanged = isDefined(newPos)
        if (posChanged) {
            for (const node of this.allNodes) {
                node.updatePositionFromParent()
            }
        }
        return newPos
    }

    protected updateSelfPositionIfNeeded(): undefined | [number, number] {
        const snapToGrid = !isCmdDown
        if (this._state === ComponentState.SPAWNING) {
            return this.setPosition(mouseX, mouseY, snapToGrid)
        }
        if (isDefined(this._isMovingWithMouseOffset)) {
            const [mouseOffsetX, mouseOffsetY] = this._isMovingWithMouseOffset
            const changedPos = this.setPosition(mouseX + mouseOffsetX, mouseY + mouseOffsetY, snapToGrid)
            if (isDefined(changedPos)) {
                startedMoving(this)
            }
            return changedPos
        }
        return undefined
    }

    mousePressed() {
        if (this._state === ComponentState.SPAWNING) {
            const snapToGrid = !isCmdDown
            this.setPosition(mouseX, mouseY, snapToGrid)
            this._state = ComponentState.SPAWNED
            stoppedMoving(this)
            backToEdit()
            return
        }

        if (mode >= Mode.CONNECT && (currMouseAction === MouseAction.MOVE || this.isMouseOver())) {
            if (isUndefined(this._isMovingWithMouseOffset)) {
                this._isMovingWithMouseOffset = [this.posX - mouseX, this.posY - mouseY]
            }
        }
    }

    mouseReleased() {
        if (isDefined(this._isMovingWithMouseOffset)) {
            this._isMovingWithMouseOffset = undefined
            stoppedMoving(this)
        }
    }

    destroy() {
        this._state = ComponentState.DEAD
        for (const node of this.allNodes) {
            node.destroy()
        }
    }

    public abstract isMouseOver(): boolean

    // TODO implement mouseClicked here?
    public abstract mouseClicked(): boolean

}

export const INPUT_OUTPUT_DIAMETER = 25
