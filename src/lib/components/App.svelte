<script lang="ts">
import { config as fabricConfig, FabricObject } from 'fabric';
import { onMount } from 'svelte';
import CanvasPanel from '$lib/components/panels/CanvasPanel.svelte';
import SidePanel from '$lib/components/panels/SidePanel.svelte';
import DeviceSelectionDialog from '$lib/components/dialogs/DeviceSelectionDialog.svelte';
import { canvasSettings, ditherSettings, targetDeviceId } from '$lib/stores/editorSettings.svelte';
import { DEVICES, getDeviceDisplayName } from '$lib/devices';
import { FULL_COLOR_PALETTE, getPaletteName } from '$lib/palettes';
import SyncNfcDialog from '$lib/components/dialogs/SyncNfcDialog.svelte';
import CaretRightIcon from "phosphor-svelte/lib/CaretRightIcon";
import PencilIcon from "phosphor-svelte/lib/PencilIcon";
import DotsNineIcon from "phosphor-svelte/lib/DotsNineIcon";
import FileArrowDownIcon from "phosphor-svelte/lib/FileArrowDownIcon";
import ContactlessPaymentIcon from "phosphor-svelte/lib/ContactlessPaymentIcon";
import { exportToClipboard, exportToFile } from '$lib/export-utils';
import { Capacitor } from '@capacitor/core';
import { EinkDevice } from '$lib/devices/EinkDevice';
import { NfcEinkDevice } from '$lib/devices/NfcEinkDevice';
import { CustomDeviceInfo } from '$lib/devices/CustomDevice';
import type { Device } from '$lib/devices/Device';
import { CANVAS_SIZE_MAX } from '$lib/constants';
import { blurActive, clampCanvasSize } from '$lib/utils';
import { EDITOR_CANVAS_PADDING } from '$lib/shared';

const IS_NATIVE_APP = Capacitor.isNativePlatform();

const uid = $props.id();


// svelte-ignore non_reactive_update
let canvasPanel: CanvasPanel;
// svelte-ignore non_reactive_update
let syncNfcDialog: SyncNfcDialog;
let deviceSelectionDialog: DeviceSelectionDialog;
let exportButton: HTMLButtonElement;
let isCanvasPanelReady = $state(false);

let exportWithDevicePalette = $state(false);

let activeView: EditorView = $state('canvas');
let targetDevice = $derived.by(() => {
    let device: Device;
    if ($targetDeviceId === 'custom' || !DEVICES[$targetDeviceId]) {
        device = new (CustomDeviceInfo.class)(CustomDeviceInfo);
    } else {
        device = new (DEVICES[$targetDeviceId].class)(DEVICES[$targetDeviceId]);
    }

    return device;
});

// Fix antiliasing border when the canvas is large enough
fabricConfig.perfLimitSizeTotal = CANVAS_SIZE_MAX * CANVAS_SIZE_MAX * 1;
fabricConfig.maxCacheSideLimit = 8192 * 1;

FabricObject.ownDefaults.borderColor = '#db4b16';
FabricObject.ownDefaults.cornerColor = '#db4b16';
FabricObject.ownDefaults.cornerStrokeColor = '#fff';
FabricObject.ownDefaults.cornerSize = 10;
FabricObject.ownDefaults.cornerStyle = 'circle';
FabricObject.ownDefaults.transparentCorners = false;

async function showSyncNfcModal() {
    if (IS_NATIVE_APP && targetDevice.deviceInfo.class.prototype instanceof EinkDevice) {
        canvasPanel.requestRenderPreview(true);
        await syncNfcDialog.showModal();
    }
}

function toggleEditorView() {
    activeView = activeView === 'canvas' ? 'dither' : 'canvas';
    if (activeView === 'dither') {
        canvasPanel.requestRenderPreview(true);
    }
}

async function onExport(format: ExportFormat, withDevicePalette: boolean) {
    blurActive();
    exportButton.disabled = true;
    const canvas = withDevicePalette ? canvasPanel.devicePreviewCanvas.canvas : canvasPanel.previewCanvas.canvas;
    const fileName = `dithr-${targetDevice.deviceInfo.id}-${+new Date}`;

    if (format === 'clipboard') {
        await exportToClipboard(canvas, canvasSettings.orientation, () => {
            exportButton.disabled = false;
        });
    } else {
        await exportToFile(canvas, fileName, format, canvasSettings.orientation, () => {
            exportButton.disabled = false;
        });
    }
}

onMount(async () => {
    ditherSettings.paletteId = targetDevice.deviceInfo.paletteId === 'full-color' ? FULL_COLOR_PALETTE : targetDevice.deviceInfo.paletteId;
    ditherSettings.devicePaletteId = targetDevice.deviceInfo.devicePaletteId ?? '';
    canvasPanel.refreshPalettes(true);

    await deviceSelectionDialog.showInitialModal();

    // Ask when refreshing/leaving
    if (import.meta.env.PROD) {
        window.addEventListener('beforeunload', e => {
            e.preventDefault();
            e.returnValue = '';
        });
    }
});

$effect(() => {
    // Restore palettes
    ditherSettings.paletteId = targetDevice.deviceInfo.paletteId === 'full-color' ? FULL_COLOR_PALETTE : targetDevice.deviceInfo.paletteId;
    ditherSettings.devicePaletteId = targetDevice.deviceInfo.devicePaletteId ?? '';

    canvasSettings.width = clampCanvasSize(targetDevice.deviceInfo.width);
    canvasSettings.height = clampCanvasSize(targetDevice.deviceInfo.height);
});
</script>

<style>
@reference "tailwindcss";

.container {
    @apply
        w-full h-full max-w-full max-h-full
        overflow-hidden
        grid sm:grid-cols-[minmax(auto,1fr)_min-content] grid-rows-[minmax(auto,1fr)_min-content];
}

.device-actions {
    @apply
        w-40 sm:w-xs
        grid gap-0.5 bg-black
        border-y-2 border-black
        ;

    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));

    &:has(button[data-supported="false"]) {
        grid-template-columns: minmax(0, 1fr) fit-content(100%);
    }

    button {
        @apply max-sm:p-1 h-full;
    }
}

div[data-native-app="false"] {
    .device-actions {
        grid-template-columns: minmax(0, 1fr) fit-content(100%);
    }
}

 @media (width < 40rem /* 640px */) {
    div[data-native-app="true"] {
        .device-actions {
            > .dropdown {
                &:not(:only-child) {
                    button {
                        span {
                            @apply hidden;
                        }
                    }
                }
            }
        }
    }

     div[data-native-app="false"] {
        .device-actions {
            > button {
                span {
                    @apply hidden;
                }
            }
        }
    }
 }

.btn-save,
.btn-sync {
    border: none;
    border-radius: none;
    outline: none;

    &:active:not(.btn-active) {
        translate: unset;
        * {
            transform: scale(90%);
        }
    }

}

.current-device {
    @apply border-0 rounded-none text-white max-sm:text-xs;
    --btn-color: var(--dithr-red);
}
</style>

<div class="grid grid-rows-[min-content_min-content_1fr] max-h-dvh h-dvh" data-native-app={IS_NATIVE_APP}>
    <button onclick={() => deviceSelectionDialog.showModal('any')} class="flex items-center btn btn-primary current-device w-full max-md:justify-start p-2">
        <div class="flex-1 font-bold overflow-hidden text-ellipsis">{getDeviceDisplayName(targetDevice.deviceInfo)}
            {#if targetDevice.deviceInfo.id === 'custom'}
                <span class="text-xs">- {canvasSettings.width}x{canvasSettings.height}</span>
            {:else}
                <span class="text-xs">- {getPaletteName(targetDevice.deviceInfo.paletteId)}, {canvasSettings.width}x{canvasSettings.height}</span>
            {/if}
        </div>
        <CaretRightIcon color="currentColor" size={24} weight="bold" class="shrink-0" />
    </button>
    <div class="grid grid-cols-[1fr_min-content]">
        <div class="dock dock-xs bg-neutral text-neutral-content" onclick={() => toggleEditorView()}>
            <button class:dock-active={activeView === 'canvas'}>
                <PencilIcon color="#fff" size={24} />
                <span class="dock-label uppercase">Canvas</span>
            </button>

            <button class:dock-active={activeView === 'dither'}>
                <DotsNineIcon color="#fff" size={24} />
                <span class="dock-label uppercase">Dither</span>
            </button>
        </div>
        <div class="device-actions">
            <div class="dropdown dropdown-down dropdown-end sm:dropdown-start">
                <button bind:this={exportButton} class="btn btn-save btn-success w-full" class:btn-disabled={activeView !== 'dither'} tabindex="-1">
                    <FileArrowDownIcon color="currentColor" size={24} />
                    <span class="uppercase">Export&hellip;</span>
                </button>
                <ul tabindex="-1" class="dropdown-content menu z-100 p-0 w-60 sm:w-xs mb-2 shadow-lg flex-col">
                    {#if ditherSettings.devicePaletteId}
                        <li class="border-b-2 border-solid border-[#323232]">
                            <div class="flex text-xs">
                                <label class="setting-label flex-1" for={`${uid}-cbx-export-device-palette`}>Use device palette</label>
                                <input
                                    bind:checked={exportWithDevicePalette}
                                    id={`${uid}-cbx-export-device-palette`}
                                    type="checkbox"
                                    class="toggle"
                                    />
                            </div>
                        </li>
                    {/if}
                    {#each (targetDevice.deviceInfo.exportFormats ?? ['png', 'jpg', 'bmp'] satisfies ExportFormat[]) as format }
                        <li>
                            <a class="p-3" onclick={async () => await onExport(format, exportWithDevicePalette)}>Export to {format.toUpperCase()}</a>
                        </li>
                    {/each}
                    <li>
                        <a class="p-3" onclick={async () => await onExport('clipboard', exportWithDevicePalette)}>Copy to clipboard</a>
                    </li>
                </ul>
            </div>
            {#if targetDevice.deviceInfo.connectionType === 'nfc'}
                {@const isEinkDevice = targetDevice.deviceInfo.class.prototype instanceof EinkDevice}
                {@const supported = IS_NATIVE_APP && isEinkDevice}
                {@const tip = activeView !== 'dither' ? '' : !isEinkDevice ? 'Device not yet supported' : !IS_NATIVE_APP ? 'Only available in the app version' : ''}
                <button
                    onclick={async () => await showSyncNfcModal()}
                    class="btn btn-sync tooltip tooltip-error tooltip-bottom tooltip-end"
                    class:btn-info={supported}
                    class:btn-disabled={!supported || activeView !== 'dither'}
                    class:pointer-events-auto!={!supported && activeView === 'dither'}
                    class:cursor-default!={!supported && activeView === 'dither'}
                    data-tip={tip}
                    data-supported={supported}
                    >
                    <ContactlessPaymentIcon color="currentColor" size={24} />
                    <span class="uppercase">Sync</span>
                </button>
            {/if}
        </div>
    </div>

    <div class="container">
        <CanvasPanel
            bind:this={canvasPanel}
            activeView={activeView}
            canvasPadding={EDITOR_CANVAS_PADDING}
            onMounted={() => { isCanvasPanelReady = true }}
            />
        {#if isCanvasPanelReady}
            <SidePanel
                activeView={activeView}
                canvasPanel={canvasPanel}
                canvasPadding={EDITOR_CANVAS_PADDING}
                targetDevice={targetDevice}
                />
        {/if}
    </div>
</div>

<DeviceSelectionDialog
    bind:this={deviceSelectionDialog}
    canvasPanel={canvasPanel}
    />

{#if IS_NATIVE_APP}
    <SyncNfcDialog
        bind:this={syncNfcDialog}
        canvasPanel={canvasPanel}
        targetDevice={targetDevice as NfcEinkDevice}
        />
{/if}
