import fragmentSource from './shaders/mosaic.glsl?raw';
import { BaseFilter } from "./BaseFilter";
import type { T2DPipelineState } from 'fabric';

export type MosaicFilterMode = 'pixelate' | 'lowpoly' | 'hexagon' | 'crystallize';

export type MosaicFilterProps = {
    enabled: boolean;
    mode: MosaicFilterMode;
    cellSize: number;
    gridGap: number;
    jitter: number;
    lightStrength: number;
    rotation: number;
};

export const MosaicValueRanges = {
    cellSize: [2, 30, 1],
    gridGap: [0, 5, 0.25],
    jitter: [0, 2, 0.1],
    lightStrength: [0, 0.1, 0.01],
    rotation: [0, 180, 5],
} satisfies RangeInputValueRanges<MosaicFilterProps>;

export const MosaicFilterDefaultValues: MosaicFilterProps = {
    enabled: false,
    mode: 'pixelate',
    cellSize: 2,
    gridGap: 0,
    jitter: 0,
    lightStrength: 0,
    rotation: 0,
};

export class MosaicFilter extends BaseFilter<'MosaicFilter'> {
    declare enabled: MosaicFilterProps['enabled'];
    declare mode: MosaicFilterProps['mode'];
    declare cellSize: MosaicFilterProps['cellSize'];
    declare gridGap: MosaicFilterProps['gridGap'];
    declare jitter: MosaicFilterProps['jitter'];
    declare lightStrength: MosaicFilterProps['lightStrength'];
    declare rotation: MosaicFilterProps['rotation'];

    static type = 'MosaicFilter';
    static defaults = MosaicFilterDefaultValues;

    static uniformLocations = [
        'uStepW',
        'uStepH',
        'uCellSize',
        'uGridGap',
        'uJitter',
        'uLightStrength',
        'uRotation',
        'uMode',
    ];

    public override isNeutralState(): boolean {
        return !this.enabled;
    }

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    public override sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        gl.uniform1f(uniformLocations.uStepW, this.sourceWidth);
        gl.uniform1f(uniformLocations.uStepH, this.sourceHeight);

        gl.uniform1f(uniformLocations.uCellSize, this.cellSize);
        gl.uniform1f(uniformLocations.uGridGap, this.gridGap);
        gl.uniform1f(uniformLocations.uJitter, this.jitter);
        gl.uniform1f(uniformLocations.uLightStrength, this.lightStrength);
        gl.uniform1f(uniformLocations.uRotation, this.rotation);

        const mode = this.mode === 'crystallize' ? 3.0 : this.mode === 'hexagon' ? 2.0 : this.mode === 'pixelate' ? 1.0 : 0.0;
        gl.uniform1f(uniformLocations.uMode, mode);
    }

    public override applyTo2d(_options: T2DPipelineState): void {
        const { data, width, height } = _options.imageData;
        const halfGap = this.gridGap / 2;

        for (let i = 0; i < height; i += this.cellSize) {
            const maxI = Math.min(i + this.cellSize, height);

            for (let j = 0; j < width; j += this.cellSize) {
                const maxJ = Math.min(j + this.cellSize, width);

                let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
                const count = (maxI - i) * (maxJ - j);

                for (let _i = i; _i < maxI; _i++) {
                    for (let _j = j; _j < maxJ; _j++) {
                        const index = _i * 4 * width + _j * 4;
                        rSum += data[index];
                        gSum += data[index + 1];
                        bSum += data[index + 2];
                        aSum += data[index + 3];
                    }
                }

                const r = rSum / count;
                const g = gSum / count;
                const b = bSum / count;
                const a = aSum / count;

                for (let _i = i; _i < maxI; _i++) {
                    for (let _j = j; _j < maxJ; _j++) {
                        const edgeDist = Math.min(_i - i, maxI - 1 - _i, _j - j, maxJ - 1 - _j);
                        const index = _i * 4 * width + _j * 4;
                        if (this.gridGap > 0 && edgeDist < halfGap) {
                            data[index] = r * 0.35;
                            data[index + 1] = g * 0.35;
                            data[index + 2] = b * 0.35;
                            data[index + 3] = a;
                        } else {
                            data[index] = r;
                            data[index + 1] = g;
                            data[index + 2] = b;
                            data[index + 3] = a;
                        }
                    }
                }
            }
        }
    }

    updateProps(props: MosaicFilterProps): void {
        super.updateProps(props);
        this.enabled = props.enabled ?? this.enabled;
        this.mode = props.mode ?? this.mode;
        this.cellSize = props.cellSize ?? this.cellSize;
        this.gridGap = props.gridGap ?? this.gridGap;
        this.jitter = props.jitter ?? this.jitter;
        this.lightStrength = props.lightStrength ?? this.lightStrength;
        this.rotation = props.rotation ?? this.rotation;
    }
}
