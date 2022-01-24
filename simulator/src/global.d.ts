import { gallery } from "./gallery"
import { Timestamp } from "./Timeline"

declare global {
    interface Window {
        gallery: typeof gallery,
        load(jsonString: string): boolean
        adjustedTime(): Timestamp
    }
}
