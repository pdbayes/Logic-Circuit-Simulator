import { AsciiDisplay, AsciiDisplayRepr } from "./AsciiDisplay.js"
import { BarDisplay, BarDisplayRepr } from "./BarDisplay.js"
import { NibbleDisplay, NibbleDisplayRepr } from "./NibbleDisplay.js"

export type Display = NibbleDisplay | AsciiDisplay | BarDisplay

export type DisplayRepr = NibbleDisplayRepr | AsciiDisplayRepr | BarDisplayRepr

export const DisplayFactory = {

    make: (savedData: DisplayRepr) => {
        switch (savedData.type) {
            case "nibble":
                return new NibbleDisplay(savedData)
            case "ascii":
                return new AsciiDisplay(savedData)
            case "bar":
                return new BarDisplay(savedData)
        }
    },

}