import fragmentSource from './shaders/dither-halftone.glsl?raw';
import { DitherFilter, type DitherProps } from './DitherFilter';

/** 0=dot 1=diamond 2=square 3=line 4=cross 5=square-dot 6=polygon 7=radial 8=right triangle */
export type DitherHalftoneShape = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type DitherHalftoneShapeId = keyof typeof HALFTONE_DOT_SHAPES;

export type DitherHalftoneProps = DitherProps & {
    spacingMultiplier: number;
    dotShape: DitherHalftoneShapeId;
    dotSize: number;
    strength: number;
    rotation: number;

    /** dotShape 'radial' only. Fraction of image width, 0 = canvas center. Range: -0.5-0.5 */
    radialCenterX: number;
    /** dotShape 'radial' only. Fraction of image height, 0 = canvas center. Range: -0.5-0.5 */
    radialCenterY: number;
    /** dotShape 'radial' only. 0 = concentric rings, >0 = spiral. Range: 0.0-3.0 */
    radialSpiralTightness: number;
    /** dotShape 'line' only. Range: 0.0-0.4 */
    lineWaveAmplitude: number;
    /** dotShape 'line' only. Cycles per cell. Range: 0.02-1.0 */
    lineWaveFrequency: number;

    /** Range: 0.0-1.0 */
    gooeyness: number;
    /** dotShape 'dot' only, requires gooeyness > 0 */
    gooeynessCheckerboard: boolean;
    /** Caps radius before the gooey merge sees it, in cell units. 0.5 =
     * uncapped (touches cell edge at full black), lower values hold
     * near-black dots back so high gooeyness has less to overflow into.
     * Range: 0.05-0.5 */
    maxDotRadius: number;

    /** Range: 0.0-1.0 */
    squareDotThreshold: number;
    /** Range: 0.01-0.5 */
    squareDotSoftness: number;

    /** shape 6 (regular polygon) only, sides>=4. */
    polygonType: keyof typeof HALFTONE_POLYGON_SIDES;
    /** shape 6, sides>=4. Max wobble in degrees, scales with luma
     * so it grows as the polygon shrinks. Range: -180-180 */
    polygonWobble: number;

    /** Flips the final dot pattern (ink <-> gap) before quantization */
    invertDots: boolean;

    /** dotShape 'dot' only. 'independent' = own SDF/coverage path,
     * dots never bridge, ignores gooeyness/checkerboard/strength.
     * 'channelSeparation' = independent-circle rendering run once per
     * R/G/B channel at its own angle, composited additively on black;
     * ignores palette/colorSpace/invertDots/independent. Mutually
     * exclusive; 'normal' runs the standard shape/gooeyness pipeline. */
    dotsMode: 'normal' | 'independent' | 'channelSeparation';
    /** dotsMode 'independent' only. Range: 0.01-1.0 */
    haloWidth: number;
};

export const HALFTONE_DOT_SHAPES = {
    dot: 0,
    diamond: 1,
    square: 2,
    line: 3,
    cross: 4,
    squaredot: 5,
    polygon: 6,
    radial: 7,
    triangle: 8,
};

export const HALFTONE_POLYGON_SIDES = {
    square: 4,
    pentagon: 5,
    hexagon: 6,
}

export const DitherHalftoneValueRanges = {
    dotSize: [1, 20, 0.01],
    strength: [0.01, 2.0, 0.01],
    spacingMultiplier: [0.5, 2.0, 0.01],
    radialSpiralTightness: [0.0, 3.0, 0.05],
    lineWaveAmplitude: [0.0, 0.4, 0.01],
    lineWaveFrequency: [0.02, 1.0, 0.01],
    gooeyness: [0.0, 1.0, 0.01],
    maxDotRadius: [0.05, 0.5, 0.01],
    squareDotThreshold: [0.0, 1.0, 0.01],
    squareDotSoftness: [0.01, 0.5, 0.01],
    polygonWobble: [-180, 180, 5],
    rotation: [-180, 180, 5],
    radialCenterX: [-0.5, 0.5, 0.01],
    radialCenterY: [-0.5, 0.5, 0.01],
    haloWidth: [0.01, 1.0, 0.01],
} satisfies RangeInputValueRanges<DitherHalftoneProps>;

export const DitherHalftoneDefaultValues: DitherHalftoneProps = {
    colorSpace: 'rgb',
    palette: [],
    colorSpacePalette: [],
    paletteMap: [],

    spacingMultiplier: 1.0,
    dotShape: 'dot',
    dotSize: 1.0,
    strength: 0.5,
    rotation: 45,

    radialCenterX: 0,
    radialCenterY: 0,
    radialSpiralTightness: 0,
    lineWaveAmplitude: 0.1,
    lineWaveFrequency: 0.3,

    gooeyness: 0,
    gooeynessCheckerboard: false,
    maxDotRadius: 0.5,

    squareDotThreshold: 0.5,
    squareDotSoftness: 0.12,

    polygonType: 'square',
    polygonWobble: 90,

    invertDots: false,

    dotsMode: 'normal',
    haloWidth: 0.2,
};

// Right triangle (polygonSides===3) has axis-aligned edges by
// construction, so grid rotation is snapped to the nearest of these.
const ROTATION_SNAP_VALUES = [-180, -90, 0, 90, 180] as const;

function snapToNearestRightAngle(degrees: number): number {
    let closest: number = ROTATION_SNAP_VALUES[0];
    let minDist = Math.abs(degrees - closest);
    for (let i = 1; i < ROTATION_SNAP_VALUES.length; i++) {
        const dist = Math.abs(degrees - ROTATION_SNAP_VALUES[i]);
        if (dist < minDist) {
            minDist = dist;
            closest = ROTATION_SNAP_VALUES[i];
        }
    }
    return closest;
}

export class DitherHalftoneFilter extends DitherFilter<'DitherHalftone'> {
    declare spacingMultiplier: DitherHalftoneProps['spacingMultiplier'];
    declare dotShape: DitherHalftoneProps['dotShape'];
    declare dotSize: DitherHalftoneProps['dotSize'];
    declare strength: DitherHalftoneProps['strength'];
    declare rotation: DitherHalftoneProps['rotation'];

    declare radialCenterX: DitherHalftoneProps['radialCenterX'];
    declare radialCenterY: DitherHalftoneProps['radialCenterY'];
    declare radialSpiralTightness: DitherHalftoneProps['radialSpiralTightness'];
    declare lineWaveAmplitude: DitherHalftoneProps['lineWaveAmplitude'];
    declare lineWaveFrequency: DitherHalftoneProps['lineWaveFrequency'];

    declare maxDotRadius: DitherHalftoneProps['maxDotRadius'];
    declare gooeyness: DitherHalftoneProps['gooeyness'];
    declare gooeynessCheckerboard: DitherHalftoneProps['gooeynessCheckerboard'];
    declare squareDotThreshold: DitherHalftoneProps['squareDotThreshold'];
    declare squareDotSoftness: DitherHalftoneProps['squareDotSoftness'];
    declare polygonType: DitherHalftoneProps['polygonType'];
    declare polygonWobble: DitherHalftoneProps['polygonWobble'];
    declare invertDots: DitherHalftoneProps['invertDots'];
    declare dotsMode: DitherHalftoneProps['dotsMode'];
    declare haloWidth: DitherHalftoneProps['haloWidth'];

    static type = 'DitherHalftone';
    static defaults = DitherHalftoneDefaultValues;

    static uniformLocations = [
        'uPalette',
        'uColorSpacePalette',
        'uPaletteSize',
        'uPaletteMap',

        'uSpacingMultiplier',
        'uStrength',
        'uDotShape',
        'uDotSize',
        'uTexSize',
        'uRotationSin',
        'uRotationCos',

        'uRadialLineCenter',
        'uRadialSpiralTightness',
        'uLineWaveAmplitude',
        'uLineWaveFrequency',

        'uGooeyness',
        'uGooeyCheckerboard',
        'uMaxDotRadius',

        'uSquareDotThreshold',
        'uSquareDotSoftness',

        'uPolygonSides',
        'uPolygonWobble',

        'uIndependentDots',
        'uChannelSeparation',
        'uHaloWidth',

        'uInvert',
    ];

    public override isNeutralState(): boolean {
        return !this.palette?.length || this.dotSize === 0;
    }

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    private get effectiveRotation(): number {
        return this.dotShape === 'triangle' ? snapToNearestRightAngle(this.rotation) : this.rotation;
    }

    private get effectiveDotSize(): number {
        return this.dotShape === 'triangle' ? Math.round(this.dotSize) : this.dotSize;
    }

    public override sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        super.sendUniformData(gl, uniformLocations);

        gl.uniform2f(uniformLocations.uTexSize, this.sourceWidth, this.sourceHeight);

        gl.uniform1i(uniformLocations.uDotShape, HALFTONE_DOT_SHAPES[this.dotShape]);
        gl.uniform1f(uniformLocations.uSpacingMultiplier, this.spacingMultiplier);
        gl.uniform1f(uniformLocations.uDotSize, this.effectiveDotSize);

        // uStrength is the smoothstep half-width, so it must stay > 0:
        // strength at its range maximum would otherwise invert to exactly 0.
        const [strengthMin, strengthMax] = DitherHalftoneValueRanges.strength;
        const effectiveStrength = this.invertDots
            ? Math.max(strengthMax - this.strength, strengthMin)
            : this.strength;
        gl.uniform1f(uniformLocations.uStrength, effectiveStrength);

        const angle = (this.effectiveRotation * Math.PI) / 180;
        gl.uniform1f(uniformLocations.uRotationSin, Math.sin(angle));
        gl.uniform1f(uniformLocations.uRotationCos, Math.cos(angle));

        // radialCenter* are fractions of the source size, so the same preset
        // lands in the same place at any resolution. The shader wants pixels.
        gl.uniform2f(
            uniformLocations.uRadialLineCenter,
            this.sourceWidth * (0.5 + this.radialCenterX),
            this.sourceHeight * (0.5 - this.radialCenterY),
        );
        gl.uniform1f(uniformLocations.uRadialSpiralTightness, this.radialSpiralTightness);
        gl.uniform1f(uniformLocations.uLineWaveAmplitude, this.lineWaveAmplitude);
        gl.uniform1f(uniformLocations.uLineWaveFrequency, this.lineWaveFrequency);

        gl.uniform1f(uniformLocations.uInvert, this.invertDots ? 1.0 : 0.0);
        gl.uniform1f(uniformLocations.uGooeyCheckerboard, this.gooeynessCheckerboard ? 1.0 : 0.0);
        gl.uniform1f(uniformLocations.uGooeyness, this.gooeyness);
        gl.uniform1f(uniformLocations.uMaxDotRadius, this.maxDotRadius);

        gl.uniform1f(uniformLocations.uSquareDotThreshold, this.squareDotThreshold);
        gl.uniform1f(uniformLocations.uSquareDotSoftness, this.squareDotSoftness);

        gl.uniform1f(uniformLocations.uPolygonSides, HALFTONE_POLYGON_SIDES[this.polygonType]);
        gl.uniform1f(uniformLocations.uPolygonWobble, (this.polygonWobble * Math.PI) / 180);

        gl.uniform1f(uniformLocations.uIndependentDots, this.dotsMode === 'independent' ? 1.0 : 0.0);
        gl.uniform1f(uniformLocations.uChannelSeparation, this.dotsMode === 'channelSeparation' ? 1.0 : 0.0);
        gl.uniform1f(uniformLocations.uHaloWidth, this.haloWidth);
    }

    override updateProps(props: Partial<DitherHalftoneProps>): void {
        super.updateProps(props);

        this.spacingMultiplier = props.spacingMultiplier ?? this.spacingMultiplier;
        this.dotShape = props.dotShape ?? this.dotShape;
        this.dotSize = props.dotSize ?? this.dotSize;
        this.invertDots = props.invertDots ?? this.invertDots;
        this.strength = props.strength ?? this.strength;
        this.rotation = props.rotation ?? this.rotation;

        this.radialCenterX = props.radialCenterX ?? this.radialCenterX;
        this.radialCenterY = props.radialCenterY ?? this.radialCenterY;
        this.radialSpiralTightness = props.radialSpiralTightness ?? this.radialSpiralTightness;
        this.lineWaveAmplitude = props.lineWaveAmplitude ?? this.lineWaveAmplitude;
        this.lineWaveFrequency = props.lineWaveFrequency ?? this.lineWaveFrequency;

        this.maxDotRadius = props.maxDotRadius ?? this.maxDotRadius;
        this.gooeyness = props.gooeyness ?? this.gooeyness;
        this.gooeynessCheckerboard = props.gooeynessCheckerboard ?? this.gooeynessCheckerboard;

        this.squareDotThreshold = props.squareDotThreshold ?? this.squareDotThreshold;
        this.squareDotSoftness = props.squareDotSoftness ?? this.squareDotSoftness;

        this.polygonType = props.polygonType ?? this.polygonType;
        this.polygonWobble = props.polygonWobble ?? this.polygonWobble;

        this.dotsMode = props.dotsMode ?? this.dotsMode;
        this.haloWidth = props.haloWidth ?? this.haloWidth;
    }
}
