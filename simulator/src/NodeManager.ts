import { Component } from "./components/Component"
import { Node } from "./components/Node"



export class NodeManager {

    private lastGivenNodeID = -1
    private usedIDs = new Set<number>()
    private allLiveNodes: Node[] = []

    public newID(): number {
        while (this.usedIDs.has(++this.lastGivenNodeID)) {
            // empty block, condition does the increment
        }
        this.usedIDs.add(this.lastGivenNodeID)
        // console.log(`gave out new node id ${lastGivenNodeID}`)
        return this.lastGivenNodeID
    }

    public markIDUsed(id: number): void {
        if (this.usedIDs.has(id)) {
            console.error(`Loaded node with id ${id}, which is already taken`)
        }
        this.usedIDs.add(id)
    }

    public addLiveNode(node: Node) {
        if (!this.usedIDs.has(node.id)) {
            console.error(`Inserting live node with unreserved id ${node.id}`)
        }
        this.allLiveNodes[node.id] = node
    }

    public removeLiveNode(node: Node) {
        delete this.allLiveNodes[node.id]
        this.usedIDs.delete(node.id)
    }

    public clearAllLiveNodes() {
        this.allLiveNodes.splice(0, this.allLiveNodes.length)
        this.usedIDs.clear()
        this.lastGivenNodeID = -1
    }

    public findNode(nodeID: number): Node | undefined {
        return this.allLiveNodes[nodeID]
    }

    public tryConnectNodesOf(comp: Component) {
        const wireMgr = comp.parent.wireMgr
        const addedConnections: [Node, Component, Node][] = []
        for (const node of comp.allNodes()) {
            if (node.acceptsMoreConnections) {
                const nodeX = node.posX
                const nodeY = node.posY
                const component = node.component
                for (const other of this.allLiveNodes) {
                    if (other !== undefined && other.component !== component && other.acceptsMoreConnections) {
                        if (other.posX === nodeX && other.posY === nodeY) {
                            // the wire manager will take care of determining whether
                            // they can actually be connected or not
                            wireMgr.startDraggingFrom(node)
                            const wire = wireMgr.stopDraggingOn(other)
                            if (wire !== undefined) {
                                addedConnections.push([node, other.component, other])
                            }
                        }
                    }
                }
            }
        }
        return addedConnections
    }

}
