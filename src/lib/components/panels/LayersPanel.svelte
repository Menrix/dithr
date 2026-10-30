<script lang="ts">
import type { FrameLayer, ChildLayer } from '$lib/editor/LayerManager';
import { canvasSettings } from '$lib/stores/editorSettings.svelte';
import { onMount, onDestroy } from 'svelte';
import EyeIcon from 'phosphor-svelte/lib/EyeIcon';
import EyeClosedIcon from 'phosphor-svelte/lib/EyeClosedIcon';
import TrashIcon from 'phosphor-svelte/lib/TrashIcon';
import ArrowUpIcon from 'phosphor-svelte/lib/ArrowUpIcon';
import ArrowDownIcon from 'phosphor-svelte/lib/ArrowDownIcon';
import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
import LockIcon from 'phosphor-svelte/lib/LockIcon';
import RectangleIcon from 'phosphor-svelte/lib/RectangleIcon';
import TriangleIcon from 'phosphor-svelte/lib/TriangleIcon';
import CircleIcon from 'phosphor-svelte/lib/CircleIcon';
import LockSimpleOpenIcon from 'phosphor-svelte/lib/LockSimpleOpenIcon';
import { canvasHistoryManager, layerManager } from '$lib/stores/managers.svelte';
import { random } from 'colord';
import ImageSquareIcon from 'phosphor-svelte/lib/ImageSquareIcon';
import ShapesIcon from 'phosphor-svelte/lib/ShapesIcon';
import TextTIcon from 'phosphor-svelte/lib/TextTIcon';
import QrCodeIcon from 'phosphor-svelte/lib/QrCodeIcon';
import CornersOutIcon from 'phosphor-svelte/lib/CornersOutIcon';
import { FabricImage } from 'fabric';
import QrCodeDialog from '../dialogs/QrCodeDialog.svelte';
import { blurActive } from '$lib/utils';
import { trimTransparentImage } from '$lib/editor/TrimTransparent';

const SAMPLE_IMAGES = [
    'gradient.png',
    'color-test.png',
    'parrot.jpg',
    'girl-with-earing.jpg',
    'david.jpg',
    'mona-lisa.jpg',
    'van-gogh.jpg',
    'stranger-than-heaven.png',
];

type Row = { frame: FrameLayer; children: ChildLayer[] };

const uid = $props.id();

let trimBackground = $state(false);

// svelte-ignore state_referenced_locally
let rows = $state<Row[]>(layerManager.listFrames());
// svelte-ignore state_referenced_locally
let activeFrameId = $state(layerManager.getActiveFrameId());
// svelte-ignore state_referenced_locally
let activeLayerIds = $state<Set<string>>(new Set(layerManager.getActiveLayerIds()));

let qrCodeDialog: QrCodeDialog | undefined = $state();
let imageInput: HTMLInputElement;

const soleSelectedId = $derived(activeLayerIds.size === 1 ? [...activeLayerIds][0] : null);

function moveSelectedUp() {
    if (!soleSelectedId) {
        return;
    }

    layerManager.getFrame(soleSelectedId)
        ? canvasHistoryManager.moveFrameUp(soleSelectedId)
        : canvasHistoryManager.moveChildUp(soleSelectedId);
}

function moveSelectedDown() {
    if (!soleSelectedId) {
        return;
    }

    layerManager.getFrame(soleSelectedId)
        ? canvasHistoryManager.moveFrameDown(soleSelectedId)
        : canvasHistoryManager.moveChildDown(soleSelectedId);
}

function deleteSelected() {
    if (!soleSelectedId) {
        return;
    }

    layerManager.getFrame(soleSelectedId)
        ? canvasHistoryManager.removeFrame(soleSelectedId)
        : canvasHistoryManager.removeChild(soleSelectedId);
}

function refresh() {
    rows = layerManager.listFrames();
    activeFrameId = layerManager.getActiveFrameId();
    activeLayerIds = new Set(layerManager.getActiveLayerIds());
}

let unsubscribe: () => void;

onMount(() => {
    refresh();
    unsubscribe = layerManager.subscribe(refresh);
});

onDestroy(() => {
    unsubscribe?.();
});

function selectOnCanvas(id: string) {
    layerManager.selectLayers([id]);
}

function setActive(frameId: string) {
    layerManager.setActiveFrame(frameId);
}

function addFrame() {
    // Placeholder bounds; real usage would size this from a canvas drag or a fixed default.
    canvasHistoryManager.createFrame({
        left: 0,
        top: 0,
        width: canvasSettings.width,
        height: canvasSettings.height,
    });
}

function toggleVisibility(id: string, currentlyVisible: boolean) {
    currentlyVisible ? canvasHistoryManager.hide(id) : canvasHistoryManager.show(id);
}

function toggleLock(id: string, currentlyLocked: boolean) {
    currentlyLocked ? canvasHistoryManager.unlock(id) : canvasHistoryManager.lock(id);
}

function insertImage(img: FabricImage) {
    if (trimBackground) {
        trimTransparentImage(img);
    }

    canvasHistoryManager?.addObject(img);
}

function insertSampleImage(name: string) {
    blurActive();
    FabricImage.fromURL('./images/samples/' + name)
        .then(img => insertImage(img));
}

function onImagePicked(e: Event) {
    blurActive();
    if (imageInput.files?.length !== 1) {
        return;
    }

    const objectUrl = URL.createObjectURL(imageInput.files[0]);
    const img = new Image();
    img.onload = async () => {
        const fabricImg = new FabricImage(img);
        insertImage(fabricImg!);
    };
    img.src = objectUrl;

    // Clear selected file
    imageInput.value = '';
}

function addRect() {
    canvasHistoryManager?.addRect({
        fill: random().toHex(),
        stroke: '#000',
        strokeWidth: 0,
    });
}

function addTriangle() {
    canvasHistoryManager?.addTriangle({
        fill: random().toHex(),
        stroke: '#000',
        strokeWidth: 0,
    });
}

function addCircle() {
    canvasHistoryManager?.addCircle({
        fill: random().toHex(),
        stroke: '#000',
        strokeWidth: 0,
    });
}

// Top frame (last in order) shown first, matching editor convention.
const orderedRows = $derived([...rows].reverse());

export {
    qrCodeDialog,
}
</script>

<style>
@reference "tailwindcss";

.frame-list {
    @apply
        list-none
        m-0 p-0
        h-50
        scrollbar-thin
        border-2 border-black
        ;
    overflow-y: auto;
    background-color: #2e2e2e;
}

.frame-block {
    background-color: #2e2e2e;
}

.frame-row,
.child-row {
    @apply flex items-center gap-2 py-2 cursor-pointer;

    &:not(.active-frame) {
        @apply opacity-60;
    }

    &.selected {
        outline-offset: -2px;
    }
}

.frame-row {
    @apply px-2.5;
    background: #202020;

    &.selected {
        outline: 2px solid var(--dithr-purple);
    }
}

.child-row {
    @apply pl-5 pr-2.5;
    background: #282828;

    &.selected {
        outline: 2px solid var(--dithr-orange);
    }
}

.frame-label {
    @apply flex-1 font-semibold;
}

.child-list {
    @apply list-none m-0 p-0;
}

.child-label {
    @apply flex-1 overflow-hidden text-ellipsis whitespace-nowrap;
}

.empty-children {
    @apply text-xs;
    padding: 6px 8px 6px 22px;
    color: #666;
}
</style>

<fieldset class="fieldset fieldset-headless">
    <!-- ADD OBJECTS -->
    <div class="flex flex-wrap gap-3 items-center mb-1">
        <span>Add</span>
        <div class="dropdown dropdown-down dropdown-start">
            <div tabindex="0" role="button" class="dithr-btn btn-sm px-2">
                <ImageSquareIcon size={18} weight="duotone" color="currentColor" />
                …
            </div>
            <div class="dropdown-content mt-2" tabindex="-1">
                <div class="grid gap-5 p-4 w-60" tabindex="-1">
                    <div class="flex text-xs border-b-2 pb-2 border-solid border-[#323232]">
                        <label class="setting-label flex-1" for={`${uid}-cbx-trim-image`}>Trim edges</label>
                        <input
                            bind:checked={trimBackground}
                            id={`${uid}-cbx-trim-image`}
                            type="checkbox"
                            class="toggle"
                            />
                    </div>

                    <div>
                        <button class="dithr-btn btn-info w-full!" onclick={() => imageInput.click()}>Import local image…</button>
                        <input bind:this={imageInput} onchange={onImagePicked} accept="image/png,image/jpeg,image/webp" type="file" class="hidden" />
                    </div>
                    <div>
                        <p class="setting-label mb-2">Sample images</p>
                        <div class="flex gap-2 flex-wrap">
                            {#each SAMPLE_IMAGES as name}
                                <div class='w-10 cursor-pointer aspect-square bg-cover border-2 border-white' style:background-image={`url("./images/samples/${name}")`} title={name} onpointerdown={() => insertSampleImage(name)}></div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="dropdown dithr-dropdown dropdown-down dropdown-start">
            <div tabindex="0" role="button" class="dithr-btn btn-sm px-2">
                <ShapesIcon size={18} weight="duotone" color="currentColor" />
                …
            </div>
            <div class="dropdown-content mt-2" tabindex="-1">
                <ul class="menu">
                    <li onpointerdown={() => addRect()}>
                        <a><RectangleIcon size={18} color="currentColor" /> Rectangle</a>
                    </li>
                    <li onpointerdown={() => addTriangle()}>
                        <a><TriangleIcon size={18} color="currentColor" /> Triangle</a>
                    </li>
                    <li onpointerdown={() => addCircle()}>
                        <a><CircleIcon size={18} color="currentColor" /> Circle</a>
                    </li>
                </ul>
            </div>
        </div>

        <button class="dithr-btn btn-sm px-2" onclick={() => qrCodeDialog?.showModal()}>
            <QrCodeIcon size={18} weight="duotone" color="currentColor" />
            …
        </button>

        <button class="dithr-btn btn-sm px-2" onclick={async () => await canvasHistoryManager?.addText('Text')}>
            <TextTIcon size={18} color="currentColor" />
        </button>
    </div>

    <div class="grid gap-3">
        <ul class="frame-list">
            {#each orderedRows as row (row.frame.id)}
                <li class="frame-block">
                    <div
                        class="frame-row"
                        class:active-frame={row.frame.id === activeFrameId}
                        class:selected={activeLayerIds.has(row.frame.id)}
                        onclick={() => {
                            selectOnCanvas(row.frame.id);
                            setActive(row.frame.id);
                        }}
                        >

                        <label class="swap inline-grid grid-cols-1">
                            <input checked={row.frame.visible} type="checkbox" onclick={(e) => {
                                    e.stopPropagation();
                                    toggleVisibility(row.frame.id, row.frame.visible);
                                }}/>
                            <EyeIcon class="swap-on" size={16} color="currentColor" />
                            <EyeClosedIcon weight="duotone" class="swap-off" size={16} color="var(--dithr-red)" />
                        </label>

                        <label class="swap inline-grid grid-cols-1">
                            <input checked={row.frame.locked} type="checkbox" onclick={(e) => {
                                    e.stopPropagation();
                                    toggleLock(row.frame.id, row.frame.locked);
                                }}/>
                            <LockIcon weight="duotone" class="swap-on" size={16} color="var(--dithr-red)" />
                            <LockSimpleOpenIcon class="swap-off" size={16} color="currentColor" />
                        </label>

                        <span class="frame-label">
                            {row.frame.name}
                        </span>

                        {#if row.frame.fillCanvas}
                            <CornersOutIcon class="swap-off inline-block" size={16} color="currentColor" />
                        {/if}

                        {#if row.frame.id === activeFrameId}
                            <span class="badge badge-error badge-xs">active</span>
                        {/if}
                    </div>

                    <ul class="child-list">
                        {#each [...row.children].reverse() as child, i (child.id)}
                            <li
                                class="child-row"
                                class:selected={activeLayerIds.has(child.id)}
                                class:active-frame={row.frame.id === activeFrameId}
                                onclick={() => { selectOnCanvas(child.id); setActive(row.frame.id); }}
                                >

                                <label class="swap inline-grid grid-cols-1">
                                    <input checked={child.visible} type="checkbox" onclick={(e) => {
                                            e.stopPropagation();
                                            toggleVisibility(child.id, child.visible);
                                        }}/>
                                    <EyeIcon class="swap-on" size={16} color="currentColor" />
                                    <EyeClosedIcon weight="duotone" class="swap-off" size={16} color="var(--dithr-red)" />
                                </label>

                                <label class="swap inline-grid grid-cols-1">
                                    <input checked={child.locked} type="checkbox" onclick={(e) => {
                                            e.stopPropagation();
                                            toggleLock(child.id, child.locked);
                                        }}/>
                                    <LockIcon weight="duotone" class="swap-on" size={16} color="var(--dithr-red)" />
                                    <LockSimpleOpenIcon class="swap-off" size={16} color="currentColor" />
                                </label>

                                <span class="child-label">{child.name}</span>
                            </li>
                        {/each}

                        {#if row.children.length === 0}
                            <li class="empty-children">Empty</li>
                        {/if}
                    </ul>
                </li>
            {/each}
        </ul>
        <div class="grid grid-flow-col grid-cols-[min-content_min-content_min-content_1fr] gap-4">
            <button class="dithr-btn btn-sm btn-info" onclick={addFrame}>
                <PlusIcon color="currentColor" weight="bold" size={10} /> Frame
            </button>
            <button class="dithr-btn btn-sm btn-square" disabled={!soleSelectedId} onclick={moveSelectedUp}>
                <ArrowUpIcon size={16} color="currentColor" />
            </button>
            <button class="dithr-btn btn-sm btn-square" disabled={!soleSelectedId} onclick={moveSelectedDown}>
                <ArrowDownIcon size={16} color="currentColor" />
            </button>
            <div class="text-right">
                <button class="dithr-btn btn-error btn-sm btn-square" disabled={!soleSelectedId} onclick={deleteSelected}>
                    <TrashIcon size={16} color="currentColor" />
                </button>
            </div>
        </div>
    </div>
</fieldset>

<QrCodeDialog bind:this={qrCodeDialog} />
