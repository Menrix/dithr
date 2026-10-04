<script lang="ts">
import { canvasHistoryManager, layerManager } from '$lib/stores/managers.svelte';
import { onMount, onDestroy } from 'svelte';
import TextInput from '../settings/TextInput.svelte';
import LinkSimpleLogoIcon from 'phosphor-svelte/lib/LinkSimpleIcon';
import LinkBreakIcon from 'phosphor-svelte/lib/LinkBreakIcon';
import TextBIcon from 'phosphor-svelte/lib/TextBIcon';
import TextItalicIcon from 'phosphor-svelte/lib/TextItalicIcon';
import TextUnderlineIcon from 'phosphor-svelte/lib/TextUnderlineIcon';
import RangeInput from '../settings/RangeInput.svelte';
import ColorPicker from 'svelte-awesome-color-picker';
import ColorPickerWrapper from '../ColorPickerWrapper.svelte';
import type { FabricLayerKind, FramePropsPatch, ImageStylesPatch, ObjectPropsPatch, ShapeStylePatch, TextStylePatch } from '$lib/editor/LayerManager';
import { SvelteMap } from 'svelte/reactivity';
import FontPicker from '../FontPicker.svelte';
import CheckboxInput from '../settings/CheckboxInput.svelte';
import LayersPanel from './LayersPanel.svelte';
import CanvasPanel from './CanvasPanel.svelte';
import QRCodeStyling from 'qr-code-styling';
import type { FabricImage, FabricObject } from 'fabric';
import { ditherPalette } from "$lib/stores/editorSettings.svelte";

type CommitField =
    keyof ObjectPropsPatch
  | keyof FramePropsPatch
  | keyof ImageStylesPatch
  | keyof ShapeStylePatch
  | keyof TextStylePatch
  ;

let {
    canvasPanel,
}: {
    canvasPanel: CanvasPanel;
} = $props();

let selectionCount = $state(0);
let selectedId = $state<string | null>(null);
let selectedKind: FabricLayerKind = $state('object');

let left = $state(0);
let top = $state(0);
let width = $state(0);
let height = $state(0);
let angle = $state(0);
let opacity = $state(1);
let rotatable = $state(true);

let frameFillCanvas = $state(false);

let linkWidthHeight = $state(false);

let fillColor: string | undefined = $state('#000');
let backgroundColor: string | undefined = $state('#000');
let strokeColor: string | undefined = $state('#00000000');
let strokeWidth: number = $state(0);
let activeColorPicker: 'fill' | 'stroke' | 'backgroundColor' | 'textColor' | null = $state(null);
let lastColorPickerValue: string | null = $state(null);
let colorPickerOpenStates = new SvelteMap();

let textValue: string = $state('');
let fontFamily: string = $state('');
let fontSize: number | undefined = $state(12);
let fontWeight: 'bold' | 'normal' | string | number = $state('normal');
let fontStyle: 'italic' | 'normal' | string = $state('normal');
let fontUnderline: boolean = $state(false);
let imageSmoothing: boolean = $state(true);

// Tracks which input the user is actively typing into, so a live canvas drag
// (or another field's commit triggering a full refresh) doesn't overwrite
// whatever they're mid-typing in this one field.
let focusedField = $state<CommitField | null>(null);

let movingObject: Record<string, any> | undefined = $state(undefined);

let layersPanel: LayersPanel;
export function setLayersPanel(panel: LayersPanel) {
    layersPanel = panel;
}

async function resizeQrCode() {
    if (!selectedId || selectedKind !== 'qrCode') {
        return;
    }

    const layer = layerManager.getChild(selectedId);
    if (!layer) {
        return;
    }
    const qrConfig = {
        ...(layer.object as FabricImage).qrConfig,
        width: Math.round(layer.object.getScaledWidth()),
        height: Math.round(layer.object.getScaledHeight()),
    }

    const qrCode = new QRCodeStyling(qrConfig);
    const blob = await qrCode.getRawData('webp');
    await canvasHistoryManager.updateQrCode(selectedId, blob, qrConfig, true);
}

function editQrCode() {
    if (!selectedId || selectedKind !== 'qrCode') {
        return;
    }

    const layer = layerManager.getChild(selectedId);
    if (!layer) {
        return;
    }
    const qrConfig = {
        ...(layer.object as FabricImage).qrConfig,
        width: Math.round(layer.object.getScaledWidth()),
        height: Math.round(layer.object.getScaledHeight()),
    }
    layersPanel.qrCodeDialog?.showModal(selectedId, qrConfig);
}

function refresh() {
    const ids = layerManager.getActiveLayerIds();
    selectionCount = ids.length;
    const id = ids.length === 1 ? ids[0] : null;
    selectedId = id;
    if (!selectedId) return;

    const t = layerManager.getTransform(selectedId);
    if (!t) return;

    selectedKind = t.kind;

    if (focusedField !== 'left') left = t.left;
    if (focusedField !== 'top') top = t.top;
    if (focusedField !== 'width') width = t.width;
    if (focusedField !== 'height') height = t.height;
    if (focusedField !== 'angle') angle = t.angle;
    if (focusedField !== 'opacity') opacity = t.opacity;

    rotatable = t.rotatable;

    if (selectedKind === 'frame') {
        frameFillCanvas = (t as FramePropsPatch).fillCanvas ?? false;
        return;
    }

    if (selectedKind === 'text') {
        const textStyles = layerManager.getTextStyle(selectedId);
        if (textStyles) {
            textValue = textStyles.text || '';
            fillColor = textStyles.fill;
            backgroundColor = textStyles.backgroundColor;
            fontSize = textStyles.fontSize;
            fontWeight = textStyles.fontWeight ?? 'normal';
            fontStyle = textStyles.fontStyle ?? 'normal';
            fontUnderline = textStyles.underline ?? false;
            fontFamily = textStyles.fontFamily ?? '';
        }
    } else if (selectedKind === 'image' || selectedKind === 'qrCode') {
        const imageStyles = layerManager.getImageStyle(selectedId);
        if (imageStyles) {
            imageSmoothing = imageStyles.imageSmoothing || false;
        }
    } else {
        const shape = layerManager.getShapeStyle(selectedId);
        if (shape) {
            fillColor = shape.fill;
            strokeColor = shape.stroke;
            strokeWidth = shape.strokeWidth || 0;
        }
    }
}

function commit(field: CommitField, value: any, commitHistory: boolean = true) {
    let params: Record<string, any> = {};
    if (linkWidthHeight && (field === 'width' || field === 'height')) {
        let w: number;
        let h: number;
        let ratio = width / height;

        if (field === 'width') {
            w = Math.max(1, value);
            h = Math.max(1, w / ratio);
            w = Math.max(1, h * ratio);
        } else {
            h = Math.max(1, value);
            w = Math.max(1, h / ratio);
            h = Math.max(1, w * ratio);
        }

        width = w;
        height = h;
        params = { width: w, height: h };
    } else {
        params = { [field]: value };
    }

    focusedField = null;
    if (!selectedId || Number.isNaN(value)) {
        refresh(); // bad input: snap back to the real current value instead of leaving garbage
        return;
    }

    let fn: string;
    if (['left', 'top', 'width', 'height', 'angle', 'opacity', 'fillCanvas'].indexOf(field) > -1) {
        fn = 'updateTransform';
    } else {
        fn = 'updateObject';
    }

    if (commitHistory) {
        (canvasHistoryManager as any)[fn](selectedId, params);
    } else {
        (layerManager as any)[fn](selectedId, params);
    }
}

$effect(() => {
    if (activeColorPicker) {
        let doCommit = false;
        let value;
        let field = activeColorPicker === 'textColor' ? 'fill' : activeColorPicker;

        if (field === 'fill' && !colorPickerOpenStates.get('fill')) {
            doCommit = true;
            value = fillColor;
        } else if (field === 'stroke' && !colorPickerOpenStates.get('stroke')) {
            doCommit = true;
            value = strokeColor;
        } else if (field === 'backgroundColor') {
            doCommit = true;
            value = backgroundColor;
        }

        if (doCommit && lastColorPickerValue !== value) {
            commit(field, value, true);
            lastColorPickerValue = null;
        }

        activeColorPicker = null;
    }
});

function saveMovingObject(e: any) {
    if (!e.target) {
        return;
    }

    const target = e.target as FabricObject;
    movingObject = {
        left: Math.round(target.left),
        top: Math.round(target.top),
        angle: Math.round(target.angle),
        width: Math.round(target.getScaledWidth()),
        height: Math.round(target.getScaledHeight()),
    };
}

let unsubscribe: () => void;
onMount(() => {
    canvasPanel.editorCanvas.fabricCanvas.on('object:moving', saveMovingObject);
    canvasPanel.editorCanvas.fabricCanvas.on('object:scaling', saveMovingObject);
    canvasPanel.editorCanvas.fabricCanvas.on('object:rotating', saveMovingObject);

    canvasPanel.editorCanvas.fabricCanvas.on('object:modified', e => {
        movingObject = undefined;
    });

    unsubscribe = layerManager.subscribe(refresh);
    refresh();
});

onDestroy(() => {
    unsubscribe?.();
});
</script>

<style>
@reference "tailwindcss";

label {
    display: flex;
    align-items: center;
    gap: 6px;
}

label span {
    @apply text-right text-xs pr-2;
}

</style>

<fieldset class="fieldset border-base-300 rounded-box border-2 p-4 grid gap-y-3" class:hidden={selectionCount === 0}>
    <legend class="fieldset-legend">
        <label>Properties</label>
    </legend>

    <div class="grid grid-cols-2 gap-x-6 gap-y-4">
        <div class="col-span-2 grid grid-cols-[1fr_1fr_min-content] gap-4">
            <CheckboxInput
                class="col-span-3"
                label="Fill entire canvas"
                bind:checked={frameFillCanvas}
                onchange={v => commit('fillCanvas', v)}
                visible={selectedKind === 'frame'}
                />

            {#if !(selectedKind === 'frame' && frameFillCanvas)}
                <label>
                    <span>X</span>
                    <TextInput
                        type="number"
                        tabindex={0}
                        bind:value={left}
                        onfocus={() => (focusedField = 'left')}
                        oncommit={v => commit('left', v)}
                        visible={!movingObject}
                        />
                    <TextInput
                        type="number"
                        tabindex={-1}
                        value={movingObject?.left}
                        visible={!!movingObject}
                        />
                </label>

                <label>
                    <span>W</span>
                    <TextInput
                        type="number"
                        min="1"
                        value={width}
                        onfocus={() => (focusedField = 'width')}
                        oncommit={v => commit('width', v)}
                        visible={!movingObject}
                        />
                    <TextInput
                        type="number"
                        tabindex={-1}
                        value={movingObject?.width}
                        visible={!!movingObject}
                        />
                </label>

                <div class="row-span-2 w-5 h-full grid items-center justify-center -ml-1 pr-1">
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

                <label>
                    <span>Y</span>
                    <TextInput
                        type="number"
                        tabindex={0}
                        bind:value={top}
                        onfocus={() => (focusedField = 'top')}
                        oncommit={v => commit('top', v)}
                        visible={!movingObject}
                        />
                    <TextInput
                        type="number"
                        tabindex={-1}
                        value={movingObject?.top}
                        visible={!!movingObject}
                        />
                </label>

                <label>
                    <span>H</span>
                    <TextInput
                        type="number"
                        min="1"
                        value={height}
                        onfocus={() => (focusedField = 'height')}
                        oncommit={v => commit('height', v)}
                        visible={!movingObject}
                        />
                    <TextInput
                        type="number"
                        tabindex={-1}
                        value={movingObject?.height}
                        visible={!!movingObject}
                        />
                </label>
            {/if}
        </div>

        <label class:hidden!={!rotatable}>
            <RangeInput
                label="Rotation"
                value={angle}
                step={1}
                disabled={selectedKind === 'frame'}
                oninput={v => commit('angle', v, false)}
                oncommit={v => commit('angle', v, true)}
                min={0}
                max={360}
                defaultValue={0}
                coloredState={false}
                unit="°"
                class="w-full"
                showReset={false}
                visible={!movingObject}
                />
            <RangeInput
                label="Rotation"
                value={movingObject?.angle}
                step={1}
                min={0}
                max={360}
                defaultValue={0}
                coloredState={false}
                unit="°"
                class="w-full"
                showReset={false}
                visible={!!movingObject}
                />
        </label>

        <label class:hidden!={!rotatable}>
            <RangeInput
                label="Opacity"
                value={opacity}
                disabled={selectedKind === 'frame'}
                oninput={v => commit('opacity', v, false)}
                oncommit={v => commit('opacity', v, true)}
                step={0.01}
                min={0.01}
                max={1}
                defaultValue={1}
                coloredState={false}
                unit='%'
                textMultiply={100}
                class="w-full"
                showReset={false}
                />
        </label>
    </div>

    <!-- OBJECT-->
    <div class="grid grid-cols-2 gap-x-4 gap-y-4" class:hidden={selectedKind === 'frame' || selectedKind === 'text' || selectedKind === 'qrCode'}>
        <div class="divider col-span-2 m-0!"></div>

        <label class:opacity-20={selectedKind === 'image'} class:pointer-events-none={selectedKind === 'frame' || selectedKind === 'image'}>
            <p class="w-full">Fill</p>
            <ColorPicker
                // @ts-expect-error
                components={{wrapper: ColorPickerWrapper}}
                bind:hex={fillColor}
                position="fixed"
                bind:isOpen={() => colorPickerOpenStates.get('fill') ?? false, isOpen => { activeColorPicker = 'fill'; isOpen && (lastColorPickerValue = fillColor); colorPickerOpenStates.set('fill', isOpen); }}
                isDark={true}
                isAlpha={true}
                onInput={color => commit('fill', color.hex, false)}
                label=""
                swatches={ditherPalette.swatches}
                />
        </label>
        <label>
            <p class="w-full">Stroke</p>
            <ColorPicker
                // @ts-expect-error
                components={{wrapper: ColorPickerWrapper}}
                bind:hex={strokeColor}
                position="fixed"
                bind:isOpen={() => colorPickerOpenStates.get('stroke') ?? false, isOpen => { activeColorPicker = 'stroke'; isOpen && (lastColorPickerValue = strokeColor); colorPickerOpenStates.set('stroke', isOpen); }}
                isDark={true}
                isAlpha={true}
                onInput={() => commit('stroke', strokeColor, false)}
                label=""
                swatches={ditherPalette.swatches}
                />
        </label>

        <div class="w-full col-span-2" class:hidden!={!rotatable}>
            <RangeInput
                label="Stroke width"
                value={strokeWidth}
                oninput={v => commit('strokeWidth', v, false)}
                oncommit={v => commit('strokeWidth', v, true)}
                step={1}
                min={0}
                max={500}
                defaultValue={0}
                coloredState={false}
                unit='px'
                class='w-full'
                />
        </div>
        <CheckboxInput
            label="Image smoothing"
            bind:checked={imageSmoothing}
            onchange={v => commit('imageSmoothing', v)}
            class="col-span-2"
            visible={selectedKind === 'image'}
            />
    </div>

    <!-- TEXT -->
    <div class="grid grid-cols-2 gap-x-4 gap-y-4" class:hidden={selectedKind !== 'text'}>
        <div class="divider col-span-2 m-0!">Text</div>

        <div class="w-full col-span-2 grid gap-2">
            <p>Text</p>
            <TextInput
                type="text"
                class="block w-full!"
                tabindex={0}
                bind:value={textValue}
                oncommit={v => commit('text', v)}
                />
        </div>

        <div class="w-full col-span-2 grid gap-2">
            <FontPicker
                // @ts-expect-error
                bind:font={fontFamily}
                class="col-span-2"
                onchange={family => commit('fontFamily', family)}
                />
        </div>

        <div class="w-full col-span-2 flex items-end gap-4">
            <label class="w-full flex-1">
                <RangeInput
                    label="Font size"
                    value={fontSize!}
                    oninput={v => commit('fontSize', v, false)}
                    oncommit={v => commit('fontSize', v, true)}
                    step={1}
                    min={12}
                    max={100}
                    unit='px'
                    class='w-full'
                    />
            </label>

            <div class="shrink-0 flex gap-2 mb-2">
                <button class="dithr-btn btn-square btn-sm" class:btn-info={fontWeight === 'bold'} onclick={() => commit('fontWeight', fontWeight === 'bold' ? 'normal' : 'bold')}>
                    <TextBIcon color="currentColor" weight="bold" size={16} />
                </button>

                <button class="dithr-btn btn-square btn-sm" class:btn-info={fontStyle === 'italic'} onclick={() => commit('fontStyle', fontStyle === 'italic' ? 'normal' : 'italic')}>
                    <TextItalicIcon color="currentColor" weight="bold" size={16} />
                </button>

                <button class="dithr-btn btn-square btn-sm" class:btn-info={fontUnderline} onclick={() => commit('underline', !fontUnderline)}>
                    <TextUnderlineIcon color="currentColor" weight="bold" size={16} />
                </button>
            </div>
        </div>

        <label class:pointer-events-none={selectedKind === 'frame' || selectedKind === 'image'}>
            <p class="w-full">Color</p>
            <ColorPicker
                // @ts-expect-error
                components={{wrapper: ColorPickerWrapper}}
                bind:hex={fillColor}
                position="fixed"
                bind:isOpen={() => colorPickerOpenStates.get('textColor') ?? false, isOpen => { activeColorPicker = 'textColor'; isOpen && (lastColorPickerValue = fillColor); colorPickerOpenStates.set('fill', isOpen); }}
                isDark={true}
                isAlpha={true}
                onInput={color => commit('fill', color.hex, false)}
                label=""
                swatches={ditherPalette.swatches}
                />
        </label>

        <label class:pointer-events-none={selectedKind === 'frame' || selectedKind === 'image'}>
            <p class="w-full">Background</p>
            <ColorPicker
                // @ts-expect-error
                components={{wrapper: ColorPickerWrapper}}
                bind:hex={backgroundColor}
                position="fixed"
                bind:isOpen={() => colorPickerOpenStates.get('backgroundColor') ?? false, isOpen => { activeColorPicker = 'backgroundColor'; isOpen && (lastColorPickerValue = backgroundColor); colorPickerOpenStates.set('backgroundColor', isOpen); }}
                isDark={true}
                isAlpha={true}
                onInput={color => commit('backgroundColor', color.hex, false)}
                label=""
                swatches={ditherPalette.swatches}
                />
        </label>
    </div>

    <!-- QR CODE -->
     <div class="grid grid-cols-2 gap-x-4 gap-y-4" class:hidden={selectedKind !== 'qrCode'}>
        <div class="divider col-span-2 m-0!">QR Code</div>

        <CheckboxInput
            label="Image smoothing"
            bind:checked={imageSmoothing}
            onchange={v => commit('imageSmoothing', v)}
            class="col-span-2"
            />

        <div class="grid grid-cols-[1fr_2fr] col-span-2 gap-3">
            <button class="dithr-btn" onclick={async () => await resizeQrCode()}>Redraw</button>
            <button class="dithr-btn btn-success" onclick={() => editQrCode()}>Edit</button>
        </div>
     </div>
</fieldset>
