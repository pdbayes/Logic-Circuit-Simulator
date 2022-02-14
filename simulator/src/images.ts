/* eslint-disable @typescript-eslint/ban-ts-comment */

// 'ts-ignore' works on the next line, so we need the next line
// @ts-ignore

import Adder from '../img/Adder.svg' // @ts-ignore
import ALU from '../img/ALU.svg' // @ts-ignore
import AND from '../img/AND.svg' // @ts-ignore
import AND3 from '../img/AND3.svg' // @ts-ignore
import AND4 from '../img/AND4.svg' // @ts-ignore
import BUF from '../img/BUF.svg' // @ts-ignore
import Clock from '../img/Clock.svg' // @ts-ignore
import FlipflopD from '../img/FlipflopD.svg' // @ts-ignore
import FlipflopJK from '../img/FlipflopJK.svg' // @ts-ignore
import FlipflopT from '../img/FlipflopT.svg' // @ts-ignore
import IMPLY from '../img/IMPLY.svg' // @ts-ignore
import InputBit from '../img/InputBit.svg' // @ts-ignore
import InputNibble from '../img/InputNibble.svg' // @ts-ignore
import InputRandom from '../img/InputRandom.svg' // @ts-ignore
import LatchSR from '../img/LatchSR.svg' // @ts-ignore
import NAND from '../img/NAND.svg' // @ts-ignore
import NAND3 from '../img/NAND3.svg' // @ts-ignore
import NAND4 from '../img/NAND4.svg' // @ts-ignore
import NIMPLY from '../img/NIMPLY.svg' // @ts-ignore
import NOR from '../img/NOR.svg' // @ts-ignore
import NOR3 from '../img/NOR3.svg' // @ts-ignore
import NOR4 from '../img/NOR4.svg' // @ts-ignore
import NOT from '../img/NOT.svg' // @ts-ignore
import OR from '../img/OR.svg' // @ts-ignore
import OR3 from '../img/OR3.svg' // @ts-ignore
import OR4 from '../img/OR4.svg' // @ts-ignore
import OutputAscii from '../img/OutputAscii.svg' // @ts-ignore
import OutputBar from '../img/OutputBar.svg' // @ts-ignore
import OutputBit from '../img/OutputBit.svg' // @ts-ignore
import OutputNibble from '../img/OutputNibble.svg' // @ts-ignore
import OutputShiftBuffer from '../img/OutputShiftBuffer.svg' // @ts-ignore
import RAM from '../img/RAM.svg' // @ts-ignore
import Register from '../img/Register.svg' // @ts-ignore
import TXA from '../img/TXA.svg' // @ts-ignore
import XNOR from '../img/XNOR.svg' // @ts-ignore
import XNOR3 from '../img/XNOR3.svg' // @ts-ignore
import XNOR4 from '../img/XNOR4.svg' // @ts-ignore
import XOR from '../img/XOR.svg' // @ts-ignore
import XOR3 from '../img/XOR3.svg' // @ts-ignore
import XOR4 from '../img/XOR4.svg' // @ts-ignore

void 0 // dummy line to consume the last 'ts-ignore'

const images = {
    Adder,
    ALU,
    AND,
    AND3,
    AND4,
    BUF,
    Clock,
    FlipflopD,
    FlipflopJK,
    FlipflopT,
    IMPLY,
    InputBit,
    InputNibble,
    InputRandom,
    LatchSR,
    NAND,
    NAND3,
    NAND4,
    NIMPLY,
    NOR,
    NOR3,
    NOR4,
    NOT,
    OR,
    OR3,
    OR4,
    OutputAscii,
    OutputBar,
    OutputBit,
    OutputNibble,
    OutputShiftBuffer,
    RAM,
    Register,
    TXA,
    XNOR,
    XNOR3,
    XNOR4,
    XOR,
    XOR3,
    XOR4,
}

export type ImageName = keyof typeof images

export function makeImage(name: ImageName, width?: number, height?: number): HTMLImageElement {
    const htmlImg = new Image(width, height)
    htmlImg.src = images[name]
    return htmlImg
}
