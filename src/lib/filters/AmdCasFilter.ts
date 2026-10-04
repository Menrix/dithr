import fragmentSource from './shaders/amd-cas.glsl?raw';
import { BaseFilter } from "./BaseFilter";

export type AmdCasProps = {
    sharpness: number,
    transparentMode: boolean,
};

export const AmdCasValueRanges = {
    sharpness: [0, 1.0, 0.01],
} satisfies RangeInputValueRanges<Pick<AmdCasProps, 'sharpness'>>;

export const AmdCasNeutralValues = {
    sharpness: 0,
    transparentMode: false,
} satisfies Partial<AmdCasProps>;

export const AmdCasDefaultValues: AmdCasProps = {
    ...AmdCasNeutralValues,
};

export class AmdCasFilter extends BaseFilter<'AmdCas'> {
    declare sharpness: AmdCasProps['sharpness'];
    declare transparentMode: AmdCasProps['transparentMode'];

    static type = 'AmdCas';
    static defaults = AmdCasDefaultValues;

    static uniformLocations = [
        'uSharpness',
        'uTexSize',
        'uTransparentMode',
    ];

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    public override isNeutralState(): boolean {
        return this.sharpness === AmdCasNeutralValues.sharpness;
    }

    public override sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        const peak = -(1.0 / (8.0 - this.sharpness * 3.0));

        gl.uniform1f(uniformLocations.uSharpness, peak);
        gl.uniform2f(uniformLocations.uTexSize, 1.0 / this.sourceWidth, 1.0 / this.sourceHeight);
        gl.uniform1i(uniformLocations.uTransparentMode, this.transparentMode ? 1 : 0);
    }

    public applyTo2d(options: any) {
        const { data, width, height } = options.imageData;
        const output = new Uint8ClampedArray(data.length);
        const EPS = 1e-5;

        const peak = -(1.0 / (8.0 - this.sharpness * 3.0));
        const alphaAware = this.transparentMode;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                const idxA = (y * width + Math.max(0, x - 1)) * 4;
                const idxB = (Math.max(0, y - 1) * width + x) * 4;
                const idxC = (y * width + Math.min(width - 1, x + 1)) * 4;
                const idxD = (Math.min(height - 1, y + 1) * width + x) * 4;

                const eg = data[idx + 1] / 255;
                const wa = alphaAware ? data[idxA + 3] / 255 : 1.0;
                const wb = alphaAware ? data[idxB + 3] / 255 : 1.0;
                const wc = alphaAware ? data[idxC + 3] / 255 : 1.0;
                const wd = alphaAware ? data[idxD + 3] / 255 : 1.0;

                let minG = eg, maxG = eg;
                if (wa > EPS) { const g = data[idxA + 1] / 255; minG = Math.min(minG, g); maxG = Math.max(maxG, g); }
                if (wb > EPS) { const g = data[idxB + 1] / 255; minG = Math.min(minG, g); maxG = Math.max(maxG, g); }
                if (wc > EPS) { const g = data[idxC + 1] / 255; minG = Math.min(minG, g); maxG = Math.max(maxG, g); }
                if (wd > EPS) { const g = data[idxD + 1] / 255; minG = Math.min(minG, g); maxG = Math.max(maxG, g); }

                const ratio = Math.min(minG, 1.0 - maxG) / Math.max(maxG, EPS);
                const amplification = Math.sqrt(Math.min(Math.max(ratio, 0.0), 1.0));
                const weight = amplification * peak;
                const softLimiter = 1.0 / (1.0 + 4.0 * weight);

                for (let c = 0; c < 3; c++) {
                    const ec = data[idx + c];
                    const ac = ec + (data[idxA + c] - ec) * wa;
                    const bc = ec + (data[idxB + c] - ec) * wb;
                    const cc = ec + (data[idxC + c] - ec) * wc;
                    const dc = ec + (data[idxD + c] - ec) * wd;

                    const sharpVal = ((ac + bc + cc + dc) * weight + ec) * softLimiter;
                    output[idx + c] = Math.min(Math.max(sharpVal, 0), 255);
                }
                output[idx + 3] = data[idx + 3];
            }
        }

        data.set(output);
    }

    override updateProps(props: Partial<AmdCasProps>): void {
        super.updateProps(props);

        this.sharpness = props.sharpness ?? this.sharpness;
        this.transparentMode = props.transparentMode ?? this.transparentMode;
    }
}
