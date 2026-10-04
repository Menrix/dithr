import fragmentSource from './shaders/dither-quantization.glsl?raw';
import shaderUtils from './shaders/shader-utils.glsl?raw';
import { DitherFilter, type DitherProps } from './DitherFilter';

export type DitherQuantizationProps = DitherProps & {
    tst?: any;
};

export const DitherQuantizationDefaultValues: DitherQuantizationProps = {
    colorSpace: 'rgb',
    palette: [],
    colorSpacePalette: [],
    paletteMap: [],
};

export class DitherQuantizationFilter extends DitherFilter<'DitherQuantization'> {
    static type = 'DitherQuantization';
    static defaults = DitherQuantizationDefaultValues;

    static uniformLocations = [
        'uPaletteSize',
        'uColorSpace',
        'uPalette',
        'uColorSpacePalette',
        'uPaletteMap',
    ];

    public override isNeutralState(): boolean {
        return !this.palette?.length;
    }

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    public override sendUniformData(
        gl: WebGLRenderingContext, 
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        super.sendUniformData(gl, uniformLocations);
    }

    override updateProps(props: Partial<DitherQuantizationProps>): void {
        super.updateProps(props);
    }
}
