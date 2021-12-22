export type Dict<T> = Record<string, T | undefined>
export type TimeoutHandle = NodeJS.Timeout

// Better types for an Object.keys() replacement
export function keysOf<K extends keyof any>(d: Record<K, any>): K[]
// eslint-disable-next-line @typescript-eslint/ban-types
export function keysOf<K extends {}>(o: K): (keyof K)[]
export function keysOf(o: any) {
    return Object.keys(o)
}

// Allows nice definitions of enums with associated data
export class RichStringEnum<K extends keyof any, P> {

    static withProps<P0>() {
        return function <K0 extends keyof any>(defs: Record<K0, P0>) {
            return new RichStringEnum<K0, P0>(defs)
        }
    }

    private _values: Array<K>

    private constructor(private props: Record<K, P>) {
        this._values = keysOf(props)
        for (let i = 0; i < this._values.length; i++) {
            this[i] = this._values[i]
        }
    }

    get type(): K {
        throw new Error()
    }

    get values(): Array<K> {
        return this._values
    }

    get length(): number {
        return this._values.length
    }

    get definitions(): Array<[K, P]> {
        const defs: Array<[K, P]> = []
        for (const i of this._values) {
            defs.push([i, this.props[i]])
        }
        return defs
    }

    isValue(val: string | number | symbol | null | undefined): val is K {
        return this.values.includes(val as any)
    }

    indexOf(val: K): number {
        return this.values.indexOf(val)
    }

    propsOf(key: K): P {
        return this.props[key]
    }

    [i: number]: K

    *[Symbol.iterator]() {
        for (const i of this._values) {
            yield i
        }
    }

}

// Utility types to force the evaluation of computed types
// See: https://stackoverflow.com/a/57683652/390581

// expands object types one level deep
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

// expands object types recursively
export type ExpandRecursively<T> = T extends Record<string, unknown>
    ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
    : T


export type OptionalKeys<T> = { [P in keyof T]-?: undefined extends T[P] ? P : never }[keyof T]
export type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>

export type PartialWhereUndefinedRecursively<T> = ExpandRecursively<_PartialWhereUndefinedRecursively<T>>

type _PartialWhereUndefinedRecursively<T> =
    // is it an object?
    T extends Record<string, unknown>
    ? T extends infer O ? {
        [P in RequiredKeys<O>]: _PartialWhereUndefinedRecursively<O[P]>
    } & {
        [P in OptionalKeys<O>]?: _PartialWhereUndefinedRecursively<O[P]>
    }
    : never // "closing the infer block"

    // is it an array?
    : T extends ReadonlyArray<infer E>
    ? Array<_PartialWhereUndefinedRecursively<E>>

    // other types
    : T

// uses for statically typing the number of component inputs
export type Plus<A extends number, B extends number> =
    B extends 1 ? Plus1<A> :
    B extends 2 ? Plus2<A> :
    B extends 3 ? Plus3<A> :
    never

export type Plus1<N extends number> =
    N extends 0 ? 1 :
    N extends 1 ? 2 :
    N extends 2 ? 3 :
    N extends 3 ? 4 :
    N extends 4 ? 5 :
    N extends 5 ? 6 :
    N extends 6 ? 7 :
    N extends 7 ? 8 :
    N extends 8 ? 9 :
    never

export type Plus2<N extends number> =
    N extends 0 ? 2 :
    N extends 1 ? 3 :
    N extends 2 ? 4 :
    N extends 3 ? 5 :
    N extends 4 ? 6 :
    N extends 5 ? 7 :
    N extends 6 ? 8 :
    N extends 7 ? 9 :
    N extends 8 ? 10 :
    never

export type Plus3<N extends number> =
    N extends 0 ? 3 :
    N extends 1 ? 4 :
    N extends 2 ? 5 :
    N extends 3 ? 6 :
    N extends 4 ? 7 :
    N extends 5 ? 8 :
    N extends 6 ? 9 :
    N extends 7 ? 10 :
    N extends 8 ? 11 :
    never


// Series of type-assertion functions

export function isUndefined(v: unknown): v is undefined {
    return typeof v === "undefined"
}

export function isDefined<T>(v: T | undefined): v is T {
    return typeof v !== "undefined"
}

export function isNullOrUndefined(v: unknown): v is null | undefined {
    return isUndefined(v) || v === null
}

export function isNull<T>(v: T | null): v is null {
    return v === null
}

export function isNotNull<T>(v: T | null): v is T {
    return v !== null
}

export function isString(v: unknown): v is string {
    return typeof v === "string"
}

export function isArray(arg: unknown): arg is ReadonlyArray<any> {
    return Array.isArray(arg)
}

export function isEmpty(container: { length: number } | { size: number }): boolean {
    return ("length" in container ? container.length : container.size) === 0
}

export function nonEmpty(container: { length: number } | { size: number }): boolean {
    return !isEmpty(container)
}

export function isEmptyObject(obj: Record<string, unknown>): boolean {
    return Object.keys(obj).length === 0
}

export function isNumber(arg: unknown): arg is number {
    return typeof arg === "number"
}

export function isBoolean(arg: unknown): arg is boolean {
    return typeof arg === "boolean"
}

import * as t from "io-ts"

// Fixed-size arrays up to 8 to model inputs statically

export type FixedArraySize = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
export type FixedArraySizeNonZero = Exclude<FixedArraySize, 0>
export type FixedArraySizeSeveral = Exclude<FixedArraySizeNonZero, 1>

export type FixedArray<T, N extends FixedArraySize> =
    N extends 0 ? []
    : N extends 1 ? [T]
    : N extends 2 ? [T, T]
    : N extends 3 ? [T, T, T]
    : N extends 4 ? [T, T, T, T]
    : N extends 5 ? [T, T, T, T, T]
    : N extends 6 ? [T, T, T, T, T, T]
    : N extends 7 ? [T, T, T, T, T, T, T]
    : N extends 8 ? [T, T, T, T, T, T, T, T]
    : N extends 9 ? [T, T, T, T, T, T, T, T, T]
    : N extends 10 ? [T, T, T, T, T, T, T, T, T, T]
    : N extends 11 ? [T, T, T, T, T, T, T, T, T, T, T]
    :/*N extends 12*/[T, T, T, T, T, T, T, T, T, T, T, T]

export type FixedReadonlyArray<T, N extends FixedArraySize> =
    N extends 0 ? readonly []
    : N extends 1 ? readonly [T]
    : N extends 2 ? readonly [T, T]
    : N extends 3 ? readonly [T, T, T]
    : N extends 4 ? readonly [T, T, T, T]
    : N extends 5 ? readonly [T, T, T, T, T]
    : N extends 6 ? readonly [T, T, T, T, T, T]
    : N extends 7 ? readonly [T, T, T, T, T, T, T]
    : N extends 8 ? readonly [T, T, T, T, T, T, T, T]
    : N extends 9 ? readonly [T, T, T, T, T, T, T, T, T]
    : N extends 10 ? readonly [T, T, T, T, T, T, T, T, T, T]
    : N extends 11 ? readonly [T, T, T, T, T, T, T, T, T, T, T]
    :/*N extends 12*/readonly [T, T, T, T, T, T, T, T, T, T, T, T]

// type HashSize1 = { readonly HasSize1: unique symbol }
// type H<N extends number, T> = { [K in `HasSize${N}`]: T }
interface HasSizeNBrand<__ extends number> {
    readonly HasSizeN: unique symbol // TODO check unique per N
}

export const FixedArray = <T extends t.Mixed, N extends FixedArraySize>(tpe: T, n: N) =>
    t.brand(
        t.array(tpe, `array of size ${n}`),
        (arr): arr is t.Branded<[t.TypeOf<T>], HasSizeNBrand<N>> => arr.length === n,
        "HasSizeN"
    )

export function FixedArrayFill<T, N extends FixedArraySize>(val: T, n: N): FixedArray<T, N> {
    return Array(n).fill(val) as FixedArray<T, N>
}

// This seemingly identity function allows to convert back from a fixed-size tuple
// to a regular array. It is a safe type cast, in a way, and allows to see the
// regular array methods as well as to use the for-of iteration on these tuples
export function asArray<T, N extends FixedArraySize>(tuple: FixedArray<T, N>): ReadonlyArray<T> {
    return tuple
}

export function isTruthyString(str: string | null | undefined): boolean {
    return !isNullOrUndefined(str) && (str === "1" || str.toLowerCase() === "true")
}

export function isFalsyString(str: string | null | undefined): boolean {
    return !isNullOrUndefined(str) && (str === "0" || str.toLowerCase() === "false")
}

export function getURLParameter<T>(sParam: string, defaultValue: T): string | T
export function getURLParameter(sParam: string, defaultValue?: undefined): string | undefined
export function getURLParameter(sParam: string, defaultValue: any) {
    const sPageURL = window.location.search.substring(1)
    const sURLVariables = sPageURL.split('&')
    for (let i = 0; i < sURLVariables.length; i++) {
        const sParameterName = sURLVariables[i].split('=')
        if (sParameterName[0] === sParam) {
            return sParameterName[1]
        }
    }
    return defaultValue
}

export function setVisible(elem: HTMLElement, visible: boolean) {
    if (visible) {
        const prevDisplay = elem.getAttribute("data-prev-display")
        if (prevDisplay === null) {
            if (elem.style.display === "none") {
                elem.style.removeProperty("display")
            } else {
                // not hidden
            }
        } else {
            elem.removeAttribute("data-prev-display")
            elem.style.display = prevDisplay
        }
    } else {
        const currentDisplay = elem.style.display
        if (currentDisplay.length !== 0 && currentDisplay !== "none") {
            elem.setAttribute("data-prev-display", currentDisplay)
        }
        elem.style.display = "none"
    }
}


// More general-purpose utility functions

export function any(bools: boolean[]): boolean {
    for (const b of bools) {
        if (b) {
            return true
        }
    }
    return false
}

export function repeatString(c: string, n: number) {
    return Array(n + 1).join(c)
}


// io-ts utils

export function forceTypeOf<U, V, W>(tpe: t.Type<U, V, W>) {
    return {
        toMoreSpecific: function <UU extends U>() {
            return tpe as unknown as t.Type<UU, V, W>
        },
    }
}

export const typeOrUndefined = <T extends t.Mixed>(tpe: T) => {
    return t.union([tpe, t.undefined], tpe.name + " | undefined")
}


// Unset; TriState

export const HighImpedance = "F" as const // "floating"
export type HighImpedance = typeof HighImpedance
export const Unset = "?" as const
export type unset = typeof Unset
export function isUnset<T>(v: T | unset): v is unset {
    return v === Unset
}
export const TUnset = new t.Type<unset>(
    "unset",
    isUnset,
    (input, context) => isUnset(input) ? t.success(input) : t.failure(input, context),
    t.identity,
)

export type TriState = boolean | unset
export const TriState = {
    invert(v: TriState): TriState {
        return isUnset(v) ? v : !v
    },
}

export type TriStateRepr = 0 | 1 | unset
export const TriStateRepr = new t.Type<TriStateRepr>(
    "0|1|'?'",
    (v: unknown): v is TriStateRepr => isUnset(v) || v === 1 || v === 0,
    (input, context) => isUnset(input) ? t.success(input) :
        input === 1 ? t.success(1) :
            input === 0 ? t.success(0) :
                t.failure(input, context),
    t.identity,
)

// TODO put this in TriState object
export function toTriStateRepr(v: TriState): TriStateRepr
export function toTriStateRepr(v: TriState | undefined): TriStateRepr | undefined
export function toTriStateRepr(v: TriState | undefined): TriStateRepr | undefined {
    switch (v) {
        case true: return 1
        case false: return 0
        case Unset: return Unset
        case undefined: return undefined
    }
}

export function toTriState(v: TriStateRepr): TriState
export function toTriState(v: TriStateRepr | undefined): TriState | undefined
export function toTriState(v: TriStateRepr | undefined): TriState | undefined {
    switch (v) {
        case 1: return true
        case 0: return false
        case Unset: return Unset
        case undefined: return undefined
    }
}


// Enums or RichEnums used in several files

export enum Mode {
    STATIC,  // cannot interact in any way
    TRYOUT,  // can change inputs on predefined circuit
    CONNECT, // can additionnally move preexisting components around and connect them
    DESIGN,  // can additionally add components from left menu
    FULL,    // can additionally force output nodes to 'unset' state and draw undetermined dates
}

export function copyToClipboard(textToCopy: string): boolean {
    function isOS() {
        //can use a better detection logic here
        return navigator.userAgent.match(/ipad|iphone/i)
    }

    const textArea = document.createElement('textArea') as unknown as HTMLTextAreaElement
    textArea.readOnly = true
    textArea.contentEditable = "true"
    textArea.value = textToCopy
    document.body.appendChild(textArea)

    if (isOS()) {
        const range = document.createRange()
        range.selectNodeContents(textArea)
        const selection = window.getSelection()
        if (isNotNull(selection)) {
            selection.removeAllRanges()
            selection.addRange(range)
            textArea.setSelectionRange(0, 999999)
        }
    } else {
        textArea.select()
    }

    const ok = document.execCommand('copy')
    document.body.removeChild(textArea)
    return ok
}
