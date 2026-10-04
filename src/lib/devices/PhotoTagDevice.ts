import { nearestPaletteIndex } from "$lib/image-encoder";

export const PALETTE: ColorRgb[] = [
    [  0,   0,   0],  // Black
    [255,   0,   0],  // Red
    [255, 255,   0],  // Yellow
    [255, 255, 255],  // White
];


export function encodeImage(imageData: ImageData, palette: PaletteRgb = PALETTE) {
    const { data, width, height } = imageData;

    const out = new Uint8Array(Math.ceil((width * height) / 4));
    let byteVal = 0;
    let shift = 6;
    let outIdx = 0;

    for (let i = 0; i < width * height; i++) {
        const spread = i * 4;
        const r = data[spread];
        const g = data[spread + 1];
        const b = data[spread + 2];

        byteVal |= (nearestPaletteIndex(palette, r, g, b) & 3) << shift;
        shift -= 2;

        if (shift < 0) {
            out[outIdx++] = byteVal;
            byteVal = 0;
            shift = 6;
        }
    }

    if (shift !== 6) {
        out[outIdx] = byteVal;
    }

    return out;
}
