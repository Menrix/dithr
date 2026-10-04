import { CANVAS_SIZE_MAX, CANVAS_SIZE_MIN } from "./constants";

export const sleep = (ms: number): Promise<void> =>  new Promise(resolve => setTimeout(resolve, ms));

export function hexStringToBytes(str: string): Uint8Array {
    if (str.length % 2 !== 0) {
        throw new SyntaxError('Hex string must have an even number of characters');
    }

    const length = str.length / 2;
    const view = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
        const byteIndex = i * 2;
        view[i] = parseInt(str.substring(byteIndex, byteIndex + 2), 16);
    }

    return view;
}

export function hexPayloadToBytes(obj: Record<string, string>): Uint8Array {
    const str = Object.values(obj).join('');
    return hexStringToBytes(str);
}

export function bytesToHex(b: Uint8Array): string {
    return Array.from(b)
        .map(x => x.toString(16)
        .padStart(2, '0'))
        .join('');
}

export function clamp255(v: number): number {
    return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function clampCanvasSize(v: number) {
    return Math.min(CANVAS_SIZE_MAX, Math.max(CANVAS_SIZE_MIN, Math.round(v)));
}

export function randomInt(min: number, max: number, step: number = 1): number {
    const steps = Math.floor((max - min) / step);
    return min + Math.floor(Math.random() * (steps + 1)) * step;
}

export function randomFloat(min: number, max: number, step: number = 0.01): number {
    if (step === 0) {
        return Math.random() * (max - min) + min;
    }

    const steps = Math.floor((max - min) / step);
    return min + Math.floor(Math.random() * (steps + 1)) * step;
}

export function isInt(value: unknown): boolean {
    return Number.isInteger(value);
}

export function isFloat(value: unknown): boolean {
    return typeof value === "number" && Number.isFinite(value) && !Number.isInteger(value);
}

export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function blurActive() {
    try {
        (document.activeElement as HTMLElement)?.blur();
    } catch (e) {}
}
