export function nearestPaletteIndex(palette: PaletteRgb, r: number, g: number, b: number): number {
    let best = Infinity;
    let idx = 0;
    const size = palette.length;

    for (let i = 0; i < size; i++) {
        const color = palette[i];
        const dr = r - color[0];
        const dg = g - color[1];
        const db = b - color[2];

        const d = 0.2126729 * dr * dr + 0.7151522 * dg * dg + 0.0721750 * db * db;
        if (d < best) {
            best = d;
            idx = i;
        }
    }

    return idx;
}

export function rotateImageData(src: ImageData, orientation: CanvasOrientation): ImageData {
    if (orientation === 'top') {
        return src;
    }

    const { width: w, height: h, data: srcData } = src;

    // 'left'/'right' swap dimensions (90°), 'bottom' keeps them (180°)
    const outW = orientation === 'bottom' ? w : h;
    const outH = orientation === 'bottom' ? h : w;
    const dst = new ImageData(outW, outH);
    const dstData = dst.data;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const srcIdx = (y * w + x) * 4;
            let dx: number, dy: number;

            switch (orientation) {
                case 'bottom': // 180°
                    dx = w - 1 - x;
                    dy = h - 1 - y;
                    break;
                case 'left': // 90° CCW
                    dx = y;
                    dy = w - 1 - x;
                    break;
                case 'right': // 90° CW
                    dx = h - 1 - y;
                    dy = x;
                    break;
            }

            const dstIdx = (dy * outW + dx) * 4;
            dstData[dstIdx] = srcData[srcIdx];
            dstData[dstIdx + 1] = srcData[srcIdx + 1];
            dstData[dstIdx + 2] = srcData[srcIdx + 2];
            dstData[dstIdx + 3] = srcData[srcIdx + 3];
        }
    }

    return dst;
}

export function getImageDataFromCanvas(canvas: HTMLCanvasElement, orientation: CanvasOrientation = 'top'): ImageData {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);

    return rotateImageData(imageData, orientation);
}

export function encodeImage(imageData: ImageData, palette: PaletteRgb, transformOptions: EinkImageTransform): Uint8Array {
    const { width: srcWidth, height: srcHeight, data: srcData } = imageData;

    const destWidth = transformOptions.rotate ? srcHeight : srcWidth;
    const destHeight = transformOptions.rotate ? srcWidth : srcHeight;

    const bytesPerColumn = Math.ceil(destHeight / 4);
    const bufferLength = destWidth * bytesPerColumn;
    const imageBuffer = new Uint8Array(bufferLength);

    let index = 0;

    // Outer loop: Right-to-Left horizontal scan (relative to target space)
    for (let i = destWidth - 1; i >= 0; i--) {
        // Inner loop: Vertical scan grouped by 4 pixels (relative to target space)
        for (let j = 0; j < bytesPerColumn; j++) {
            let temp = 0;

            for (let k = 0; k < 4; k++) {
                temp <<= 2; 
                let destY = (j * 4) + k;
                let destX = i;

                let srcX = destX;
                let srcY = destY;

                if (transformOptions.rotate) {
                    // Forward: destX = srcHeight - 1 - srcY, destY = srcX
                    // Inverse:
                    srcX = destY;
                    srcY = srcHeight - 1 - destX;
                }

                // Apply Inverse Geometric Transforms to map Target (dest) back to Source (src)
                // Reverse Flips (Executed in reverse order of forward transformation)
                if (transformOptions.flipVertical) {
                    srcY = srcHeight - 1 - srcY;
                }
                if (transformOptions.flipHorizontal) {
                    srcX = srcWidth - 1 - srcX;
                }

                // Sample directly from the unmodified source buffer
                const srcIdx = (srcY * srcWidth + srcX) * 4;
                const r = srcData[srcIdx];
                const g = srcData[srcIdx + 1];
                const b = srcData[srcIdx + 2];

                temp |= nearestPaletteIndex(palette, r, g, b);
            }

            imageBuffer[index++] = temp;
        }
    }

    return imageBuffer;
}
