import { binaryStringRepr, isAllZeros, isArray, isDefined, isRecord, isString, isUndefined, toLogicValue } from "./utils"

export const CurrentFormatVersion = 5

export function migrateData(data: Record<string, unknown>) {
    // console.log("BEFORE:\n" + (isString(content) ? content : JSON.stringify(content)))

    // TODO also apply migration to defs
    let jsonVersion = Number(data["v"]) ?? 0
    const savedVersion = jsonVersion
    while (jsonVersion < CurrentFormatVersion) {
        const migrationFunc = migrateTo[jsonVersion]

        // migrate the outer container
        migrationFunc(data)

        // try to migrate the inner circuit descriptions of the custom components
        const defs = data.defs
        if (isArray(defs)) {
            for (const def of defs) {
                const circuit = def.circuit
                if (isRecord(circuit)) {
                    migrationFunc(circuit)
                }
            }
        }

        // bump version
        jsonVersion++
    }
    if (jsonVersion !== savedVersion) {
        console.log(`Migrated data format from v${savedVersion} to v${jsonVersion}, consider upgrading the source`)
        // console.log("AFTER:\n" + this.stringifyObject(parsedContents, false))
    }
    if (jsonVersion > CurrentFormatVersion) {
        console.log(`WARNING: data format v${jsonVersion} is newer than the current v${CurrentFormatVersion}, make sure the editor saves in the correct format`)
    }
}

// Migration functions

const migrateTo: Record<number, (container: Record<string, unknown>) => void> = {

    1: (container) => {
        // all displays are now out
        if ("displays" in container) {
            const displays = container.displays
            delete container.displays
            if (!("out" in container)) {
                container.out = []
            }
            if (isArray(displays) && isArray(container.out)) {
                for (const display of displays) {
                    container.out.push(display)
                }
            }
        }

        // all clocks are now in
        if ("clocks" in container) {
            const clocks = container.clocks
            delete container.clocks
            if (!("in" in container)) {
                container.in = []
            }
            if (isArray(clocks) && isArray(container.in)) {
                for (const clock of clocks) {
                    clock.type = "clock"
                    container.in.push(clock)
                }
            }
        }

        // flipflops have a different input node order
        const components = container.components
        if (isArray(components)) {
            for (const comp of components) {
                let type
                if (isString(type = comp.type) && type.startsWith("flipflop")) {
                    // extract last three inputs
                    const inputs: Array<number> = comp.in
                    const lastThree = inputs.splice(-3)
                    comp.in = [...lastThree, ...inputs]
                }
            }
        }
    },


    2: (container) => {
        // waypoints -> via
        const wires = container.wires
        if (isArray(wires)) {
            for (const wire of wires) {
                if (isArray(wire) && wire.length === 3) {
                    const wireOptions = wire[2]
                    if ("waypoints" in wireOptions) {
                        wireOptions.via = wireOptions.waypoints
                        delete wireOptions.waypoints
                    }
                }
            }
        }
    },


    3: (container) => {
        // alu has one more input
        let nextNewId = findFirstFreeId(container)
        const components = container.components
        if (isArray(components)) {
            for (const comp of components) {
                if (comp.type === "alu") {
                    if (isArray(comp.in)) {
                        comp.in.push(nextNewId++)
                    }
                }
            }
        }
    },


    4: (container) => {
        let nextNewId = findFirstFreeId(container)

        // correct type of 4-bit display
        const outs = container.out
        if (isArray(outs)) {
            for (const out of outs) {
                if (out.type === "nibble") {
                    out.type = "nibble-display"
                }
            }
        }

        // alu has one more output
        const components = container.components
        if (isArray(components)) {
            for (const comp of components) {
                if (comp.type === "alu") {
                    if (isArray(comp.out)) {
                        comp.out.push(nextNewId++) // add a new oVerflow output
                        // replace carry output with overflow output as it was wrongly used before
                        const t = comp.out[4]
                        comp.out[4] = comp.out[6]
                        comp.out[6] = t
                    }
                }
            }
        }
    },


    5: (container) => {
        let type
        let match: RegExpExecArray | null

        // replace all hard-coded length types with parameterized types
        const ins = container.in
        if (isArray(ins)) {
            for (const in_ of ins) {
                if (isString(type = in_.type)) {

                    if (type === "nibble") {
                        delete in_.type
                        in_.bits = 4

                    } else if (type === "byte") {
                        delete in_.type
                        in_.bits = 8
                    }
                }
            }
        }

        const outs = container.out
        if (isArray(outs)) {
            for (const out of outs) {
                if (isString(type = out.type)) {

                    if (type === "nibble") {
                        delete out.type
                        out.bits = 4

                    } else if (type === "byte") {
                        delete out.type
                        out.bits = 8

                    } else if (type === "nibble-display") {
                        out.type = "display"
                        out.bits = 4

                    } else if (type === "byte-display") {
                        out.type = "display"
                        out.bits = 8

                    } else if (type === "shiftbuffer") {
                        out.type = "shift-buffer"
                    }
                }
            }
        }

        const gates = container.gates
        if (isArray(gates)) {
            for (const gate of gates) {
                if (isString(type = gate.type)) {

                    const lastChar = type[type.length - 1]
                    const maybeBit = parseInt(lastChar)
                    if (!isNaN(maybeBit)) {
                        gate.bits = maybeBit
                        gate.type = type.slice(0, -1)
                    }
                }
            }
        }

        const components = container.components
        if (isArray(components)) {

            const ramRegex = /^ram-(?<lines>\d+)x(?<bits>\d+)$/
            const muxRegex = /^mux-(?<from>\d+)to(?<to>\d+)$/
            const demuxRegex = /^demux-(?<from>\d+)to(?<to>\d+)$/

            for (const comp of components) {
                if (isString(type = comp.type)) {

                    if (type === "register") {
                        // register.state -> register.content
                        let state
                        if (isArray(state = comp.state)) {
                            const binStr = binaryStringRepr(state.map(toLogicValue) as any)
                            if (!isAllZeros(binStr)) {
                                comp.content = binStr
                            }
                            delete comp.state
                        }

                    } else if (type === "quad-gate") {
                        comp.type = "gate-array"

                    } else if (type === "quad-tristate") {
                        comp.type = "tristate-array"

                    } else if ((match = ramRegex.exec(type)) !== null) {
                        comp.type = "ram"
                        comp.bits = parseInt(match.groups?.bits ?? "4")
                        comp.lines = parseInt(match.groups?.lines ?? "16")

                    } else if ((match = muxRegex.exec(type)) !== null) {
                        comp.type = "mux"
                        comp.from = parseInt(match.groups?.from ?? "8")
                        comp.to = parseInt(match.groups?.to ?? "4")

                    } else if ((match = demuxRegex.exec(type)) !== null) {
                        comp.type = "demux"
                        comp.from = parseInt(match.groups?.from ?? "4")
                        comp.to = parseInt(match.groups?.to ?? "8")

                    }
                }
            }

            container.ic = components
            delete container.components
        }

        const layouts = container.layout
        if (isArray(layouts)) {

            const passthroughRegex = /^pass-(?<bits>\d+)$/

            for (const layout of layouts) {
                if (isString(type = layout.type)) {

                    if ((match = passthroughRegex.exec(type)) !== null) {
                        layout.type = "pass"
                        layout.bits = parseInt(match.groups?.bits ?? "1")
                    }
                }
            }
        }
    },

}


// Migration helpers

function findFirstFreeId(parsedContents: Record<string, unknown>): number {
    // this finds the maximum id of all components on raw (but parsed) JSON;
    // it is useful for migration code that needs to generate new ids

    let maxId = -1

    function inspectComponentDef(compDef: Record<string, unknown>) {
        for (const fieldName of ["id", "in", "out"]) {
            inspectValue(compDef[fieldName])
        }
    }

    function inspectValue(value: unknown) {
        if (isUndefined(value)) {
            return
        }
        if (typeof value === "number") {
            if (!isNaN(value) && isFinite(value)) {
                maxId = Math.max(maxId, value)
            }
        } else if (typeof value === "string") {
            for (const val of value.split("-")) {
                inspectValue(parseInt(val))
            }
        } else if (isArray(value)) {
            for (const item of value) {
                inspectValue(item)
            }
        } else if (typeof value === "object" && value !== null) {
            inspectValue((value as Record<string, unknown>).id)
        }
    }

    for (const jsonField of Object.keys(parsedContents)) {
        const arr = parsedContents[jsonField]
        if (isDefined(arr) && isArray(arr)) {
            for (const comp of arr) {
                inspectComponentDef(comp)
            }
        }
    }

    return maxId + 1
}
