import { filters, type T2DPipelineState, type TWebGLPipelineState, type TWebGLUniformLocationMap } from "fabric";
import fragmentSource from './shaders/glitch.glsl?raw';
import { BaseFilter } from "./BaseFilter";
import { clamp255, randomFloat, randomInt } from "$lib/utils";

export type GlitchProps = {
    enabled: boolean;

    redAngle: number;    // degrees
    redDistance: number; // pixels
    redOpacity: number;  // 0-1

    greenAngle: number;
    greenDistance: number;
    greenOpacity: number;  // 0-1

    blueAngle: number;
    blueDistance: number;
    blueOpacity: number;  // 0-1

    seed: number;  // any
    intensity: number; // 0-1
    sliceCount: number;  // 3-200
    noiseAmount: number;  // 0-1
};

export const GlitchValueRanges = {
    seed:       [1, 1000, 1],
    intensity:  [0, 1, 0.01],
    sliceCount: [3, 200, 1],
    noiseAmount: [0, 1, 1],

    redDistance: [-100, 100, 1],
    redAngle:    [-180, 180, 5],
    redOpacity:  [0.1, 1, 0.01],

    greenDistance: [-100, 100, 1],
    greenAngle:    [-180, 180, 5],
    greenOpacity:  [0.1, 1, 0.01],

    blueDistance: [-100, 100, 1],
    blueAngle:    [-180, 180, 5],
    blueOpacity:  [0.1, 1, 0.01],

} satisfies RangeInputValueRanges<GlitchProps>;

export const GlitchDefaultValues: GlitchProps = {
    enabled: false,
    redDistance: 0,
    redAngle: 0,
    redOpacity: 1,

    greenDistance: 0,
    greenAngle: 0,
    greenOpacity: 1,

    blueDistance: 0,
    blueAngle: 180,
    blueOpacity: 1,

    seed: randomInt.apply(null, GlitchValueRanges.seed),
    intensity: randomFloat.apply(null, GlitchValueRanges.intensity),
    sliceCount: randomInt.apply(null, GlitchValueRanges.sliceCount),
    noiseAmount: 0,
};

const DEG_TO_RAD = Math.PI / 180;

export class GlitchFilter extends BaseFilter<'Glitch'> {
    static type = 'Glitch';
    static defaults = GlitchDefaultValues;

    static uniformLocations = [
        'uTexSize',
        'uSeed',
        'uIntensity',
        'uSliceCount',
        'uNoiseAmount',
        'uRedOffset',
        'uGreenOffset',
        'uBlueOffset',
        'uRedOpacity',
        'uGreenOpacity',
        'uBlueOpacity',
    ];

    declare enabled: GlitchProps['enabled'];
    declare redAngle: GlitchProps['redAngle'];
    declare redDistance: GlitchProps['redDistance'];
    declare redOpacity: GlitchProps['redOpacity'];
    declare greenAngle: GlitchProps['greenAngle'];
    declare greenDistance: GlitchProps['greenDistance'];
    declare greenOpacity: GlitchProps['greenOpacity'];
    declare blueAngle: GlitchProps['blueAngle'];
    declare blueDistance: GlitchProps['blueDistance'];
    declare blueOpacity: GlitchProps['blueOpacity'];

    declare seed: GlitchProps['seed'];
    declare intensity: GlitchProps['intensity'];
    declare sliceCount: GlitchProps['sliceCount'];
    declare noiseAmount: GlitchProps['noiseAmount'];

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    private channelIsNoop = (distance: number, opacity: number) => distance === 0 && opacity === 1;

    public override isNeutralState(): boolean {
        return (
            !this.enabled ||
            (
                this.intensity === 0 &&
                this.channelIsNoop(this.redDistance, this.redOpacity) &&
                this.channelIsNoop(this.greenDistance, this.greenOpacity) &&
                this.channelIsNoop(this.blueDistance, this.blueOpacity)
            )
        );
    }

    sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: TWebGLUniformLocationMap,
    ) {
        const redRad = this.redAngle * DEG_TO_RAD;
        const greenRad = this.greenAngle * DEG_TO_RAD;
        const blueRad = this.blueAngle * DEG_TO_RAD;

        gl.uniform2f(
            uniformLocations.uRedOffset,
            Math.cos(redRad) * this.redDistance,
            Math.sin(redRad) * this.redDistance,
        );
        gl.uniform2f(
            uniformLocations.uGreenOffset,
            Math.cos(greenRad) * this.greenDistance,
            Math.sin(greenRad) * this.greenDistance,
        );
        gl.uniform2f(
            uniformLocations.uBlueOffset,
            Math.cos(blueRad) * this.blueDistance,
            Math.sin(blueRad) * this.blueDistance,
        );

        gl.uniform1f(uniformLocations.uRedOpacity, this.redOpacity);
        gl.uniform1f(uniformLocations.uGreenOpacity, this.greenOpacity);
        gl.uniform1f(uniformLocations.uBlueOpacity, this.blueOpacity);

        gl.uniform2f(uniformLocations.uTexSize, this.sourceWidth, this.sourceHeight);
        gl.uniform1f(uniformLocations.uSeed, this.seed);
        gl.uniform1f(uniformLocations.uIntensity, this.intensity);
        gl.uniform1f(uniformLocations.uSliceCount, this.sliceCount);
        gl.uniform1f(uniformLocations.uNoiseAmount, this.noiseAmount);
    }

    private hash(n: number) {
        const s = Math.sin(n) * 43758.5453123;
        return s - Math.floor(s);
    }

    applyTo2d(options: T2DPipelineState) {
        const { imageData } = options;
        const { data, width, height } = imageData;
        // Read from a snapshot; data itself is the write target, and channel
        // shifting reads neighboring pixels, so writing in place would corrupt
        // reads for pixels processed later in the same pass.
        const src = new Uint8ClampedArray(data);

        const bandHeight = Math.max(1, Math.floor(height / this.sliceCount));

        const redRad = this.redAngle * DEG_TO_RAD;
        const greenRad = this.greenAngle * DEG_TO_RAD;
        const blueRad = this.blueAngle * DEG_TO_RAD;

        // Rounded to whole pixels - unlike the WebGL path's texture2D sample,
        // this does not bilinearly interpolate at fractional offsets. A
        // distance of 3.5px will look slightly different between backends.
        const redOffsetX = Math.round(Math.cos(redRad) * this.redDistance);
        const redOffsetY = Math.round(Math.sin(redRad) * this.redDistance);
        const greenOffsetX = Math.round(Math.cos(greenRad) * this.greenDistance);
        const greenOffsetY = Math.round(Math.sin(greenRad) * this.greenDistance);
        const blueOffsetX = Math.round(Math.cos(blueRad) * this.blueDistance);
        const blueOffsetY = Math.round(Math.sin(blueRad) * this.blueDistance);

        for (let y = 0; y < height; y++) {
            const band = Math.floor(y / bandHeight);
            const bandRand = this.hash(band + this.seed);
            const active = bandRand > 0.6 ? 1 : 0;
            const bandDispPx = Math.round((bandRand - 0.5) * 0.08 * this.intensity * width * active);
            const noise = (this.hash(y * 1000 + this.seed) - 0.5) * this.noiseAmount * 76.5;

            for (let x = 0; x < width; x++) {
                const baseX = x + bandDispPx;
                const clampedBaseX = baseX < 0 ? 0 : baseX >= width ? width - 1 : baseX;
                const idx = (y * width + x) * 4;
                const baseIdx = (y * width + clampedBaseX) * 4;

                const shiftedR = this.sampleChannel(src, width, height, clampedBaseX + Math.round(redOffsetX), y + Math.round(redOffsetY), 0);
                const shiftedG = this.sampleChannel(src, width, height, clampedBaseX + Math.round(greenOffsetX), y + Math.round(greenOffsetY), 1);
                const shiftedB = this.sampleChannel(src, width, height, clampedBaseX + Math.round(blueOffsetX), y + Math.round(blueOffsetY), 2);

                data[idx]     = clamp255(src[baseIdx]     + (shiftedR - src[baseIdx])     * this.redOpacity   + noise);
                data[idx + 1] = clamp255(src[baseIdx + 1] + (shiftedG - src[baseIdx + 1]) * this.greenOpacity + noise);
                data[idx + 2] = clamp255(src[baseIdx + 2] + (shiftedB - src[baseIdx + 2]) * this.blueOpacity  + noise);
                data[idx + 3] = src[baseIdx + 3];
            }
        }
    }

    updateProps(props: GlitchProps) {
        super.updateProps(props);

        this.enabled = props.enabled ?? this.enabled;
        this.redAngle = props.redAngle ?? this.redAngle;
        this.redDistance = props.redDistance ?? this.redDistance;
        this.redOpacity = props.redOpacity ?? this.redOpacity;
        this.greenAngle = props.greenAngle ?? this.greenAngle;
        this.greenDistance = props.greenDistance ?? this.greenDistance;
        this.greenOpacity = props.greenOpacity ?? this.greenOpacity;
        this.blueAngle = props.blueAngle ?? this.blueAngle;
        this.blueDistance = props.blueDistance ?? this.blueDistance;
        this.blueOpacity = props.blueOpacity ?? this.blueOpacity;

        this.seed = props.seed ?? this.seed;
        this.intensity = props.intensity ?? this.intensity;
        this.sliceCount = props.sliceCount ?? this.sliceCount;
        this.noiseAmount = props.noiseAmount ?? this.noiseAmount;
    }
}
