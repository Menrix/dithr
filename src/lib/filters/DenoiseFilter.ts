import { type T2DPipelineState } from "fabric";
import fragmentSource from './shaders/denoise.glsl?raw';
import { BaseFilter } from "./BaseFilter";
import { clamp } from "$lib/utils";

export type DenoiseFilterProps = {
    strength: number;  // 0-1
};

export const DenoiseFilterValueRanges = {
    strength: [0, 1, 0.01],
} satisfies RangeInputValueRanges<DenoiseFilterProps>;

export const DenoiseFilterNeutralValues: DenoiseFilterProps = {
    strength: 0,
};

export const DenoiseFilterDefaultValues: DenoiseFilterProps = {
    ...DenoiseFilterNeutralValues,
};

export class DenoiseFilter extends BaseFilter<'DenoiseFilter'> {
    declare strength: DenoiseFilterProps['strength'];

    static type = 'DenoiseFilter';
    static defaults = DenoiseFilterDefaultValues;

    static uniformLocations = [
        'uStepW',
        'uStepH',
        'uSigmaColor',
    ];

    public override isNeutralState(): boolean {
        return this.strength === DenoiseFilterDefaultValues.strength;
    }

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    // uStepW/uStepH assume the base pipeline populates this.width/this.height
    // before rendering - same convention as stock fabric's Convolute filter.
    // Unverified against this project's actual BaseFilter; check if blank/NaN.
    public override sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        gl.uniform1f(uniformLocations.uStepW, 1 / this.sourceWidth);
        gl.uniform1f(uniformLocations.uStepH, 1 / this.sourceHeight);
        gl.uniform1f(uniformLocations.uSigmaColor, 0.02 + this.strength * 0.38);
    }

    public applyTo2d({ imageData }: T2DPipelineState) {
        if (this.strength <= 0) return;

        const { data, width, height } = imageData;
        const src = new Uint8ClampedArray(data); // read-only snapshot; writes go to `data`
        const sigmaColor = 8 + this.strength * 72;
        const sigma2 = 2 * sigmaColor * sigmaColor;
        // Fixed 3x3 spatial kernel, approx Gaussian by distance.
        const W = [0.5, 0.75, 0.5, 0.75, 1.0, 0.75, 0.5, 0.75, 0.5];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const cr = src[idx], cg = src[idx + 1], cb = src[idx + 2];

                let sumR = 0, sumG = 0, sumB = 0, sumW = 0, k = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    const ny = clamp(y + dy, 0, height - 1);
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = clamp(x + dx, 0, width - 1);
                        const nIdx = (ny * width + nx) * 4;
                        const nr = src[nIdx], ng = src[nIdx + 1], nb = src[nIdx + 2];

                        const d2 = (nr - cr) ** 2 + (ng - cg) ** 2 + (nb - cb) ** 2;
                        const w = W[k] * Math.exp(-d2 / sigma2);

                        sumR += nr * w; sumG += ng * w; sumB += nb * w; sumW += w;
                        k++;
                    }
                }

                data[idx]     = sumR / sumW;
                data[idx + 1] = sumG / sumW;
                data[idx + 2] = sumB / sumW;
            }
        }
    }

    updateProps(props: DenoiseFilterProps): void {
        super.updateProps(props);
        this.strength = props.strength ?? this.strength;
    }
}
