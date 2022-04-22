import { gallery } from "./gallery"
import { Timestamp } from "./Timeline"

declare global {
    interface Window {
        gallery: typeof gallery,
        load(jsonStringOrObject: string | Record<string, unknown>): void
        save(): Record<string, unknown>
        adjustedTime(): Timestamp
        formatString(str: string, ...varargs: any[]): string
    }
}
