import { Component } from "./components/Component"
import { GateFactory } from "./components/Gate"
import { ICFactory } from "./components/IC"
import { InputFactory } from "./components/Inputs"
import { LabelFactory } from "./components/Labels"
import { OutputFactory } from "./components/Outputs"
import { LogicEditor } from "./LogicEditor"
import { isUndefined, RichStringEnum } from "./utils"

type Factory = { make(editor: LogicEditor, type: string | undefined): Component | undefined }

function makeFactory(compType: string, factory: Factory) {
    return {
        make: (editor: LogicEditor, elem: HTMLElement) => {
            const type = elem.dataset["type"]
            const newComp = factory.make(editor, type === null ? undefined : type)
            if (isUndefined(newComp)) {
                throw new Error(`undefined '${compType}' type - elem: ` + elem.outerHTML)
            }
            return newComp
        },
    }
}

const ComponentFactoryTypes = RichStringEnum.withProps<{
    make(editor: LogicEditor, elem: HTMLElement): Component,
}>()({
    "in": makeFactory("in", InputFactory),
    "out": makeFactory("out", OutputFactory),
    "gate": makeFactory("gate", GateFactory),
    "component": makeFactory("component", ICFactory),
    "label": makeFactory("label", LabelFactory),
})
// type ComponentFactoryType = typeof ComponentFactoryTypes.type

class _ComponentFactory {
    makeFactoryForButton(elem: HTMLElement): (editor: LogicEditor) => Component {
        const compType = elem.dataset["component"]
        if (!ComponentFactoryTypes.isValue(compType)) {
            throw new Error(`bad component category: '${compType}'; expected one of: ` + ComponentFactoryTypes.values.join(", "))
        }
        const compDef = ComponentFactoryTypes.propsOf(compType)
        return (editor) => {
            const newComp = compDef.make(editor, elem)
            editor.components.add(newComp)
            return newComp
        }
    }
}

export const ComponentFactory = new _ComponentFactory()
