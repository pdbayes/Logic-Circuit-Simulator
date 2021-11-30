import { Clock } from "./components/Clock"
import { GateFactory, GateTypes } from "./components/Gate"
import { LogicInput } from "./components/LogicInput"
import { LogicOutput } from "./components/LogicOutput"
import { isUndefined, RichStringEnum } from "./utils"
import { DisplayNibble } from "./components/DisplayNibble"
import { DisplayAscii } from "./components/DisplayAscii"
import { DisplayBar } from "./components/DisplayBar"
import { Component } from "./components/Component"
import { Adder } from "./components/Adder"
import { ALU } from "./components/ALU"
import { LogicEditor } from "./LogicEditor"


const ComponentFactoryTypes = RichStringEnum.withProps<{
    make(editor: LogicEditor, elem: HTMLElement): Component,
}>()({
    "LogicInput": {
        make: editor => new LogicInput(editor, null),
    },

    "LogicOutput": {
        make: editor => new LogicOutput(editor, null),
    },

    "DisplayNibble": {
        make: editor => new DisplayNibble(editor, null),
    },

    "DisplayAscii": {
        make: editor => new DisplayAscii(editor, null),
    },

    "DisplayBar": {
        make: editor => new DisplayBar(editor, null),
    },

    "Clock": {
        make: editor => new Clock(editor, { period: 2000, dutycycle: undefined, phase: undefined, showLabel: undefined }),
    },

    "Gate": {
        make: (editor, elem) => {
            const gateType = elem.dataset["type"]
            if (!GateTypes.isValue(gateType)) {
                throw new Error(`bad gate type: '${gateType}' - elem: ` + elem.outerHTML)
            }
            return GateFactory.make(editor, { type: gateType })
        },
    },

    "IC": {
        make: (editor, elem) => {
            const icType = elem.dataset["type"]
            if (isUndefined(icType)) {
                throw new Error(`undefined IC type - elem: ` + elem.outerHTML)
            }
            switch (icType) {
                case "Adder":
                    return new Adder(editor, null)
                case "ALU":
                default:
                    return new ALU(editor, null)
            }
        },
    },
})
// type ComponentFactoryType = typeof ComponentFactoryTypes.type

class _ComponentFactory {
    makeFactoryForButton(elem: HTMLElement): (editor: LogicEditor) => Component {
        const compType = elem.dataset["component"]
        if (!ComponentFactoryTypes.isValue(compType)) {
            throw new Error(`bad component type: '${compType}'; expected one of: ` + ComponentFactoryTypes.values.join(", "))
        }
        const compDef = ComponentFactoryTypes.propsOf(compType)
        return (editor) => {
            const newComp = compDef.make(editor, elem)
            editor.components.push(newComp)
            return newComp
        }
    }
}

export const ComponentFactory = new _ComponentFactory()
