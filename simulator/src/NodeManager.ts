import { Component } from "./components/Component"
import { Node } from "./components/Node"
import { isDefined, isUndefined } from "./utils"



export class NodeManager {

    private lastGivenNodeID = -1
    private usedIDs = new Set<number>()
    private allLiveNodes: Node[] = []

    newID(): number {
        while (this.usedIDs.has(++this.lastGivenNodeID)) {
            // empty block, condition does the increment
        }
        this.usedIDs.add(this.lastGivenNodeID)
        // console.log(`gave out new node id ${lastGivenNodeID}`)
        return this.lastGivenNodeID
    }

    markIDUsed(id: number): void {
        if (this.usedIDs.has(id)) {
            console.warn(`WARN: loaded node with id ${id}, which is already taken`)
        }
        this.usedIDs.add(id)
    }

    addLiveNode(node: Node) {
        if (!this.usedIDs.has(node.id)) {
            console.warn(`WARN inserting live node with unreserved id ${node.id}`)
        }
        this.allLiveNodes[node.id] = node
    }

    removeLiveNode(node: Node) {
        delete this.allLiveNodes[node.id]
        this.usedIDs.delete(node.id)
    }

    clearAllLiveNodes() {
        this.allLiveNodes.splice(0, this.allLiveNodes.length)
        this.usedIDs.clear()
        this.lastGivenNodeID = -1
    }

    findNode(nodeID: number): Node | undefined {
        return this.allLiveNodes[nodeID]
    }

    tryConnectNodesOf(comp: Component) {
        const wireMgr = comp.editor.wireMgr
        const addedConnections: [Node, Component, Node][] = []
        comp.forEachNode(node => {
            if (node.acceptsMoreConnections) {
                const nodeX = node.posX
                const nodeY = node.posY
                const parent = node.parent
                for (const other of this.allLiveNodes) {
                    if (!isUndefined(other) && other.parent !== parent && other.acceptsMoreConnections) {
                        if (other.posX === nodeX && other.posY === nodeY) {
                            // the wire manager will take care of determining whether
                            // they can actually be connected or not
                            wireMgr.addNode(node)
                            const wire = wireMgr.addNode(other)
                            if (isDefined(wire)) {
                                addedConnections.push([node, other.parent as Component, other])
                            }
                        }
                    }
                }
            }
            return true
        })
        return addedConnections
    }

}


