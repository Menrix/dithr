declare const __GIT_HASH__: string;
declare const __DEVICE_IMAGES__: string[];

declare module '*.glsl?raw' {
    const content: string;
    export default content;
}

type ColorSpace = 'rgb' | 'lab' | 'oklab';

type ColorRgb = [number, number, number];
type ColorLab = [number, number, number];
type ColorOklab = [number, number, number];

type PaletteRgb = ColorRgb[];
type ColorSpacePalette = Array<ColorRgb | ColorLab | ColorOklab>;

type DevicePaletteInfo = {
    name: string;
    colors: PaletteRgb;
    devices?: string[];
};

type PaletteInfo = {
    name: string;
    colors: PaletteRgb;
    author: string;
    url?: string;
    devicePalettes: Record<string, DevicePaletteInfo>;
    colorIndices?: Partial<Record<EinkColorChannel, number>>;
};

interface WorkspaceRect extends Rect {
    isWorkspace?: boolean;
}

type EditorView = 'canvas' | 'dither';

type DitherMethod = 'quantization' | 'halftone' | 'bayer' | 'errorDiffusion' | 'errorOstromoukhov';

type SyncProgressHandler = {
    onTransferProgress(currentScreen: number, totalScreens: number, currentPacket: number, totalPackets: number): void;
    onRefreshCountdown(remaining: number): void;
    onError(error: string): void;
    switchStep(step: import('$lib/shared').SyncStep): void;
}

type SyncImageOptions = {
    rotate: boolean;
    flipHorizontal: boolean;
    flipVertical: boolean;
}

type CanvasZoomFactor = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2 | 3 | 4 | 5;

type CanvasOrientation = 'top' | 'bottom' | 'left' | 'right';

// Only get keys with values are number
type NumericKeys<T> = {
    [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

type RangeInputValueRanges<T> = Record<NumericKeys<T>, [number, number, number]>;
