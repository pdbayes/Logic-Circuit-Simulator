import { Component } from "./components/Component"
import { GateFactory } from "./components/Gates"
import { ICFactory } from "./components/IC"
import { InputFactory } from "./components/Inputs"
import { LabelFactory } from "./components/Labels"
import { LayoutFactory } from "./components/Layout"
import { OutputFactory } from "./components/Outputs"
import { LogicEditor } from "./LogicEditor"
import { isDefined, isUndefined, RichStringEnum } from "./utils"

type Factory = { make(editor: LogicEditor, type: string | undefined, params: Record<string, unknown> | undefined): Component | undefined }

function makeFactory(compType: string, factory: Factory) {
    return {
        make: (editor: LogicEditor, elem: HTMLElement, params: Record<string, unknown> | undefined) => {
            const compDataset = elem.dataset
            const type = compDataset["type"]
            const newComp = factory.make(editor, type === null ? undefined : type, params)
            if (isUndefined(newComp)) {
                throw new Error(`undefined '${compType}' type - elem: ` + elem.outerHTML)
            }

            // further general component customisation based on editor options
            const classId = compDataset["classid"]
            if (isUndefined(classId)) {
                console.log("WARN No class ID linked to elem " + elem.outerHTML)
            } else {
                const compConfig = editor.options.initParams?.[classId]
                if (isDefined(compConfig)) {
                    let val
                    if (isDefined(val = compConfig.orient)) {
                        newComp.doSetOrient(val)
                    }
                }
            }
            return newComp
        },
    }
}

const ComponentFactoryTypes = RichStringEnum.withProps<{
    make(editor: LogicEditor, elem: HTMLElement, params: Record<string, unknown> | undefined): Component,
}>()({
    "in": makeFactory("in", InputFactory),
    "out": makeFactory("out", OutputFactory),
    "gate": makeFactory("gate", GateFactory),
    "component": makeFactory("component", ICFactory),
    "label": makeFactory("label", LabelFactory),
    "layout": makeFactory("layout", LayoutFactory),
})
// type ComponentFactoryType = typeof ComponentFactoryTypes.type

class _ComponentFactory {
    public makeFactoryForButton(elem: HTMLElement) {
        const compType = elem.dataset["component"]
        if (!ComponentFactoryTypes.includes(compType)) {
            throw new Error(`bad component category: '${compType}'; expected one of: ` + ComponentFactoryTypes.values.join(", "))
        }
        const compDef = ComponentFactoryTypes.props[compType]

        return (editor: LogicEditor, params: Record<string, unknown> | undefined): Component => {
            const newComp = compDef.make(editor, elem, params)
            editor.components.add(newComp)
            return newComp
        }
    }
}

export const ComponentFactory = new _ComponentFactory()
