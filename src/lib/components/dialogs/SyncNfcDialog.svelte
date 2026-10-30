<script lang="ts">
import { EinkIsoDep } from '../../../plugins/EinkIsoDep';
import { getImageDataFromCanvas } from '$lib/image-encoder';
import { SyncStep } from '$lib/shared';
import { onMount } from 'svelte';
import CanvasPanel from '../panels/CanvasPanel.svelte';
import XIcon from "phosphor-svelte/lib/XIcon";
import ConfettiIcon from "phosphor-svelte/lib/ConfettiIcon";
import PackageIcon from "phosphor-svelte/lib/PackageIcon";
import AirplaneInFlightIcon from "phosphor-svelte/lib/AirplaneInFlightIcon";
import AirplaneLandingIcon from "phosphor-svelte/lib/AirplaneLandingIcon";
import { canvasSettings } from '$lib/stores/editorSettings.svelte';
import { getPaletteName } from '$lib/palettes';
import { getDeviceDisplayName } from '$lib/devices';
import { deviceMockup } from '../snippets/DeviceMockup.svelte';
import { NfcEinkDevice } from '$lib/devices/NfcEinkDevice';
import { NfcFmscEinkDevice } from '$lib/devices/NfcFmscEinkDevice';
import { Device as CapacitorDevice } from '@capacitor/device';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';
import { isWebSerialAvailable } from '../../../plugins/EinkIsoDepWebSerial';
import { REMOTE_AVAILABLE, sendToStation } from '$lib/remote-sync';

const IS_NATIVE_APP = Capacitor.isNativePlatform();
// Phone without NFC access (e.g. iPhone): send the image to the Mac, which writes it with the USB writer
const IS_REMOTE = !IS_NATIVE_APP && !isWebSerialAvailable() && REMOTE_AVAILABLE;


export type SyncStatuses = {
    [SyncStep.SENDING]: {
        startTime: number;
        endTime: number;

        currentScreen: number;
        totalScreens: number;
        currentPacket: number;
        totalPackets: number;
    };
    [SyncStep.REFRESHING]: {
        startTime: number;
        endTime: number;
        refreshRemaining: number;
        refreshOvertime: number;
    };
};

const {
    canvasPanel,
    targetDevice,
}: {
    canvasPanel: CanvasPanel;
    targetDevice: NfcEinkDevice;
} = $props();

let dialog: HTMLDialogElement;
let currentStep = $state(SyncStep.WAITING);

let devicePreviewDataImg: string = $state('');

let totalTimeSending = $state(0);
let totalTimeRefreshing = $state(0);
let totalTime = $state(0);

const UNSUPPORTED_MANUFACTURERS = {
    google: 'Google',
    samsung: 'Samsung',
    sony: 'Sony',
};

let isNfcUnsupported = $state(false);

const syncStatuses: SyncStatuses = $state({
    [SyncStep.SENDING]: {
        startTime: -1,
        endTime: -1,
        currentScreen: -1,
        totalScreens: -1,
        currentPacket: -1,
        totalPackets: -1,
    },
    [SyncStep.REFRESHING]: {
        startTime: -1,
        endTime: -1,
        refreshRemaining: -1,
        refreshOvertime: -1,
    },
    [SyncStep.FINISHED]: false,
});
let sendingStatus = $derived(syncStatuses[SyncStep.SENDING]);
let refreshingStatus = $derived(syncStatuses[SyncStep.REFRESHING]);

let errorMessage: undefined | string = $state(undefined);
let remoteWaiting = $state(false);

function reset() {
    errorMessage = undefined;
    currentStep = SyncStep.WAITING;

    totalTimeSending = 0;
    totalTimeRefreshing = 0;
    totalTime = 0;

    const keys = [SyncStep.SENDING, SyncStep.REFRESHING] as const;
    keys.forEach(key => {
        const obj = syncStatuses[key];
        let prop: keyof typeof obj;
        for (prop in obj) {
            obj[prop] = -1;
        }
    });

    if (devicePreviewDataImg) {
        URL.revokeObjectURL(devicePreviewDataImg);
        devicePreviewDataImg = '';
    }
}

function createHandler(): SyncProgressHandler {
    return {
        onTransferProgress(currentScreen: number, totalScreens: number, currentPacket: number, totalPackets: number) {
            currentStep = SyncStep.SENDING;

            if (sendingStatus.startTime === -1) {
                sendingStatus.startTime = +new Date;
            } else if (currentScreen === totalScreens && currentPacket === totalPackets) {
                sendingStatus.endTime = +new Date;
            }

            sendingStatus.currentScreen = currentScreen;
            sendingStatus.totalScreens = totalScreens;
            sendingStatus.currentPacket = currentPacket;
            sendingStatus.totalPackets = totalPackets;
        },

        onRefreshCountdown(remaining: number) {
            currentStep = SyncStep.REFRESHING;
            if (remaining >= 0) {
                refreshingStatus.refreshRemaining = remaining;
            } else {
                refreshingStatus.refreshRemaining = 0;
                refreshingStatus.refreshOvertime = -remaining;
            }
        },

        onError(error: string) {
            throw new Error('Function not implemented.');
        },

        switchStep: function (step: SyncStep) {
            const now = +new Date;
            if (step === SyncStep.SENDING) {
                sendingStatus.startTime = now;
                sendingStatus.currentScreen = 0;
                sendingStatus.totalScreens = 0;
                sendingStatus.currentPacket = 0;
                sendingStatus.totalPackets = 0;
            } else if (step === SyncStep.REFRESHING) {
                sendingStatus.endTime = now;
                refreshingStatus.startTime = now;

                totalTimeSending = Number(((sendingStatus.endTime - sendingStatus.startTime) / 1000).toFixed(1));
            } else if (step === SyncStep.FINISHED) {
                refreshingStatus.endTime = now;
                totalTimeRefreshing = Number(((refreshingStatus.endTime - refreshingStatus.startTime) / 1000).toFixed(1));

                totalTime = Number((totalTimeSending + totalTimeRefreshing).toFixed(1));
            }

            currentStep = step;
        }
    };
}

async function scanNfc() {
    reset();

    const canvasElement = canvasPanel.previewCanvas.fabricCanvas.toCanvasElement();
    const imageData = getImageDataFromCanvas(canvasElement, canvasSettings.orientation);

    // Generate preview for device mockup
    canvasPanel.devicePreviewCanvas.canvas.toBlob(blob => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                devicePreviewDataImg = url;
            }
        }, 'image/webp', 0.1,
    );

    if (IS_REMOTE) {
        remoteWaiting = false;
        sendToStation(targetDevice.deviceInfo.id, imageData, createHandler(), () => { remoteWaiting = true; })
            .catch(error => {
                errorMessage = '' + (error?.message ?? error);
                console.error(errorMessage);
            });
        return;
    }

    try {
        // Clear old listeners before binding to avoid stacking duplicate callback handlers
        await EinkIsoDep.removeAllListeners();
        await EinkIsoDep.stopScanning().catch(() => {});

        await EinkIsoDep.addListener('onTagReady', async (event) => {
            console.log("Tag locked exclusively by EinkIsoDep. Initializing transaction...");
            reset();

            try {
                await KeepAwake.keepAwake().catch(() => {});

                await EinkIsoDep.connect({ timeout: 10000 });
                let hardwareConfig = targetDevice instanceof NfcFmscEinkDevice ? await NfcFmscEinkDevice.getHardwareConfig() : undefined;

                const handler = createHandler();
                currentStep = SyncStep.SENDING;
                await targetDevice.syncImage(hardwareConfig, imageData, handler);
            } catch (error) {
                errorMessage = 'Transmission halted: ' + error;
                console.error(errorMessage);
            } finally {
                await KeepAwake.allowSleep().catch(() => {});
                await EinkIsoDep.close().catch(() => {});
                await EinkIsoDep.stopScanning().catch(() => {});
                console.log('Session complete. Scanning loop wound down.');
            }
        });

        // 2. Spin up the OS hardware scanner loop
        currentStep = SyncStep.WAITING;
        await EinkIsoDep.startScanning();
    } catch (error) {
        errorMessage = 'Failed to initialize tracking sequence: ' + error;
        console.error(errorMessage);
    }
}

export async function showModal() {
    reset();
    await KeepAwake.allowSleep().catch(() => {});

    await scanNfc();
    dialog.showModal();
}

onMount(async () => {
    const deviceManufacturer = (await CapacitorDevice.getInfo()).manufacturer;
    isNfcUnsupported = IS_NATIVE_APP && deviceManufacturer in UNSUPPORTED_MANUFACTURERS;

    dialog.addEventListener('close', async e => {
        reset();
        await KeepAwake.allowSleep().catch(() => {});

        await EinkIsoDep.close().catch(() => {});
        await EinkIsoDep.removeAllListeners();
    });

    /*
    setTimeout(() => { currentStep = SyncStep.SENDING; }, 1000);
    setTimeout(() => { currentStep = SyncStep.REFRESHING; }, 2000);
    setTimeout(() => { currentStep = SyncStep.FINISHED; }, 3000);
    setTimeout(() => { errorMessage = 'EEEEEE'; }, 4000);
    //*/
});

</script>

<style>
@reference "tailwindcss";

.steps {
    @apply mb-3;
}

.step-contents {
    @apply
        grid
        w-full
        ;

    .step-content {
        @apply
            opacity-0 invisible
            flex flex-col items-center justify-center
            ;

        grid-area: 1 / 1;

        transition: opacity 0.4s ease, visibility 0.4s ease;

        &.step-active {
            @apply opacity-100 visible;
        }
    }

    .step-title {
        @apply block text-center text-xl font-bold mb-3;
    }
}
</style>

<dialog bind:this={dialog} class="modal">
    <div class="modal-box">
        <div class="flex">
            <h3 class="text-lg font-bold flex-1 mb-5">Sync to device via NFC</h3>
            <form method="dialog" class="shrink-0">
                <button class="dithr-btn btn-square" title="Close">
                    <XIcon color="currentColor" weight="bold" size={16} />
                </button>
            </form>
        </div>

        <div class="dialog-content">
            <ul class="steps grid-auto-flow-[auto] w-full">
                <li class="step step-success">
                    <span class="step-icon">
                        <PackageIcon size={24} color="currentColor" />
                    </span>
                    &nbsp;
                </li>
                <li class="step" class:step-success={syncStatuses[SyncStep.SENDING].startTime > -1}>
                    <span class="step-icon">
                        <AirplaneInFlightIcon size={24} color="currentColor" />
                    </span>
                    {totalTimeSending > 0 ? totalTimeSending.toFixed(1) + 's' : ''}
                </li>
                <li class="step" class:step-success={syncStatuses[SyncStep.REFRESHING].startTime > -1}>
                    <span class="step-icon">
                        <AirplaneLandingIcon size={24} color="currentColor" />
                    </span>
                    {totalTimeRefreshing > 0 ? totalTimeRefreshing.toFixed(1) + 's' : ''}
                </li>
                <li class="step" class:step-success={currentStep === SyncStep.FINISHED}>
                    <span class="step-icon">
                        <ConfettiIcon size={24} color="currentColor" />
                    </span>
                </li>
            </ul>

            {#if errorMessage}
                <p class="bg-error text-error-content m-2 p-3 text-sm">
                    Erorr: {errorMessage}.
                    <br>
                    Please close this dialog and try again.
                </p>
            {/if}

            <div class="step-contents">
                <div class="step-content" class:step-active={currentStep === SyncStep.WAITING}>
                    <p class="step-title">Ready to sync</p>
                    {#if isNfcUnsupported}
                        <p class="bg-warning text-warning-content text-xs p-2 mb-4 w-full">
                            The NFC feature may not work on <b>{Object.values(UNSUPPORTED_MANUFACTURERS).join(', ')}</b> devices
                        </p>
                    {/if}
                    {#if targetDevice}
                        {@const deviceInfo = targetDevice.deviceInfo}
                        <div class="mb-3">
                            <p class="text-sm">
                                {#if IS_REMOTE}
                                    {remoteWaiting ? 'Place the Eink display on the NFC writer at the Mac now.' : 'Sending the image to the Mac…'}
                                    <span class="text-xs opacity-70">(The Mac writes it with the USB NFC writer.)</span>
                                {:else if IS_NATIVE_APP}
                                    Place your phone over the Eink display to start syncing.
                                {:else}
                                    Place the Eink display on the USB NFC writer to start syncing.
                                    <span class="text-xs opacity-70">(First time: pick the writer's serial port in the browser window.)</span>
                                {/if}
                                <span class="text-warning text-xs">Warning: syncing to the wrong display may corrupt it!</span>
                            </p>
                        </div>
                        <div class="flex w-full p-3 bg-neutral text-white gap-x-4">
                            <div>
                                {@render deviceMockup(deviceInfo, 60, canvasSettings.orientation, devicePreviewDataImg)}
                            </div>
                            <div class="flex-1">
                                <p class="font-bold pb-1">{getDeviceDisplayName(deviceInfo)}</p>
                                <p class="text-sm">{getPaletteName(deviceInfo.paletteId)}, {deviceInfo.width}x{deviceInfo.height}</p>
                            </div>
                        </div>
                    {/if}
                </div>
                <div class="step-content" class:step-active={currentStep === SyncStep.SENDING}>
                    <p class="step-title">Transfering image</p>
                    <div class="w-full text-center">
                        <div class="stats">
                            <div class="stat">
                                <div class="stat-title">Screen</div>
                                <div class="stat-value">{sendingStatus.currentScreen}/{sendingStatus.totalScreens}</div>
                            </div>
                            <div class="stat">
                                <div class="stat-title">Packets</div>
                                <div class="stat-value">{sendingStatus.currentPacket}/{sendingStatus.totalPackets}</div>
                            </div>
                        </div>
                    </div>
                    <progress
                        class="progress progress-success mt-4 w-full h-4 rounded"
                        value={sendingStatus.totalPackets > -1 ? Math.floor(sendingStatus.currentPacket * 100 / sendingStatus.totalPackets) : 0}
                        max="100"></progress>
                </div>

                <div class="step-content" class:step-active={currentStep === SyncStep.REFRESHING}>
                    <p class="step-title">Refreshing the screen</p>
                    <p class="w-full text-center text-3xl font-extrabold">
                        {#if refreshingStatus.refreshRemaining  >= 0}
                            {(refreshingStatus.refreshRemaining / 1000).toFixed(1)}s
                        {:else if refreshingStatus.refreshOvertime >= 0}
                            0.0s <span class="text-error">(+{(refreshingStatus.refreshOvertime / 1000).toFixed(1)}s)</span>
                        {/if}
                    </p>
                </div>

                <div class="step-content" class:step-active={currentStep === SyncStep.FINISHED}>
                    <p class="step-title">Finished!</p>
                    <div class="w-full text-center">
                        <div class="stats">
                            <div class="stat col-span-2">
                                <div class="stat-title">Total time</div>
                                <div class="stat-value">{totalTime}</div>
                                <div class="stat-desc">seconds</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</dialog>
