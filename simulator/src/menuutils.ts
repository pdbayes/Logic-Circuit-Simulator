import { make } from "fp-ts/lib/Tree"
import { a, button, cls, dataComponent, dataType, div, emptyMod, raw, span, style, title, type } from "./htmlgen"
import { ImageName, makeImage } from "./images"
import { isUndefined, setVisible } from "./utils"

type ComponentItem = {
    type: string // TODO better types for this
    subtype: string | undefined // explicit undefined
    title: string
    caption: string | undefined
    img: ImageName
    width: number
    normallyHidden?: boolean
}


type Section = {
    name: string,
    items: Array<ComponentItem>
}

const componentsMenu: Array<Section> = [
    {
        name: "Entrées/sorties",
        items: [
            {
                type: "in", subtype: undefined,
                title: "Entrée", caption: undefined,
                img: "InputBit", width: 32,
            },
            {
                type: "out", subtype: undefined,
                title: "Sortie", caption: undefined,
                img: "OutputBit", width: 32,
            },
            {
                type: "out", subtype: "nibble",
                title: "Affichage de 4 bits", caption: undefined,
                img: "OutputNibble", width: 32,
            },
            {
                type: "out", subtype: "ascii",
                title: "Affichage d’un caractère ASCII", caption: undefined,
                img: "OutputAscii", width: 32,
                normallyHidden: true,
            },
            {
                type: "out", subtype: "bar",
                title: "Affichage d’un bit sous forme de segment lumineux", caption: undefined,
                img: "OutputBar", width: 32,
                normallyHidden: true,
            },
            {
                type: "in", subtype: "clock",
                title: "Horloge", caption: undefined,
                img: "Clock", width: 50,
            },
            {
                type: "in", subtype: "nibble",
                title: "Entrée semioctet", caption: undefined,
                img: "InputNibble", width: 32,
            },
            {
                type: "out", subtype: "shiftbuffer",
                title: "Affichage avec buffer à décalage", caption: undefined,
                img: "OutputShiftBuffer", width: 50,
                normallyHidden: true,
            },
        ],
    },

    {
        name: "Portes",
        items: [
            {
                type: "gate", subtype: "NOT",
                title: "Porte NON", caption: "NON",
                img: "NOT", width: 50,
            },
            {
                type: "gate", subtype: "BUF",
                title: "Buffer (porte OUI)", caption: "OUI",
                img: "BUF", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "AND",
                title: "Porte ET", caption: "ET",
                img: "AND", width: 50,
            },
            {
                type: "gate", subtype: "OR",
                title: "Porte OU", caption: "OU",
                img: "OR", width: 50,
            },
            {
                type: "gate", subtype: "XOR",
                title: "Porte OU-X", caption: "OU-X",
                img: "XOR", width: 50,
            },
            {
                type: "gate", subtype: "NAND",
                title: "Porte NON-ET", caption: "NON-ET",
                img: "NAND", width: 50,
            },
            {
                type: "gate", subtype: "NOR",
                title: "Porte NON-OU", caption: "NON-OU",
                img: "NOR", width: 50,
            },

            {
                type: "gate", subtype: "XNOR",
                title: "Porte NON-OU-X", caption: "NON-OU-X",
                img: "XNOR", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "IMPLY",
                title: "Porte IMPLIQUE", caption: "IMPLIQUE",
                img: "IMPLY", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "NIMPLY",
                title: "Porte NON-IMPLIQUE", caption: "NON-IMPL.",
                img: "NIMPLY", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "TXA",
                title: "Fausse porte TRANSFERT à deux entrée", caption: "TRANSF.",
                img: "TXA", width: 50,
                normallyHidden: true,
            },

            {
                type: "gate", subtype: "AND3",
                title: "Porte ET à 3 entrées", caption: "ET (3)",
                img: "AND3", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "OR3",
                title: "Porte OU à 3 entrées", caption: "OU (3)",
                img: "OR3", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "XOR3",
                title: "Porte OU-X à 3 entrées", caption: "OU-X (3)",
                img: "XNOR3", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "NAND3",
                title: "Porte NON-ET à 3 entrées", caption: "NON-ET (3)",
                img: "NAND3", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "NOR3",
                title: "Porte NON-OU à 3 entrées", caption: "NON-OU (3)",
                img: "NOR3", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "XNOR3",
                title: "Porte NON-OU-X à 3 entrées", caption: "NON-OU-X (3)",
                img: "XNOR3", width: 50,
                normallyHidden: true,
            },

            {
                type: "gate", subtype: "AND4",
                title: "Porte ET à 4 entrées", caption: "ET (4)",
                img: "AND4", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "OR4",
                title: "Porte OU à 4 entrées", caption: "OU (4)",
                img: "OR4", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "XOR4",
                title: "Porte OU-X à 4 entrées", caption: "OU-X (4)",
                img: "XNOR4", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "NAND4",
                title: "Porte NON-ET à 4 entrées", caption: "NON-ET (4)",
                img: "NAND4", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "NOR4",
                title: "Porte NON-OU à 4 entrées", caption: "NON-OU (4)",
                img: "NOR4", width: 50,
                normallyHidden: true,
            },
            {
                type: "gate", subtype: "XNOR4",
                title: "Porte NON-OU-X à 4 entrées", caption: "NON-OU-X (4)",
                img: "XNOR4", width: 50,
                normallyHidden: true,
            },
        ],
    },


    {
        name: "Compo- sants",
        items: [
            {
                type: "component", subtype: "adder",
                title: "Additionneur", caption: "Add.",
                img: "Adder", width: 50,
            },
            {
                type: "component", subtype: "alu",
                title: "Unité arithmétique et logique à 4 bits", caption: "ALU",
                img: "ALU", width: 50,
            },

            {
                type: "component", subtype: "mux-2to1",
                title: "Multiplexer 2-vers-1 (1 bit de contrôle)", caption: "Mux 2-1",
                img: "ALU", width: 50, // TODO mux icons
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux-4to1",
                title: "Multiplexer 4-vers-1 (2 bits de contrôle)", caption: "Mux 4-1",
                img: "ALU", width: 50, // TODO mux icons
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux-8to1",
                title: "Multiplexer 8-vers-1 (3 bits de contrôle)", caption: "Mux 8-1",
                img: "ALU", width: 50, // TODO mux icons
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux-4to2",
                title: "Multiplexer 4-vers-2 (1 bit de contrôle)", caption: "Mux 4-2",
                img: "ALU", width: 50, // TODO mux icons
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux-8to2",
                title: "Multiplexer 8-vers-2 (2 bits de contrôle)", caption: "Mux 8-2",
                img: "ALU", width: 50, // TODO mux icons
                normallyHidden: true,
            },
            {
                type: "component", subtype: "mux-8to4",
                title: "Multiplexer 8-vers-4 (1 bit de contrôle)", caption: "Mux 8-4",
                img: "ALU", width: 50, // TODO mux icons
                normallyHidden: true,
            },

            {
                type: "component", subtype: "latch-sr",
                title: "Verrou SR", caption: "Verrou SR",
                img: "LatchSR", width: 50,
            },
            {
                type: "component", subtype: "flipflop-jk",
                title: "Bascule JK", caption: "Basc. JK",
                img: "FlipflopJK", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "flipflop-t",
                title: "Bascule T", caption: "Basc. T",
                img: "FlipflopT", width: 50,
                normallyHidden: true,
            },
            {
                type: "component", subtype: "flipflop-d",
                title: "Bascule D", caption: "Basc. D",
                img: "FlipflopD", width: 50,
            },
            {
                type: "component", subtype: "register",
                title: "Registre à 4 bits", caption: "Registre",
                img: "Register", width: 50,
            },
        ],
    },
]


export function makeComponentMenuInto(target: HTMLElement) {

    let lastSectionNonEmpty = false

    for (const section of componentsMenu) {

        // separator from previous section
        if (lastSectionNonEmpty) {
            target.appendChild(
                div(style("height: 20px"), raw("&nbsp;")).render()
            )
        }

        // section header
        target.appendChild(
            div(cls("leftToolbarHeader"),
                section.name
            ).render()
        )

        // section content
        let hasHidden = false
        let numAdded = 0
        const normallyHiddenButtons: HTMLButtonElement[] = []
        for (const item of section.items) {
            const normallyHidden = item.normallyHidden ?? false

            const buttonStyle = normallyHidden ? style("display: none") : emptyMod
            const dataTypeOpt = isUndefined(item.subtype) ? emptyMod : dataType(item.subtype)
            const caption = isUndefined(item.caption) ? emptyMod : span(cls("gate-label"), item.caption)
            const buttonTitle = isUndefined(item.title) ? emptyMod : title(item.title)
            const extraClasses = normallyHidden ? " sim-component-button-extra" : ""
            const compButton =
                button(type("button"), buttonStyle, cls(`list-group-item list-group-item-action sim-component-button${extraClasses}`), // TODO can remove sim-component-button?
                    dataComponent(item.type), dataTypeOpt,
                    makeImage(item.img, item.width),
                    caption, buttonTitle
                ).render()

            if (normallyHidden) {
                hasHidden = true
                normallyHiddenButtons.push(compButton)
            }

            target.appendChild(compButton)
            numAdded++
        }

        // link to show more if needed
        if (hasHidden) {
            let moreShown = false
            const names = ["Plus ↓", "Moins ↑"]
            const linkShowMore = a(cls("leftToolbarMore"),names[0]).render()
            linkShowMore.addEventListener("click", () => {
                moreShown = !moreShown
                for (const button of normallyHiddenButtons) {
                    setVisible(button, moreShown)
                }
                linkShowMore.innerHTML = names[Number(moreShown)]
            })
            target.appendChild(linkShowMore)
        }

        lastSectionNonEmpty = numAdded > 0 || hasHidden
    }
}