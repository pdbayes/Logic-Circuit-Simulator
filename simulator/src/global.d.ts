import "p5/global"

declare global {
    interface Window {
        preload(): void;
        setup(): void
        draw(): void
        activeTool(e: HTMLElement): void
        setModeClicked(e: HTMLElement): void
        load(jsonString: string): boolean
    }
}
