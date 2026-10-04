<script lang="ts">
import { canvasSettings, ditherPalette } from "$lib/stores/editorSettings.svelte";
import ColorPicker from "svelte-awesome-color-picker";
import RadioTabsInput from "../settings/RadioTabsInput.svelte";
import { deviceMockup } from "../snippets/DeviceMockup.svelte";
import PropertiesPanel from "./PropertiesPanel.svelte";
import { clampCanvasSize } from "$lib/utils";
import ArrowsDownUpIcon from 'phosphor-svelte/lib/ArrowsDownUpIcon';
import LinkSimpleLogoIcon from 'phosphor-svelte/lib/LinkSimpleIcon';
import LinkBreakIcon from 'phosphor-svelte/lib/LinkBreakIcon';
import LayersPanel from "./LayersPanel.svelte";
import ColorPickerWrapper from '../ColorPickerWrapper.svelte';
import type { Device } from "$lib/devices/Device";
import TextInput from "../settings/TextInput.svelte";
import { onMount } from "svelte";
import CanvasPanel from "./CanvasPanel.svelte";

type CanvasTab = keyof typeof CANVAS_TABS;
const CANVAS_TABS = {
    'layers': 'Layers',
    'canvas': 'Canvas',
} satisfies Record<string, string>;

let {
    activeView,
    isCustomDevice,
    targetDevice,
    canvasPanel,
}: {
    activeView: EditorView;
    isCustomDevice: boolean;
    targetDevice: Device;
    canvasPanel: CanvasPanel,
} = $props();

let layersPanel: LayersPanel;
let propertiesPanel: PropertiesPanel;
let currentCanvasTab: CanvasTab = $state('layers');
let bgColor = $state('#fff');

function switchCanvasTab(tab: CanvasTab): any {
    currentCanvasTab = tab;
}

let linkWidthHeight = $state(false);

function onUpdateCanvasSize(value: number, type: 'width' | 'height') {
    if (isNaN(value)) {
        return;
    }

    if (!linkWidthHeight) {
        canvasSettings[type] = clampCanvasSize(value);
        return;
    }

    let w: number;
    let h: number;
    const ratio = canvasSettings.width / canvasSettings.height;

    if (type === 'width') {
        w = clampCanvasSize(value);
        h = clampCanvasSize(w / ratio);
        w = clampCanvasSize(h * ratio);
    } else {
        h = clampCanvasSize(value);
        w = clampCanvasSize(h / ratio);
        h = clampCanvasSize(w * ratio);
    }

    canvasSettings.width = w;
    canvasSettings.height = h;
}

function swapCanvasDimension() {
    const tmpW = canvasSettings.width;
    const tmpH = canvasSettings.height;
    canvasSettings.width = tmpH;
    canvasSettings.height = tmpW;
}

onMount(() => {
    propertiesPanel.setLayersPanel(layersPanel);
});
</script>

<div class="editor-panel" class:hidden!={activeView !== 'canvas'}>
    <div class="grid gap-5">
        <div role="tablist" class="tabs tabs-lift w-full">
            {#each Object.entries(CANVAS_TABS) as [tabId, tabName]}
                <a tabindex="-1" role="tab" class="tab" class:tab-active={currentCanvasTab === tabId} onclick={() => switchCanvasTab(tabId as CanvasTab)}>
                    <span>{tabName}</span>
                </a>
            {/each}
        </div>

        <!-- LAYERS TAB -->
        <div class="grid gap-5" class:hidden={currentCanvasTab !== 'layers'}>
            <LayersPanel bind:this={layersPanel} />
            <PropertiesPanel bind:this={propertiesPanel} {canvasPanel} />
        </div>

        <!-- CANVAS TAB -->
        <div class="grid gap-5" class:hidden={currentCanvasTab !== 'canvas'}>
            <fieldset class="fieldset fieldset-headless">
                <div class="grid gap-3">
                    <div class="flex gap-2 flex-wrap items-center">
                        <p class="setting-label flex-1">Background color</p>
                        <ColorPicker
                            bind:hex={bgColor}
                            swatches={ditherPalette.swatches}
                            // @ts-expect-error
                            components={{wrapper: ColorPickerWrapper}}
                            position="fixed"
                            isDark={true}
                            isAlpha={true}
                            label=""
                            onInput={(event) => {
                                canvasSettings.bgColor = event.hex || '#fff';
                            }}
                            />
                    </div>

                    {#if isCustomDevice}
                        <p class="setting-label flex-1">Size</p>
                        <div class="ml-2 gap-x-4 gap-y-4 grid grid-cols-[min-content_1fr_min-content]">
                            <div class="row-span-2 flex items-center">
                                <button class="dithr-btn btn-xs btn-square" aria-label="Swap" onclick={() => swapCanvasDimension()}>
                                    <ArrowsDownUpIcon color="currentColor" size={16} />
                                </button>
                            </div>

                            <label class="flex items-center gap-4">
                                <span>W</span>
                                <TextInput
                                    type="number"
                                    min="1"
                                    value={canvasSettings.width}
                                    oncommit={v => onUpdateCanvasSize(v, 'width')}
                                    />
                            </label>

                            <div class="row-span-2 h-full p-1">
                                <div class="text-center" class:invisible={!linkWidthHeight}>┐</div>
                                <button tabindex="-1" class="btn btn-ghost btn-xs btn-square" aria-label={linkWidthHeight ? 'Unlink' : 'Link'} onclick={() => linkWidthHeight = !linkWidthHeight}>
                                    {#if linkWidthHeight}
                                        <LinkSimpleLogoIcon color="currentColor" size={16} />
                                    {:else}
                                        <LinkBreakIcon color="currentColor" size={16} />
                                    {/if}
                                </button>
                                <div class="text-center" class:invisible={!linkWidthHeight}>┘</div>
                            </div>

                            <label class="flex items-center gap-4">
                                <span>H</span>
                                <TextInput
                                    type="number"
                                    min="1"
                                    value={canvasSettings.height}
                                    oncommit={v => onUpdateCanvasSize(v, 'height')}
                                    />
                            </label>
                        </div>
                    {:else}
                        <div class="flex gap-2 flex-wrap items-center">
                            <p class="setting-label flex-1">Size</p>
                            <div class="font-bold font-md">{canvasSettings.width}x{canvasSettings.height}</div>
                        </div>
                    {/if}

                    <RadioTabsInput
                        label="Orientation"
                        bind:value={canvasSettings.orientation}
                        radioTabs={{
                            top: 'Default',
                            bottom: 'Upside down',
                            left: '90° CCW',
                            right: '90° CW',
                        } as Record<CanvasOrientation, string>}
                        equally={true}
                        visible={!isCustomDevice}
                        />

                    {#if !isCustomDevice}
                        {@render deviceMockup(targetDevice.deviceInfo, 40, canvasSettings.orientation, "./images/app-icon.svg")}
                    {/if}
                </div>
            </fieldset>
        </div>
    </div>
</div>
