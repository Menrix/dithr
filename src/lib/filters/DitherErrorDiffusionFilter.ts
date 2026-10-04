import {
    computeGrayLevelForColorSpace,
    diffuseKernelError,
    DitherErrorPropagationFilter,
    type DitherErrorPropagationProps,
} from './DitherErrorPropagationFilter';

export type DitherErrorDiffusionKernel = keyof typeof DitherErrorDiffusionFilter.KERNEL_NAMES;

export type DitherErrorDiffusionProps = DitherErrorPropagationProps & {
    kernelLow: DitherErrorDiffusionKernel;
    kernelHigh: DitherErrorDiffusionKernel;
    hybridMode: boolean;
    grayThreshold: number;
    graySoftness: number;
};

export const DitherErrorDiffusionValueRanges = {
    strength: [0.1, 0.9, 0.01],
    grayThreshold: [0, 1, 0.01],
    graySoftness: [0, 0.5, 0.01],
    pixelSize: [1, 16, 1],
} satisfies RangeInputValueRanges<DitherErrorDiffusionProps>;

export const DitherErrorDiffusionDefaultValues: DitherErrorDiffusionProps = {
    hybridMode: true,
    colorSpace: 'rgb',
    palette: [],
    colorSpacePalette: [],
    paletteMap: [],
    strength: 0.8,
    kernelLow: 'Atkinson',
    kernelHigh: 'JaJuNi',
    grayThreshold: 0.5,
    graySoftness: 0.05,
    pixelSize: 1,
    serpentine: true,
};

function smoothstep(edge0: number, edge1: number, x: number): number {
    if (edge0 === edge1) {
        return x < edge0 ? 0 : 1;
    }
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

export class DitherErrorDiffusionFilter extends DitherErrorPropagationFilter<'ErrorDiffusion'> {
    declare hybridMode: DitherErrorDiffusionProps['hybridMode'];
    declare kernelLow: DitherErrorDiffusionProps['kernelLow'];
    declare kernelHigh: DitherErrorDiffusionProps['kernelHigh'];
    declare grayThreshold: DitherErrorDiffusionProps['grayThreshold'];
    declare graySoftness: DitherErrorDiffusionProps['graySoftness'];

    static type = 'ErrorDiffusion';

    static defaults = DitherErrorDiffusionDefaultValues;

    static KERNEL_NAMES = {
        Atkinson: 'Atkinson',
        JaJuNi: 'Jarvis-Judice-Ninke',
        FloydSteinberg: 'Floyd-Steinberg',
        Stucki: 'Stucki',
        Burkes: 'Burkes',

        SierraLite: 'Sierra Lite',
        Sierra2: 'Sierra2',
        Sierra3: 'Sierra3',

        FalseFloydSteinberg: 'False Floyd-Steinberg',

        Fan: 'Fan',
        Diagonal: 'Diagonal',
        ShiauFan: 'Shiau-Fan',
        ShiauFan2: 'Shiau-Fan 2',
        ShiauFan3: 'Shiau-Fan 3',

        Minis: 'Minis',
        WongAllebach: 'Wong-Allebach',
        StevePigeon: 'Steve Pigeon',
        RobertKist: 'Robert Kist',
        // 'StevensonArce': 'Stevenson Arce',
    };

    private static KERNELS: Record<DitherErrorDiffusionKernel, Float32Array> = {
        FloydSteinberg: new Float32Array([
            4, // Node count
            7 / 16,  1, 0,
            3 / 16, -1, 1,   5 / 16, 0, 1,   1 / 16, 1, 1
        ]),
        FalseFloydSteinberg: new Float32Array([
            2,
            3 / 8, 1, 0,
            5 / 8, 0, 1,
        ]),
        Minis: new Float32Array([
            3,
            5 / 16, 1, 0,
            7 / 16, 0, 1,
            4 / 16, 1, 1,
        ]),
        Atkinson: new Float32Array([
            6,
            1 / 8,  1, 0,   1 / 8, 2, 0,
            1 / 8, -1, 1,   1 / 8, 0, 1,   1 / 8, 1, 1,
            1 / 8,  0, 2,
        ]),
        JaJuNi: new Float32Array([
            12,
            7 / 48,  1, 0,   5 / 48, 2, 0,
            3 / 48, -2, 1,   5 / 48, -1, 1,   7 / 48, 0, 1,   5 / 48, 1, 1,   3 / 48, 2, 1,
            1 / 48, -2, 2,   3 / 48, -1, 2,   5 / 48, 0, 2,   3 / 48, 1, 2,   1 / 48, 2, 2,
        ]),
        Stucki: new Float32Array([
            12,
            8 / 42,  1, 0,   4 / 42, 2, 0,
            2 / 42, -2, 1,   4 / 42, -1, 1,   8 / 42, 0, 1,   4 / 42, 1, 1,   2 / 42, 2, 1,
            1 / 42, -2, 2,   2 / 42, -1, 2,   4 / 42, 0, 2,   2 / 42, 1, 2,   1 / 42, 2, 2,
        ]),
        Burkes: new Float32Array([
            7,
            8 / 32,  1, 0,   4 / 32, 2, 0,
            2 / 32, -2, 1,   4 / 32, -1, 1,   8 / 32, 0, 1,   4 / 32, 1, 1,   2 / 32, 2, 1,
        ]),

        Sierra3: new Float32Array([
            10,
            5 / 32,  1, 0,   3 / 32, 2, 0,
            2 / 32, -2, 1,   4 / 32, -1, 1,   5 / 32, 0, 1,   4 / 32, 1, 1,   2 / 32, 2, 1,
            2 / 32, -1, 2,   3 / 32, 0, 2,   2 / 32, 1, 2,
        ]),
        Sierra2: new Float32Array([
            7,
            4 / 16,  1, 0,   3 / 16, 2, 0,
            1 / 16, -2, 1,   2 / 16, -1, 1,   3 / 16, 0, 1,   2 / 16, 1, 1,   1 / 16, 2, 1,
        ]),
        SierraLite: new Float32Array([
            3,
            2 / 4,  1, 0,
            1 / 4, -1, 1,
            1 / 4,  0, 1,
        ]),

        Fan: new Float32Array([
            4,
            7 / 16,  1, 0,
            1 / 16, -1, 1,   3 / 16, 0, 1,   5 / 16, 1, 1,
        ]),
        ShiauFan: new Float32Array([
            5,
            8 / 16,  1, 0,
            1 / 16, -2, 1,   1 / 16, -1, 1,   2 / 16, 0, 1,   4 / 16, 1, 1,
        ]),
        ShiauFan2: new Float32Array([
            4,
            7 / 16,  1, 0,
            1 / 16, -2, 1,   3 / 16, -1, 1,   5 / 16, 0, 1,
        ]),
        ShiauFan3: new Float32Array([
            4,
            4 / 8, 1, 0,
            1 / 8, -2, 1,   1 / 8, -1, 1,   2 / 8, 0, 1,
        ]),

        Diagonal: new Float32Array([
            4,
            5 / 16,  1, 0,
            2 / 16, -1, 1,   3 / 16, 0, 1,   6 / 16, 1, 1
        ]),

        StevePigeon: new Float32Array([
            8,
            2 / 12, 1, 0,    1 / 12, 2, 0,
            2 / 12, -1, 1,   2 / 12, 0, 1,   2 / 12, 1, 1,
            1 / 12, -2, 2,   1 / 12, 0, 2,   1 / 12, 2, 2,
        ]),

        RobertKist: new Float32Array([
            11,
            18 / 44, 1, 0,
            2 / 44, -2, 1,   4 / 44, -1, 1,   6 / 44, 0, 1,   4 / 44, 1, 1,   2 / 44, 2, 1,
            2 / 44, -2, 2,   1 / 44, -1, 2,   2 / 44, 0, 2,   1 / 44, 1, 2,   2 / 44, 2, 2,
        ]),

        // Optimum error-diffusion kernel design
        // https://doi.org/10.1117/12.271597
        WongAllebach: new Float32Array([
            4,
            0.2911,  1, 0,
            0.1373, -1, 1,
            0.3457,  0, 1, 0.2258,  1, 1,
        ]),

        /* too slow
        StevensonArce: new Float32Array([
            18,
            32 / 200, 1, 0,
            6 / 200, -3, 1,   13 / 200, -2, 1,  10 / 200, -1, 1,  19 / 200, 0, 1,   10 / 200, 1, 1,   18 / 200, 2, 1,   8 / 200, 3, 1,
            12 / 200, -1, 2,  26 / 200, 0, 2,   12 / 200, 1, 2,
            3 / 200, -3, 3,   6 / 200, -2, 3,   4 / 200, -1, 3,   8 / 200, 0, 3,   4 / 200, 1, 3,   7 / 200, 2, 3,   2 / 200, 3, 3,
        ]),
        */
    };

    // Memoized once per applyTo2d call via beforeBlockLoop(): non-hybrid mode
    // always diffuses through the same static kernel, no need to re-derive it
    // per block. bandLo/bandHi likewise depend only on props, not per-pixel data.
    private staticKernel: Float32Array | null = null;
    private bandLo = 0;
    private bandHi = 0;

    protected override getPadding() {
        return { left: 2, right: 2, bottom: 2 };
    }

    protected override beforeBlockLoop(): void {
        this.staticKernel = this.hybridMode
            ? null
            : DitherErrorDiffusionFilter.KERNELS[this.kernelHigh];

        const grayThreshold = 1 - this.grayThreshold;
        const halfSoftness = this.graySoftness / 2;
        this.bandLo = grayThreshold - halfSoftness;
        this.bandHi = grayThreshold + halfSoftness;
    }

    protected override diffuseError(
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
    ): void {
        if (!this.hybridMode) {
            diffuseKernelError(errBuff, paddedWidth, leftPad, bx, by, dir, this.staticKernel!, errR, errG, errB, 1);
            return;
        }

        const gray = computeGrayLevelForColorSpace(this.colorSpace, tmpR, tmpG, tmpB);
        const weight = smoothstep(this.bandLo, this.bandHi, gray);
        if (weight <= 0) {
            diffuseKernelError(errBuff, paddedWidth, leftPad, bx, by, dir, DitherErrorDiffusionFilter.KERNELS[this.kernelLow], errR, errG, errB, 1);
        } else if (weight >= 1) {
            diffuseKernelError(errBuff, paddedWidth, leftPad, bx, by, dir, DitherErrorDiffusionFilter.KERNELS[this.kernelHigh], errR, errG, errB, 1);
        } else {
            diffuseKernelError(errBuff, paddedWidth, leftPad, bx, by, dir, DitherErrorDiffusionFilter.KERNELS[this.kernelLow], errR, errG, errB, 1 - weight);
            diffuseKernelError(errBuff, paddedWidth, leftPad, bx, by, dir, DitherErrorDiffusionFilter.KERNELS[this.kernelHigh], errR, errG, errB, weight);
        }
    }

    override updateProps(props: Partial<DitherErrorDiffusionProps>): void {
        super.updateProps(props);

        this.hybridMode = props.hybridMode ?? this.hybridMode;
        this.kernelLow = props.kernelLow ?? this.kernelLow;
        this.kernelHigh = props.kernelHigh ?? this.kernelHigh;

        if (props.grayThreshold !== undefined) {
            this.grayThreshold = Math.min(1, Math.max(0, props.grayThreshold));
        } else {
            this.grayThreshold ??= DitherErrorDiffusionDefaultValues.grayThreshold;
        }

        if (props.graySoftness !== undefined) {
            this.graySoftness = Math.min(0.5, Math.max(0, props.graySoftness));
        } else {
            this.graySoftness ??= DitherErrorDiffusionDefaultValues.graySoftness;
        }
    }
}
