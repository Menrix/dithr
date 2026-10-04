import { Media } from "@capacitor-community/media";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Toast } from "@capacitor/toast";
import { rotateImageData } from "./image-encoder";

export type ImageBitDepth = 24 | 8 | 4 | 2 | 1;

const MIME_TYPES = {
    'jpg': 'image/jpeg',
    'png': 'image/png',
} satisfies Partial<Record<ExportFormat, string>>;

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // strip data:*/*;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function getOrCreateAlbumId(name: string): Promise<string> {
    const { albums } = await Media.getAlbums();
    const existing = albums.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (existing) {
        return existing.identifier;
    }

    await Media.createAlbum({ name });

    const { albums: updated } = await Media.getAlbums();
    const created = updated.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (!created) {
        throw new Error('Album creation failed silently');
    }

    return created.identifier;
}

function writeHeaders(
    view: DataView,
    fileSize: number,
    pixelDataOffset: number,
    width: number,
    height: number,
    bitDepth: number,
    pixelDataSize: number,
    clrUsed = 0,
): void {
    view.setUint8(0, 0x42);
    view.setUint8(1, 0x4d);
    view.setUint32(2, fileSize, true);
    view.setUint32(10, pixelDataOffset, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    view.setInt32(22, -height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, bitDepth, true);
    view.setUint32(34, pixelDataSize, true);
    view.setInt32(38, 2835, true);
    view.setInt32(42, 2835, true);
    view.setUint32(46, clrUsed, true);
    view.setUint32(50, clrUsed, true);
}

function encode24bitBmp(width: number, height: number, data: Uint8ClampedArray): Blob {
    const rowStride = (3 * width + 3) & ~3;
    const pixelDataSize = rowStride * height;
    const fileSize = 54 + pixelDataSize;
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    writeHeaders(view, fileSize, 54, width, height, 24, pixelDataSize);

    const padding = rowStride - width * 3;
    let offset = 54;
    let srcIdx = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++, srcIdx += 4) {
            bytes[offset++] = data[srcIdx + 2];
            bytes[offset++] = data[srcIdx + 1];
            bytes[offset++] = data[srcIdx];
        }
        offset += padding;
    }

    return new Blob([buffer], { type: 'image/bmp' });
}

function encodeIndexedBmp(width: number, height: number, data: Uint8ClampedArray, bitDepth: 8 | 4 | 2 | 1): Blob {
    const levels = 1 << bitDepth; // palette size, grayscale ramp
    const paletteBytes = levels * 4;
    const headerSize = 54 + paletteBytes;

    const bytesPerRow = Math.ceil((bitDepth * width) / 8);
    const rowStride = (bytesPerRow + 3) & ~3;
    const pixelDataSize = rowStride * height;
    const fileSize = headerSize + pixelDataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    writeHeaders(view, fileSize, headerSize, width, height, bitDepth, pixelDataSize, levels);

    // BGRA grayscale palette
    let palOffset = 54;
    for (let i = 0; i < levels; i++) {
        const v = Math.round((i * 255) / (levels - 1));
        bytes[palOffset++] = v;
        bytes[palOffset++] = v;
        bytes[palOffset++] = v;
        bytes[palOffset++] = 0;
    }

    const maxLevel = levels - 1;
    let offset = headerSize;
    let srcIdx = 0;
    for (let y = 0; y < height; y++) {
        const rowStart = offset;
        let bitPos = 0;
        let acc = 0;

        for (let x = 0; x < width; x++, srcIdx += 4) {
            const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const index = Math.round(lum * maxLevel);

            if (bitDepth === 8) {
                bytes[offset++] = index;
            } else {
                acc = (acc << bitDepth) | index;
                bitPos += bitDepth;
                if (bitPos === 8) {
                    bytes[offset++] = acc;
                    acc = 0;
                    bitPos = 0;
                }
            }
        }
        if (bitDepth !== 8 && bitPos > 0) {
            bytes[offset++] = acc << (8 - bitPos);
        }
        offset = rowStart + rowStride;
    }

    return new Blob([buffer], { type: 'image/bmp' });
}

function canvasToBmp(canvas: HTMLCanvasElement, orientation: CanvasOrientation, bitDepth: ImageBitDepth = 24): Blob {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas context unavailable');
    }

    const imageData = rotateImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), orientation);
    const { width, height, data } = imageData;

    if (bitDepth === 24) {
        return encode24bitBmp(width, height, data);
    }

    return encodeIndexedBmp(width, height, data, bitDepth);
}

function canvasToPxc(canvas: HTMLCanvasElement, orientation: CanvasOrientation): Blob {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas context unavailable');
    }

    const imageData = rotateImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), orientation);
    const { width, height, data } = imageData;

    const rowBytes = (width + 3) >> 2;
    const buffer = new ArrayBuffer(4 + rowBytes * height);
    const bytes = new Uint8Array(buffer);
    new DataView(buffer).setUint16(0, width, true);
    new DataView(buffer).setUint16(2, height, true);

    let offset = 4;
    let srcIdx = 0;
    for (let y = 0; y < height; y++) {
        let byte = 0, shift = 6, col = 0;
        for (let x = 0; x < width; x++, srcIdx += 4) {
            const gray = 0.299 * data[srcIdx] + 0.587 * data[srcIdx + 1] + 0.114 * data[srcIdx + 2];
            const val = gray < 64 ? 0 : gray < 128 ? 1 : gray < 192 ? 2 : 3;
            byte |= val << shift;
            shift -= 2;
            if (shift < 0) {
                bytes[offset++] = byte;
                byte = 0;
                shift = 6;
                col++;
            }
        }
        if (shift !== 6) bytes[offset++] = byte;
    }
    return new Blob([buffer], { type: 'application/octet-stream' });
}

async function download(fileName: string, blob: Blob, callback?: (() => void)) {
    if (Capacitor.isNativePlatform()) {
        await triggerNativeDownload(blob, fileName);
    } else {
        triggerDownload(blob, fileName);
    }

    callback && callback();
}

export async function exportToClipboard(canvas: HTMLCanvasElement, orientation: CanvasOrientation, callback?: (() => void)) {
    canvas.toBlob(async (blob) => {
        if (!blob) {
            return;
        }

        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
            ]);
        } catch (error) {
            console.error('Failed to copy canvas to clipboard:', error);
        } finally {
            callback && callback();
        }
    });
}

export async function exportToFile(canvas: HTMLCanvasElement, fileName: string, format: Exclude<ExportFormat, 'clipboard'>, orientation: CanvasOrientation, callback?: (() => void)) {
    const fullFilename = fileName + '.' + format;

    if (format === 'bmp') {
        download(fullFilename, canvasToBmp(canvas, orientation), callback);
        return;
    }

    if (format === 'pxc') {
        download(fullFilename, canvasToPxc(canvas, orientation), callback);
        return;
    }

    // Rotate image
    if (orientation !== 'top') {
        const ctx = canvas.getContext('2d')!
        const imageData = rotateImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), orientation);

        // Update image
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);
    }

    const mime = MIME_TYPES[format];
    canvas.toBlob(async blob => {
        if (!blob) {
            return;
        }

        download(fullFilename, blob, callback);
    }, mime, 100);
}

function triggerDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);
}

async function triggerNativeDownload(blob: Blob, fileName: string) {
    // Media plugin needs a file:// path, not raw base64 - write to cache first
    await Filesystem.writeFile({
        path: fileName,
        data: await blobToBase64(blob),
        directory: Directory.Cache,
    });

    const { uri } = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
    });

    try {
        const albumId = await getOrCreateAlbumId('DITHR');
        await Media.savePhoto({ path: uri, albumIdentifier: albumId });
        await Toast.show({ text: 'Saved image to storage', duration: 'short' });
    } catch (e) {
        await Toast.show({ text: 'Save failed: ' + e, duration: 'short' });
        console.error(e);
    } finally {
        // cleanup temp cache file
        await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
    }
}
