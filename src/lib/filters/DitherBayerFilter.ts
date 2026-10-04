import fragmentSource from './shaders/dither-bayer.glsl?raw';
import { DitherFilter, type DitherProps } from './DitherFilter';

export type DitherBayerMatrixSize = 2 | 3 | 4 | 8;
export type DitherBayerMatrixSizeId = keyof typeof BAYER_MATRIX_SIZES;

export const BAYER_MATRIX_SIZES = {
    '2x2': 2,
    // '3x3': 3,
    '4x4': 4,
    '8x8': 8,
};

export type DitherBayerProps = DitherProps & {
    matrixSize: DitherBayerMatrixSizeId;
    pixelSize: number;
    strength: number;
};

export const DitherBayerValueRanges = {
    strength: [0.1, 1.5, 0.01],
    pixelSize: [1, 16, 1],
} satisfies RangeInputValueRanges<DitherBayerProps>;

export const DitherBayerDefaultValues: DitherBayerProps = {
    colorSpace: 'rgb',
    palette: [],
    colorSpacePalette: [],
    paletteMap: [],
    matrixSize: '4x4',
    pixelSize: 1,
    strength: 0.5,
};

export class DitherBayerFilter extends DitherFilter<'DitherBayer'> {
    declare matrixSize: DitherBayerProps['matrixSize'];
    declare pixelSize: DitherBayerProps['pixelSize'];
    declare strength: DitherBayerProps['strength'];

    static type = 'DitherBayer';
    static defaults = DitherBayerDefaultValues;

    static uniformLocations = [
        'uPaletteSize',
        'uColorSpace',
        'uPalette',
        'uColorSpacePalette',
        'uPaletteMap',
        'uTexSize',

        'uStrength',
        'uMatrixSize',
        'uPixelSize',
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

        gl.uniform1f(uniformLocations.uStrength, this.strength);
        gl.uniform1i(uniformLocations.uMatrixSize, BAYER_MATRIX_SIZES[this.matrixSize]);
        gl.uniform1i(uniformLocations.uPixelSize, this.pixelSize);
        gl.uniform1i(uniformLocations.uPaletteSize, this.palette.length);
        gl.uniform2f(uniformLocations.uTexSize, 1 / this.sourceWidth, 1/ this.sourceHeight);
    }

    override updateProps(props: Partial<DitherBayerProps>): void {
        super.updateProps(props);

        this.strength = props.strength ?? this.strength;
        this.matrixSize = props.matrixSize ?? this.matrixSize;
        this.pixelSize = Math.max(1, props.pixelSize ?? this.pixelSize);
    }
}
