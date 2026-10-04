import { filters, type T2DPipelineState } from "fabric";
import fragmentSource from './shaders/dynamic-range-compressor.glsl?raw';
import { getLinearLuminance, linearToSrgb, srgbToLinear } from "$lib/color-utils";
import { BaseFilter } from "./BaseFilter";

type DynamicRangeCompressorProps = {
    enabled: boolean,
    black: [number, number, number],
    white: [number, number, number],
};

const neutralValues = {
    enabled: false,
} satisfies Partial<DynamicRangeCompressorProps>;

const defaultValues: DynamicRangeCompressorProps = {
    ...neutralValues,
    black: [  0,   0,   0],
    white: [255, 255, 255],
};

export class DynamicRangeCompressorFilter extends BaseFilter<'DynamicRangeCompressor'> {
    declare enabled: DynamicRangeCompressorProps['enabled'];
    declare black: DynamicRangeCompressorProps['black'];
    declare white: DynamicRangeCompressorProps['white'];

    static type = 'DynamicRangeCompressor';
    static defaults = defaultValues;

    static uniformLocations = [
        'uBlackY',
        'uRange',
    ];

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    public override isNeutralState(): boolean {
        return !this.enabled
            || (getLinearLuminance(this.black) === 0 && getLinearLuminance(this.white) === 1);
    }

    public override sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        const blackY = getLinearLuminance(this.black);
        const whiteY = getLinearLuminance(this.white);
        const range = Math.max(0.0, whiteY - blackY);

        gl.uniform1f(uniformLocations.uBlackY, blackY);
        gl.uniform1f(uniformLocations.uRange, range);
    }

    public applyTo2d(options: T2DPipelineState): void {
        const data = options.imageData.data;
        const len = data.length;

        const blackY = getLinearLuminance(this.black);
        const whiteY = getLinearLuminance(this.white);
        const range = Math.max(0.0, whiteY - blackY);

        for (let i = 0; i < len; i += 4) {
            const lr = srgbToLinear(data[i]);
            const lg = srgbToLinear(data[i + 1]);
            const lb = srgbToLinear(data[i + 2]);

            const Y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
            const normalizedY = Math.min(Math.max(Y, 0.0), 1.0);
            const compressedY = blackY + normalizedY * range;

            let finalR, finalG, finalB;
            if (Y > 1e-6) {
                const scale = compressedY / Y;
                finalR = lr * scale;
                finalG = lg * scale;
                finalB = lb * scale;
            } else {
                finalR = blackY;
                finalG = blackY;
                finalB = blackY;
            }

            data[i]     = Math.round(linearToSrgb(finalR) * 255);
            data[i + 1] = Math.round(linearToSrgb(finalG) * 255);
            data[i + 2] = Math.round(linearToSrgb(finalB) * 255);
        }
    }
}
