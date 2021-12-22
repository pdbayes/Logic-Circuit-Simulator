import { Clock } from "./components/Clock"
import { GateFactory, GateTypes } from "./components/Gate"
import { InputBit } from "./components/InputBit"
import { OutputBit } from "./components/OutputBit"
import { isUndefined, RichStringEnum } from "./utils"
import { OutputNibble } from "./components/OutputNibble"
import { OutputAscii } from "./components/OutputAscii"
import { OutputBar } from "./components/OutputBar"
import { Component } from "./components/Component"
import { LogicEditor } from "./LogicEditor"
import { ICFactory } from "./components/IC"
import { InputNibble } from "./components/InputNibble"
import { OutputShiftBuffer } from "./components/OutputShiftBuffer"
import { InputFactory } from "./components/Inputs"
import { OutputFactory } from "./components/Outputs"


const ComponentFactoryTypes = RichStringEnum.withProps<{
    make(editor: LogicEditor, elem: HTMLElement): Component,
}>()({

    "in": {
        make: (editor, elem) => {
            const type = elem.dataset["type"]
            const newComp = InputFactory.make(editor, type === null ? undefined : type)
            if (isUndefined(newComp)) {
                throw new Error(`undefined in type - elem: ` + elem.outerHTML)
            }
            return newComp

        },
    },

    "out": {
        make: (editor, elem) => {
            const type = elem.dataset["type"]
            const newComp = OutputFactory.make(editor, type)
            if (isUndefined(newComp)) {
                throw new Error(`undefined out type - elem: ` + elem.outerHTML)
            }
            return newComp
        },
    },

    "gate": {
        make: (editor, elem) => {
            const gateType = elem.dataset["type"]
            if (!GateTypes.isValue(gateType)) {
                throw new Error(`bad gate type: '${gateType}' - elem: ` + elem.outerHTML)
            }
            return GateFactory.make(editor, { type: gateType })
        },
    },

    "component": {
        make: (editor, elem) => {
            const type = elem.dataset["type"]
            const newComp = ICFactory.make(editor, type)
            if (isUndefined(newComp)) {
                throw new Error(`undefined IC type - elem: ` + elem.outerHTML)
            }
            return newComp
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
