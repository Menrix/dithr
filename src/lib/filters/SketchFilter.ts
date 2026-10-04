import fragmentSource from './shaders/sketch.glsl?raw';
import { BaseFilter } from "./BaseFilter";

export type SketchProps = {
    enabled: boolean;
    threshold: number;
    intensity: number;
    thickness: number;
    overlayEnabled: boolean;
    overlayOpacity: number;
};

export const SketchValueRanges = {
    threshold: [0.0, 1.0, 0.05],
    intensity: [0.0, 1.0, 0.05],
    thickness: [0.1, 2.0, 0.1],
    overlayOpacity: [0, 1.0, 0.05],
} satisfies RangeInputValueRanges<SketchProps>;

export const SketchNeutralValues = {
} satisfies Partial<SketchProps>;

export const SketchDefaultValues: SketchProps = {
    enabled: false,
    threshold: 0.5,
    intensity: 1.0,
    thickness: 0.1,
    overlayEnabled: true,
    overlayOpacity: 0.3,
    ...SketchNeutralValues,
};

export class SketchFilter extends BaseFilter<'Sketch'> {
    declare enabled: SketchProps['enabled'];
    declare threshold: SketchProps['threshold'];
    declare intensity: SketchProps['intensity'];
    declare thickness: SketchProps['thickness'];
    declare overlayEnabled: SketchProps['overlayEnabled'];
    declare overlayOpacity: SketchProps['overlayOpacity'];

    static type = 'Sketch';
    static defaults = SketchDefaultValues;

    static uniformLocations = [
        'uTexSize',
        'uThreshold',
        'uIntensity',
        'uThickness',
        'uOverlayEnabled',
        'uOverlayOpacity',
    ];

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    public override isNeutralState(): boolean {
        return !this.enabled;
    }

    public override sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        gl.uniform1f(uniformLocations.uThreshold, this.threshold);
        gl.uniform1f(uniformLocations.uIntensity, this.intensity);
        gl.uniform1f(uniformLocations.uThickness, this.thickness);
        gl.uniform1f(uniformLocations.uOverlayEnabled, this.overlayEnabled ? 1.0 : 0.0);
        gl.uniform1f(uniformLocations.uOverlayOpacity, this.overlayOpacity);
        gl.uniform2f(uniformLocations.uTexSize, 1 / this.sourceWidth, 1 / this.sourceHeight);
    }

    private lumaAt = (src: Uint8ClampedArray, width: number, height: number, fx: number, fy: number) => {
        // bilinear interpolation, required for fractional thickness offsets;
        // nearest-pixel sampling quantizes thickness to whole steps and causes
        // the slider to jump instead of changing gradually
        const sample = (xx: number, yy: number) => {
            xx = Math.min(Math.max(xx, 0), width - 1);
            yy = Math.min(Math.max(yy, 0), height - 1);
            const i = (yy * width + xx) * 4;
            return 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
        };
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const dx = fx - x0, dy = fy - y0;
        const v00 = sample(x0, y0), v10 = sample(x0 + 1, y0);
        const v01 = sample(x0, y0 + 1), v11 = sample(x0 + 1, y0 + 1);
        const top = v00 * (1 - dx) + v10 * dx;
        const bottom = v01 * (1 - dx) + v11 * dx;
        return top * (1 - dy) + bottom * dy;
    }

    private smoothstep(edge0: number, edge1: number, x: number) {
        const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
        return t * t * (3 - 2 * t);
    }

    // Fixed 1px-kernel Sobel, returns ink amount (0..1) at (cx, cy).
    // Kernel width is intentionally NOT scaled by thickness -- see sketch.glsl
    // for why (abrupt jump once offset crosses native stroke width).
    private detectInk(src: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, threshold255: number) {
        const tl = this.lumaAt(src, width, height, cx - 1, cy - 1);
        const t_ = this.lumaAt(src, width, height, cx, cy - 1);
        const tr = this.lumaAt(src, width, height, cx + 1, cy - 1);
        const l  = this.lumaAt(src, width, height, cx - 1, cy);
        const r  = this.lumaAt(src, width, height, cx + 1, cy);
        const bl = this.lumaAt(src, width, height, cx - 1, cy + 1);
        const b  = this.lumaAt(src, width, height, cx, cy + 1);
        const br = this.lumaAt(src, width, height, cx + 1, cy + 1);

        const gx = -tl - 2 * l - bl + tr + 2 * r + br;
        const gy = -tl - 2 * t_ - tr + bl + 2 * b + br;
        const edge = Math.sqrt(gx * gx + gy * gy);

        return this.smoothstep(threshold255, threshold255 + 25.5, edge);
    }

    public applyTo2d(options: any) {
        const { imageData } = options;
        const { data, width, height } = imageData;
        const src = new Uint8ClampedArray(data);

        const threshold255 = this.threshold * 255; // normalized [0,1] GLSL space -> raw 0-255 CPU space
        const intensity = this.intensity;
        const radius = this.thickness; // dilation search radius, not kernel width
        const overlay = this.overlayEnabled;
        const overlayOpacity = this.overlayOpacity;

        // 8 compass directions, unrolled to match sketch.glsl exactly (parity, not
        // performance -- this is 9x the sampling cost of the un-thickened version;
        // profile on WebView before shipping)
        const DIAG = 0.7071;
        const dirs: [number, number][] = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [DIAG, DIAG], [-DIAG, DIAG], [DIAG, -DIAG], [-DIAG, -DIAG],
        ];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let inkAmount = this.detectInk(src, width, height, x, y, threshold255);
                for (const [dx, dy] of dirs) {
                    const ink = this.detectInk(src, width, height, x + dx * radius, y + dy * radius, threshold255);
                    if (ink > inkAmount) inkAmount = ink;
                }

                const grayMultiplier = 1 - inkAmount * intensity;

                const i = (y * width + x) * 4;
                if (overlay) {
                    const blend = 1 - overlayOpacity * (1 - grayMultiplier);
                    data[i]     = src[i] * blend;
                    data[i + 1] = src[i + 1] * blend;
                    data[i + 2] = src[i + 2] * blend;
                } else {
                    const value = 255 * grayMultiplier;
                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                }
            }
        }
    }

    override updateProps(props: Partial<SketchProps>): void {
        super.updateProps(props);

        this.enabled = props.enabled ?? this.enabled;
        this.threshold = props.threshold ?? this.threshold;
        this.intensity = props.intensity ?? this.intensity;
        this.thickness = props.thickness ?? this.thickness;
        this.overlayEnabled = props.overlayEnabled ?? this.overlayEnabled;
        this.overlayOpacity = props.overlayOpacity ?? this.overlayOpacity;
    }
}
