import { filters } from 'fabric';
import fragmentSource from './shaders/unsharp-masking.glsl?raw';
import { BaseFilter } from './BaseFilter';

type UnsharpMaskingProps = {
    amount: number,
    screenSize: [number, number],
};

const defaultValues: UnsharpMaskingProps = {
    amount: 0,
    screenSize: [200, 200],
};

export class UnsharpMaskingFilter extends BaseFilter<'UnsharpMasking'> {
    declare amount: UnsharpMaskingProps['amount'];
    declare screenSize: UnsharpMaskingProps['screenSize'];

    static type = 'UnsharpMasking';
    static defaults = defaultValues;

    static uniformLocations = ['uAmount', 'uTexSize'];

    protected getFragmentSource(): string {
        return this.processFragmentSource(fragmentSource);
    }

    isNeutralState(options?: any): boolean {
        return this.amount === 0;
    }

    public override sendUniformData(
        gl: WebGLRenderingContext, 
        uniformLocations: Record<string, WebGLUniformLocation>
    ): void {
        gl.uniform1f(uniformLocations.uAmount, this.amount);
        gl.uniform2f(uniformLocations.uTexSize, 1.0 / this.screenSize[0], 1.0 / this.screenSize[1]);
    }

    private getPixelColor(src: Uint8ClampedArray, width: number, height: number, px: number, py: number): [number, number, number]{
        const x = Math.max(0, Math.min(width - 1, px));
        const y = Math.max(0, Math.min(height - 1, py));
        const idx = (y * width + x) * 4;

        return [src[idx], src[idx + 1], src[idx + 2]];
    }

    public applyTo2d(options: any) {
        if (this.amount === 0) {
            return;
        }

        const { data, width, height } = options.imageData;

        // Read-only deep copy of original source buffer
        const src = new Uint8ClampedArray(data);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;

                // Skip processing completely transparent fragments
                if (src[i + 3] === 0) {
                    continue;
                }

                // 1. Fetch the center pixel directly from the source buffer
                const rCenter = src[i];
                const gCenter = src[i + 1];
                const bCenter = src[i + 2];

                // 2. Sample 3x3 neighborhood spatial data 
                const pTL = this.getPixelColor(src, width, height, x - 1, y + 1);
                const pTC = this.getPixelColor(src, width, height, x,     y + 1);
                const pTR = this.getPixelColor(src, width, height, x + 1, y + 1);

                const pML = this.getPixelColor(src, width, height, x - 1, y);
                const pMR = this.getPixelColor(src, width, height, x + 1, y);

                const pBL = this.getPixelColor(src, width, height, x - 1, y - 1);
                const pBC = this.getPixelColor(src, width, height, x,     y - 1);
                const pBR = this.getPixelColor(src, width, height, x + 1, y - 1);

                // 3. 3x3 Gaussian Blur Application (Weights: Center 4/16, Edges 2/16, Corners 1/16)
                const blurR = (pTL[0] + pTR[0] + pBL[0] + pBR[0]) * 0.0625 +
                            (pTC[0] + pML[0] + pMR[0] + pBC[0]) * 0.125  +
                            rCenter * 0.25;

                const blurG = (pTL[1] + pTR[1] + pBL[1] + pBR[1]) * 0.0625 +
                            (pTC[1] + pML[1] + pMR[1] + pBC[1]) * 0.125  +
                            gCenter * 0.25;

                const blurB = (pTL[2] + pTR[2] + pBL[2] + pBR[2]) * 0.0625 +
                            (pTC[2] + pML[2] + pMR[2] + pBC[2]) * 0.125  +
                            bCenter * 0.25;

                // 4. High-Pass Mask Generation (Orig - Blur)
                const maskR = rCenter - blurR;
                const maskG = gCenter - blurG;
                const maskB = bCenter - blurB;

                // 5. Amplify and Combine
                const sharpR = rCenter + maskR * this.amount;
                const sharpG = gCenter + maskG * this.amount;
                const sharpB = bCenter + maskB * this.amount;

                // 6. Mutation phase with strict clamping [0, 255]
                data[i]     = sharpR < 0 ? 0 : (sharpR > 255 ? 255 : sharpR);
                data[i + 1] = sharpG < 0 ? 0 : (sharpG > 255 ? 255 : sharpG);
                data[i + 2] = sharpB < 0 ? 0 : (sharpB > 255 ? 255 : sharpB);
            }
        }
    }
}
