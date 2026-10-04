type DeviceConnectionType = 'none' | 'nfc' | 'ble' | 'wifi' | 'usb';

type DevicePaletteColor = {
    raw: ColorRgb;
    device: ColorRgb;
};

type PaletteId = 'full-color' | keyof typeof import('../src/lib/palettes').PALETTES;

type PaletteConfig = {
    id: PaletteId;
    name: string;
    colors?: DevicePaletteColor[];
};

type EinkImageTransform = {
    rotate: boolean;
    flipHorizontal: boolean;
    flipVertical: boolean;
}

type EinkColorChannel =
    'black'
  | 'white' 
  | 'red' 
  | 'yellow' 
  | 'orange' 
  | 'green' 
  | 'cyan' 
  | 'blue' 
  | 'violet'
  ;

type DeviceForm =
    'screen'
  | 'display'
  | 'dashboard'
  | 'esl'
  | 'keychain'
  | 'badge'
  | 'photoframe'
  | 'ereader'
  | 'phoneCase'
  | 'devkit'
  | 'custom'
  ;

type ExportFormat = 'png' | 'jpg' | 'bmp' | 'pxc' | 'clipboard';

type BaseDeviceInfo = {
    id: string;
    url?: string;
    name?: string;
    fullName?: string;
    comment?: string;
    class: new (...args: any[]) => import('$lib/devices/Device').Device;
    brand: string;
    width: number;
    height: number;
    inch: number;
    ppi?: number;
    paletteId: PaletteId;
    devicePaletteId?: string;
    exportFormats?: ExportFormat[];
    form?: DeviceForm;
    connectionType?: DeviceConnectionType;
    /** Bezel's widths: relatives to screen size. Unit: %  */
    bezels?: Partial<{
        top: number;
        bottom: number;
        right: number;
        left: number;
        radiusOutside: number;
    }>;
    variants?: Array<
        Pick<EinkDeviceInfo, 'id' | 'brand'> &
        Partial<Omit<EinkDeviceInfo, 'id' | 'brand' | 'variants'>>
    >;
};

type FileDeviceInfo = BaseDeviceInfo & {};

type EinkDeviceInfo = BaseDeviceInfo & {
    deviceConfig?: string;
    compressionSupport?: boolean;
    hardwarePalette: PaletteRgb;
};

type NfcEinkDeviceInfo = EinkDeviceInfo & {
    refreshDuration: number;
    imageTransform: EinkImageTransform;
    variants?: Array<
        Pick<NfcEinkDeviceInfo, 'id' | 'brand'> &
        Partial<Omit<NfcEinkDeviceInfo, 'id' | 'brand' | 'variants'>>
    >;
};

type NfcFmscEinkDeviceInfo = NfcEinkDeviceInfo & {
    pin?: [number, number] | [number, number, number] | [number, number, number, number] | [number, number, number, number, number] | [number, number, number, number, number, number];
    refreshCmdVersion: 1 | 2;
};

interface EinkScreenTypeInfo {
    manufacturer: string;
    color: PaletteId;
    width: number;
    height: number;
    // flipVertical: boolean;
    // flipHorizontal: boolean;
}

interface EinkColorChannelEntry {
  channel: ColorChannel;
  value: number;
}

interface EinkColorInfo {
    scanMode: 'HORIZONTAL' | 'VERTICAL';
    /** Present when byte after scan mode != 0xE0 (sentinel meaning "absent" in real firmware). */
    colorControl?: {
        size: number; // high nibble, meaning context-dependent, unconfirmed beyond raw passthrough
        colorCount: number;
        channels: EinkColorChannelEntry[];
    };
}

interface EinkExtendedColorInfo {
    size: number;
    colorCount: number;
    channels: EinkColorChannelEntry[];
    deviceType: number; // firmware constant 6 for this tag
}

interface EinkHardwareConfig {
    screenType?: EinkScreenTypeInfo;    // TAG A0
    colorInfo?: EinkColorInfo;          // TAG A1
    imageCapacity?: number;             // TAG B1
    userDataCapacityKB?: number;        // TAG B2
    hasBattery?: boolean;               // TAG B3
    appId?: string;                     // TAG C0
    uid?: string;                       // TAG C1
    compressionSupported?: boolean;     // TAG D1
    systemVersionRaw?: number;          // TAG D1 value[1], raw byte, meaning mostly unknown
    cosVersion2?: boolean;              // TAG D1 value[1] === 0x20, only confirmed mapping
    extendedColor?: EinkExtendedColorInfo;  // TAG 0xE0, undocumented in PDF, real in firmware
    raw: Record<string, Uint8Array>;
}
