import "p5/global"
import { gallery } from "./gallery"

declare global {
    interface Window {
        preload(): void;
        setup(): void
        draw(): void
        activeTool(e: HTMLElement): void
        setModeClicked(e: HTMLElement): void
        gallery: typeof gallery,
        load(jsonString: string): boolean
    }
}
