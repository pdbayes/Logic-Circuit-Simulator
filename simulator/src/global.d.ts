import { gallery } from "./gallery"

declare global {
    interface Window {
        activeTool(e: HTMLElement): void
        setModeClicked(e: HTMLElement): void
        gallery: typeof gallery,
        load(jsonString: string): boolean
        setOptions(opts: Record<string, unknown>): void
    }
}
