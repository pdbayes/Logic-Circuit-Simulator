import { Component } from "./components/Component"
import { Node } from "./components/Node"
import { wireMgr } from "./simulator"


export const NodeManager = (() => {
    let lastGivenNodeID = -1
    const usedIDs = new Set<number>()
    const allLiveNodes: Node[] = []

    return {
        newID: function (): number {
            while (usedIDs.has(++lastGivenNodeID)) {
                // empty block, condition does the increment
            }
            usedIDs.add(lastGivenNodeID)
            // console.log(`gave out new node id ${lastGivenNodeID}`)
            return lastGivenNodeID
        },
        markIDUsed: function (id: number): void {
            if (usedIDs.has(id)) {
                console.warn(`WARN: loaded node with id ${id}, which is already taken`)
            }
            usedIDs.add(id)
        },

        addLiveNode: function (node: Node) {
            if (!usedIDs.has(node.id)) {
                console.warn(`WARN inserting live node with unreserved id ${node.id}`)
            }
            allLiveNodes[node.id] = node
        },

        removeLiveNode: function (node: Node) {
            delete allLiveNodes[node.id]
            usedIDs.delete(node.id)
        },

        clearAllLiveNodes: function () {
            allLiveNodes.splice(0, allLiveNodes.length)
            usedIDs.clear()
            lastGivenNodeID = -1
        },

        findNode: function (nodeID: number): Node | undefined {
            return allLiveNodes[nodeID]
        },

        tryConnectNodesOf: function (comp: Component) {
            comp.forEachNode(node => {
                if (node.acceptsMoreConnections) {
                    const nodeX = node.posX
                    const nodeY = node.posY
                    const parent = node.parent
                    for (const other of allLiveNodes) {
                        if (other.parent !== parent && other.acceptsMoreConnections) {
                            if (other.posX === nodeX && other.posY === nodeY) {
                                // the wire manager will take care of determining whether
                                // they can actually be connected or not
                                wireMgr.addNode(node)
                                wireMgr.addNode(other)
                            }
                        }
                    }
                }
                return true
            })
        },

    }
})()


