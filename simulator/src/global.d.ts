import { gallery } from "./gallery"

declare global {
    interface Window {
        gallery: typeof gallery,
        load(jsonString: string): boolean
    }
}
