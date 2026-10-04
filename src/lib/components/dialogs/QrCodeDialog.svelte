<script lang="ts">
import QRCodeStyling, { type Options } from "qr-code-styling";
import XIcon from "phosphor-svelte/lib/XIcon";
import TrashIcon from "phosphor-svelte/lib/TrashIcon";
import TextInput from "../settings/TextInput.svelte";
import Dropdown from "../settings/Dropdown.svelte";
import ColorPicker from "svelte-awesome-color-picker";
import { canvasHistoryManager } from "$lib/stores/managers.svelte";
import { onMount } from "svelte";
import { ditherPalette } from "$lib/stores/editorSettings.svelte";
	import RadioTabsInput from "../settings/RadioTabsInput.svelte";
	import CheckboxInput from "../settings/CheckboxInput.svelte";

const SIZE = 200;

const DEFAULT_OPTIONS = {
    width: SIZE,
    height: SIZE,
    type: 'svg',
    dataType: 'text',
    dataRaw: {
        text: 'https://www.example.com',
        wifi: {
			ssid: '',
			password: '',
			encryption: 'WPA',
			hidden: false,
		},
    },
    data: 'https://www.example.com',
    backgroundOptions: {
        color: '#fff',
    },
    dotsOptions: {
        type: 'square',
        color: '#000',
    },
    cornersDotOptions: {
        type: 'square',
        color: '#000',
    },
    cornersSquareOptions: {
        type: 'square',
        color: '#000',
    },
    qrOptions: {
        errorCorrectionLevel: 'M',
    },

    imageOptions: {
        margin: 5,
    },
} satisfies QrCodeOptions;

let dialog: HTMLDialogElement;
let canvasWrapper: HTMLDivElement;
let qrCode: QRCodeStyling | null = null;
let options: QrCodeOptions = $state(structuredClone(DEFAULT_OPTIONS));
let mode: 'add' | 'update' = $state('add');
let childId: string | undefined = $state(undefined);

let logoInput: HTMLInputElement;
function onLogoPicked(e: Event) {
    if (logoInput.files?.length !== 1) {
        return;
    }

    let reader = new FileReader();
    reader.onload = event => {
        const image = event.target?.result as string ?? undefined
        options.image = image;

        qrCode?.update({ image });
    };
    reader.readAsDataURL(logoInput.files[0]);

    // Clear selected file
    logoInput.value = '';
}

function onClearLogo() {
    options.image = undefined;
    qrCode?.update({ image: options.image });
}

export async function showModal(id: string | undefined = undefined, newOptions: Partial<QrCodeOptions> = {}) {
    mode = Object.keys(newOptions).length ? 'update' : 'add';
    childId = id;

    options = {
        ...structuredClone(DEFAULT_OPTIONS),
        ...structuredClone(newOptions),
    };

    // Recreate each time to work around this bug: https://github.com/kozakdenys/qr-code-styling/issues/271
    qrCode = new QRCodeStyling(options);

    // Clear children
    canvasWrapper.replaceChildren();
    qrCode!.append(canvasWrapper);

    dialog.showModal();
}

async function addQrCode() {
    const blob = await qrCode!.getRawData('png');
    await canvasHistoryManager.addQrCode(blob, $state.snapshot(options));
    dialog.close();
}

function escapeWifiField(value: string): string {
    return value.replace(/([\\;,":])/g, "\\$1");
}

function generateWifiQrText(params: QrCodeOptions['dataRaw']['wifi']): string {
  const { ssid, password = '', encryption = 'WPA', hidden = false } = params;

  const s = escapeWifiField(ssid);
  const t = encryption;
  const p = encryption === 'nopass' ? '' : escapeWifiField(password);
  const h = hidden ? 'true' : 'false';

  return `WIFI:S:${s};T:${t};P:${p};H:${h};;`;
}

function updateOptionsData() {
    if (options.dataType === 'text') {
        options.data = options.dataRaw.text;
    } else if (options.dataType === 'wifi') {
        options.data = generateWifiQrText(options.dataRaw.wifi);
    } else {
        throw new Error('Unknown dataType:', options.dataType);
    }

    qrCode?.update({ data: options.data });
}

async function updateQrCode() {
    const blob = await qrCode!.getRawData('png');
    await canvasHistoryManager.updateQrCode(childId!, blob, $state.snapshot(options), true);
    dialog.close();
}

onMount(() => {
    dialog.addEventListener('close', e => {
        // Clear children
        canvasWrapper.replaceChildren();
        qrCode = null;
    });
});

</script>

<style>
@reference "tailwindcss";

.modal-box {
    @apply overflow-visible;
}

:global(.color-picker) {
    position: unset !important;

    :global(.wrapper) {
        @apply m-0;
        top: 0 !important;
        left: unset !important;
        right: 50px !important;
    }
}

.canvas-wrapper {
    :global(svg) {
        @apply max-w-75 max-h-75 aspect-square;
    }
}
</style>

<dialog bind:this={dialog} class="modal">
    <div class="modal-box">
        <div class="flex">
            <h3 class="text-lg font-bold flex-1 mb-5">{mode === 'update' ? 'Update QR Code' : 'Generate QR Code'}</h3>
            <form method="dialog" class="shrink-0">
                <button class="dithr-btn btn-square" title="Close">
                    <XIcon color="currentColor" weight="bold" size={16} />
                </button>
            </form>
        </div>

        <div class="dialog-content grid grid-cols-2 gap-5">
            <div class="grid gap-2 col-span-2">
                <RadioTabsInput
                    label=""
                    radioTabs={{
                        text: 'Text',
                        wifi: 'Wi-Fi',
                    }}
                    bind:value={options.dataType}
                    onchange={v => updateOptionsData()}
                    class="col-span-2"
                    />
                <div class="px-4 grid gap-2 col-span-2" class:hidden={options.dataType !== 'text'}>
                    <p class="text-sm">Data</p>
                    <TextInput
                        type="text"
                        class="w-full!"
                        bind:value={options.dataRaw.text}
                        oncommit={v => updateOptionsData()}
                        />
                </div>
                <div class="px-4 grid grid-cols-[min-content_1fr] md:grid-cols-[min-content_1fr_min-content_1fr] gap-4 items-center col-span-2" class:hidden={options.dataType !== 'wifi'}>
                    <p class="text-sm">SSID</p>
                    <TextInput
                        type="text"
                        class="w-full!"
                        bind:value={options.dataRaw.wifi.ssid}
                        oncommit={v => updateOptionsData()}
                        />
                    <p class="text-sm">Password</p>
                    <TextInput
                        type="text"
                        class="w-full!"
                        bind:value={options.dataRaw.wifi.password}
                        oncommit={v => updateOptionsData()}
                        disabled={options.dataRaw.wifi.encryption === 'nopass'}
                        />

                    <p class="text-sm">Encryption</p>
                    <Dropdown
                        options={{
                            WPA: 'WPA/WPA2',
                            WEP: 'WEP',
                            nopass: 'No password',
                        } satisfies Record<WifiEncryption, string>}
                        label=""
                        bind:value={options.dataRaw.wifi.encryption}
                        onchange={v => updateOptionsData()}
                        />
                    <p class="text-sm">Hidden?</p>
                    <CheckboxInput
                        bind:checked={options.dataRaw.wifi.hidden}
                        onchange={v => updateOptionsData()}
                        />
                </div>
            </div>
            <div class="divider col-span-2 m-0"></div>
            <div class="grid grid-cols-[1fr_min-content] gap-4 text-sm items-center relative">
                <div class="col-span-2 grid grid-cols-2 gap-2">
                    <div>
                        <p class="mb-2">Background</p>
                        <ColorPicker
                            bind:hex={options.backgroundOptions!.color}
                            label=""
                            isAlpha={false}
                            onInput={v => qrCode?.update({ backgroundOptions: { color: v.hex! }})}
                            swatches={ditherPalette.swatches}
                            />
                    </div>

                    <div>
                        <p class="mb-2">Logo</p>
                        <div class="flex gap-2">
                            <button class="dithr-btn btn-info w-full! flex-1" onclick={() => logoInput.click()}>Select…</button>
                            <input bind:this={logoInput} onchange={onLogoPicked} accept="image/png,image/jpeg,image/webp" type="file" class="hidden" />
                            {#if options.image}
                                <button class="dithr-btn btn-square" onclick={() => onClearLogo()}>
                                    <TrashIcon size={16} color="currentColor" />
                                </button>
                            {/if}
                        </div>
                    </div>
                </div>
                <Dropdown
                    label="Dot style"
                    options={{
                        square: 'Square',
                        dots: 'Dots',
                        rounded: 'Rounded',
                        'extra-rounded': 'Extra rounded',
                    }}
                    bind:value={options.dotsOptions!.type!}
                    onchange={v => qrCode?.update({ dotsOptions: { type: v as any } })}
                    />
                <div class="self-end">
                    <ColorPicker
                        bind:hex={options.dotsOptions!.color}
                        label=""
                        isAlpha={false}
                        onInput={v => qrCode?.update({ dotsOptions: { color: v.hex! }})}
                        swatches={ditherPalette.swatches}
                        />
                </div>

                <Dropdown
                    label="Corners dot style"
                    options={{
                        square: 'Square',
                        dots: 'Dots',
                        rounded: 'Rounded',
                        'extra-rounded': 'Extra rounded',
                    }}
                    bind:value={options.cornersDotOptions!.type!}
                    onchange={v => qrCode?.update({ cornersDotOptions: { type: v as any } })}
                    />
                <div class="self-end">
                    <ColorPicker
                        bind:hex={options.cornersDotOptions!.color}
                        position="fixed"
                        label=""
                        isAlpha={false}
                        onInput={v => qrCode?.update({ cornersDotOptions: { color: v.hex! }})}
                        swatches={ditherPalette.swatches}
                        />
                </div>

                <Dropdown
                    label="Corners square style"
                    options={{
                        square: 'Square',
                        dots: 'Dots',
                        rounded: 'Rounded',
                        'extra-rounded': 'Extra rounded',
                    }}
                    bind:value={options.cornersSquareOptions!.type!}
                    onchange={v => qrCode?.update({ cornersSquareOptions: { type: v as any } })}
                    />
                <div class="self-end">
                    <ColorPicker
                        bind:hex={options.cornersSquareOptions!.color}
                        position="fixed"
                        label=""
                        isAlpha={false}
                        onInput={v => qrCode?.update({ cornersSquareOptions: { color: v.hex! }})}
                        swatches={ditherPalette.swatches}
                        />
                </div>

                <div class="col-span-2">
                    <Dropdown
                        label="Error correction level"
                        options={{
                            L: 'Low',
                            M: 'Medium',
                            Q: 'Quartile',
                            H: 'High',
                        }}
                        bind:value={options.qrOptions!.errorCorrectionLevel!}
                        onchange={v => qrCode?.update({ qrOptions: { errorCorrectionLevel: v as any } })}
                        />
                </div>
            </div>

            <div bind:this={canvasWrapper} class="canvas-wrapper flex justify-center"></div>
            <button class="dithr-btn btn-success w-full col-span-2" onclick={async () => await (mode === 'update' ? updateQrCode() : addQrCode())}>{mode === 'update' ? 'Update' : 'Add'}</button>
        </div>
    </div>
</dialog>
