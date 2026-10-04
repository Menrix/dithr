import { FileDevice } from "./FileDevice";

export const CustomDeviceInfo: FileDeviceInfo = {
    id: 'custom',
    brand: '',
    class: FileDevice,
    fullName: 'Custom',
    form: 'custom',
    width: 400,
    height: 380,
    inch: 7.5,
    bezels: {
        top: 1,
        bottom: 2,
        left: 1,
        right: 1,
        radiusOutside: 1,
    },
    paletteId: 'full-color',
}
