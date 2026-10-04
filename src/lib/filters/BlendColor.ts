// Based on: https://github.com/fabricjs/fabric.js/blob/22fda4575b9a171e8efe201e21ee2bd9d77651b8/src/filters/BlendColor.ts

import fragmentSource from './shaders/blend-color.glsl?raw';
import { BaseFilter, BLEND_2D, BLEND_GLSL, type TBlendMode } from "./BaseFilter";
import type { T2DPipelineState } from 'fabric';

export type BlendColorProps = {
    enabled: boolean;
    color: ColorRgb;
    mode: TBlendMode;
    alpha: number;
};

export const BlendColorValueRanges = {
    alpha: [0.0, 1.0, 0.05],
} satisfies RangeInputValueRanges<BlendColorProps>;

export const BlendColorNeutralValues = {
} satisfies Partial<BlendColorProps>;

export const BlendColorDefaultValues: BlendColorProps = {
    ...BlendColorNeutralValues,
    enabled: false,
    color: [255, 0, 0],
    mode: 'add',
    alpha: 0.5,
};

export class BlendColorFilter extends BaseFilter<'BlendColor'> {
    declare enabled: BlendColorProps['enabled'];
    declare color: BlendColorProps['color'];
    declare mode: BlendColorProps['mode'];
    declare alpha: BlendColorProps['alpha'];

    static type = 'BlendColor';
    static defaults = BlendColorDefaultValues;

    static uniformLocations = [
        'uColor',
    ];

    getCacheKey() {
        return `${this.type}_${this.mode}`;
    }

    protected getFragmentSource(): string {
        let source = this.processFragmentSource(fragmentSource);
        source = source.replace('/* {{BLEND_GLSL}} */', BLEND_GLSL[this.mode]);
        return source;
    }

    public override isNeutralState(): boolean {
        return !this.enabled || this.mode === 'normal';
    }

    public override sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        const color = this.color.slice(0);
        color[0] = (this.alpha * color[0]) / 255;
        color[1] = (this.alpha * color[1]) / 255;
        color[2] = (this.alpha * color[2]) / 255;
        color[3] = this.alpha;

        gl.uniform4fv(uniformLocations.uColor, color);
    }

    applyTo2d({ imageData: { data } }: T2DPipelineState) {
        const alpha = this.alpha;
        const tr = this.color[0] * alpha;
        const tg = this.color[1] * alpha;
        const tb = this.color[2] * alpha;
        const blendFn = BLEND_2D[this.mode];
        const size = data.length;

        for (let i = 0; i < size; i += 4) {
            data[i]     = blendFn(data[i]    , tr, alpha);
            data[i + 1] = blendFn(data[i + 1], tg, alpha);
            data[i + 2] = blendFn(data[i + 2], tb, alpha);
        }
    }

    override updateProps(props: Partial<BlendColorProps>): void {
        super.updateProps(props);

        this.enabled = props.enabled ?? this.enabled;
        this.color = props.color ?? this.color;
        this.mode = props.mode ?? this.mode;
        this.alpha = props.alpha ?? this.alpha;
    }
}
