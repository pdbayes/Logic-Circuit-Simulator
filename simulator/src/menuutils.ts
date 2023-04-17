import { Branded } from "io-ts"
import JSON5 from "json5"
import { ButtonDataset } from "./ComponentFactory"
import { ALUDef } from "./components/ALU"
import { AdderDef } from "./components/Adder"
import { AdderArrayDef } from "./components/AdderArray"
import { ClockDef } from "./components/Clock"
import { ComparatorDef } from "./components/Comparator"
import { ParamDef, ParametrizedComponentDef, ParamsFromDefs } from "./components/Component"
import { ControlledInverterDef } from "./components/ControlledInverter"
import { CounterDef } from "./components/Counter"
import { DecoderDef } from "./components/Decoder"
import { Decoder16SegDef } from "./components/Decoder16Seg"
import { Decoder7SegDef } from "./components/Decoder7Seg"
import { DecoderBCD4Def } from "./components/DecoderBCD4"
import { DemuxDef } from "./components/Demux"
import { DisplayDef } from "./components/Display"
import { Display16SegDef } from "./components/Display16Seg"
import { Display7SegDef } from "./components/Display7Seg"
import { DisplayAsciiDef } from "./components/DisplayAscii"
import { DisplayBarDef } from "./components/DisplayBar"
import { FlipflopDDef } from "./components/FlipflopD"
import { FlipflopJKDef } from "./components/FlipflopJK"
import { FlipflopTDef } from "./components/FlipflopT"
import { Gate1Def, GateNDef } from "./components/Gate"
import { GateArrayDef } from "./components/GateArray"
import { HalfAdderDef } from "./components/HalfAdder"
import { InputDef } from "./components/Input"
import { LabelDef } from "./components/Label"
import { LatchSRDef } from "./components/LatchSR"
import { MuxDef } from "./components/Mux"
import { OutputDef } from "./components/Output"
import { PassthroughDef } from "./components/Passthrough"
import { RAMDef } from "./components/RAM"
import { ROMDef } from "./components/ROM"
import { RandomDef } from "./components/Random"
import { RectangleDef } from "./components/Rectangle"
import { RegisterDef } from "./components/Register"
import { ShiftDisplayDef } from "./components/ShiftDisplay"
import { ShiftRegisterDef } from "./components/ShiftRegister"
import { TristateBufferDef } from "./components/TristateBuffer"
import { TristateBufferArrayDef } from "./components/TristateBufferArray"
import { a, button, cls, div, emptyMod, raw, span, style, title, type } from "./htmlgen"
import { ImageName, makeImage } from "./images"
import { S, Strings } from "./strings"
import { deepObjectEquals, isArray, isString } from "./utils"

export type ComponentKey = Strings["ComponentBar"]["Components"]["type"]

export type DefAndParams<
    TParamDefs extends Record<string, ParamDef<unknown>>,
    TParams extends ParamsFromDefs<TParamDefs>
> = {
    def: ParametrizedComponentDef<any, any, any, any, any, any, any, any, TParams>,
    params: TParams
}

export type LibraryItemVisibility = "always" | "withButton" | "ifShowOnly"
const withButton = "withButton"
const ifShowOnly = "ifShowOnly"

export type LibraryItem = {
    type: string
    params?: Branded<DefAndParams<any, any>, "params">
    visual: ComponentKey & ImageName | [ComponentKey, ImageName]
    compat?: string // for compatibility with old URL params
    width: number
    visible?: LibraryItemVisibility
}

export type LibraryButtonProps = { imgWidth: number }
export type LibraryButtonOptions = { compat?: string, visible?: LibraryItemVisibility }

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
        DisplayBarDef.button("DisplayBar", { compat: "out.bar", visible: withButton }),
        ClockDef.button("Clock"),

        InputDef.button({ bits: 4 }, ["InputN", "Input4"], { compat: "in.nibble" }),
        OutputDef.button({ bits: 4 }, ["OutputN", "Output4"], { compat: "out.nibble" }),
        DisplayDef.button({ bits: 4 }, ["DisplayN", "Display4"], { compat: "out.nibble-display" }),

        InputDef.button({ bits: 8 }, "Input8", { compat: "in.byte", visible: ifShowOnly }),
        OutputDef.button({ bits: 8 }, "Output8", { compat: "out.byte", visible: ifShowOnly }),
        DisplayDef.button({ bits: 8 }, "Display8", { compat: "out.byte-display", visible: ifShowOnly }),

        Display7SegDef.button("Display7Seg", { compat: "out.7seg", visible: withButton }),
        Display16SegDef.button("Display16Seg", { compat: "out.16seg", visible: withButton }),
        DisplayAsciiDef.button("DisplayAscii", { compat: "out.ascii", visible: withButton }),

        RandomDef.button({ bits: 1 }, "Random", { compat: "random", visible: withButton }),
        ShiftDisplayDef.button("ShiftDisplay", { compat: "out.shift-buffer", visible: withButton }),
    ],
}, {
    nameKey: "Gates",
    items: [
        Gate1Def.button({ type: "not" }, "not"),
        Gate1Def.button({ type: "buf" }, "buf", { visible: withButton }),
        TristateBufferDef.button("tri", { compat: "tri", visible: withButton }),

        GateNDef.button({ type: "and", bits: 2 }, "and"),
        GateNDef.button({ type: "or", bits: 2 }, "or"),
        GateNDef.button({ type: "xor", bits: 2 }, "xor"),
        GateNDef.button({ type: "nand", bits: 2 }, "nand"),
        GateNDef.button({ type: "nor", bits: 2 }, "nor"),

        GateNDef.button({ type: "xnor", bits: 2 }, "xnor", { visible: withButton }),
        GateNDef.button({ type: "imply", bits: 2 }, "imply", { visible: withButton }),
        GateNDef.button({ type: "nimply", bits: 2 }, "nimply", { visible: withButton }),
        GateNDef.button({ type: "txa", bits: 2 }, ["transfer", "txa"], { visible: withButton }),

        GateNDef.button({ type: "and", bits: 3 }, "and3", { compat: "and3", visible: ifShowOnly }),
        GateNDef.button({ type: "or", bits: 3 }, "or3", { compat: "or3", visible: ifShowOnly }),
        GateNDef.button({ type: "xor", bits: 3 }, "xor3", { compat: "xor3", visible: ifShowOnly }),
        GateNDef.button({ type: "nand", bits: 3 }, "nand3", { compat: "nand3", visible: ifShowOnly }),
        GateNDef.button({ type: "nor", bits: 3 }, "nor3", { compat: "nor3", visible: ifShowOnly }),
        GateNDef.button({ type: "xnor", bits: 3 }, "xnor3", { compat: "xnor3", visible: ifShowOnly }),

        GateNDef.button({ type: "and", bits: 4 }, "and4", { compat: "and4", visible: ifShowOnly }),
        GateNDef.button({ type: "or", bits: 4 }, "or4", { compat: "or4", visible: ifShowOnly }),
        GateNDef.button({ type: "xor", bits: 4 }, "xor4", { compat: "xor4", visible: ifShowOnly }),
        GateNDef.button({ type: "nand", bits: 4 }, "nand4", { compat: "nand4", visible: ifShowOnly }),
        GateNDef.button({ type: "nor", bits: 4 }, "nor4", { compat: "nor4", visible: ifShowOnly }),
        GateNDef.button({ type: "xnor", bits: 4 }, "xnor4", { compat: "xnor4", visible: ifShowOnly }),

        ControlledInverterDef.button({ bits: 4 }, "ControlledInverter", { compat: "switched-inverter", visible: withButton }),
        GateArrayDef.button({ type: "and", bits: 4 }, "GateArray", { visible: withButton }),
        TristateBufferArrayDef.button({ bits: 4 }, "TristateBufferArray", { visible: withButton }),

    ],
}, {
    nameKey: "Layout",
    items: [
        LabelDef.button("Label"),
        RectangleDef.button("Rectangle", { compat: "label.rect" }),

        PassthroughDef.button({ bits: 1 }, "Passthrough1"),
        PassthroughDef.button({ bits: 4 }, "PassthroughN"),
    ],
}, {
    nameKey: "Components",
    items: [
        HalfAdderDef.button("HalfAdder"),
        AdderDef.button("Adder"),
        ComparatorDef.button("Comparator", { compat: "comparator", visible: withButton }),

        AdderArrayDef.button({ bits: 4 }, "AdderArray"),
        ALUDef.button({ bits: 4, ext: false }, "ALU"),

        MuxDef.button({ from: 4, to: 2 }, "Mux"),
        DemuxDef.button({ from: 2, to: 4 }, "Demux"),

        LatchSRDef.button("LatchSR"),
        FlipflopJKDef.button("FlipflopJK", { compat: "flipflop-jk", visible: withButton }),
        FlipflopTDef.button("FlipflopT", { compat: "flipflop-t", visible: withButton }),
        FlipflopDDef.button("FlipflopD", { compat: "flipflop-d" }),

        RegisterDef.button({ bits: 4, inc: false }, "Register", { compat: "register" }),
        ShiftRegisterDef.button({ bits: 4 }, "ShiftRegister", { compat: "shift-register" }),
        CounterDef.button({ bits: 4 }, "Counter"),

        RAMDef.button({ lines: 16, bits: 4 }, "RAM"),
        ROMDef.button({ lines: 16, bits: 4 }, "ROM", { visible: withButton }),

        DecoderDef.button({ bits: 2 }, "Decoder", { compat: "decoder" }),
        Decoder7SegDef.button("Decoder7Seg", { compat: "decoder-7seg" }),
        Decoder16SegDef.button("Decoder16Seg", { compat: "decoder-16seg", visible: withButton }),
        DecoderBCD4Def.button("DecoderBCD4", { compat: "decoder-bcd4", visible: withButton }),

    ],
}]


export function makeComponentMenuInto(target: HTMLElement, _showOnly: string[] | undefined) {

    let showOnly: string[] | undefined = undefined
    if (_showOnly !== undefined) {
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
        const showWithMoreButton: HTMLButtonElement[] = []
        const showOnlyWithURLParam: HTMLButtonElement[] = []
        for (const item of section.items) {
            const normallyHidden = item.visible !== undefined && item.visible !== "always"
            const hiddenNow = showOnly !== undefined ? !shouldShow(item, showOnly) : normallyHidden

            const buttonStyle = !hiddenNow ? "" : "max-height: 0; transition: all 0.25s ease-out; overflow: hidden; padding: 0; border: 0; margin-bottom: 0;"
            const visual = item.visual
            const [stringsKey, img] = isString(visual) ? [visual, visual] : visual
            const compStrings = S.ComponentBar.Components.props[stringsKey]
            const [titleStr, captionStr] = isString(compStrings) ? [compStrings, undefined] : compStrings
            const caption = captionStr === undefined ? emptyMod : span(cls("gate-label"), captionStr)
            const classIds = componentIdsFor(item)
            const buttonTitle = title(titleStr === undefined ? "" : (titleStr + " \n") + `(“${classIds[0]}”)`)
            const extraClasses = hiddenNow ? " sim-component-button-extra" : ""
            const params = item.params?.params
            const compButton =
                button(type("button"), style(buttonStyle), cls(`list-group-item list-group-item-action sim-component-button${extraClasses}`),
                    makeImage(img, item.width),
                    caption, buttonTitle
                ).render()

            const compDataset = compButton.dataset as ButtonDataset
            if (item.type !== undefined) {
                compDataset.type = item.type
            }
            compDataset.componentId = classIds[0]
            if (params !== undefined) {
                compDataset.params = JSON5.stringify(params)
            }

            if (hiddenNow) {
                const targetArray = item.visible === "withButton" ? showWithMoreButton : showOnlyWithURLParam
                targetArray.push(compButton)
            }

            target.appendChild(compButton)
            numAdded++
        }

        const numShowWithMoreButton = showWithMoreButton.length
        const numVisible = numAdded - numShowWithMoreButton - showOnlyWithURLParam.length

        // link to show more if needed
        if (numShowWithMoreButton !== 0 && showOnly === undefined) {
            let moreShown = false
            const names = [S.ComponentBar.Labels.More + " ↓", S.ComponentBar.Labels.Less + " ↑"]
            const linkShowMore = a(cls("leftToolbarMore"), names[0]).render()
            linkShowMore.addEventListener("click", () => {
                moreShown = !moreShown
                for (const button of showWithMoreButton) {
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
            if (separator !== undefined) {
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

    if (showOnly !== undefined && showOnly.length > 0) {
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
    const ids: string[] = []
    const defAndParams = item.params
    const type = item.type

    if (defAndParams === undefined) {
        // no parameters
        ids.push(type)

    } else {
        // with parameters; component may override primary type
        // (e.g. gate => and, gate-array => and-array, etc)
        const def = defAndParams.def

        const variants = def.variantName(defAndParams.params)
        if (isArray(variants)) {
            // first returned element is base types, other are variants;
            // we got them all
            ids.push(...variants)

        } else {
            // is it the default variant? If so, push the base type as first id
            if (deepObjectEquals(defAndParams.params, def.defaultParams)) {
                ids.push(type)
            } else {
                // console.log(`Nonstandard for ${type}: ${JSON.stringify(params)} != ${JSON.stringify(defaultParams)}`)
            }
            ids.push(variants)
        }
    }

    // compatibility variant
    if (item.compat !== undefined) {
        ids.push(item.compat)
    }

    return ids
}

