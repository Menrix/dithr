import { type TWebGLUniformLocationMap } from "fabric";
import fragmentSource from './shaders/dither-halftone-cmyk.glsl?raw';
import { DitherFilter } from "./DitherFilter";

type DitherHalftoneCmykProps = {
    enabled: boolean;
    dotSize: number;   // px, grid pitch before rotation
    strength: number;  // AA edge feather, 2D path uses it as radius jitter softness
    angleC: number;    // degrees
    angleM: number;
    angleY: number;
    angleK: number;
};

export const DitherHalftoneCmykDefaultValues: DitherHalftoneCmykProps = {
    enabled: false,
    dotSize: 6,
    strength: 0.1,
    angleC: 15,
    angleM: 75,
    angleY: 0,
    angleK: 45,
};

export class DitherHalftoneCmykFilter extends DitherFilter<'DitherHalftoneCmyk'> {
    declare enabled: DitherHalftoneCmykProps['enabled'];
    declare dotSize: DitherHalftoneCmykProps['dotSize'];
    declare strength: DitherHalftoneCmykProps['strength'];
    declare angleC: DitherHalftoneCmykProps['angleC'];
    declare angleM: DitherHalftoneCmykProps['angleM'];
    declare angleY: DitherHalftoneCmykProps['angleY'];
    declare angleK: DitherHalftoneCmykProps['angleK'];

    static type = 'DitherHalftoneCmyk';
    static defaults = DitherHalftoneCmykDefaultValues;

    static uniformLocations = [
        'uTexSize',
        'uDotSize',
        'uStrength',
        'uAngleC',
        'uAngleM',
        'uAngleY',
        'uAngleK',
    ];

    protected getFragmentSource(): string {
        return fragmentSource;
    }

    public override isNeutralState(): boolean {
        return !this.enabled;
    }

    sendUniformData(gl: WebGLRenderingContext, uniformLocations: TWebGLUniformLocationMap): void {
        gl.uniform2f(uniformLocations.uTexSize, this.sourceWidth, this.sourceHeight);

        gl.uniform1f(uniformLocations.uDotSize, this.dotSize);
        gl.uniform1f(uniformLocations.uStrength, this.strength);
        gl.uniform1f(uniformLocations.uAngleC, this.angleC);
        gl.uniform1f(uniformLocations.uAngleM, this.angleM);
        gl.uniform1f(uniformLocations.uAngleY, this.angleY);
        gl.uniform1f(uniformLocations.uAngleK, this.angleK);
    }
}
