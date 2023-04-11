import { gallery } from "../gallery"
import { LogicStatic } from "../LogicEditor"
import { Timestamp } from "../Timeline"

declare global {
    interface Window {

        Logic: LogicStatic

        // only set when in singleton mode
        gallery: typeof gallery,
        load(jsonStringOrObject: string | Record<string, unknown>): void
        save(): Record<string, unknown>
        highlight(ref: string | string[] | undefined): void
        logicalTime(): Timestamp
        formatString(str: string, ...varargs: any[]): string
        decompress(str: string): string | null
        decodeOld(str: string): string
    }
}
