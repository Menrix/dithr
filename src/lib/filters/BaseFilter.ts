import { filters, type TWebGLPipelineState } from "fabric";
import { FILTER_MAX_COLORS } from "./DitherFilter";
import shaderUtils from './shaders/shader-utils.glsl?raw';

export type TBlendMode =
    'normal'
  | 'multiply'
  | 'add'
  | 'difference'
  | 'screen'
  | 'subtract'
  | 'darken'
  | 'lighten'
  | 'overlay'
  | 'exclusion'
  | 'tint';

export const BlendModeNames = {
    normal: 'Normal',
    add: 'Add',
    subtract: 'Subtract',
    multiply: 'Multiply',
    difference: 'Difference',
    screen: 'Screen',
    darken: 'Darken',
    lighten: 'Lighten',
    overlay: 'Overlay',
    exclusion: 'Exclusion',
    tint: 'Tint',
} satisfies Record<'normal' | TBlendMode, string>;

export const BLEND_GLSL: Record<TBlendMode, string> = {
    normal: `vec3 blend(vec3 base, vec3 blendC) { return blendC; }`,
    multiply: `vec3 blend(vec3 base, vec3 blendC) { return base * blendC; }`,
    screen: `vec3 blend(vec3 base, vec3 blendC) { return 1.0 - (1.0 - base) * (1.0 - blendC); }`,
    overlay: `
        float overlayCh(float b, float c) {
            return b < 0.5 ? 2.0 * b * c : 1.0 - 2.0 * (1.0 - b) * (1.0 - c);
        }
        vec3 blend(vec3 base, vec3 blendC) {
            return vec3(overlayCh(base.r, blendC.r), overlayCh(base.g, blendC.g), overlayCh(base.b, blendC.b));
        }`,
    difference: `vec3 blend(vec3 base, vec3 blendC) { return abs(base - blendC); }`,
    add: `vec3 blend(vec3 base, vec3 blendC) { return base + blendC; }`,
    subtract: `vec3 blend(vec3 base, vec3 blendC) { return base - blendC; }`,
    darken: `vec3 blend(vec3 base, vec3 blendC) { return min(base, blendC); }`,
    lighten: `vec3 blend(vec3 base, vec3 blendC) { return max(base, blendC); }`,
    exclusion: `vec3 blend(vec3 base, vec3 blendC) { return base + blendC - 2.0 * (blendC * base); }`,
    tint: `vec3 blend(vec3 base, vec3 blendC) { base *= (1.0 - uColor.a); return base + blendC; }`,
};

export const BLEND_2D: Record<TBlendMode, (base: number, c: number, alpha: number) => number> = {
    normal: (b, c) => c,
    multiply: (b, c) => (b * c) / 255,
    screen: (b, c) => 255 - ((255 - b) * (255 - c)) / 255,
    overlay: (b, c) =>
        b < 128 ? (2 * b * c) / 255 : 255 - (2 * (255 - b) * (255 - c)) / 255,
    difference: (b, c) => Math.abs(b - c),
    add: (b, c) => b + c,
    subtract: (b, c) => b - c,
    darken: (b, c) => Math.min(b, c),
    lighten: (b, c) => Math.max(b, c),
    exclusion: (b, c) => b + c - (2 * c * b) / 255,
    tint: (b, c, a) => {
        b *= 1 - a;
        return b + c;
    },
};

export abstract class BaseFilter<T extends string> extends filters.BaseFilter<T> {
    // Captured from the pipeline state each pass - see applyToWebGL below.
    protected sourceWidth = 0;
    protected sourceHeight = 0;

    override applyToWebGL(options: TWebGLPipelineState) {
        this.sourceWidth = options.sourceWidth;
        this.sourceHeight = options.sourceHeight;

        super.applyToWebGL(options);
    }

    protected sampleChannel(src: Uint8ClampedArray, width: number, height: number, x: number, y: number, channel: 0 | 1 | 2) {
        const cx = x < 0 ? 0 : x >= width ? width - 1 : x;
        const cy = y < 0 ? 0 : y >= height ? height - 1 : y;
        return src[(cy * width + cx) * 4 + channel];
    }

    protected processFragmentSource(source: string): string {
        source = source.replace('/* {{SHADER_UTILS}} */', shaderUtils);

        source = source.replace('/* {{DEFINE}} */', `
#define MAX_COLORS ${FILTER_MAX_COLORS}
${(this as any).colorSpace === 'lab' ? '#define USE_LAB 1' : ''}
${(this as any).colorSpace === 'oklab' ? '#define USE_OKLAB 1' : ''}

#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    precision highp int;
#else
    precision mediump float;
    precision mediump int;
#endif

varying vec2 vTexCoord;
uniform sampler2D uTexture;
uniform vec3 uPalette[MAX_COLORS];
uniform vec3 uColorSpacePalette[MAX_COLORS];
uniform int uPaletteMap[MAX_COLORS];
uniform int uPaletteSize;

`);

        return source;
    }

    updateProps(props: Record<string, any>) {}
}
