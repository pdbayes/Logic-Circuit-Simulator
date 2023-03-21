import { Branded } from "io-ts"
import { ButtonDataset } from "./ComponentFactory"
import { AdderDef } from "./components/Adder"
import { AdderArrayDef } from "./components/AdderArray"
import { ALUDef } from "./components/ALU"
import { ClockDef } from "./components/Clock"
import { ComparatorDef } from "./components/Comparator"
import { ComponentCategory, ParametrizedComponentDef } from "./components/Component"
import { CounterDef } from "./components/Counter"
import { Decoder16SegDef } from "./components/Decoder16Seg"
import { Decoder7SegDef } from "./components/Decoder7Seg"
import { DecoderBCD4Def } from "./components/DecoderBCD4"
import { DemuxDef } from "./components/Demux"
import { FlipflopDDef } from "./components/FlipflopD"
import { FlipflopJKDef } from "./components/FlipflopJK"
import { FlipflopTDef } from "./components/FlipflopT"
import { Gate1Def, GateNDef } from "./components/Gate"
import { GateArrayDef } from "./components/GateArray"
import { HalfAdderDef } from "./components/HalfAdder"
import { InputDef } from "./components/Input"
import { InputRandomDef } from "./components/InputRandom"
import { LabelRectDef } from "./components/LabelRect"
import { LabelStringDef } from "./components/LabelString"
import { LatchSRDef } from "./components/LatchSR"
import { MuxDef } from "./components/Mux"
import { OutputDef } from "./components/Output"
import { Output16SegDef } from "./components/Output16Seg"
import { Output7SegDef } from "./components/Output7Seg"
import { OutputAsciiDef } from "./components/OutputAscii"
import { OutputBarDef } from "./components/OutputBar"
import { OutputDisplayDef } from "./components/OutputDisplay"
import { OutputShiftBufferDef } from "./components/OutputShiftBuffer"
import { PassthroughDef } from "./components/Passthrough"
import { RAMDef } from "./components/RAM"
import { RegisterDef } from "./components/Register"
import { ShiftRegisterDef } from "./components/ShiftRegister"
import { SwitchedInverterDef } from "./components/SwitchedInverter"
import { TriStateBufferDef } from "./components/TriStateBuffer"
import { TriStateBufferArrayDef } from "./components/TriStateBufferArray"
import { a, button, cls, div, emptyMod, raw, span, style, title, type } from "./htmlgen"
import { ImageName, makeImage } from "./images"
import { S, Strings } from "./strings"
import { deepObjectEquals, isDefined, isString, isUndefined } from "./utils"

export type ComponentKey = Strings["ComponentBar"]["Components"]["type"]

export type DefAndParams<TParams extends Record<string, unknown>> = {
    def: ParametrizedComponentDef<string | undefined, TParams>,
    params: TParams
}

export type LibraryItem = {
    category: ComponentCategory
    type?: string
    params?: Branded<DefAndParams<any>, "params">
    visual: ComponentKey & ImageName | [ComponentKey, ImageName]
    variantNameCompat?: string // for compatibility with old URL params
    width: number
    normallyHidden?: boolean
}

type SectionNameKey = keyof Strings["ComponentBar"]["SectionNames"]

type Section = {
    nameKey: SectionNameKey,
    items: Array<LibraryItem>
}

const componentsMenu: Array<Section> = [{
    nameKey: "InputOutput",
    items: [
        InputDef.button({ bits: 1 }, "Input1"),
        OutputDef.button({ bits: 1 }, "Output1"),
        OutputBarDef.button("OutputBar", { normallyHidden: true }),
        ClockDef.button("Clock"),

        InputDef.button({ bits: 4 }, "Input4", { variantNameCompat: "in.nibble" }),
        OutputDef.button({ bits: 4 }, "Output4", { variantNameCompat: "out.nibble" }),
        OutputDisplayDef.button({ bits: 4 }, "OutputDisplay4", { variantNameCompat: "out.nibble-display" }),

        InputDef.button({ bits: 32 }, "Input8", { variantNameCompat: "in.byte", normallyHidden: true }),
        OutputDef.button({ bits: 8 }, "Output8", { variantNameCompat: "out.byte", normallyHidden: true }),
        OutputDisplayDef.button({ bits: 8 }, "OutputDisplay8", { variantNameCompat: "out.byte-display", normallyHidden: true }),

        Output7SegDef.button("Output7Seg", { normallyHidden: true }),
        Output16SegDef.button("Output16Seg", { normallyHidden: true }),
        OutputAsciiDef.button("OutputAscii", { normallyHidden: true }),

        InputRandomDef.button({ bits: 1 }, "InputRandom", { normallyHidden: true }),
        OutputShiftBufferDef.button("OutputShiftBuffer", { normallyHidden: true }),
    ],
}, {
    nameKey: "Gates",
    items: [
        Gate1Def.button({ type: "NOT" }, "NOT"),
        Gate1Def.button({ type: "BUF" }, "BUF", { normallyHidden: true }),
        TriStateBufferDef.button("TRI", { normallyHidden: true }),

        GateNDef.button({ type: "AND", bits: 2 }, "AND"),
        GateNDef.button({ type: "OR", bits: 2 }, "OR"),
        GateNDef.button({ type: "XOR", bits: 2 }, "XOR"),
        GateNDef.button({ type: "NAND", bits: 2 }, "NAND"),
        GateNDef.button({ type: "NOR", bits: 2 }, "NOR"),

        GateNDef.button({ type: "XNOR", bits: 2 }, "XNOR3", { normallyHidden: true }),
        GateNDef.button({ type: "IMPLY", bits: 2 }, "IMPLY", { normallyHidden: true }),
        GateNDef.button({ type: "NIMPLY", bits: 2 }, "NIMPLY", { normallyHidden: true }),
        GateNDef.button({ type: "TXA", bits: 2 }, ["TRANSFER", "TXA"], { normallyHidden: true }),

        GateNDef.button({ type: "AND", bits: 3 }, "AND3", { variantNameCompat: "AND3", normallyHidden: true }),
        GateNDef.button({ type: "OR", bits: 3 }, "OR3", { variantNameCompat: "OR3", normallyHidden: true }),
        GateNDef.button({ type: "XOR", bits: 3 }, "XOR3", { variantNameCompat: "XOR3", normallyHidden: true }),
        GateNDef.button({ type: "NAND", bits: 3 }, "NAND3", { variantNameCompat: "NAND3", normallyHidden: true }),
        GateNDef.button({ type: "NOR", bits: 3 }, "NOR3", { variantNameCompat: "NOR3", normallyHidden: true }),
        GateNDef.button({ type: "XNOR", bits: 3 }, "XNOR3", { variantNameCompat: "XNOR3", normallyHidden: true }),

        GateNDef.button({ type: "AND", bits: 4 }, "AND4", { variantNameCompat: "AND4", normallyHidden: true }),
        GateNDef.button({ type: "OR", bits: 4 }, "OR4", { variantNameCompat: "OR4", normallyHidden: true }),
        GateNDef.button({ type: "XOR", bits: 4 }, "XOR4", { variantNameCompat: "XOR4", normallyHidden: true }),
        GateNDef.button({ type: "NAND", bits: 4 }, "NAND4", { variantNameCompat: "NAND4", normallyHidden: true }),
        GateNDef.button({ type: "NOR", bits: 4 }, "NOR4", { variantNameCompat: "NOR4", normallyHidden: true }),
        GateNDef.button({ type: "XNOR", bits: 4 }, "XNOR4", { variantNameCompat: "XNOR4", normallyHidden: true }),

        SwitchedInverterDef.button({ bits: 4 }, "SwitchedInverter", { normallyHidden: true }),
        GateArrayDef.button({ bits: 4 }, "GateArray", { normallyHidden: true }),
        TriStateBufferArrayDef.button({ bits: 4 }, "TriStateBufferArray", { normallyHidden: true }),

    ],
}, {
    nameKey: "Layout",
    items: [
        LabelStringDef.button("LabelString"),
        LabelRectDef.button("LabelRectangle"),

        PassthroughDef.button({ bits: 1 }, "Passthrough1"),
        PassthroughDef.button({ bits: 4 }, "Passthrough4"),
        PassthroughDef.button({ bits: 8 }, "Passthrough8", { normallyHidden: true }),
    ],
}, {
    nameKey: "Components",
    items: [
        HalfAdderDef.button("HalfAdder"),
        AdderDef.button("Adder"),
        AdderArrayDef.button({ bits: 4 }, "AdderArray4"),

        ALUDef.button({ bits: 4 }, "ALU4"),
        ALUDef.button({ bits: 8 }, "ALU8", { normallyHidden: true }),

        MuxDef.button({ from: 2, to: 1 }, ["Mux2to1", "Mux"], { normallyHidden: true }),
        MuxDef.button({ from: 4, to: 1 }, ["Mux4to1", "Mux"], { normallyHidden: true }),
        MuxDef.button({ from: 8, to: 1 }, ["Mux8to1", "Mux"], { normallyHidden: true }),
        MuxDef.button({ from: 4, to: 2 }, ["Mux4to2", "Mux"], { normallyHidden: true }),
        MuxDef.button({ from: 8, to: 2 }, ["Mux8to2", "Mux"], { normallyHidden: true }),
        MuxDef.button({ from: 8, to: 4 }, ["Mux8to4", "Mux"], { normallyHidden: true }),
        MuxDef.button({ from: 16, to: 8 }, ["Mux16to8", "Mux"], { normallyHidden: true }),

        DemuxDef.button({ from: 1, to: 2 }, ["Demux1to2", "Demux"], { normallyHidden: true }),
        DemuxDef.button({ from: 1, to: 4 }, ["Demux1to4", "Demux"], { normallyHidden: true }),
        DemuxDef.button({ from: 1, to: 8 }, ["Demux1to8", "Demux"], { normallyHidden: true }),
        DemuxDef.button({ from: 2, to: 4 }, ["Demux2to4", "Demux"], { normallyHidden: true }),
        DemuxDef.button({ from: 2, to: 8 }, ["Demux2to8", "Demux"], { normallyHidden: true }),
        DemuxDef.button({ from: 4, to: 8 }, ["Demux4to8", "Demux"], { normallyHidden: true }),
        DemuxDef.button({ from: 8, to: 16 }, ["Demux8to16", "Demux"], { normallyHidden: true }),

        LatchSRDef.button("LatchSR"),
        FlipflopJKDef.button("FlipflopJK", { normallyHidden: true }),
        FlipflopTDef.button("FlipflopJK", { normallyHidden: true }),
        FlipflopDDef.button("FlipflopJK"),

        RegisterDef.button({ bits: 4 }, "Register4"),
        RegisterDef.button({ bits: 8 }, "Register8", { normallyHidden: true }),

        ShiftRegisterDef.button({ bits: 4 }, "ShiftRegister4"),
        ShiftRegisterDef.button({ bits: 8 }, "ShiftRegister8", { normallyHidden: true }),

        RAMDef.button({ lines: 16, bits: 4 }, "RAM16x4"),
        RAMDef.button({ lines: 16, bits: 8 }, "RAM16x8", { normallyHidden: true }),
        RAMDef.button({ lines: 64, bits: 8 }, "RAM64x8", { normallyHidden: true }),

        CounterDef.button("Counter"),

        Decoder7SegDef.button("Decoder7Seg"),
        Decoder16SegDef.button("Decoder16Seg", { normallyHidden: true }),
        DecoderBCD4Def.button("DecoderBCD4", { normallyHidden: true }),

        ComparatorDef.button("Comparator", { normallyHidden: true }),

    ],
}]


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

            const buttonStyle = !hiddenNow ? "" : "max-height: 0; transition: all 0.25s ease-out; overflow: hidden; padding: 0; border: 0; margin-bottom: 0;"
            const visual = item.visual
            const [stringsKey, img] = isString(visual) ? [visual, visual] : visual
            const compStrings = S.ComponentBar.Components.props[stringsKey]
            const [titleStr, captionStr] = isString(compStrings) ? [compStrings, undefined] : compStrings
            const caption = isUndefined(captionStr) ? emptyMod : span(cls("gate-label"), captionStr)
            const classIds = componentIdsFor(item)
            const buttonTitle = title(isUndefined(titleStr) ? "" : (titleStr + " \n") + `(“${classIds[0]}”)`)
            const extraClasses = hiddenNow ? " sim-component-button-extra" : ""
            const params = item.params?.params
            const compButton =
                button(type("button"), style(buttonStyle), cls(`list-group-item list-group-item-action sim-component-button${extraClasses}`),
                    makeImage(img, item.width),
                    caption, buttonTitle
                ).render()

            const compDataset = compButton.dataset as ButtonDataset
            compDataset.category = item.category
            if (isDefined(item.type)) {
                compDataset.type = item.type
            }
            compDataset.componentId = classIds[0]
            if (isDefined(params)) {
                compDataset.params = JSON.stringify(params)
            }

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

function shouldShow(item: LibraryItem, showOnly: string[]) {
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

function componentIdsFor(item: LibraryItem): string[] {
    const defAndParams = item.params
    if (isDefined(defAndParams)) {
        const ids: string[] = []
        const { def, params } = defAndParams
        if (deepObjectEquals(params, def.defaultParams)) {
            const genericId = def.type ?? def.category
            ids.push(genericId)
        }
        const specificId = def.variantName(params)
        ids.push(specificId)
        if (isDefined(item.variantNameCompat)) {
            ids.push(item.variantNameCompat.toLowerCase())
        }
        if (ids.length !== 0) {
            return ids
        }
    }

    const category = item.category
    const type = item.type
    let buttonId
    if (isUndefined(type)) {
        buttonId = category
    } else {
        if (category === "ic" || category === "gate") {
            buttonId = type
        } else if (category === "in" && type === "clock") {
            buttonId = "clock"
        } else {
            buttonId = `${category}.${type}`
        }
    }
    return [buttonId.toLowerCase()]
}

