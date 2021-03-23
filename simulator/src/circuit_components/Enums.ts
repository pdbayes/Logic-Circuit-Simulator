export type Dict<T> = Record<string, T | undefined>

export function keysOf<K extends keyof any>(d: Record<K, any>): K[]
// eslint-disable-next-line @typescript-eslint/ban-types
export function keysOf<K extends {}>(o: K): (keyof K)[]

export function keysOf(o: any) {
    return Object.keys(o)
}

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

    isValue(val: string | number | symbol): val is K {
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

export enum Mode {
    STATIC,
    TRYOUT,
    CONNECT,
    FULL,
}

export enum MouseAction {
    EDIT,
    MOVE,
    DELETE,
}

export enum ICType {
    SR_LATCH_ASYNC,
    SR_LATCH_SYNC,
    FF_D_SINGLE,
    FF_D_MASTERSLAVE,
    FF_T,
    FF_JK,
}

export enum ElementType {
    LOGIC_GATE,
    FLIP_FLOP,
    LOGIC_INPUT,
    LOGIC_OUTPUT,
}

export enum SyncType {
    ASYNC,
    SYNC,
}

