import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface EinkIsoDepPlugin {
    startScanning(): Promise<void>;
    stopScanning(): Promise<void>;
    connect(options?: { timeout: number }): Promise<{ connected: boolean }>;
    isConnected(): Promise<{ connected: boolean }>;
    transceive(options: { data: number[] }): Promise<{ response: number[] }>;
    close(): Promise<{ closed: boolean }>;
    addListener(
        eventName: 'onTagReady', 
        listenerFunc: (event: { status: string }) => void
    ): Promise<PluginListenerHandle> & PluginListenerHandle;
    removeAllListeners(): Promise<void>;
}

// Android uses the native plugin; in the browser a PN532 USB NFC module is used via Web Serial.
export const EinkIsoDep = registerPlugin<EinkIsoDepPlugin>('EinkIsoDep', {
    web: () => import('./EinkIsoDepWebSerial').then(m => new m.EinkIsoDepWebSerial()),
});
