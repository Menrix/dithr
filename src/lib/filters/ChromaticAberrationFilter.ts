import { filters, type T2DPipelineState, type TWebGLPipelineState, type TWebGLUniformLocationMap } from "fabric";
import fragmentSource from './shaders/chromatic-aberration.glsl?raw';
import { BaseFilter } from "./BaseFilter";

export type ChromaticAberrationProps = {
    enabled: boolean;

    strength: number;  // 0.01 – 0.05, fraction of image size
    angle: number;     // degrees
    radial: boolean;   // 0 or 1
};

export const ChromaticAberrationValueRanges = {
    strength: [0.001, 0.05, 0.001],
    angle: [-180, 180, 1],
} satisfies RangeInputValueRanges<ChromaticAberrationProps>;

export const ChromaticAberrationNeutralValues = {
    enabled: false,
} satisfies Partial<ChromaticAberrationProps>;

export const ChromaticAberrationDefaultValues: ChromaticAberrationProps = {
    ...ChromaticAberrationNeutralValues,
    strength: 0.005,
    angle: 0,         
    radial: true,
};

export class ChromaticAberrationFilter extends BaseFilter<'ChromaticAberration'> {
    static type = 'ChromaticAberration';
    static defaults = ChromaticAberrationDefaultValues;

    static uniformLocations = [
        'uStrength',
        'uAngleRad',
        'uRadial',
    ];

    declare enabled: ChromaticAberrationProps['enabled'];
    declare strength: ChromaticAberrationProps['strength'];
    declare angle: ChromaticAberrationProps['angle'];
    declare radial: ChromaticAberrationProps['radial'];

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    public override isNeutralState(): boolean {
        return !this.enabled;
    }

    sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: TWebGLUniformLocationMap,
    ) {
        gl.uniform1f(uniformLocations.uStrength, this.strength);
        gl.uniform1f(uniformLocations.uAngleRad, this.angle * Math.PI / 180);
        gl.uniform1f(uniformLocations.uRadial, this.radial ? 1.0 : 0.0);
    }

    applyTo2d(options: T2DPipelineState) {
        const { imageData } = options;
        const { data, width, height } = imageData;
        const src = new Uint8ClampedArray(data);
        const rad = this.angle * Math.PI / 180;
        const dx0 = Math.cos(rad), dy0 = Math.sin(rad);
        const cx = width / 2, cy = height / 2;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let falloff = 1;
                if (this.radial) {
                const ndx = (x - cx) / cx, ndy = (y - cy) / cy;
                falloff = Math.sqrt(ndx * ndx + ndy * ndy);
                }
                const offX = dx0 * this.strength * falloff * width;
                const offY = dy0 * this.strength * falloff * height;
                const idx = (y * width + x) * 4;

                data[idx]     = this.sampleChannel(src, width, height, Math.round(x + offX), Math.round(y + offY), 0);
                data[idx + 1] = src[idx + 1];
                data[idx + 2] =  this.sampleChannel(src, width, height, Math.round(x - offX), Math.round(y - offY), 2);
                data[idx + 3] = src[idx + 3];
            }
        }
    }

    updateProps(props: ChromaticAberrationProps) {
        super.updateProps(props);

        this.enabled = props.enabled ?? this.enabled;
        this.strength = props.strength ?? this.strength;
        this.angle = props.angle ?? this.angle;
        this.radial = props.radial ?? this.radial;
    }
}
