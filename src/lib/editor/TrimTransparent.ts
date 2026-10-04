import { FabricImage, Point } from 'fabric';

interface AlphaBBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

function getAlphaBoundingBox(
    source: HTMLImageElement | HTMLCanvasElement,
    maxScanDim = 512
): AlphaBBox | null {
    const srcW = source.width;
    const srcH = source.height;
    const scale = Math.min(1, maxScanDim / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, w, h);

    const { data } = ctx.getImageData(0, 0, w, h);

    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const alpha = data[(y * w + x) * 4 + 3];
            if (alpha === 0) {
                continue;
            }

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }

    if (maxX === -1) return null;

    const invScale = 1 / scale;
    const x = Math.floor(minX * invScale);
    const y = Math.floor(minY * invScale);
    return {
        x,
        y,
        width: Math.min(Math.ceil((maxX - minX + 1) * invScale), srcW - x),
        height: Math.min(Math.ceil((maxY - minY + 1) * invScale), srcH - y),
    };
}

export function trimTransparentImage(img: FabricImage): void {
    const element = img.getElement() as HTMLImageElement | HTMLCanvasElement;
    const bbox = getAlphaBoundingBox(element);
    if (!bbox) return;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = bbox.width;
    trimmedCanvas.height = bbox.height;
    const ctx = trimmedCanvas.getContext('2d')!;
    ctx.drawImage(
        element,
        bbox.x, bbox.y, bbox.width, bbox.height,   // uncropped source rect
        0, 0, bbox.width, bbox.height               // dest rect
    );

    const currentTopLeft = img.getPositionByOrigin('left', 'top');
    const newTopLeft = new Point(
        currentTopLeft.x + bbox.x,
        currentTopLeft.y + bbox.y
    );

    img.setElement(trimmedCanvas);
    img.set({
        cropX: 0,
        cropY: 0,
        width: bbox.width,
        height: bbox.height,
    });

    img.setPositionByOrigin(newTopLeft, 'left', 'top');
    img.setCoords();
}
