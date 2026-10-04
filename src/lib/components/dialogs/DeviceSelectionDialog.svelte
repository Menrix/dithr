<script lang="ts">
// @ts-expect-error
import { FilteringFlow } from "@filtering.js/filtering.js/ui";
// @ts-expect-error
import { FilterData } from "@filtering.js/filtering.js";
import { DEVICE_BRANDS, DEVICE_COLORS, DEVICE_FORMS, DEVICE_LARGEST_SIZE, DEVICE_SIZES, DEVICES, getDeviceDisplayName, getDeviceFormName } from "$lib/devices";
import { getPaletteName, PALETTE_ORDERS } from "$lib/palettes";
import { canvasSettings, targetDeviceId } from "$lib/stores/editorSettings.svelte";
import { onMount, tick } from "svelte";
import { EinkIsoDep } from "../../../plugins/EinkIsoDep";
import CanvasPanel from "../panels/CanvasPanel.svelte";
import FunnelXIcon from "phosphor-svelte/lib/FunnelXIcon";
import XIcon from "phosphor-svelte/lib/XIcon";
import InfoIcon from "phosphor-svelte/lib/InfoIcon";
import HeartStraightIcon from "phosphor-svelte/lib/HeartStraightIcon";
import ContactlessPaymentIcon from "phosphor-svelte/lib/ContactlessPaymentIcon";
import { Capacitor } from "@capacitor/core";
import { deviceMockup } from "../snippets/DeviceMockup.svelte";
import { EinkDevice } from "$lib/devices/EinkDevice";
import { NfcFmscEinkDevice } from "$lib/devices/NfcFmscEinkDevice";
import { Preferences } from "@capacitor/preferences";
import { SvelteSet } from "svelte/reactivity";
import { CustomDeviceInfo } from "$lib/devices/CustomDevice";
import { clampCanvasSize } from "$lib/utils";

let {
    canvasPanel,
}: {
    canvasPanel: CanvasPanel;
} = $props();

const FILTER_CATEGORIES = {
    brand: 'Brand',
    color: 'Color',
    size: 'Size',
    form: 'Form',
};

let dialog: HTMLDialogElement;
let closedBy: string = $state('closerequest');
let checkedFilters = $state(new Map());
let filterLabels: Record<'brand' | 'color' | 'size' | 'form', string> = $derived.by(() => {
    const brandSet: Set<string> | undefined = checkedFilters.get('brand');
    const colorSet: Set<string> | undefined  = checkedFilters.get('color');
    const sizeSet: Set<string> | undefined  = checkedFilters.get('size');
    const formSet: Set<string> | undefined  = checkedFilters.get('form');

    return {
        brand: brandSet ? brandSet.values().next().value! : FILTER_CATEGORIES.brand,
        color: colorSet ? getPaletteName(colorSet.values().next().value as PaletteId) : FILTER_CATEGORIES.color,
        size: sizeSet ? sizeSet.values().next().value + '"' : FILTER_CATEGORIES.size,
        form: formSet ? getDeviceFormName(formSet.values().next().value as DeviceForm) : FILTER_CATEGORIES.form,
    };
});
let deviceList: HTMLElement;
let brandPopover: HTMLElement;
let colorPopover: HTMLElement;
let sizePopover: HTMLElement;
let formPopover: HTMLElement;
let filteringFlow: FilteringFlow;

let favoriteDevices: Set<string> = new SvelteSet();
let devices = $derived.by(() => {
    return Object.entries(DEVICES).sort(([, a], [, b]) => {
        // Favorites
        if (favoriteDevices.has(a.id) && !favoriteDevices.has(b.id)) {
            return -1;
        }

        // Favorites
        if (favoriteDevices.has(b.id) && !favoriteDevices.has(a.id)) {
            return 1;
        }

        // Brand
        if (a.brand !== b.brand) {
            return a.brand > b.brand ? 1 : -1;
        }

        // Screen size
        if (a.inch !== b.inch) {
            return a.inch - b.inch;
        }

        // Palette
        if (a.paletteId !== b.paletteId) {
            return PALETTE_ORDERS.Eink.indexOf(b.paletteId as any) - PALETTE_ORDERS.Eink.indexOf(a.paletteId as any);
        }

        // PPI
        if (a.ppi !== b.ppi) {
            return a.ppi! - b.ppi!;
        }

        return 0;
    }).map(([key]) => key);
});

const DEVICE_WIDTH_FACTOR = 60;

export async function showInitialModal() {
    if ($targetDeviceId !== 'custom' && !DEVICES[$targetDeviceId]) {
        await showModal('none');
        return;
    }
}

async function scanNfc() {
    try {
        // Clear old listeners before binding to avoid stacking duplicate callback handlers
        await EinkIsoDep.removeAllListeners();
        await EinkIsoDep.stopScanning().catch(() => {});

        await EinkIsoDep.addListener('onTagReady', async (event) => {
            try {
                await EinkIsoDep.connect({ timeout: 10000 });
                const hardwareConfig = await NfcFmscEinkDevice.getHardwareConfig();
                console.log('hardwareConfig', hardwareConfig);
            } catch (error) {
                console.error('Transmission halted:', error);
            }
        });

        await EinkIsoDep.startScanning();
    } catch (e) {
        console.error(e);
    }
}

function getFavorites(callback: () => void) {
    Preferences.get({
        key: 'devices.favorites',
    }).then(result => {
        try {
            const value: string[] = JSON.parse(result.value || '[]');
            value.forEach(item => favoriteDevices.add(item));
        } catch (e) {}

        callback();
    });
}

async function toggleFavorite(e: Event, deviceId: string) {
    e.preventDefault();
    e.stopPropagation();

    if (favoriteDevices.has(deviceId)) {
        favoriteDevices.delete(deviceId);
    } else {
        favoriteDevices.add(deviceId);
    }

    await tick();
    await Preferences.set({
        key: 'devices.favorites',
        value: JSON.stringify(Array.from(favoriteDevices)),
    });

    setupFilters();
}

export async function showModal(by: 'any' | 'none' | 'closerequest' = 'closerequest') {
    getFavorites(async () => {
        await tick();
        setupFilters();

        deviceList.querySelector('.item-active')?.scrollIntoView({
            block: 'center',
            inline: 'nearest',
            // @ts-expect-error
            container: 'nearest',
        });

        closedBy = by;
        dialog.closedBy = by ? by : 'closerequest';
        dialog.showModal();

        if (Capacitor.isNativePlatform()) {
            await scanNfc();
        }
    });
}

async function selectDevice(deviceId: string) {
    canvasSettings.orientation = 'top';

    // Copy properties from current device to custom device
    if (deviceId === 'custom' && $targetDeviceId !== 'custom') {
        const previousDevice = DEVICES[$targetDeviceId];
        if (previousDevice) {
            Object.assign(CustomDeviceInfo, {
                width: previousDevice.width,
                height: previousDevice.height,
                paletteId: previousDevice.paletteId,
                devicePaletteId: previousDevice.devicePaletteId,
            });
        }
    }

    $targetDeviceId = deviceId;
    // Wait for targetDevice to be updated
    await tick();

    // Update palettes
    canvasPanel.refreshPalettes();
    canvasPanel.requestRenderPreview(true);
    dialog.close();
}

function updateGroupTitles() {
    let currentGroupTitle = '';

    (deviceList.querySelectorAll('.filtering-item') as NodeListOf<HTMLElement>).forEach(elm => {
        let showGroupTitle = false;
        if (!elm.classList.contains('filtered') && currentGroupTitle !== elm.dataset.groupTitle) {
            currentGroupTitle = elm.dataset.groupTitle!;
            showGroupTitle = true;
        }

        elm.dataset.showGroupTitle = String(showGroupTitle);
    });
}

function setupFilters() {
    filteringFlow?.destroy();

    filteringFlow = new FilteringFlow(dialog, {
        disabledFilterClass: 'hidden',
    });

    filteringFlow.addEventListener('filter', (event: any) => {
        if (!event.data) {
            return;
        }

        // Update totals
        const result = event.data.result;
        for (const group of result.groups) {
            for (const filter of group.filters) {
                const filterElement = filter.schemaFilter.data.element;
                // Update the number next to the filter to indicate how many items are or would be filtered
                filterElement.querySelector('.total').innerText = filter.possibleItems.length;
            }
        }

        // Update filter labels
        checkedFilters = event.data.filterData.checkedFilters;
        // Hide all popovers
        brandPopover.hidePopover();
        colorPopover.hidePopover();
        sizePopover.hidePopover();
        formPopover.hidePopover();

        // Update group titles
        updateGroupTitles();
    });
    filteringFlow.filter();
}

onMount(() => {
    if (Capacitor.isNativePlatform()) {
        dialog.addEventListener('close', async e => {
            await EinkIsoDep.close().catch(() => {});
            await EinkIsoDep.removeAllListeners();
        });
    }
});
</script>

<style>
@reference "tailwindcss";

.badge {
    @apply border-0;
}

.megamenu {
    @apply mb-4 py-2 flex-wrap gap-2;

    .btn {
        border: 2px solid black;

        &:hover {
            --btn-bg: #202020;
        }
    }

    [popover] {
        box-shadow: 0 0 4px black;
        background-color: #202020;
    }

    .menu {
        @apply p-0;

        &
        :where(
            li:not(.menu-title, .disabled)
            > :not(ul, details, .menu-title):not(.menu-active, :active, .btn):hover,
            li:not(.menu-title, .disabled)
            > details
            > summary:not(.menu-title):not(.menu-active, :active, .btn):hover
        ) {
            background-color: #202020;
        }

        :global(.filtering-filter) {
            @apply px-3 py-2;

            &.checked {
                background-color: var(--dithr-green);
                color: var(--dithr-green-content);
            }

            &:hover:not(.checked) {
                background-color: #2e2e2e;
            }

            color: #fff;
        }

        .total {
            @apply rounded;
        }
    }
}

ul {
    @apply select-none;

    li.filtering-item {
        .device {
            @apply
                p-0
                cursor-pointer
                overflow-clip
                shadow-sm
                transition-colors
                flex flex-col
                ;

            border: 2px solid color-mix(in oklch, var(--palette-base) 10%, white 5%);
            color: #fff;
            background-color: color-mix(in oklch, var(--palette-base) 10%, white 10%);

            &:hover {
                background-color: color-mix(in oklch, var(--palette-base) 10%, white 15%);
                border-color: color-mix(in oklch, var(--palette-base) 10%, white 10%);
            }
        }

        &.item-active {
            .device {
                background-color: color-mix(in oklch, var(--palette-base) 10%, black 20%);
            }
        }

        :global(&.filtered) {
            display: none;
        }

        &[data-palette] {
            .badge-palette {
                background-color: var(--palette-base);
                color: white;
            }

            .badge-res {
                /* background-color: color-mix(in oklch, var(--palette-base) 70%, white 30%); */
                background-color: transparent;
                color: white;
            }
        }

        &[data-palette="bw"] {
            --palette-base: #0f0f0f;
        }

        &[data-palette="bwr"] {
            --palette-base: #3f0909;
        }

        &[data-palette="bwry"] {
            --palette-base: #b95800;
        }

        &[data-palette="spectra-6"] {
            --palette-base: #003c8a;
        }

        &[data-palette="gray-4"] {
            --palette-base: #646464;
        }

        &[data-palette="gray-16"] {
            --palette-base: #343434;
        }

        &[data-palette="full-color"] {
            --palette-base: var(--dithr-purple);
        }

        .thumb-wrapper {
            @apply
                relative
                w-full
                aspect-video
                flex items-center
                py-1.5
                ;
        }

        .thumb-wrapper,
        .badges-wrapper {
            background-color: color-mix(in oklch, var(--palette-base) 10%, black 35%);
        }

        .badges-wrapper {
            @apply flex p-1.5 pt-0 gap-1.5;
        }

        .buttons-wrapper {
            @apply bg-[#00000020];
            border-bottom-left-radius: 4px;
            overflow: hidden;
        }

        &[data-has-image="true"] {
            .thumb-wrapper {
                @apply
                    bg-white! bg-origin-content
                    px-9 py-2
                    ;
            }

            .buttons-wrapper {
                @apply bg-[#00000029];
            }

            .badge-res {
                color: black;
            }
        }

        .device-tabs {
            @apply hidden relative ml-3;

            p {
                @apply
                    hidden
                    content-center
                    relative top-px
                    h-6
                    px-4
                    text-xs md:text-sm font-bold
                    rounded-tl rounded-tr
                    ;

                box-shadow: inset 0 -8px 6px -6px rgba(0,0,0,0.3);
                border-width: 2px 2px 0 2px;
                border-color: color-mix(in oklch, currentColor 10%, white 20%);

                &.device-tab-group {
                    @apply bg-(--dithr-red) text-(--dithr-red-content);
                }

                &.device-tab-active {
                    @apply bg-(--dithr-green) text-(--dithr-green-content);
                }
            }
        }

        :global(&[data-show-group-title="true"]) {
            .device-tabs {
                @apply block;

                .device-tab-group {
                    @apply inline-block;
                }
            }
        }

        &.item-active {
            .device-tabs {
                @apply block;

                .device-tab-active {
                    @apply inline-block;
                }
            }
        }

        &:not([data-show-group-title="true"], .item-active) {
            .device {
                @apply mt-6;
            }
        }
    }
}
</style>
{#snippet deviceItem(device: BaseDeviceInfo)}
    {@const deviceWidthPx = Math.max(20, Math.min(60, Math.round((device.inch / DEVICE_LARGEST_SIZE) * DEVICE_WIDTH_FACTOR)))}
    {@const isFavorite = favoriteDevices.has(device.id)}
    {@const hasDeviceImage = __DEVICE_IMAGES__.indexOf(device.id) > -1}
    {@const groupTitle = isFavorite ? 'Favorites' : device.brand[0]}
    <li class="filtering-item"
        data-id={device.id}
        class:item-active={device.id === $targetDeviceId}
        data-filter-brand={device.brand}
        data-filter-color={device.paletteId}
        data-filter-size={device.inch}
        data-filter-form={device.form}
        data-palette={device.paletteId}
        data-has-image={hasDeviceImage}
        data-group-title={groupTitle}
        data-show-group-title={false}
        >
        <div class="device-tabs">
            <p class="device-tab-group">{groupTitle}</p>
            <p class="device-tab-active">✱</p>
        </div>
        <div class="device" onclick={async () => await selectDevice(device.id)}>
            <div class="thumb-wrapper bg-no-repeat bg-contain bg-center" style:background-image={hasDeviceImage ? `url("./images/devices/${device.id}.webp")` : ''}>
                {#if device.connectionType === 'nfc'}
                    <div class="absolute top-px left-px p-1">
                        <ContactlessPaymentIcon color={device.class.prototype instanceof EinkDevice ? 'green' : hasDeviceImage ? 'gray' : 'currentColor'} size={22} />
                    </div>
                {/if}

                {#if !hasDeviceImage}
                    {@render deviceMockup(device, deviceWidthPx, 'top')}
                {/if}

                <div class="buttons-wrapper absolute top-0 right-0 grid grid-col">
                    <a class="p-1 btn btn-primary btn-ghost btn-square"
                        onclick={e => toggleFavorite(e, device.id)}
                        >
                        <HeartStraightIcon color="currentColor" size={20} fill={isFavorite ? 'red' : hasDeviceImage ? 'currentColor' : 'currentColor'} weight={isFavorite ? 'duotone' : 'regular'} />
                    </a>
                    {#if device.url}
                        <a class="p-1 btn btn-primary btn-ghost btn-square"
                            onclick={e => e.stopPropagation()}
                            href={device.url}
                            target="_blank"
                            rel="nofollow noreferer noopener"
                            title="Info"
                            >
                            <InfoIcon color={hasDeviceImage ? 'currentColor' : 'currentColor'} size={20} />
                        </a>
                    {/if}
                </div>
            </div>
            <div class="badges-wrapper" class:bg-white!={hasDeviceImage}>
                <div class="badge badge-xs shrink-0 px-2 py-2 badge-palette rounded whitespace-nowrap min-w-12">{getPaletteName(device.paletteId)}</div>
                <div class="badge badge-xs flex-1 py-2 badge-res justify-end">
                    <p>{device.width}x{device.height}</p>
                    <p class="ml-1 max-sm:hidden">{device.ppi} PPI</p>
                </div>
            </div>
            <div class="px-2.5 py-2.5">
                <p class="text-sm font-bold">{getDeviceDisplayName(device)}</p>
                {#if device.comment}
                    <p class="italic text-[10px]">{device.comment}</p>
                {/if}
            </div>
        </div>
    </li>
{/snippet}

<dialog bind:this={dialog} class="modal">
    <div class="modal-box grid grid-rows-[min-content_min-content_1fr] overflow-hidden">
        <div class="flex">
            <h3 class="text-lg font-bold flex-1 mb-5">Target device</h3>
            {#if closedBy && closedBy !== 'none'}
                <div class="shrink-0 flex gap-x-3">
                    <button class="dithr-btn btn-info" onclick={() => selectDevice('custom')}>Custom device</button>
                    <form method="dialog">
                        <button class="dithr-btn btn-square" title="Close">
                            <XIcon color="currentColor" weight="bold" size={16} />
                        </button>
                    </form>
                </div>
            {/if}
        </div>

        <div class="megamenu">
            <button class="btn btn-primary" class:btn-success={filterLabels.brand !== FILTER_CATEGORIES.brand} popovertarget="popover-filter-brand">{filterLabels.brand}</button>
            <div bind:this={brandPopover} id="popover-filter-brand" popover>
                <ul class="filtering-group menu" data-group-name="brand" data-select-type="single">
                    {#each DEVICE_BRANDS as brand}
                        <li><a class="filtering-filter" data-filter-name={brand}>{brand} <span class="total badge badge-error badge-xs"></span></a></li>
                    {/each}
                </ul>
            </div>

            <button class="btn btn-primary" class:btn-success={filterLabels.color !== FILTER_CATEGORIES.color} popovertarget="popover-filter-color">{filterLabels.color}</button>
            <div bind:this={colorPopover} id="popover-filter-color" popover>
                <ul class="filtering-group menu" data-group-name="color" data-select-type="single">
                    {#each DEVICE_COLORS as paletteId}
                        <li><a class="filtering-filter" data-filter-name={paletteId}>{getPaletteName(paletteId)} <span class="total badge badge-error badge-xs"></span></a></li>
                    {/each}
                </ul>
            </div>

            <button class="btn btn-primary" class:btn-success={filterLabels.size !== FILTER_CATEGORIES.size} popovertarget="popover-filter-size">{filterLabels.size}</button>
            <div bind:this={sizePopover} id="popover-filter-size" popover>
                <ul class="filtering-group menu" data-group-name="size" data-select-type="single">
                    {#each DEVICE_SIZES as size}
                        <li><a class="filtering-filter" data-filter-name={size}>{size}" <span class="total badge badge-error badge-xs"></span></a></li>
                    {/each}
                </ul>
            </div>

            <button class="btn btn-primary" class:btn-success={filterLabels.form !== FILTER_CATEGORIES.form} popovertarget="popover-filter-form">{filterLabels.form}</button>
            <div bind:this={formPopover} id="popover-filter-form" popover>
                <ul class="filtering-group menu" data-group-name="form" data-select-type="single">
                    {#each DEVICE_FORMS as form}
                        <li><a class="filtering-filter" data-filter-name={form}>{getDeviceFormName(form)}<span class="total badge badge-error badge-xs"></span></a></li>
                    {/each}
                </ul>
            </div>

            <button
                onclick={() => filteringFlow?.filter(new FilterData())}
                class:hidden={checkedFilters.size === 0}
                class="btn btn-square btn-error shrink-0"
                title="Clear filters"
                >
                <FunnelXIcon color="currentColor" size={20} />
            </button>
        </div>

        <div bind:this={deviceList} class="dialog-content overflow-auto scrollbar-thin">
            <ul class="w-full grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-x-4 p-2">
                {#each Object.values(devices) as device}
                    {@render deviceItem(DEVICES[device])}
                {/each}
            </ul>
        </div>
    </div>
</dialog>
