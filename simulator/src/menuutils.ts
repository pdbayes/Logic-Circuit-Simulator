import * as t from "io-ts"
import { Branded } from "io-ts"
import { AdderArrayDef } from "./components/AdderArray"
import { ALUDef } from "./components/ALU"
import { DemuxDef } from "./components/Demux"
import { GateNDef } from "./components/Gate"
import { GateArrayDef } from "./components/GateArray"
import { InputDef } from "./components/Input"
import { InputRandomDef } from "./components/InputRandom"
import { MuxDef } from "./components/Mux"
import { OutputDef } from "./components/Output"
import { OutputDisplayDef } from "./components/OutputDisplay"
import { PassthroughDef } from "./components/Passthrough"
import { RAMDef } from "./components/RAM"
import { RegisterDef } from "./components/Register"
import { ShiftRegisterDef } from "./components/ShiftRegister"
import { a, button, cls, dataClassId, dataComponent, dataParams, dataType, div, emptyMod, raw, span, style, title, type } from "./htmlgen"
import { ImageName, makeImage } from "./images"
import { S, Strings } from "./strings"
import { brand, deepObjectEquals, isDefined, isString, isUndefined } from "./utils"

type ComponentKey = Strings["ComponentBar"]["Components"]["type"]

type ComponentDef<TParams> = {
    variantName: (params: TParams) => string,
    defaultParams: TParams, repr: t.Mixed,
}

type DefAndParams<TParams> = {
    def: ComponentDef<TParams>,
    params: TParams
}

type ComponentItem = {
    type: string // TODO better types for this
    subtype?: string
    params?: Branded<DefAndParams<any>, "params">
    strings: ComponentKey
    variantNameCompat?: string // for compatibility with old URL params
    img: ImageName
    width: number
    normallyHidden?: boolean
}


function forDef<TParams>(def: ComponentDef<TParams>,
    params: TParams): Branded<DefAndParams<TParams>, "params"> {
    return brand<"params">()({ def, params })
}

type SectionNameKey = keyof Strings["ComponentBar"]["SectionNames"]

type Section = {
    nameKey: SectionNameKey,
    items: Array<ComponentItem>
}

const componentsMenu: Array<Section> = [
    {
        nameKey: "InputOutput",
        items: [
            {
                type: "in", strings: "Input1", img: "Input1", width: 32,
            },
            {
                type: "out", strings: "Output1", img: "Output1", width: 32,
            },
            {
                type: "out", subtype: "bar",
                strings: "OutputBar", img: "OutputBar", width: 32,
                normallyHidden: true,
            },
            {
                type: "in", subtype: "clock",
                strings: "Clock", img: "Clock", width: 50,
            },
            {
                type: "in",
                params: forDef(InputDef, { bits: 4 }),
                strings: "Input4", img: "Input4", width: 32,
                variantNameCompat: "in.nibble",
            },
            {
                type: "out",
                params: forDef(OutputDef, { bits: 4 }),
                strings: "Output4", img: "Output4", width: 32,
                variantNameCompat: "out.nibble",
            },
            {
                type: "out", subtype: "display",
                params: forDef(OutputDisplayDef, { bits: 4 }),
                strings: "OutputDisplay4", img: "OutputDisplay4", width: 32,
                variantNameCompat: "out.nibble-display",
            },
            {
                type: "in",
                params: forDef(InputDef, { bits: 8 }),
                strings: "Input8", img: "Input8", width: 32,
                variantNameCompat: "in.byte",
                normallyHidden: true,
            },
            {
                type: "out",
                params: forDef(OutputDef, { bits: 8 }),
                strings: "Output8", img: "Output8", width: 32,
                variantNameCompat: "out.byte",
                normallyHidden: true,
            },
            {
                type: "out", subtype: "display",
                params: forDef(OutputDisplayDef, { bits: 8 }),
                strings: "OutputDisplay8", img: "OutputDisplay8", width: 32,
                variantNameCompat: "out.byte-display",
                normallyHidden: true,
            },
            {
                type: "out", subtype: "7seg",
                strings: "Output7Seg", img: "Output7Seg", width: 32,
                normallyHidden: true,
            },
            {
                type: "out", subtype: "16seg",
                strings: "Output16Seg", img: "Output16Seg", width: 32,
                normallyHidden: true,
            },
            {
                type: "out", subtype: "ascii",
                strings: "OutputAscii", img: "OutputAscii", width: 32,
                normallyHidden: true,
            },
            {
                type: "in", subtype: "random",
                params: forDef(InputRandomDef, { bits: 1 }),
                strings: "InputRandom", img: "InputRandom", width: 32,
                normallyHidden: true,
            },
            {
                type: "out", subtype: "shift-buffer",
                strings: "OutputShiftBuffer", img: "OutputShiftBuffer", width: 50,
                normallyHidden: true,
            },
        ],
    },

    {
        nameKey: "Gates",
        items: [
            {
                type: "gate", subtype: "NOT",
                strings: "NOT", img: "NOT", width: 50,
            },
            {
                type: "gate", subtype: "BUF",
                strings: "BUF", img: "BUF", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "TRI",
                strings: "TRI", img: "TRI", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "AND",
                strings: "AND", img: "AND", width: 50,
            },
            {
                type: "gate", subtype: "OR",
                strings: "OR", img: "OR", width: 50,
            },
            {
                type: "gate", subtype: "XOR",
                strings: "XOR", img: "XOR", width: 50,
            },
            {
                type: "gate", subtype: "NAND",
                strings: "NAND", img: "NAND", width: 50,
            },
            {
                type: "gate", subtype: "NOR",
                strings: "NOR", img: "NOR", width: 50,
            },

            {
                type: "gate", subtype: "XNOR",
                strings: "XNOR", img: "XNOR", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "IMPLY",
                strings: "IMPLY", img: "IMPLY", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "NIMPLY",
                strings: "NIMPLY", img: "NIMPLY", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "TXA",
                strings: "TRANSFER", img: "TXA", width: 50,
                normallyHidden: true,
            },

            {
                type: "gate", subtype: "AND", 
                // TODO rework this menu-creation code to not need repeating the type
                params: forDef(GateNDef, { type: "AND", bits: 3 }),
                strings: "AND3", img: "AND3", width: 50,
                variantNameCompat: "AND3",
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "OR",
                params: forDef(GateNDef, { type: "OR", bits: 3 }),
                strings: "OR3", img: "OR3", width: 50,
                variantNameCompat: "OR3",
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "XOR",
                params: forDef(GateNDef, { type: "XOR", bits: 3 }),
                strings: "XOR3", img: "XOR3", width: 50,
                variantNameCompat: "XOR3",
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "NAND",
                params: forDef(GateNDef, { type: "NAND", bits: 3 }),
                strings: "NAND3", img: "NAND3", width: 50,
                variantNameCompat: "NAND3",
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "NOR",
                params: forDef(GateNDef, { type: "NOR", bits: 3 }),
                strings: "NOR3", img: "NOR3", width: 50,
                variantNameCompat: "NOR3",
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "XNOR",
                params: forDef(GateNDef, { type: "XNOR", bits: 3 }),
                strings: "XNOR3", img: "XNOR3", width: 50,
                variantNameCompat: "XNOR3",
                normallyHidden: true,
            },

            {
                type: "gate", subtype: "AND",
                params: forDef(GateNDef, { type: "AND", bits: 4 }),
                strings: "AND4", img: "AND4", width: 50,
                variantNameCompat: "AND4",
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "OR",
                params: forDef(GateNDef, { type: "OR", bits: 4 }),
                strings: "OR4", img: "OR4", width: 50,
                variantNameCompat: "OR4",
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "XOR",
                params: forDef(GateNDef, { type: "XOR", bits: 4 }),
                strings: "XOR4", img: "XOR4", width: 50,
                variantNameCompat: "XOR4",
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "NAND",
                params: forDef(GateNDef, { type: "NAND", bits: 4 }),
                strings: "NAND4", img: "NAND4", width: 50,
                variantNameCompat: "NAND4",
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "NOR",
                params: forDef(GateNDef, { type: "NOR", bits: 4 }),
                strings: "NOR4", img: "NOR4", width: 50,
                variantNameCompat: "NOR4",
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "XNOR",
                params: forDef(GateNDef, { type: "XNOR", bits: 4 }),
                strings: "XNOR4", img: "XNOR4", width: 50,
                variantNameCompat: "XNOR4",
                normallyHidden: true,
            },

            {
                type: "component", subtype: "switched-inverter",
                strings: "SwitchedInverter", img: "SwitchedInverter", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "gate-array",
                params: forDef(GateArrayDef, { bits: 4 }),
                strings: "GateArray", img: "GateArray", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "tristate-array",
                params: forDef(GateArrayDef, { bits: 4 }),
                strings: "TriStateBufferArray", img: "TriStateBufferArray", width: 50,
                normallyHidden: true,
            },

        ],
    },

    {
        nameKey: "Layout",
        items: [
            {
                type: "label", strings: "LabelString", img: "LabelString", width: 32,
            },
            {
                type: "label", subtype: "rect",
                strings: "LabelRectangle", img: "LabelRectangle", width: 32,
            },
            {
                type: "layout", subtype: "pass",
                params: forDef(PassthroughDef, { bits: 1 }),
                strings: "Passthrough1", img: "Passthrough1", width: 32,
            },
            {
                type: "layout", subtype: "pass",
                params: forDef(PassthroughDef, { bits: 4 }),
                strings: "Passthrough4", img: "Passthrough4", width: 32,
            },
            {
                type: "layout", subtype: "pass",
                params: forDef(PassthroughDef, { bits: 8 }),
                strings: "Passthrough8", img: "Passthrough8", width: 32,
                normallyHidden: true,
            },
        ],
    },


    {
        nameKey: "Components",
        items: [
            {
                type: "component", subtype: "halfadder",
                strings: "HalfAdder", img: "HalfAdder", width: 50,
            },
            {
                type: "component", subtype: "adder",
                strings: "Adder", img: "Adder", width: 50,
            },
            {
                type: "component", subtype: "adder-array",
                params: forDef(AdderArrayDef, { bits: 4 }),
                strings: "AdderArray4", img: "AdderArray", width: 50,
            },
            {
                type: "component", subtype: "alu",
                params: forDef(ALUDef, { bits: 4 }),
                strings: "ALU4", img: "ALU4", width: 50,
            },
            {
                type: "component", subtype: "alu",
                params: forDef(ALUDef, { bits: 8 }),
                strings: "ALU8", img: "ALU8", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux",
                params: forDef(MuxDef, { from: 2, to: 1 }),
                strings: "Mux2to1", img: "Mux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux",
                params: forDef(MuxDef, { from: 4, to: 1 }),
                strings: "Mux4to1", img: "Mux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux",
                params: forDef(MuxDef, { from: 8, to: 1 }),
                strings: "Mux8to1", img: "Mux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux",
                params: forDef(MuxDef, { from: 4, to: 2 }),
                strings: "Mux4to2", img: "Mux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux",
                params: forDef(MuxDef, { from: 8, to: 2 }),
                strings: "Mux8to2", img: "Mux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux",
                params: forDef(MuxDef, { from: 8, to: 4 }),
                strings: "Mux8to4", img: "Mux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux",
                params: forDef(MuxDef, { from: 16, to: 8 }),
                strings: "Mux16to8", img: "Mux", width: 50,
                normallyHidden: true,
            },

            {
                type: "component", subtype: "demux",
                params: forDef(DemuxDef, { from: 1, to: 2 }),
                strings: "Demux1to2", img: "Demux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "demux",
                params: forDef(DemuxDef, { from: 1, to: 4 }),
                strings: "Demux1to4", img: "Demux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "demux",
                params: forDef(DemuxDef, { from: 1, to: 8 }),
                strings: "Demux1to8", img: "Demux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "demux",
                params: forDef(DemuxDef, { from: 2, to: 4 }),
                strings: "Demux2to4", img: "Demux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "demux",
                params: forDef(DemuxDef, { from: 2, to: 8 }),
                strings: "Demux2to8", img: "Demux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "demux",
                params: forDef(DemuxDef, { from: 4, to: 8 }),
                strings: "Demux4to8", img: "Demux", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "demux",
                params: forDef(DemuxDef, { from: 8, to: 16 }),
                strings: "Demux8to16", img: "Demux", width: 50,
                normallyHidden: true,
            },

            {
                type: "component", subtype: "latch-sr",
                strings: "LatchSR", img: "LatchSR", width: 50,
            },
            {
                type: "component", subtype: "flipflop-jk",
                strings: "FlipflopJK", img: "FlipflopJK", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "flipflop-t",
                strings: "FlipflopT", img: "FlipflopT", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "flipflop-d",
                strings: "FlipflopD", img: "FlipflopD", width: 50,
            },
            {
                type: "component", subtype: "register",
                params: forDef(RegisterDef, { bits: 4 }),
                strings: "Register4", img: "Register", width: 50,
            },
            {
                type: "component", subtype: "register",
                params: forDef(RegisterDef, { bits: 8 }),
                strings: "Register8", img: "Register", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "shift-register",
                params: forDef(ShiftRegisterDef, { bits: 4 }),
                strings: "ShiftRegister4", img: "ShiftRegister", width: 50,
            },
            {
                type: "component", subtype: "shift-register",
                params: forDef(ShiftRegisterDef, { bits: 8 }),
                strings: "ShiftRegister8", img: "ShiftRegister", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "ram",
                params: forDef(RAMDef, { bits: 4, lines: 16 }),
                strings: "RAM16x4", img: "RAM16x4", width: 50,
            },
            {
                type: "component", subtype: "ram",
                params: forDef(RAMDef, { bits: 8, lines: 16 }),
                strings: "RAM16x8", img: "RAM16x8", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "ram",
                params: forDef(RAMDef, { bits: 8, lines: 64 }),
                strings: "RAM64x8", img: "RAM64x8", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "counter",
                strings: "Counter", img: "Counter", width: 50,
            },
            {
                type: "component", subtype: "decoder-7seg",
                strings: "Decoder7Seg", img: "Decoder7Seg", width: 50,
            },
            {
                type: "component", subtype: "decoder-16seg",
                strings: "Decoder16Seg", img: "Decoder16Seg", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "decoder-bcd4",
                strings: "DecoderBCD4", img: "DecoderBCD4", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "comparator",
                strings: "Comparator", img: "Comparator", width: 50,
                normallyHidden: true,
            },

        ],
    },
]


export function makeComponentMenuInto(target: HTMLElement, _showOnly: string[] | undefined) {

    let showOnly: string[] | undefined = undefined
    if (isDefined(_showOnly)) {
        showOnly = [..._showOnly]
    }

    // console.log("makeComponentMenuInto; showOnly", showOnly)

    let lastSectionNonEmpty = false

    for (const section of componentsMenu) {

        // separator from previous section
        let separator: HTMLElement | undefined = undefined
        const lastSectionNonEmptyPrev: boolean = lastSectionNonEmpty

        if (lastSectionNonEmpty) {
            separator =
                div(style("height: 20px"),
                    raw("&nbsp;")
                ).render()

            target.appendChild(separator)
        }

        // section header
        const header =
            div(cls("leftToolbarHeader"),
                S.ComponentBar.SectionNames[section.nameKey]
            ).render()
        target.appendChild(header)

        // section content
        let numAdded = 0
        const normallyHiddenButtons: HTMLButtonElement[] = []
        for (const item of section.items) {
            const normallyHidden = item.normallyHidden ?? false
            const hiddenNow = isDefined(showOnly) ? !shouldShow(item, showOnly) : normallyHidden

            let buttonStyle = ""
            if (hiddenNow) {
                buttonStyle += "max-height: 0; transition: all 0.25s ease-out; overflow: hidden; padding: 0; border: 0; margin-bottom: 0;"
            }
            const dataTypeOpt = isUndefined(item.subtype) ? emptyMod : dataType(item.subtype)
            const compStrings = S.ComponentBar.Components.props[item.strings]
            const [titleStr, captionStr] = isString(compStrings) ? [compStrings, undefined] : compStrings
            const caption = isUndefined(captionStr) ? emptyMod : span(cls("gate-label"), captionStr)
            const classIds = componentIdsFor(item)
            const buttonTitle = title(isUndefined(titleStr) ? "" : (titleStr + " \n") + `(“${classIds[0]}”)`)
            const extraClasses = hiddenNow ? " sim-component-button-extra" : ""
            const params = item.params?.params
            const compButton =
                button(type("button"), style(buttonStyle), cls(`list-group-item list-group-item-action sim-component-button${extraClasses}`),
                    dataComponent(item.type), dataTypeOpt,
                    dataClassId(classIds[0]),
                    isUndefined(params) ? emptyMod : dataParams(JSON.stringify(params)),
                    makeImage(item.img, item.width),
                    caption, buttonTitle
                ).render()

            if (hiddenNow) {
                normallyHiddenButtons.push(compButton)
            }

            target.appendChild(compButton)
            numAdded++
        }

        const numHidden = normallyHiddenButtons.length
        const numVisible = numAdded - numHidden

        // link to show more if needed
        if (numHidden !== 0 && isUndefined(showOnly)) {
            let moreShown = false
            const names = [S.ComponentBar.Labels.More + " ↓", S.ComponentBar.Labels.Less + " ↑"]
            const linkShowMore = a(cls("leftToolbarMore"), names[0]).render()
            linkShowMore.addEventListener("click", () => {
                moreShown = !moreShown
                for (const button of normallyHiddenButtons) {
                    if (moreShown) {
                        button.style.removeProperty("padding")
                        button.style.removeProperty("border")
                        button.style.removeProperty("margin-bottom")
                        button.style.removeProperty("max-height")
                        button.style.removeProperty("overflow")
                    } else {
                        button.style.padding = "0"
                        button.style.border = "0"
                        button.style.marginBottom = "0"
                        button.style.maxHeight = "0"
                        button.style.overflow = "hidden"
                    }
                }
                linkShowMore.innerHTML = names[Number(moreShown)]
            })
            target.appendChild(linkShowMore)
        }

        if (numVisible === 0) {
            if (isDefined(separator)) {
                separator.remove()
            }
            header.remove()

            // as we removed our sep, keep nonempty value for next section from previous one
            lastSectionNonEmpty = lastSectionNonEmptyPrev
        } else {
            // if we're visible, we're nonempty
            lastSectionNonEmpty = true
        }

    }

    if (isDefined(showOnly) && showOnly.length > 0) {
        console.log(`ERROR Supposed to show unknown elems: ${showOnly.join("; ")}`)
    }
}

function shouldShow(item: ComponentItem, showOnly: string[]) {
    const componentIds = componentIdsFor(item)

    let visible = false
    for (const componentId of componentIds) {
        if (showOnly.includes(componentId)) {
            visible = true
            const ind = showOnly.indexOf(componentId)
            showOnly.splice(ind, 1)
            break
        }
    }

    // console.log(`buttonId '${buttonId}' is visible: ${visible}`)

    return visible
}

function componentIdsFor(item: ComponentItem): string[] {
    const defAndParams = item.params
    if (isDefined(defAndParams)) {
        const ids: string[] = []
        const { def, params } = defAndParams
        if (deepObjectEquals(params, def.defaultParams)) {
            const genericId = def.repr.name
            ids.push(genericId)
        }
        const specificId = def.variantName(params)
        ids.push(specificId)
        if (isDefined(item.variantNameCompat)) {
            ids.push(item.variantNameCompat)
        }
        if (ids.length !== 0) {
            return ids
        }
    }

    const compType = item.type
    const compSubtype = item.subtype
    let buttonId
    if (isUndefined(compSubtype)) {
        buttonId = compType
    } else {
        if (compType === "component" || compType === "gate") {
            buttonId = compSubtype
        } else if (compType === "in" && compSubtype === "clock") {
            buttonId = "clock"
        } else {
            buttonId = `${compType}.${compSubtype}`
        }
    }
    return [buttonId.toLowerCase()]
}

