import { gallery } from "./gallery"
import { Timestamp } from "./Timeline"

declare global {
    interface Window {
        gallery: typeof gallery,
        load(jsonString: string): string | undefined
        adjustedTime(): Timestamp
    }
}
