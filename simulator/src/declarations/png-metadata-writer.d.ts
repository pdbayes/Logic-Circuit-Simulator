declare module 'png-metadata-writer' {
    
    type PNGChunk = { name: string, data: Uint8Array }

    type PNGMetadata = {
        tEXt?: Record<string, string>,
        pHYs?: { x: number, y: number, unit: number }
    }

    function readMetadata(data: Uint8Array): PNGMetadata

    function extractChunks(data: Uint8Array): PNGChunk[]

    function insertMetadata(chunks: PNGChunk[], newMetadata: PNGMetadata): void

    function encodeChunks(chunks: PNGChunk[]): Uint8Array

}
