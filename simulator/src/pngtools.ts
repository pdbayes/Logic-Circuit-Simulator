import { crc32_buf } from "./crc32"

export function blobToArrayBuffer(blob: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
        // Blob -> ArrayBuffer
        const fileReader = new FileReader()
        fileReader.onload = function (event) {
            const arrayBuffer = event.target!.result
            if (arrayBuffer instanceof ArrayBuffer) {
                resolve(arrayBuffer)
            } else {
                reject(new Error("blobToArrayBuffer: fileReader.onload: result is not an ArrayBuffer"))
            }

            // warn if read values are not the same as the original values
            // arrayEqual from: http://stackoverflow.com/questions/3115982/how-to-check-javascript-array-equals
            // function arrayEqual(a, b) {
            //   return !(a < b || b < a);
            // }
            // if (arrayBufferNew.byteLength !== arrayBuffer.byteLength) // should be 3
            //   reject("ArrayBuffer byteLength does not match");
            // if (arrayEqual(uint8ArrayNew, uint8Array) !== true) // should be [1,2,3]
            //   reject("Uint8Array does not match");
        }
        fileReader.readAsArrayBuffer(blob)
        fileReader.result // also accessible this way once the blob has been read
    })
}



/**
 * library to read and write PNG Metadata
 *
 * References:
 * w3 PNG Chunks specification: https://www.w3.org/TR/PNG-Chunks.html
 * The Metadata in PNG files: https://dev.exiv2.org/projects/exiv2/wiki/The_Metadata_in_PNG_files
 */


// Used for fast-ish conversion between uint8s and uint32s/int32s.
// Also required in order to remain agnostic for both Node Buffers and
// Uint8Arrays.
const uint8 = new Uint8Array(4)
const int32 = new Int32Array(uint8.buffer)
const uint32 = new Uint32Array(uint8.buffer)

const RESOLUTION_UNITS = { UNDEFINED: 0, METERS: 1, INCHES: 2 }

/**
 * https://github.com/aheckmann/sliced
 * An Array.prototype.slice.call(arguments) alternative
 * @param {Object} args something with a length
 * @param {Number} slice
 * @param {Number} sliceEnd
 * @api public
 */
function sliced<T>(args: { length: number, [n: number]: T }, slice: number, sliceEnd: number): T[] {
    const ret: T[] = []
    let len = args.length

    if (0 === len) { return ret }

    const start = slice < 0
        ? Math.max(0, slice + len)
        : slice || 0

    if (sliceEnd !== undefined) {
        len = sliceEnd < 0
            ? sliceEnd + len
            : sliceEnd
    }

    while (len-- > start) {
        ret[len - start] = args[len]
    }

    return ret
}

/**
 * https://github.com/hughsk/png-chunk-text
 * Returns a chunk object containing the metadata for a given key and value:
 * @param keyword
 * @param content
 * @param chunkName
 * @returns {{data: Uint8Array, name: 'tEXt'}}
 */
function textEncode(keyword: string, content: string, chunkName = 'tEXt') {

    // eslint-disable-next-line no-control-regex
    if (content.length && (!/^[\x00-\xFF]+$/.test(keyword) || !/^[\x00-\xFF]+$/.test(content))) {
        throw new Error('Only Latin-1 characters are permitted in PNG tEXt chunks. You might want to consider base64 encoding and/or zEXt compression')
    }

    if (keyword.length >= 80) {
        throw new Error('Keyword "' + keyword + '" is longer than the 79-character limit imposed by the PNG specification')
    }

    const totalSize = keyword.length + content.length + 1
    const output = new Uint8Array(totalSize)
    let idx = 0
    let code

    for (let i = 0; i < keyword.length; i++) {
        if (!(code = keyword.charCodeAt(i))) {
            throw new Error('0x00 character is not permitted in tEXt keywords')
        }

        output[idx++] = code
    }

    output[idx++] = 0

    for (let j = 0; j < content.length; j++) {
        if (!(code = content.charCodeAt(j))) {
            throw new Error('0x00 character is not permitted in tEXt content')
        }

        output[idx++] = code
    }

    return {
        name: chunkName,
        data: output,
    }
}

/**
 * https://github.com/hughsk/png-chunk-text
 * Reads a Uint8Array or Node.js Buffer instance containing a tEXt PNG chunk's data and returns its keyword/text:
 * @param data
 * @returns {{text: string, keyword: string}}
 */
function textDecode(data: Uint8Array) {

    let naming = true
    let text = ''
    let name = ''

    for (let i = 0; i < data.length; i++) {
        const code = data[i]

        if (naming) {
            if (code) {
                name += String.fromCharCode(code)
            } else {
                naming = false
            }
        } else {
            if (code) {
                text += String.fromCharCode(code)
            } else {
                throw new Error('Invalid NULL character found. 0x00 character is not permitted in tEXt content')
            }
        }
    }

    return {
        keyword: name,
        text: text,
    }
}

/**
 * https://github.com/hughsk/png-chunks-extract
 * Extract the data chunks from a PNG file.
 * Useful for reading the metadata of a PNG image, or as the base of a more complete PNG parser.
 * Takes the raw image file data as a Uint8Array or Node.js Buffer, and returns an array of chunks. Each chunk has a name and data buffer:
 * @param data {Uint8Array}
 * @returns {[{name: String, data: Uint8Array}]}
 */
function extractChunks(data: Uint8Array): Array<{ name: string, data: Uint8Array }> {
    if (data[0] !== 0x89) { throw new Error('Invalid .png file header') }
    if (data[1] !== 0x50) { throw new Error('Invalid .png file header') }
    if (data[2] !== 0x4E) { throw new Error('Invalid .png file header') }
    if (data[3] !== 0x47) { throw new Error('Invalid .png file header') }
    if (data[4] !== 0x0D) { throw new Error('Invalid .png file header: possibly caused by DOS-Unix line ending conversion?') }
    if (data[5] !== 0x0A) { throw new Error('Invalid .png file header: possibly caused by DOS-Unix line ending conversion?') }
    if (data[6] !== 0x1A) { throw new Error('Invalid .png file header') }
    if (data[7] !== 0x0A) { throw new Error('Invalid .png file header: possibly caused by DOS-Unix line ending conversion?') }

    let ended = false
    const chunks = []
    let idx = 8

    while (idx < data.length) {
        // Read the length of the current chunk,
        // which is stored as a Uint32.
        uint8[3] = data[idx++]
        uint8[2] = data[idx++]
        uint8[1] = data[idx++]
        uint8[0] = data[idx++]

        // Chunk includes name/type for CRC check (see below).
        const length = uint32[0] + 4
        const chunk = new Uint8Array(length)
        chunk[0] = data[idx++]
        chunk[1] = data[idx++]
        chunk[2] = data[idx++]
        chunk[3] = data[idx++]

        // Get the name in ASCII for identification.
        const name = (
            String.fromCharCode(chunk[0]) +
            String.fromCharCode(chunk[1]) +
            String.fromCharCode(chunk[2]) +
            String.fromCharCode(chunk[3])
        )

        // The IHDR header MUST come first.
        if (!chunks.length && name !== 'IHDR') {
            throw new Error('IHDR header missing')
        }

        // The IEND header marks the end of the file,
        // so on discovering it break out of the loop.
        if (name === 'IEND') {
            ended = true
            chunks.push({
                name: name,
                data: new Uint8Array(0),
            })

            break
        }

        // Read the contents of the chunk out of the main buffer.
        for (let i = 4; i < length; i++) {
            chunk[i] = data[idx++]
        }

        // Read out the CRC value for comparison.
        // It's stored as an Int32.
        uint8[3] = data[idx++]
        uint8[2] = data[idx++]
        uint8[1] = data[idx++]
        uint8[0] = data[idx++]

        const crcActual = int32[0]
        const crcExpect = crc32_buf(chunk)
        if (crcExpect !== crcActual) {
            throw new Error(
                'CRC values for ' + name + ' header do not match, PNG file is likely corrupted'
            )
        }

        // The chunk data is now copied to remove the 4 preceding
        // bytes used for the chunk name/type.
        const chunkData = new Uint8Array(chunk.buffer.slice(4))

        chunks.push({
            name: name,
            data: chunkData,
        })
    }

    if (!ended) {
        throw new Error('.png file ended prematurely: no IEND header was found')
    }

    return chunks
}

/**
 * https://github.com/hughsk/png-chunks-encode
 * Return a fresh PNG buffer given a set of PNG chunks. Useful in combination with png-chunks-encode to easily modify or add to the data of a PNG file.
 * Takes an array of chunks, each with a name and data:
 * @param chunks {[{name: String, data: Uint8Array}]}
 * @returns {Uint8Array}
 */
function encodeChunks(chunks: PNGChunk[]) {
    let totalSize = 8
    let idx = totalSize
    let i

    for (i = 0; i < chunks.length; i++) {
        totalSize += chunks[i].data.length
        totalSize += 12
    }

    const output = new Uint8Array(totalSize)

    output[0] = 0x89
    output[1] = 0x50
    output[2] = 0x4E
    output[3] = 0x47
    output[4] = 0x0D
    output[5] = 0x0A
    output[6] = 0x1A
    output[7] = 0x0A

    for (i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const name = chunk.name
        const data = chunk.data
        const size = data.length
        const nameChars = [
            name.charCodeAt(0),
            name.charCodeAt(1),
            name.charCodeAt(2),
            name.charCodeAt(3),
        ]

        uint32[0] = size
        output[idx++] = uint8[3]
        output[idx++] = uint8[2]
        output[idx++] = uint8[1]
        output[idx++] = uint8[0]

        output[idx++] = nameChars[0]
        output[idx++] = nameChars[1]
        output[idx++] = nameChars[2]
        output[idx++] = nameChars[3]

        for (let j = 0; j < size;) {
            output[idx++] = data[j++]
        }

        const crcCheck = nameChars.concat(sliced(data, 0, 0))
        int32[0] = crc32_buf(crcCheck)
        output[idx++] = uint8[3]
        output[idx++] = uint8[2]
        output[idx++] = uint8[1]
        output[idx++] = uint8[0]
    }

    return output
}

/**
 * read 4 bytes number from UInt8Array.
 * @param uint8array
 * @param offset
 * @returns {number}
 */
function readUint32(uint8array: Uint8Array, offset: number) {
    const byte1 = uint8array[offset++]
    const byte2 = uint8array[offset++]
    const byte3 = uint8array[offset++]
    const byte4 = uint8array[offset]
    return 0 | (byte1 << 24) | (byte2 << 16) | (byte3 << 8) | byte4
}

/**
 * write 4 bytes number to UInt8Array.
 * @param uint8array
 * @param num
 * @param offset
 */
function writeUInt32(uint8array: Uint8Array, num: number, offset: number) {
    uint8array[offset] = (num & 0xff000000) >> 24
    uint8array[offset + 1] = (num & 0x00ff0000) >> 16
    uint8array[offset + 2] = (num & 0x0000ff00) >> 8
    uint8array[offset + 3] = (num & 0x000000ff)
}

/**
 * Get object with PNG metadata. only tEXt and pHYs chunks are parsed
 * @param buffer {Buffer}
 * @returns {{tEXt: {keyword: value}, pHYs: {x: number, y: number, units: RESOLUTION_UNITS}, [string]: true}}
 */
export function readMetadata(buffer: Uint8Array): PNGMetadata {
    const result: PNGMetadata = {}
    const chunks = extractChunks(buffer)
    chunks.forEach(chunk => {
        switch (chunk.name) {
            case 'tEXt': {
                if (!("tEXt" in result)) {
                    result.tEXt = {}
                }
                const textChunk = textDecode(chunk.data)
                result.tEXt![textChunk.keyword] = textChunk.text
                break
            }
            case 'pHYs':
                result.pHYs = {
                    // Pixels per unit, X axis: 4 bytes (unsigned integer)
                    "x": readUint32(chunk.data, 0),
                    // Pixels per unit, Y axis: 4 bytes (unsigned integer)
                    "y": readUint32(chunk.data, 4),
                    "unit": chunk.data[8],
                }
                break
            case 'gAMA':
            case 'cHRM':
            case 'sRGB':
            case 'IHDR':
            case 'iCCP':
            default:
            // result[chunk.name] = true
        }
    })
    return result
}

/**
 * create new Buffer with metadata. only tEXt and pHYs chunks are supported.
 * @param buffer {Buffer}
 * @param metadata {{tEXt: {keyword: value}, pHYs: {x: number, y: number, units: RESOLUTION_UNITS}}}
 * @returns {Buffer}
 */
export function writeMetadata(buffer: Uint8Array, metadata: PNGMetadata) {
    const chunks = extractChunks(buffer)
    insertMetadata(chunks, metadata)
    return encodeChunks(chunks).buffer
}

/**
 * the same. but for Blobs
 * @param blob {Blob}
 * @param metadata {{tEXt: {keyword: value}, pHYs: {x: number, y: number, units: RESOLUTION_UNITS}}}
 * @returns {Promise<Blob>} new blob
 */
export async function writeMetadataB(blob: Blob, metadata: PNGMetadata) {
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const newBuffer = writeMetadata(uint8Array, metadata)
    return new Blob([newBuffer], { type: blob.type })
}

type PNGChunk = { name: string, data: Uint8Array }

type PNGMetadata = {
    tEXt?: Record<string, string>,
    pHYs?: { x: number, y: number, unit: number }
}

function insertMetadata(chunks: PNGChunk[], metadata: PNGMetadata) {
    // if (metadata.clear) {
    //     for (let i = chunks.length - 1; i--;) {
    //         switch (chunks[i].name) {
    //             case 'IHDR':
    //             case 'IDAT':
    //             case 'IEND':
    //                 break
    //             default:
    //                 chunks.splice(i, 1)
    //         }
    //     }
    // }
    if (metadata.tEXt) {
        for (const keyword in metadata.tEXt) {
            chunks.splice(-1, 0, textEncode(keyword, metadata.tEXt[keyword]))
        }
    }

    if (metadata.pHYs) {
        const data = new Uint8Array(9)
        writeUInt32(data, metadata.pHYs.x, 0)
        writeUInt32(data, metadata.pHYs.y, 4)
        data[8] = metadata.pHYs.unit // inches

        const pHYs = chunks.find(chunk => chunk.name === "pHYs")
        if (pHYs) {
            pHYs.data = data
        }
        else {
            chunks.splice(1, 0, { name: "pHYs", data: data })
        }
    }
}
