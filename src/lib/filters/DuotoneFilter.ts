import type { T2DPipelineState, TWebGLUniformLocationMap } from 'fabric';
import fragmentSource from './shaders/duotone.glsl?raw';
import { BaseFilter } from './BaseFilter';

export type DuotoneProps = {
    enabled: boolean;
    colorDark: ColorRgb;
    colorLight: ColorRgb;
};

export const DuotoneDefaultValues: DuotoneProps = {
    enabled: false,
    colorDark: [0, 0, 0],
    colorLight: [255, 255, 255],
};

export class DuotoneFilter extends BaseFilter<'Duotone'> {
    static type = 'Duotone';
    static defaults = DuotoneDefaultValues;

    declare enabled: DuotoneProps['enabled'];
    declare colorDark: DuotoneProps['colorDark'];
    declare colorLight: DuotoneProps['colorLight'];

    static uniformLocations = [
        'uColorDark',
        'uColorLight',
    ];

    getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    override isNeutralState(): boolean {
        return !this.enabled;
    }

    applyTo2d({ imageData }: T2DPipelineState) {
        const data = imageData.data;
        const size = data.length;
        const dark = this.colorDark;
        const light = this.colorLight;

        for (let i = 0; i < size; i += 4) {
            const gray = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
            data[i] = dark[0] + (light[0] - dark[0]) * gray;
            data[i + 1] = dark[1] + (light[1] - dark[1]) * gray;
            data[i + 2] = dark[2] + (light[2] - dark[2]) * gray;
        }
    }

    sendUniformData(gl: WebGLRenderingContext, uniformLocations: TWebGLUniformLocationMap) {
        const dark = this.colorDark;
        const light = this.colorLight;
        gl.uniform3f(uniformLocations.uColorDark, dark[0] / 255, dark[1] / 255, dark[2] / 255);
        gl.uniform3f(uniformLocations.uColorLight, light[0] / 255, light[1] / 255, light[2] / 255);
    }

    override updateProps(props: Partial<DuotoneProps>): void {
        super.updateProps(props);

        this.enabled = props.enabled ?? this.enabled;
        this.colorDark = props.colorDark ?? this.colorDark;
        this.colorLight = props.colorLight ?? this.colorLight;
    }
}
