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

export enum GateType {
    NONE, // for testing usage
    NOT,
    AND,
    NAND,
    OR,
    NOR,
    XOR,
    XNOR,
}

export enum ICType {
    NONE, // for testing usage
    SR_LATCH_ASYNC,
    SR_LATCH_SYNC,
    FF_D_SINGLE,
    FF_D_MASTERSLAVE,
    FF_T,
    FF_JK,
}

export enum ElementType {
    NONE, // for testing usage
    LOGIC_GATE,
    FLIP_FLOP,
    LOGIC_INPUT,
    LOGIC_OUTPUT,
}

export enum SyncType {
    ASYNC,
    SYNC,
}

export enum InputState {
    FREE,
    TAKEN,
}
