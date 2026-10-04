import { FILTER_MAX_COLORS } from "./filters/DitherFilter";

export function srgbToLinear(c: number): number {
    const v = Math.min(Math.max(c, 0), 255) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c: number) {
    const v = Math.min(Math.max(c, 0.0), 1.0);
    return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1.0 / 2.4) - 0.055;
}

// Helper: Converts sRGB (0-255) to CIELAB [L, a, b] assuming D65 white point
export function rgbToLab(red: number, green: number, blue: number): ColorLab {
    return linearRgbToLab(
        srgbToLinear(red),
        srgbToLinear(green),
        srgbToLinear(blue),
    );
}

export function linearRgbToLab(red: number, green: number, blue: number): [number, number, number] {
    const x = red * 0.4124564 + green * 0.3575761 + blue * 0.1804375;
    const y = red * 0.2126729 + green * 0.7151522 + blue * 0.0721750;
    const z = red * 0.0193339 + green * 0.1191920 + blue * 0.9503041;

    const e = 216 / 24389;   // CIE actual epsilon, 0.008856451
    const kappa116 = 841 / 108; // = CIE kappa (903.3) / 116, pre-divided for the linear branch below - NOT kappa itself

    const vx = x / 0.95047;
    const vy = y / 1.00000;
    const vz = z / 1.08883;

    const f = (t: number) => t > e ? Math.pow(t, 1 / 3) : (kappa116 * t) + (16 / 116);

    const fx = f(vx);
    const fy = f(vy);
    const fz = f(vz);

    return [
        (116 * fy) - 16,
        500 * (fx - fy),
        200 * (fy - fz),
    ];
}

export function rgbToOklab(red: number, green: number, blue: number): ColorLab {
    return linearRgbToOklab(
        srgbToLinear(red),
        srgbToLinear(green),
        srgbToLinear(blue),
    );
}

export function linearRgbToOklab(red: number, green: number, blue: number): [number, number, number] {
    const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
    const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
    const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;

    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    return [
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    ];
}

export function getLinearLuminance(color: ColorRgb) {
    const lr = srgbToLinear(color[0]);
    const lg = srgbToLinear(color[1]);
    const lb = srgbToLinear(color[2]);
    return 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
}

// Fast-path nearest-color search in raw sRGB space. Perceptually inaccurate
// (sRGB is not uniform, green is over-weighted relative to CIE76/Oklab).
// Use only where speed matters more than accuracy; prefer findClosestLab otherwise.
export function findClosestRgb(paletteMap: number[], outputPalette: PaletteRgb, comparePalette: ColorSpacePalette, r: number, g: number, b: number) {
    if (comparePalette.length !== outputPalette.length) {
        throw new Error(`findClosestRgb: targetPalette (${comparePalette.length}) and palette (${outputPalette.length}) length mismatch`);
    }

    let index = 0;
    let minDist = Infinity;
    const size = comparePalette.length;

    for (let i = 0; i < size; i++) {
        if (paletteMap[i] === -1) {
            continue;
        }

        const p = comparePalette[i];
        const d = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2;
        if (d < minDist) {
            minDist = d;
            index = i;
        }
    }

    return outputPalette[index];
}

export function flattenPalette(palette: PaletteRgb): Float32Array {
    if (palette.length > FILTER_MAX_COLORS) {
        throw new Error(`flattenPalette: palette has ${palette.length} colors, exceeds FILTER_MAX_COLORS (${FILTER_MAX_COLORS})`);
    }

    const flatPalette = new Float32Array(FILTER_MAX_COLORS * 3);
    palette.forEach((color, i) => {
        const index = i * 3;
        flatPalette[index] = color[0] / 255;
        flatPalette[index + 1] = color[1] / 255;
        flatPalette[index + 2] = color[2] / 255;
    });

    return flatPalette;
}

// Flattens a Lab (or other non-0..255) triple palette. Despite the historical
// PaletteRgb param type, values here are NOT sRGB - do not pass this to code
// expecting normalized 0..1 RGB.
export function flattenPaletteRaw(paletteLab: ColorSpacePalette): Float32Array {
    if (paletteLab.length > FILTER_MAX_COLORS) {
        throw new Error(`flattenPaletteRaw: palette has ${paletteLab.length} colors, exceeds FILTER_MAX_COLORS (${FILTER_MAX_COLORS})`);
    }

    const flatPalette = new Float32Array(FILTER_MAX_COLORS * 3);
    paletteLab.forEach((color, i) => {
        const index = i * 3;
        flatPalette[index] = color[0];
        flatPalette[index + 1] = color[1];
        flatPalette[index + 2] = color[2];
    });

    return flatPalette;
}
