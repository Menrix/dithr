type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

type QrCodeOptions = Omit<import('qr-code-styling').Options, 'nodeCanvas'> & {
    dataType: 'text' | 'wifi';
    dataRaw: {
        text: string;
        wifi: {
            ssid: string;
            password: string;
            encryption: WifiEncryption;
            hidden: boolean;
        };
    };
};
