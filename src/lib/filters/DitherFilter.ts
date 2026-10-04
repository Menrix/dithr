import { BaseFilter } from "./BaseFilter";
import { flattenPalette, flattenPaletteRaw } from "$lib/color-utils";

export const FILTER_MAX_COLORS = 64;

export type DitherProps = {
    colorSpace: ColorSpace;
    palette: PaletteRgb;
    colorSpacePalette: ColorSpacePalette;
    paletteMap: number[];
};

export abstract class DitherFilter<T extends string> extends BaseFilter<T> {
    declare palette: DitherProps['palette'];
    declare colorSpacePalette: DitherProps['colorSpacePalette'];
    declare colorSpace: DitherProps['colorSpace'];
    declare paletteMap: DitherProps['paletteMap'];

    private prepPalette: Float32Array = new Float32Array();
    private prepColorSpacePalette: Float32Array = new Float32Array();
    private prepPaletteArray: Int32Array = new Int32Array(FILTER_MAX_COLORS).fill(-1);
    private prepPaletteSize = 0;

    // Identity of the inputs prepPalette* were built from, so preparePalette
    // can be called on every upload without re-flattening every frame.
    private prepSources: [unknown, unknown, unknown, unknown] | null = null;

    override getCacheKey() {
        return `${this.type}_${this.colorSpace}`;
    }

    override updateProps(props: Partial<DitherProps>): void {
        super.updateProps(props);

        this.colorSpace = props.colorSpace ?? this.colorSpace;
        this.palette = props.palette ?? this.palette;
        this.colorSpacePalette = props.colorSpacePalette ?? this.colorSpacePalette;
        this.paletteMap = props.paletteMap ?? this.paletteMap;

        this.preparePalette();
    }

    /**
     * Rebuilds the flattened uniform arrays if the source props changed.
     * Called from sendUniformData as well as updateProps: a filter built
     * straight from `static defaults` never goes through updateProps, and
     * uploading uPaletteSize from a live palette alongside an empty
     * prepPalette leaves the shader indexing uninitialised uniforms.
     */
    private preparePalette(): void {
        const palette = this.palette ?? [];
        const colorSpacePalette = this.colorSpacePalette ?? [];
        const paletteMap = this.paletteMap ?? [];

        if (
            this.prepSources !== null &&
            this.prepSources[0] === palette &&
            this.prepSources[1] === colorSpacePalette &&
            this.prepSources[2] === paletteMap &&
            this.prepSources[3] === this.colorSpace
        ) {
            return;
        }

        // The shader declares fixed arrays of FILTER_MAX_COLORS. A longer
        // palette overruns uniform3fv and makes Int32Array.set throw, so
        // everything past the limit is dropped here instead.
        const size = Math.min(palette.length, FILTER_MAX_COLORS);
        this.prepPaletteSize = size;

        const flat = flattenPalette(palette);
        this.prepPalette = flat.length > size * 3 ? flat.subarray(0, size * 3) : flat;

        const flatColorSpace =
            this.colorSpace === 'rgb'
                ? flattenPalette(colorSpacePalette)
                : flattenPaletteRaw(colorSpacePalette);
        this.prepColorSpacePalette =
            flatColorSpace.length > size * 3 ? flatColorSpace.subarray(0, size * 3) : flatColorSpace;

        this.prepPaletteArray = new Int32Array(FILTER_MAX_COLORS).fill(-1);
        this.prepPaletteArray.set(paletteMap.slice(0, FILTER_MAX_COLORS));

        this.prepSources = [palette, colorSpacePalette, paletteMap, this.colorSpace];
    }

    public override sendUniformData(
        gl: WebGLRenderingContext,
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        this.preparePalette();

        gl.uniform1i(uniformLocations.uPaletteSize, this.prepPaletteSize);
        gl.uniform3fv(uniformLocations.uPalette, this.prepPalette);
        gl.uniform3fv(uniformLocations.uColorSpacePalette, this.prepColorSpacePalette);
        gl.uniform1iv(uniformLocations.uPaletteMap, this.prepPaletteArray);
    }
}
