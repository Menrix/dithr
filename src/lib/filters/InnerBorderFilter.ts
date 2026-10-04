import fragmentSource from './shaders/inner-border.glsl?raw';
import { BaseFilter, BLEND_2D, BLEND_GLSL, type TBlendMode } from "./BaseFilter";


export type InnerBorderProps = {
    enabled: boolean;
    width: number;     // px, inset thickness
    radius: number;     // px, corner radius of the inner (hole) edge; 0 = square
    color: [number, number, number, number]; // rgba 0-1
    blendMode: TBlendMode;
};

export const InnerBorderValueRanges = {
    width: [0, 50, 1],
    radius: [0, 50, 1],
} satisfies RangeInputValueRanges<InnerBorderProps>;

export const InnerBorderDefaultValues: InnerBorderProps = {
    enabled: false,
    width: 5,
    radius: 5,
    color: [255, 255, 255, 0.5],
    blendMode: 'add',
};

export class InnerBorderFilter extends BaseFilter<'InnerBorder'> {
    declare enabled: InnerBorderProps['enabled'];
    declare width: InnerBorderProps['width'];
    declare radius: InnerBorderProps['radius'];
    declare color: InnerBorderProps['color'];
    declare blendMode: InnerBorderProps['blendMode'];

    static type = 'InnerBorder';
    static defaults = InnerBorderDefaultValues;

    static uniformLocations = [
        'uWidth',
        'uRadius',
        'uColor',
        'uTexSize',
    ];

    getCacheKey() {
        // blendMode changes shader source -> must be part of cache key
        return `${this.type}_${this.blendMode}`;
    }

    public override isNeutralState(): boolean {
        return !this.enabled || this.width === 0;
    }

    protected getFragmentSource(): string {
        let source = this.processFragmentSource(fragmentSource);
        return source.replace('/* {{BLEND_GLSL}} */', BLEND_GLSL[this.blendMode]);
    }

    public override sendUniformData(
        gl: WebGLRenderingContext, 
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        gl.uniform1f(uniformLocations.uWidth, this.width);
        gl.uniform1f(uniformLocations.uRadius, this.radius);
        gl.uniform2f(uniformLocations.uTexSize, this.sourceWidth, this.sourceHeight);
        gl.uniform4fv(uniformLocations.uColor, this.color);
    }

    public applyTo2d(options: { imageData: ImageData }) {
        const { data, width: w, height: h } = options.imageData;
        const bw = this.width;
        const [cr, cg, cb, ca] = this.color;
        const blendFn = BLEND_2D[this.blendMode];

        const halfW = w / 2 - bw;
        const halfH = h / 2 - bw;
        const r = Math.min(Math.max(this.radius, 0), Math.min(halfW, halfH));
        const bx = Math.max(halfW, 0);
        const by = Math.max(halfH, 0);

        const sdRoundRect = (px: number, py: number) => {
            const qx = Math.abs(px) - bx + r;
            const qy = Math.abs(py) - by + r;
            const ax = Math.max(qx, 0);
            const ay = Math.max(qy, 0);
            return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(qx, qy), 0) - r;
        };

        for (let y = 0; y < h; y++) {
            const py = y + 0.5 - h / 2;
            for (let x = 0; x < w; x++) {
                const px = x + 0.5 - w / 2;
                const sdHole = sdRoundRect(px, py);
                if (sdHole < -1) continue;

                const t = Math.min(Math.max(sdHole + 1, 0), 1);
                const inBorder = t * t * (3 - 2 * t); // smoothstep(-1,0,sdHole)
                const alpha = inBorder * ca;
                if (alpha <= 0) continue;

                const i = (y * w + x) * 4;
                data[i]     = (1 - alpha) * (data[i])     + alpha * blendFn(data[i], cr, ca);
                data[i + 1] = (1 - alpha) * (data[i + 1]) + alpha * blendFn(data[i + 1], cg, ca);
                data[i + 2] = (1 - alpha) * (data[i + 2]) + alpha * blendFn(data[i + 2], cb, ca);
            }
        }
    }

    override updateProps(props: InnerBorderProps) {
        super.updateProps(props);

        this.enabled = props.enabled ?? this.enabled;
        this.width = props.width ?? this.width;
        this.radius = props.radius ?? this.radius;
        this.color = props.color ?? this.color;
        this.blendMode = props.blendMode ?? this.blendMode;
    }
}
