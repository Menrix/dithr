import { findClosestRgb, rgbToLab, rgbToOklab } from '$lib/color-utils';
import { type T2DPipelineState } from 'fabric';
import { DitherFilter, type DitherProps } from './DitherFilter';

export type DitherErrorPropagationProps = DitherProps & {
    strength: number;
    pixelSize: number;
    serpentine: boolean;
};

// Rec.709 luminance, normalized 0-1. Used only for colorSpace === 'rgb'.
function computeGrayLevelRgb(r: number, g: number, b: number): number {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Gray level dispatched by matching colorSpace, so any subclass basing a
// kernel choice on brightness uses the same perceptual metric as the
// palette match itself.
// Note: recomputes L for lab/oklab since findClosestRgb* only returns RGB;
// duplicate cost accepted here, flagged for optimization if it shows up in profiling.
export function computeGrayLevelForColorSpace(
    colorSpace: DitherProps['colorSpace'],
    r: number,
    g: number,
    b: number
): number {
    if (colorSpace === 'oklab') {
        const [L] = rgbToOklab(r, g, b);
        return L; // Oklab L is already ~0-1
    }
    if (colorSpace === 'lab') {
        const [L] = rgbToLab(r, g, b);
        return L / 100; // CIE Lab L is 0-100
    }
    return computeGrayLevelRgb(r, g, b);
}

// Diffuses one kernel's contribution, scaled by `scale` (lets a subclass
// blend multiple kernels for one block; pass 1 for a single-kernel diffuse).
// Writes into the padded error buffer with no bounds checking: the buffer's
// padding (sized by each subclass's getPadding()) guarantees every kernel
// offset lands inside it. dir is the row's scan direction (+1 or -1); it
// mirrors the kernel's x-offset so serpentine scanning works for any kernel
// shape, symmetric or not, without a second code path.
export function diffuseKernelError(
    errBuff: Float32Array,
    paddedWidth: number,
    leftPad: number,
    x: number,
    y: number,
    dir: number,
    kernel: Float32Array,
    errR: number,
    errG: number,
    errB: number,
    scale: number
): void {
    const kernelNodeCount = kernel[0];
    for (let z = 0; z < kernelNodeCount; z++) {
        const stride = 1 + (z * 3);
        const weight = kernel[stride] * scale;
        const nx = x + (dir * kernel[stride + 1]) + leftPad;
        const ny = y + kernel[stride + 2];

        const destIdx = ((ny * paddedWidth) + nx) * 3;
        errBuff[destIdx]     += errR * weight;
        errBuff[destIdx + 1] += errG * weight;
        errBuff[destIdx + 2] += errB * weight;
    }
}

// Shared skeleton for any palette-quantizing filter that propagates its
// quantization error to neighboring blocks (Floyd-Steinberg-family,
// Ostromoukhov, etc). A subclass supplies only: how much padding its
// kernel(s) need, and how to distribute one block's error once it's known.
// Block averaging, alpha handling, quantization dispatch, pixel stamping,
// and serpentine scan order live here exactly once.
export abstract class DitherErrorPropagationFilter<T extends string> extends DitherFilter<T> {
    declare strength: DitherErrorPropagationProps['strength'];
    declare pixelSize: DitherErrorPropagationProps['pixelSize'];
    declare serpentine: DitherErrorPropagationProps['serpentine'];

    protected abstract getPadding(): { left: number; right: number; bottom: number };

    // Called once per block with nonzero alpha and nonzero error. tmpR/G/B
    // are the pre-quantization, post-accumulated-error values (for any
    // brightness-dependent kernel choice); errR/G/B are already strength-scaled.
    protected abstract diffuseError(
        errBuff: Float32Array,
        paddedWidth: number,
        leftPad: number,
        bx: number,
        by: number,
        dir: number,
        tmpR: number,
        tmpG: number,
        tmpB: number,
        errR: number,
        errG: number,
        errB: number
    ): void;

    // Optional per-call setup hook, run once before the block loop starts.
    // Override to memoize anything a static-kernel lookup would otherwise
    // repeat on every block.
    protected beforeBlockLoop(): void {}

    public override isNeutralState(): boolean {
        return !this.palette?.length || this.strength <= 0;
    }

    private findClosestRgbByLab(tmpR: number, tmpG: number, tmpB: number): ColorRgb {
        const [L, a, b] = rgbToLab(tmpR, tmpG, tmpB);
        return findClosestRgb(this.paletteMap, this.palette, this.colorSpacePalette, L, a, b);
    }

    private findClosestRgbByOklab(tmpR: number, tmpG: number, tmpB: number): ColorRgb {
        const [L, a, b] = rgbToOklab(tmpR, tmpG, tmpB);
        return findClosestRgb(this.paletteMap, this.palette, this.colorSpacePalette, L, a, b);
    }

    private findClosestRgb(tmpR: number, tmpG: number, tmpB: number): ColorRgb {
        return findClosestRgb(this.paletteMap, this.palette, this.colorSpacePalette, tmpR, tmpG, tmpB);
    }

    public override applyTo2d(options: T2DPipelineState) {
        const { data, width, height } = options.imageData;

        this.beforeBlockLoop();

        let findClosestFn;
        if (this.colorSpace === 'oklab') {
            findClosestFn = this.findClosestRgbByOklab;
        } else if (this.colorSpace === 'lab') {
            findClosestFn = this.findClosestRgbByLab;
        } else {
            findClosestFn = this.findClosestRgb;
        }
        findClosestFn = findClosestFn.bind(this);

        const scale = this.pixelSize > 0 ? Math.floor(this.pixelSize) : 1;
        const blockCountX = Math.ceil(width / scale);
        const blockCountY = Math.ceil(height / scale);

        const { left: leftPad, right: rightPad, bottom: bottomPad } = this.getPadding();
        const paddedWidth = blockCountX + leftPad + rightPad;
        const paddedHeight = blockCountY + bottomPad;
        const errBuff = new Float32Array(paddedWidth * paddedHeight * 3);

        for (let by = 0; by < blockCountY; by++) {
            const dir = (this.serpentine && (by & 1) === 1) ? -1 : 1;
            const xStart = dir === 1 ? 0 : blockCountX - 1;
            const xEnd = dir === 1 ? blockCountX : -1;

            for (let bx = xStart; bx !== xEnd; bx += dir) {
                const x0 = bx * scale;
                const y0 = by * scale;
                const x1 = Math.min(x0 + scale, width);
                const y1 = Math.min(y0 + scale, height);

                // Block average, straight RGB + alpha, no per-pixel flatten.
                // Cheaper than flatten-then-average; visually equivalent at
                // block sizes where this feature matters (>=2px).
                let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
                for (let yy = y0; yy < y1; yy++) {
                    for (let xx = x0; xx < x1; xx++) {
                        const ii = (yy * width + xx) * 4;
                        sumR += data[ii];
                        sumG += data[ii + 1];
                        sumB += data[ii + 2];
                        sumA += data[ii + 3];
                        count++;
                    }
                }

                const avgAlpha = sumA / count / 255;
                if (avgAlpha === 0) {
                    continue; // block fully transparent, leave pixels untouched
                }

                const avgR = sumR / count;
                const avgG = sumG / count;
                const avgB = sumB / count;

                const errIdx = ((by * paddedWidth) + (bx + leftPad)) * 3;

                const oldR = avgR + errBuff[errIdx];
                const oldG = avgG + errBuff[errIdx + 1];
                const oldB = avgB + errBuff[errIdx + 2];

                const tmpAlpha = 255 * (1 - avgAlpha);
                const tmpR = oldR * avgAlpha + tmpAlpha;
                const tmpG = oldG * avgAlpha + tmpAlpha;
                const tmpB = oldB * avgAlpha + tmpAlpha;

                let [newR, newG, newB] = findClosestFn(tmpR, tmpG, tmpB);

                // Stamp block color onto every actual pixel, skipping any pixel
                // that is individually fully transparent (preserves original
                // per-pixel skip semantics inside a mixed-alpha block).
                for (let yy = y0; yy < y1; yy++) {
                    for (let xx = x0; xx < x1; xx++) {
                        const ii = (yy * width + xx) * 4;
                        if (data[ii + 3] === 0) continue;
                        data[ii]     = newR;
                        data[ii + 1] = newG;
                        data[ii + 2] = newB;
                    }
                }

                const errR = (oldR - newR) * this.strength;
                const errG = (oldG - newG) * this.strength;
                const errB = (oldB - newB) * this.strength;

                if (errR === 0 && errG === 0 && errB === 0) {
                    continue;
                }

                this.diffuseError(errBuff, paddedWidth, leftPad, bx, by, dir, tmpR, tmpG, tmpB, errR, errG, errB);
            }
        }
    }

    override updateProps(props: Partial<DitherErrorPropagationProps>): void {
        super.updateProps(props);

        this.strength = props.strength ?? this.strength;
        this.serpentine = props.serpentine ?? this.serpentine;
        this.pixelSize = Math.max(1, Math.floor(props.pixelSize ?? this.pixelSize ?? 1));
    }
}
