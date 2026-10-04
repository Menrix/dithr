// Combine various filters from https://github.com/fabricjs/fabric.js/blob/master/src/filters/
import { type T2DPipelineState } from "fabric";
import fragmentSource from './shaders/color-correction.glsl?raw';
import { BaseFilter } from "./BaseFilter";

export type GrayscaleMode = 'none' | 'average' | 'lightness' | 'luminosity';

export type ColorCorrectionValueProps = {
    grayscaleMode: GrayscaleMode;
    invert: boolean;
    brightness: number;         // -1 to 1
    contrast: number;
    gammaR: number;             // 0.01 to 2.2
    gammaG: number;             // 0.01 to 2.2
    gammaB: number;             // 0.01 to 2.2
    hue: number;                // radians, 0 to 2*PI
    vibrance: number;           // -1 to 1
    saturation: number;         // -1 to 1
    shadowBoost: number;        // 0 to 0.3
    midBoost: number;           // -0.15 to 0.15
    highlightCompress: number;  // 0 to 0.4
    toneMidpoint: number;       // 0.3 to 0.7
    toneStrength: number;       // 0 to 1
};

export const ColorCorrectionValueRanges = {
    brightness: [-0.5, 0.5, 0.01],
    contrast: [-0.5, 0.5, 0.01],
    gammaR: [0.1, 2.2, 0.01],
    gammaG: [0.1, 2.2, 0.01],
    gammaB: [0.1, 2.2, 0.01],
    hue: [0, 360, 1],
    vibrance: [-1, 1, 0.01],
    saturation: [-1, 1, 0.01],
    shadowBoost: [0, 0.3, 0.02],
    midBoost: [-0.15, 0.15, 0.01],
    highlightCompress: [0, 0.4, 0.01],
    toneMidpoint: [0.3, 0.7, 0.01],
    toneStrength: [0, 1, 0.01],
} satisfies RangeInputValueRanges<ColorCorrectionValueProps>;

export const ColorCorrectionNeutralValues = {
    grayscaleMode: 'none',
    invert: false,
    brightness: 0,
    contrast: 0,
    gammaR: 1,
    gammaG: 1,
    gammaB: 1,
    hue: 0,
    vibrance: 0,
    saturation: 0,
    shadowBoost: 0,
    midBoost: 0,
    highlightCompress: 0,
    toneStrength: 0,
    // toneMidpoint has no independent neutral value
} satisfies Partial<ColorCorrectionValueProps>;

export const ColorCorrectionDefaultValues: ColorCorrectionValueProps = {
    ...ColorCorrectionNeutralValues,
    toneStrength: 0.5,
    toneMidpoint: 0.5,
};

export class ColorCorrectionFilter extends BaseFilter<'ColorCorrection'> {
    declare grayscaleMode: ColorCorrectionValueProps['grayscaleMode'];
    declare invert: ColorCorrectionValueProps['invert'];
    declare brightness: ColorCorrectionValueProps['brightness'];
    declare contrast: ColorCorrectionValueProps['contrast'];
    declare gammaR: ColorCorrectionValueProps['gammaR'];
    declare gammaG: ColorCorrectionValueProps['gammaG'];
    declare gammaB: ColorCorrectionValueProps['gammaB'];
    declare hue: ColorCorrectionValueProps['hue'];
    declare vibrance: ColorCorrectionValueProps['vibrance'];
    declare saturation: ColorCorrectionValueProps['saturation'];
    declare shadowBoost: ColorCorrectionValueProps['shadowBoost'];
    declare midBoost: ColorCorrectionValueProps['midBoost'];
    declare highlightCompress: ColorCorrectionValueProps['highlightCompress'];
    declare toneMidpoint: ColorCorrectionValueProps['toneMidpoint'];
    declare toneStrength: ColorCorrectionValueProps['toneStrength'];

    static type = 'ColorCorrection';
    static defaults = ColorCorrectionDefaultValues;

    static uniformLocations = [
        'uBrightness',
        'uContrast',
        'uGamma',
        'uHueCos',
        'uHueSin',
        'uVibrance',
        'uSaturation',
        'uShadowBoost',
        'uMidBoost',
        'uHighlightCompress',
        'uToneMidpoint',
        'uToneStrength',
        'uInvert',
    ];

    private gammaRgbValues: { r: Uint8ClampedArray, g: Uint8ClampedArray, b: Uint8ClampedArray};
    // Tone curve is single-channel (same mapping applied to r/g/b independently),
    // so one shared 256-entry LUT covers all three channels - unlike gamma,
    // which needs a per-channel table because gamma[0..2] can differ per channel.
    private toneCurveLut: Uint8ClampedArray;

    constructor(options = {}) {
        super(options);

        this.gammaRgbValues = {
            r: new Uint8ClampedArray(256),
            g: new Uint8ClampedArray(256),
            b: new Uint8ClampedArray(256),
        };
        this.toneCurveLut = new Uint8ClampedArray(256);
    }

    override getCacheKey() {
        return `${this.type}_grayscale-${this.grayscaleMode}`;
    }

    protected getFragmentSource(): string {
        let source = this.processFragmentSource(fragmentSource);

        if (this.grayscaleMode !== 'none') {
            source = `#define GRAYSCALE_${this.grayscaleMode.toUpperCase()} 1\n` + source
        }

        return source;
    }

    public override isNeutralState(): boolean {
        return this.grayscaleMode === ColorCorrectionNeutralValues.grayscaleMode
            && this.invert === ColorCorrectionNeutralValues.invert
            && this.brightness === ColorCorrectionNeutralValues.brightness
            && this.contrast === ColorCorrectionNeutralValues.contrast
            && this.gammaR === ColorCorrectionNeutralValues.gammaR
            && this.gammaG === ColorCorrectionNeutralValues.gammaG
            && this.gammaB === ColorCorrectionNeutralValues.gammaB
            && this.hue === ColorCorrectionNeutralValues.hue
            && this.vibrance === ColorCorrectionNeutralValues.vibrance
            && this.saturation === ColorCorrectionNeutralValues.saturation
            && (
                this.toneStrength === ColorCorrectionNeutralValues.toneStrength
                || (
                    this.shadowBoost === ColorCorrectionNeutralValues.shadowBoost
                    && this.midBoost === ColorCorrectionNeutralValues.midBoost
                    && this.highlightCompress === ColorCorrectionNeutralValues.highlightCompress
                )
            )
    }

    public override sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        // Brightness
        gl.uniform1f(uniformLocations.uBrightness, this.brightness);
        // Contrast
        gl.uniform1f(uniformLocations.uContrast, (259.0 * (this.contrast + 1.0)) / (259.0 - 255.0 * this.contrast));
        // Gamma
        gl.uniform3fv(uniformLocations.uGamma, [this.gammaR, this.gammaG, this.gammaB]);
        // Hue rotation - cos/sin precomputed on CPU, not passed as a raw angle
        gl.uniform1f(uniformLocations.uHueCos, Math.cos(this.hue));
        gl.uniform1f(uniformLocations.uHueSin, Math.sin(this.hue));
        // Vibrance
        gl.uniform1f(uniformLocations.uVibrance, -this.vibrance);
        // Saturation
        gl.uniform1f(uniformLocations.uSaturation, -this.saturation);
        // Tone curve
        gl.uniform1f(uniformLocations.uShadowBoost, this.shadowBoost);
        gl.uniform1f(uniformLocations.uMidBoost, this.midBoost);
        gl.uniform1f(uniformLocations.uHighlightCompress, this.highlightCompress);
        gl.uniform1f(uniformLocations.uToneMidpoint, this.toneMidpoint);
        gl.uniform1f(uniformLocations.uToneStrength, this.toneStrength);
        // Invert
        gl.uniform1f(uniformLocations.uInvert, this.invert ? 1.0 : 0.0);
    }

    private clampColorValue(value: number) {
        return Math.min(255, Math.max(0, Math.round(value)));
    }

    private smoothstep(edge0: number, edge1: number, x: number): number {
        if (edge0 === edge1) return x < edge0 ? 0 : 1;
        let t = (x - edge0) / (edge1 - edge0);
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        return t * t * (3 - 2 * t);
    }

    private grayscaleAverage(r: number, g: number, b: number) {
        const average = (r + g + b) / 3;
        return [average, average, average];
    }

    private grayscaleLuminosity(r: number, g: number, b: number) {
        // Rec. 709 luma coefficients
        const average = r * 0.2126 + g * 0.7152 + b * 0.0722;
        return [average, average, average];
    }

    private grayscaleLightness(r: number, g: number, b: number) {
        const average = (Math.min(r, g, b) + Math.max(r, g, b)) / 2;
        return [average, average, average];
    }

    public applyTo2d({ imageData: { data } }: T2DPipelineState) {
        const brightness = this.brightness * 255;
        const contrast = this.contrast * 255;
        const contrastF = (259 * (contrast + 255)) / (255 * (259 - contrast));

        const gammaInvR = 1 / this.gammaR;
        const gammaInvG = 1 / this.gammaG;
        const gammaInvB = 1 / this.gammaB;
        const vibrance = -this.vibrance / 255;
        const saturation = -this.saturation;

        const editBrightness = this.brightness !== ColorCorrectionNeutralValues.brightness;
        const editContrast = this.contrast !== ColorCorrectionNeutralValues.contrast;
        const editHue = this.hue !== ColorCorrectionNeutralValues.hue;
        const editVibSat = !(this.vibrance === ColorCorrectionNeutralValues.vibrance && this.saturation === ColorCorrectionNeutralValues.saturation);
        const editGamma = !(this.gammaR === ColorCorrectionNeutralValues.gammaR && this.gammaG === ColorCorrectionNeutralValues.gammaG && this.gammaB === ColorCorrectionNeutralValues.gammaB);
        const editToneCurve = !(
            this.toneStrength === ColorCorrectionNeutralValues.toneStrength
            || (
                this.shadowBoost === ColorCorrectionNeutralValues.shadowBoost
                && this.midBoost === ColorCorrectionNeutralValues.midBoost
                && this.highlightCompress === ColorCorrectionNeutralValues.highlightCompress
            )
        );

        // Hue rotation matrix (W3C hue-rotate, luma-preserving), computed once
        // per call - not per pixel. Row-major here; applied manually below
        // rather than via a matrix type since there's no vec/mat lib on the CPU path.
        let hm00 = 1, hm01 = 0, hm02 = 0;
        let hm10 = 0, hm11 = 1, hm12 = 0;
        let hm20 = 0, hm21 = 0, hm22 = 1;
        if (editHue) {
            const c = Math.cos(this.hue);
            const s = Math.sin(this.hue);
            hm00 = 0.213 + c*0.787 - s*0.213; hm01 = 0.213 - c*0.213 + s*0.143; hm02 = 0.213 - c*0.213 - s*0.787;
            hm10 = 0.715 - c*0.715 - s*0.715; hm11 = 0.715 + c*0.285 + s*0.140; hm12 = 0.715 - c*0.715 + s*0.715;
            hm20 = 0.072 - c*0.072 + s*0.928; hm21 = 0.072 - c*0.072 - s*0.283; hm22 = 0.072 + c*0.928 + s*0.072;
        }

        // This is an optimization - pre-compute a look-up table for each color channel
        // instead of performing these pow calls for each pixel in the image.
        const gammaRgb = this.gammaRgbValues;
        if (editGamma) {
            for (let i = 0; i < 256; i++) {
                gammaRgb.r[i] = Math.pow(i / 255, gammaInvR) * 255;
                gammaRgb.g[i] = Math.pow(i / 255, gammaInvG) * 255;
                gammaRgb.b[i] = Math.pow(i / 255, gammaInvB) * 255;
            }
        }

        // Same LUT optimization for the tone curve - single-channel, so one
        // 256-entry table instead of per-pixel smoothstep calls.
        const toneCurveLut = this.toneCurveLut;
        if (editToneCurve) {
            const m = this.toneMidpoint;
            const sb = this.shadowBoost;
            const mb = this.midBoost;
            const hc = this.highlightCompress;
            const st = this.toneStrength;
            for (let i = 0; i < 256; i++) {
                const c = i / 255;
                const wShadow = 1 - this.smoothstep(0, m, c);
                const wHighlight = this.smoothstep(m, 1, c);
                const wMid = Math.max(0, 1 - wShadow - wHighlight);

                const delta = sb * wShadow + mb * wMid - hc * wHighlight;
                const mapped = this.clampColorValue((c + delta) * 255) / 255;
                const result = c + (mapped - c) * st;
                toneCurveLut[i] = this.clampColorValue(result * 255);
            }
        }

        // Grayscale preparation
        let grayscaleFn;
        if (this.grayscaleMode === 'average') {
            grayscaleFn = this.grayscaleAverage;
        } else if (this.grayscaleMode === 'luminosity') {
            grayscaleFn = this.grayscaleLuminosity;
        } else if (this.grayscaleMode === 'lightness') {
            grayscaleFn = this.grayscaleLightness;
        }

        let r: number;
        let g: number;
        let b: number;

        for (let i = 0; i < data.length; i += 4) {
            r = data[i];
            g = data[i + 1];
            b = data[i + 2];

            // Grayscale
            if (grayscaleFn) {
                [r, g, b] = grayscaleFn(r, g, b);
            }

            // Brightness
            if (editBrightness) {
                r += brightness;
                g += brightness;
                b += brightness;
            }

            // Contrast
            if (editContrast) {
                r = contrastF * (r - 128) + 128;
                g = contrastF * (g - 128) + 128;
                b = contrastF * (b - 128) + 128;
            }

            // Gamma
            if (editGamma) {
                r = gammaRgb.r[this.clampColorValue(r)];
                g = gammaRgb.g[this.clampColorValue(g)];
                b = gammaRgb.b[this.clampColorValue(b)];
            } else if (editHue || editVibSat) {
                // Gamma's LUT lookup normally forces r/g/b back into [0,255] here.
                // When gamma is skipped, do it explicitly so downstream stages see
                // deterministic input regardless of which controls are active.
                r = this.clampColorValue(r);
                g = this.clampColorValue(g);
                b = this.clampColorValue(b);
            }

            // Hue rotation
            if (editHue) {
                const hr = hm00*r + hm01*g + hm02*b;
                const hg = hm10*r + hm11*g + hm12*b;
                const hb = hm20*r + hm21*g + hm22*b;
                r = hr; g = hg; b = hb;
            }

            // Vibrance & Saturation
            if (editVibSat) {
                const channelMax = Math.max(r, g, b);
                const avg = (r + g + b) / 3;
                const vibAmt = Math.abs(channelMax - avg) * 2 * vibrance;
                const k = vibAmt + (1 - vibAmt) * saturation;

                r += (channelMax - r) * k;
                g += (channelMax - g) * k;
                b += (channelMax - b) * k;
            }

            // Tone curve (shadow/mid/highlight) - runs last, right before the
            // dithering/palette-matching filter stage in the pipeline.
            if (editToneCurve) {
                r = toneCurveLut[this.clampColorValue(r)];
                g = toneCurveLut[this.clampColorValue(g)];
                b = toneCurveLut[this.clampColorValue(b)];
            }

            // Invert
            if (this.invert) {
                r = 255 - r;
                g = 255 - g;
                b = 255 - b;
            }

            // Update colors
            data[i] = this.clampColorValue(r);
            data[i + 1] = this.clampColorValue(g);
            data[i + 2] = this.clampColorValue(b);
        }
    }

    updateProps(props: ColorCorrectionValueProps): void {
        super.updateProps(props);

        this.grayscaleMode = props.grayscaleMode ?? this.grayscaleMode;
        this.invert = props.invert ?? this.invert;
        this.brightness = props.brightness ?? this.brightness;
        this.contrast = props.contrast ?? this.contrast;
        this.gammaR = props.gammaR ?? this.gammaR;
        this.gammaG = props.gammaG ?? this.gammaG;
        this.gammaB = props.gammaB ?? this.gammaB;
        this.vibrance = props.vibrance ?? this.vibrance;
        this.saturation = props.saturation ?? this.saturation;
        this.shadowBoost = props.shadowBoost ?? this.shadowBoost;
        this.midBoost = props.midBoost ?? this.midBoost;
        this.highlightCompress = props.highlightCompress ?? this.highlightCompress;
        this.toneMidpoint = props.toneMidpoint ?? this.toneMidpoint;
        this.toneStrength = props.toneStrength ?? this.toneStrength;
        this.hue = typeof props.hue !== 'undefined' ? (props.hue * Math.PI) / 180 : this.hue;
    }
}
