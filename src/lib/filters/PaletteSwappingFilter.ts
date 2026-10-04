import { type T2DPipelineState } from "fabric";
import fragmentSource from './shaders/palette-swapping.glsl?raw';
import { flattenPalette } from "$lib/color-utils";
import { BaseFilter } from "./BaseFilter";

type PaletteSwappingProps = {
    sourcePalette: PaletteRgb;
    targetPalette: PaletteRgb;
};

export const PaletteSwappingDefaultValues: PaletteSwappingProps = {
    sourcePalette: [],
    targetPalette: [],
};

export class PaletteSwappingFilter extends BaseFilter<'PaletteSwapping'> {
    declare sourcePalette: PaletteSwappingProps['sourcePalette'];
    declare targetPalette: PaletteSwappingProps['targetPalette'];

    static type = 'PaletteSwapping';
    static defaults = PaletteSwappingDefaultValues;

    static uniformLocations = [
        'uPaletteSize',
        'uSourcePalette',
        'uTargetPalette',
    ];

    private paletteMap: Record<string, ColorRgb> = {};

    constructor(options = {}) {
        super(options);
        this.updatePalette(this.sourcePalette, this.targetPalette);
    }

    public updatePalette(sourcePalette: PaletteRgb, targetPalette: PaletteRgb) {
        this.sourcePalette = sourcePalette;
        this.targetPalette = targetPalette;

        this.paletteMap = {};
        for (let i = 0; i < this.sourcePalette.length; i++) {
            const src = this.sourcePalette[i];
            const tgt = this.targetPalette[i];

            const key = src.join(',');
            this.paletteMap[key] = tgt;
        }
    }

    public override isNeutralState(): boolean {
        return this.sourcePalette.length === 0;
    }

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    public override sendUniformData(
        gl: WebGLRenderingContext, 
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        gl.uniform1i(uniformLocations.uPaletteSize, this.sourcePalette.length);
        gl.uniform3fv(uniformLocations.uSourcePalette, flattenPalette(this.sourcePalette));
        gl.uniform3fv(uniformLocations.uTargetPalette, flattenPalette(this.targetPalette));
    }

    public override applyTo2d(options: T2DPipelineState) {
        const data = options.imageData.data;
        const src = this.sourcePalette;
        const tgt = this.targetPalette;
        const size = data.length;
        const paletteSize = src.length;
        // const tolSq = this.tolerance * this.tolerance * 3 * 255 * 255;

        for (let i = 0; i < size; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            let bestIdx = 0;
            let bestDistSq = Infinity;
            for (let p = 0; p < paletteSize; p++) {
                const dr = r - src[p][0];
                const dg = g - src[p][1];
                const db = b - src[p][2];
                const distSq = dr * dr + dg * dg + db * db;
                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    bestIdx = p;
                }
            }

            // if (bestIdx !== -1 && bestDistSq <= tolSq) {
                data[i]     = tgt[bestIdx][0];
                data[i + 1] = tgt[bestIdx][1];
                data[i + 2] = tgt[bestIdx][2];
            // }
        }
    }
}
