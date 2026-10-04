/**
* LayerManager for Fabric.js 7
*
* - Frame: resizable crop mask, clamped to canvas bounds. Resizing a Frame
*   re-clips children but doesn't move/resize them (static crop).
* - Every non-frame object belongs to exactly one Frame. New objects join
*   the active Frame.
* - No nested frames, no frame rotation (axis-aligned only).
* - Canvas always has >=1 Frame; deleting the last one recreates a
*   full-size Frame (and deletes its children, no unwrap).
* - Hide/lock on a Frame overrides children's rendering/interactivity
*   without touching each child's own visible/locked flag.
* - Focus mode: selecting a Frame (or all of one Frame's children) makes
*   everything outside it non-interactive, so a stray click can't grab
*   unrelated layers. Clearing selection or selecting across Frames exits
*   focus.
*/

import { ActiveSelection, Circle, FabricImage, IText, Path, Rect, Textbox, Triangle, util } from 'fabric';
import type { Canvas, FabricObject } from 'fabric';
import type { Options } from 'qr-code-styling';

export type FabricLayerKind =
    'frame'
  | 'rect'
  | 'triangle'
  | 'circle'
  | 'image'
  | 'qrCode'
  | 'text'
  | 'object'
  ;
declare module 'fabric' {
    interface FabricObject {
        layerId?: string;
        layerKind?: FabricLayerKind;
    }

    interface FabricImage {
        qrConfig?: Partial<QrCodeOptions>;
    }
}

export interface FrameLayer {
    kind: 'frame';
    id: string;
    readonly name: string;
    object: FabricObject;
    /** Invisible mirror of `object`'s bounds, never added to canvas. Shared as
    *  `clipPath` for every child, so resizing the Frame re-clips all children
    *  by updating this one shape. */
    clipShape: FabricObject;
    visible: boolean;
    locked: boolean;
    /** Child ids, bottom-to-top. */
    childOrder: string[];
    fillCanvas: boolean;
}

export interface ChildLayer {
    kind: 'object';
    id: string;
    readonly name: string;
    object: FabricObject;
    parentId: string;
    visible: boolean;
    locked: boolean;
}

export type AnyLayer = FrameLayer | ChildLayer;
export type ObjectAlignment = 'h-left' | 'h-center' | 'h-right' | 'v-top' | 'v-middle' | 'v-bottom';
export type ObjectScaleType = 'fit-width' | 'fit-height' | 'fit-both' | 'original-size';

export interface ObjectPropsPatch {
    kind?: FabricObject['layerKind'];
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    angle?: number;
    opacity?: number;
    rotatable?: boolean;
}

export interface FramePropsPatch extends ObjectPropsPatch {
    fillCanvas?: boolean;
}

export interface ImageStylesPatch {
    imageSmoothing?: boolean;
}

/** Fill/border properties, children only. Frames have no fill/stroke by
 *  design, so getShapeStyle returns null for a frame id. */
export interface ShapeStylePatch {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeDashArray?: number[] | null;
}

/** Font/text properties, IText/Textbox children only. getTextStyle returns
 *  null for anything else. */
export interface TextStylePatch {
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    fill?: string;
    backgroundColor?: string;
    textAlign?: string;
    underline?: boolean;
    linethrough?: boolean;
}

/** Plain-data snapshot for an external undo/redo manager (LayerManager has no
 *  undo stack of its own). `objectData` is each object's toObject() output.
 *  clipShape is not captured - always regenerated from the frame's bounds. */
export interface LayerManagerSnapshot {
    frameOrder: string[];
    activeFrameId: string;
    counter: number;
    frameNameCounter: number;
    childNameCounter: number;
    frames: Array<{
        id: string;
        name: string;
        visible: boolean;
        locked: boolean;
        childOrder: string[];
        objectData: Record<string, unknown>;
        fillCanvas: boolean;
    }>;
    children: Array<{
        id: string;
        name: string;
        parentId: string;
        visible: boolean;
        locked: boolean;
        objectData: Record<string, unknown>;
    }>;
}


export interface LayerManagerOptions {
    /** Insets from the canvas's pixel size to its usable area (e.g. CSS
    *  padding). Frames are clamped to this region, not the full canvas. */
    padding?: {
        blockStart?: number; // top
        blockEnd?: number; // bottom
        inlineStart?: number; // left
        inlineEnd?: number; // right
    };
}

export const OBJECT_TYPE_NAMES = {
    object: 'Object',
    frame: 'Frame',
    image: 'Image',
    qrCode: 'QR Code',
    text: 'Text',
    rect: 'Rectangle',
    triangle: 'Triangle',
    circle: 'Circle',
} satisfies Record<FabricLayerKind, string>;

export class LayerManager {
    private canvas!: Canvas;
    private frames = new Map<string, FrameLayer>();
    private children = new Map<string, ChildLayer>();
    /** Frame ids, bottom-to-top. */
    private frameOrder: string[] = [];
    private activeFrameId!: string;

    private padding: Required<NonNullable<LayerManagerOptions['padding']>>;

    private counter = 0;
    private frameNameCounter = 0;
    private childNameCounter = 0;
    private listeners = new Set<() => void>();
    private activeLayerIds = new Set<string>();

    private canvasRealWidth = 0;
    private canvasRealHeight = 0;

    /** Current focus target (see class doc). Null when selection spans
   *  multiple frames, is empty, or is dangling. 'frame' mode: only the frame
   *  itself is selectable. 'children' mode: only its children are. */
    private focusedScope: { frameId: string; mode: 'frame' | 'children' } | null = null;

    private readonly onSelectionCreated = () => this.handleSelectionChange();
    private readonly onSelectionUpdated = () => this.handleSelectionChange();
    private readonly onSelectionCleared = () => this.handleSelectionChange();

    private readonly onObjectModified = (e: { target?: FabricObject }) => {
        if (!e.target) {
            return;
        }

        if (e.target.layerKind === 'frame' && e.target.layerId) {
            this.clampFrameBounds(e.target);
            this.syncClipShape(e.target.layerId);
        } else {
            this.roundObjectBounds(e.target);
        }
    };

    // Clamp live during drag/resize too, not just on release.
    private readonly onObjectMoving = (e: { target?: FabricObject }) => {
        if (e.target?.layerKind === 'frame') this.clampFrameBounds(e.target);
    };
    private readonly onObjectScaling = (e: { target?: FabricObject; transform?: { corner?: string } }) => {
        if (e.target?.layerKind === 'frame') this.clampFrameBounds(e.target, e.transform?.corner);
    };

    constructor(options: LayerManagerOptions = {}) {
        this.padding = {
            blockStart: options.padding?.blockStart ?? 0,
            blockEnd: options.padding?.blockEnd ?? 0,
            inlineStart: options.padding?.inlineStart ?? 0,
            inlineEnd: options.padding?.inlineEnd ?? 0,
        };
    }

    initCanvas(canvas: Canvas): boolean {
        if (this.canvas) {
            return false;
        }

        this.canvas = canvas;

        this.canvas.on('selection:created', this.onSelectionCreated);
        this.canvas.on('selection:updated', this.onSelectionUpdated);
        this.canvas.on('selection:cleared', this.onSelectionCleared);
        this.canvas.on('object:modified', this.onObjectModified);
        this.canvas.on('object:moving', this.onObjectMoving);
        this.canvas.on('object:scaling', this.onObjectScaling);

        // Seeds canvasRealWidth/canvasRealHeight from the canvas's actual size.
        this.handleCanvasResize();

        return true;
    }

    /** Canvas pixel size minus configured padding: the region frames are constrained to. */
    private usableArea(): { left: number; top: number; width: number; height: number } {
        const cw = this.canvas.getWidth();
        const ch = this.canvas.getHeight();
        const left = 0;
        const top = 0;
        const width = Math.max(1, cw - this.padding.inlineStart - this.padding.inlineEnd);
        const height = Math.max(1, ch - this.padding.blockStart - this.padding.blockEnd);
        return { left, top, width, height };
    }

    private nextId(prefix: 'frame' | 'child'): string {
        return `${prefix}_${Date.now()}_${this.counter++}`;
    }

    subscribe(fn: () => void): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private notify(): void {
        for (const fn of this.listeners) {
            try {
                fn();
            } catch (err) {
                console.error('LayerManager listener error:', err);
            }
        }
    }

    dispose(): void {
        this.canvas.off('selection:created', this.onSelectionCreated);
        this.canvas.off('selection:updated', this.onSelectionUpdated);
        this.canvas.off('selection:cleared', this.onSelectionCleared);
        this.canvas.off('object:modified', this.onObjectModified);
        this.canvas.off('object:moving', this.onObjectMoving);
        this.canvas.off('object:scaling', this.onObjectScaling);
        this.listeners.clear();
    }

    // ---------- Selection sync + focus mode ----------

    private handleSelectionChange(): void {
        const activeObjects = this.canvas.getActiveObjects();
        this.activeLayerIds = new Set(
            activeObjects.map((obj) => obj.layerId).filter((id): id is string => id !== undefined),
        );
        this.updateFocus();
        this.notify();
    }

    getActiveLayerIds(): string[] {
        return [...this.activeLayerIds];
    }

    selectLayers(ids: string[]): void {
        const objects = ids
            .map((id) => this.frames.get(id)?.object ?? this.children.get(id)?.object)
            .filter((obj): obj is FabricObject => obj !== undefined);

        if (objects.length === 0) {
            this.canvas.discardActiveObject();
        } else if (objects.length === 1) {
            this.canvas.setActiveObject(objects[0]);
        } else {
            this.canvas.setActiveObject(new ActiveSelection(objects, { canvas: this.canvas }));
        }
        this.canvas.requestRenderAll();
        // setActiveObject/discardActiveObject fire selection events, which call
        // handleSelectionChange() -> updateFocus() + notify(). No manual call needed here.
    }

    /** Resolve a layer id to the frame that owns it (itself, if it is a frame). */
    private ownerFrameId(id: string): string | null {
        if (this.frames.has(id)) return id;
        const child = this.children.get(id);
        return child?.parentId ?? null;
    }

    private updateFocus(): void {
        const ids = [...this.activeLayerIds];
        let next: { frameId: string; mode: 'frame' | 'children' } | null = null;

        if (ids.length > 0) {
            const owners = new Set(ids.map((id) => this.ownerFrameId(id)));
            if (owners.size === 1 && ![...owners].includes(null)) {
                const frameId = [...owners][0] as string;
                // If the frame itself is part of the selection, frame-mode wins even if
                // some of its children are also selected alongside it (mixed selection
                // is an edge case with no unambiguous "right" answer; frame takes priority).
                const mode: 'frame' | 'children' = ids.includes(frameId) ? 'frame' : 'children';
                next = { frameId, mode };
            }
            // owners.size > 1 (selection spans frames) or contains null (dangling id) -> no focus.
        }

        if (next?.frameId === this.focusedScope?.frameId && next?.mode === this.focusedScope?.mode) {
            return;
        }

        this.exitFocus();
        if (next) this.enterFocus(next.frameId, next.mode);
    }

    private applyFrameInteractivity(frame: FrameLayer): void {
        const scope = this.focusedScope;
        // Opt-in, not opt-out: a frame is only ever interactive when it is the exact
        // panel-selected target in 'frame' mode. Nothing-selected, a child selected,
        // or a different frame focused all fall through to non-interactive by default,
        // so a stray canvas click can never pick up a frame on its own.
        const isFocusedFrame = scope !== null && scope.mode === 'frame' && scope.frameId === frame.id;

        let interactive = isFocusedFrame && !frame.locked;
        if (frame.fillCanvas) {
            interactive = false;
        }

        frame.object.setControlsVisibility({
            tl: interactive,
            tr: interactive,
            br: interactive,
            bl: interactive,
            ml: interactive,
            mt: interactive,
            mr: interactive,
            mb: interactive,
        });

        frame.object.set({
            selectable: interactive,
            evented: interactive,
            borderScaleFactor: interactive ? 2 : 5,
        });
    }

    private enterFocus(frameId: string, mode: 'frame' | 'children'): void {
        const focused = this.frames.get(frameId);
        if (!focused) return;
        this.focusedScope = { frameId, mode };

        for (const frame of this.frames.values()) this.applyFrameInteractivity(frame);
        for (const childId of this.children.keys()) this.refreshChildEffectiveState(childId);

        this.canvas.requestRenderAll();
    }

    private exitFocus(): void {
        if (this.focusedScope === null) {
            return;
        }

        this.focusedScope = null;
        for (const frame of this.frames.values()) this.applyFrameInteractivity(frame);
        for (const childId of this.children.keys()) this.refreshChildEffectiveState(childId);

        this.canvas.requestRenderAll();
    }

    // ---------- Active frame ----------

    getActiveFrameId(): string {
        return this.activeFrameId;
    }

    setActiveFrame(frameId: string): boolean {
        if (!this.frames.has(frameId)) return false;
        this.activeFrameId = frameId;
        this.refreshAllChildInteractivity();
        this.canvas.requestRenderAll();
        this.notify();
        return true;
    }

    // ---------- Frames ----------

    private fullBounds() {
        return {
            left: 0,
            top: 0,
            width: this.canvasRealWidth,
            height: this.canvasRealHeight,
        };
    }

    /** Clamp bounds to the usable area. Floors width/height first (rounding up
   *  could overshoot), then clamps position against that floored size. */
    private clampBounds(b: { left: number; top: number; width: number; height: number }) {
        const area = this.usableArea();
        const width = Math.floor(Math.min(Math.max(b.width, 1), area.width));
        const height = Math.floor(Math.min(Math.max(b.height, 1), area.height));
        const left = Math.floor(Math.min(Math.max(b.left, area.left), area.left + area.width - width));
        const top = Math.floor(Math.min(Math.max(b.top, area.top), area.top + area.height - height));
        return { left, top, width, height };
    }

    /** Keeps a frame within the usable area. Called live during move/scale and
     *  again on modify as a final correction. Same floor-then-clamp order as
     *  clampBounds, to avoid overshoot. */
    private clampFrameBounds(obj: FabricObject, corner?: string): void {
        const area = this.usableArea();
        const baseWidth = obj.width ?? 0;
        const baseHeight = obj.height ?? 0;

        // Capture right/bottom edge before changing anything - the anchor for
        // handles that keep the opposite edge fixed.
        const liveLeft = obj.left ?? 0;
        const liveTop = obj.top ?? 0;
        const liveRight = liveLeft + baseWidth * (obj.scaleX ?? 1);
        const liveBottom = liveTop + baseHeight * (obj.scaleY ?? 1);

        let scaleX = obj.scaleX ?? 1;
        let scaleY = obj.scaleY ?? 1;
        if (baseWidth * scaleX > area.width) scaleX = area.width / baseWidth;
        if (baseHeight * scaleY > area.height) scaleY = area.height / baseHeight;

        const width = Math.floor(baseWidth * scaleX);
        const height = Math.floor(baseHeight * scaleY);
        scaleX = baseWidth > 0 ? width / baseWidth : scaleX;
        scaleY = baseHeight > 0 ? height / baseHeight : scaleY;

        // Left/top handles keep the right/bottom edge fixed, so left/top must
        // be re-derived from that fixed edge, not read back from obj.left/top
        // (which still reflects the pre-floor size).
        const leftHandle = corner === 'tl' || corner === 'ml' || corner === 'bl';
        const topHandle = corner === 'tl' || corner === 'mt' || corner === 'tr';

        let left = leftHandle ? liveRight - width : liveLeft;
        let top = topHandle ? liveBottom - height : liveTop;

        left = Math.floor(Math.min(Math.max(left, area.left), area.left + area.width - width));
        top = Math.floor(Math.min(Math.max(top, area.top), area.top + area.height - height));

        obj.set({ scaleX, scaleY, left, top });
        obj.setCoords();
    }

    /** Round a child object's position to whole pixels. No bounds clamping -
    *  unlike frames, children aren't constrained to the canvas/usable area. */
    private roundObjectPosition(obj: FabricObject): void {
        obj.set({ left: Math.round(obj.left ?? 0), top: Math.round(obj.top ?? 0) });
        obj.setCoords();
    }

    /** Round a child's position and size to whole pixels, re-deriving scale
    *  from the rounded size (rounding scale directly won't land on a whole
    *  pixel size in general). No bounds clamping. */
    private roundObjectBounds(obj: FabricObject): void {
        const baseWidth = obj.width ?? 0;
        const baseHeight = obj.height ?? 0;
        const scaleX = obj.scaleX ?? 1;
        const scaleY = obj.scaleY ?? 1;
        const angle = obj.angle ?? 0;

        const width = Math.round(baseWidth * scaleX);
        const height = Math.round(baseHeight * scaleY);
        const props: Record<string, any> = {
            left: Math.round(obj.left ?? 0),
            top: Math.round(obj.top ?? 0),
            angle: Math.round(angle),
        };

        if (obj instanceof Rect || obj instanceof Triangle) {
            props.width = width;
            props.height = height;
            props.scaleX = 1;
            props.scaleY = 1;
        } else if (obj instanceof Circle) {
            props.scaleX = baseWidth > 0 ? width / baseWidth : scaleX;
            props.scaleY = baseHeight > 0 ? height / baseHeight : scaleY;
        } else {
            props.scaleX = baseWidth > 0 ? width / baseWidth : scaleX;
            props.scaleY = baseHeight > 0 ? height / baseHeight : scaleY;
        }

        obj.set(props);
        obj.setCoords();
        // Only called on release, not during drag - safe to notify here.
        this.notify();
    }


    createFullFrame(fillCanvas: boolean) {
        const area = this.usableArea();
        this.activeFrameId = this.createFrame(fillCanvas ? { fillCanvas: true } : {
            left: area.left,
            top: area.top,
            width: area.width,
            height: area.height,
        });
    }


    createFrame(bounds: { fillCanvas: true } | { left: number; top: number; width: number; height: number }): string {
        const id = this.nextId('frame');
        const fillCanvas = 'fillCanvas' in bounds;
        let clamped;
        if (fillCanvas) {
            clamped = this.fullBounds();
        } else {
            clamped = this.clampBounds(bounds);
        }

        const object = new Path(`M 0 0 H ${1} V ${1} H 0 Z`, {
            strokeWidth: 0,
            fill: '#ffffff00',
        });
        object.set({
            originX: 'left',
            originY: 'top',
            left: clamped.left,
            top: clamped.top,
            width: 1,
            height: 1,
            scaleX: clamped.width,
            scaleY: clamped.height,
            absolutePositioned: true,
            lockRotation: true,
            // Selection styling: only visible while active, distinct from other objects' default blue.
            borderColor: '#773bbf',
            borderDashArray: [50, 10],
            cornerColor: '#773bbf',
            cornerStrokeColor: '#ffffff',
            cornerStyle: 'square',
            cornerSize: 14,
            borderScaleFactor: 2,
            transparentCorners: false,
            // Starts non-interactive; applyFrameInteractivity turns it on once selected.
            selectable: false,
            evented: false,
        });

        object.set({ layerId: id, layerKind: 'frame' });
        // Hide the rotate handle too, not just lock rotation. Unverified API name;
        // no-ops silently if absent in this fabric build.
        object.setControlVisible?.('mtr', false);

        const clipShape = new Path(`M 0 0 H ${1} V ${1} H 0 Z`, {
            strokeWidth: 0,
        });
        clipShape.set({
            originX: 'left',
            originY: 'top',
            left: clamped.left,
            top: clamped.top,
            width: 1,
            height: 1,
            scaleX: clamped.width,
            scaleY: clamped.height,
            absolutePositioned: true,
        });

        const frame: FrameLayer = {
            kind: 'frame',
            id,
            name: `Frame ${++this.frameNameCounter}`,
            object,
            clipShape,
            visible: true,
            locked: false,
            childOrder: [],
            fillCanvas,
        };

        this.frames.set(id, frame);
        this.frameOrder.push(id);
        this.canvas.add(object);
        this.activeFrameId = id;
        this.refreshAllChildInteractivity();
        this.syncCanvasOrder();
        this.notify();
        return id;
    }

    /** Re-clip a frame's children to its current bounds. Static crop: children
    *  keep their own position/size, only the clip window moves. */
    private syncClipShape(frameId: string): void {
        const frame = this.frames.get(frameId);
        if (!frame) return;
        const src = frame.object;
        frame.clipShape.set({
            left: src.left,
            top: src.top,
            width: 1,
            height: 1,
            scaleX: Math.floor(src.getScaledWidth()),
            scaleY: Math.floor(src.getScaledHeight()),
        });
        this.canvas.requestRenderAll();
        this.notify();
    }

    removeFrame(frameId: string): boolean {
        const frame = this.frames.get(frameId);
        if (!frame) return false;

        if (this.focusedScope?.frameId === frameId) {
            this.exitFocus();
        }

        for (const childId of [...frame.childOrder]) {
            const child = this.children.get(childId);
            if (child) {
                this.canvas.remove(child.object);
                this.children.delete(childId);
            }
        }

        this.canvas.remove(frame.object);
        this.frames.delete(frameId);
        this.frameOrder = this.frameOrder.filter((id) => id !== frameId);

        if (this.activeFrameId === frameId) {
            this.activeFrameId = this.frameOrder[this.frameOrder.length - 1] ?? '';
            this.refreshAllChildInteractivity();
        }

        if (this.frameOrder.length === 0) {
            // Invariant: at least one frame always exists. Recreate full-size default.
            this.createFullFrame(true);
            return true; // createFrame already synced order and notified.
        }

        this.syncCanvasOrder();
        this.notify();
        return true;
    }

    listFrames(): Array<{ frame: FrameLayer; children: ChildLayer[] }> {
        return this.frameOrder.map((frameId) => {
            const frame = this.frames.get(frameId)!;
            return {
                frame,
                children: frame.childOrder.map((childId) => this.children.get(childId)!),
            };
        });
    }

    getFrame(frameId: string): FrameLayer | null {
        return this.frames.get(frameId) ?? null;
    }

    // ---------- Children ----------

    addObject(fabricObject: FabricObject, kind?: FabricObject['layerKind']): string {
        const frame = this.frames.get(this.activeFrameId);
        if (!frame) throw new Error('No active frame: invariant violated.');

        kind = kind ?? 'object';

        if (fabricObject instanceof FabricImage) {
            kind = kind === 'object' ? 'image' : kind;
            fabricObject.set({
                lockUniScaling: true,
                imageSmoothing: false,
            });

            fabricObject.setControlsVisibility({
                mt: false,
                mb: false,
                ml: false,
                mr: false,
            });

            const scaledWidth = frame.object.getScaledWidth();
            const scaledHeight = frame.object.getScaledHeight();

            // Fit within the frame
            const imgWidth = fabricObject.width ?? 1;
            const imgHeight = fabricObject.height ?? 1;
            let scale;
            if (kind === 'qrCode') {
                // contain
                scale = Math.min(scaledWidth / imgWidth, scaledHeight / imgHeight);
            } else {
                // cover
                scale = Math.max(scaledWidth / imgWidth, scaledHeight / imgHeight);
            }
            fabricObject.scale(scale);
        } else if (fabricObject instanceof IText) {
            kind = 'text';
        }

        const id = this.nextId('child');
        fabricObject.set({
            originX: 'left',
            originY: 'top',
            left: frame.object.getX(),
            top: frame.object.getY(),
            layerId: id,
            layerKind: kind,
        });
        fabricObject.clipPath = frame.clipShape;

        this.canvas.add(fabricObject);

        const child: ChildLayer = {
            kind: 'object',
            id,
            name: `${OBJECT_TYPE_NAMES[kind]} ${++this.childNameCounter}`,
            object: fabricObject,
            parentId: frame.id,
            visible: true,
            locked: false,
        };
        this.children.set(id, child);
        frame.childOrder.push(id);

        this.syncCanvasOrder();
        this.notify();

        this.selectLayers([id]);

        // Center object
        this.alignObjects(['h-center', 'v-middle']);
        return id;
    }

    // ---------- Content factories ----------
    // All go through addObject for consistent framing/naming/selection.
    // Starting left/top don't matter - addObject re-centers via alignObjects.
    // Options are loosely typed since each shape's constructor options differ.
    async addText(text = 'Text', options: Record<string, unknown> = {}): Promise<string> {
        const fontSize = 24;
        const fontFamily = 'Noto Sans Variable';
        await document.fonts.load(`${fontSize}px ${fontFamily}`);

        const obj = new IText(text, {
            fontFamily,
            fontSize,
            fontWeight: 'normal',
            fill: '#000000',
            ...options,
        });

        return this.addObject(obj);
    }

    addRect(options: Record<string, unknown> = {}): string {
        const obj = new Rect({
            width: 120,
            height: 80,
            fill: '#4a90d9',
            ...options,
        });
        return this.addObject(obj, 'rect');
    }

    addCircle(options: Record<string, unknown> = {}): string {
        const obj = new Circle({
            radius: 50,
            fill: '#4a90d9',
            ...options,
        });
        return this.addObject(obj, 'circle');
    }

    addTriangle(options: Record<string, unknown> = {}): string {
        const obj = new Triangle({
            width: 100,
            height: 100,
            fill: '#4a90d9',
            ...options,
        });
        return this.addObject(obj, 'triangle');
    }

    async addQrCode(url: string, config: Partial<Options>): Promise<string> {
        const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
        img.qrConfig = structuredClone(config);
        img.set({ name: 'QR Code' });
        return this.addObject(img, 'qrCode');
    }

    async updateQrCode(childId: string, newUrl: string, config: Partial<Options>, resetScaling: boolean = false): Promise<boolean> {
        const child = this.children.get(childId);
        if (!child) {
            return false;
        }
        const obj = child.object;
        if (!(obj instanceof FabricImage)) {
            return false;
        }

        await obj.setSrc(newUrl);
        obj.qrConfig = structuredClone(config);

        if (resetScaling) {
            obj.scaleX = 1;
            obj.scaleY = 1;
        }

        this.canvas.requestRenderAll();
        this.notify();

        return true;
    }

    removeChild(childId: string): boolean {
        const child = this.children.get(childId);
        if (!child) return false;

        const frame = this.frames.get(child.parentId);
        if (frame) frame.childOrder = frame.childOrder.filter((id) => id !== childId);

        this.canvas.remove(child.object);
        this.children.delete(childId);

        this.syncCanvasOrder();
        this.notify();
        return true;
    }

    getChild(childId: string): ChildLayer | null {
        return this.children.get(childId) ?? null;
    }

    getLayerByObject(fabricObject: FabricObject): AnyLayer | null {
        if (!fabricObject.layerId) return null;
        return this.frames.get(fabricObject.layerId) ?? this.children.get(fabricObject.layerId) ?? null;
    }

    // ---------- Visibility / locking (frame overrides child, non-destructively) ----------

    private refreshChildEffectiveState(childId: string): void {
        const child = this.children.get(childId);
        if (!child) return;
        const frame = this.frames.get(child.parentId);
        const effectiveVisible = child.visible && (frame?.visible ?? true);
        const scope = this.focusedScope;
        let suppressedByFocus: boolean;
        if (scope !== null) {
            // Suppressed if a different frame is focused, or the frame itself
            // (not a child) is the focus target.
            suppressedByFocus = scope.frameId !== child.parentId || scope.mode === 'frame';
        } else {
            // No selection: only the active frame's children are clickable.
            suppressedByFocus = child.parentId !== this.activeFrameId;
        }
        const effectiveInteractive = !suppressedByFocus && !child.locked && !(frame?.locked ?? false);
        child.object.visible = effectiveVisible;
        child.object.set({ selectable: effectiveInteractive, evented: effectiveInteractive });
    }

    /** Re-derive interactivity for every child. Needed whenever activeFrameId
    *  changes, since the no-selection default depends on it. */
    private refreshAllChildInteractivity(): void {
        for (const childId of this.children.keys()) this.refreshChildEffectiveState(childId);
    }

    /** True if the layer actually renders, accounting for parent-frame overrides. */
    isEffectivelyVisible(id: string): boolean {
        const frame = this.frames.get(id);
        if (frame) return frame.visible;
        const child = this.children.get(id);
        if (!child) return false;
        return child.visible && (this.frames.get(child.parentId)?.visible ?? true);
    }

    show(id: string): boolean {
        const frame = this.frames.get(id);
        if (frame) {
            frame.visible = true;
            frame.object.visible = true;
            frame.childOrder.forEach((c) => this.refreshChildEffectiveState(c));
            this.canvas.requestRenderAll();
            this.notify();
            return true;
        }
        const child = this.children.get(id);
        if (!child) return false;
        child.visible = true;
        this.refreshChildEffectiveState(id);
        this.canvas.requestRenderAll();
        this.notify();
        return true;
    }

    hide(id: string): boolean {
        const frame = this.frames.get(id);
        if (frame) {
            frame.visible = false;
            frame.object.visible = false;
            frame.childOrder.forEach((c) => this.refreshChildEffectiveState(c));
            this.canvas.requestRenderAll();
            this.notify();
            return true;
        }
        const child = this.children.get(id);
        if (!child) return false;
        child.visible = false;
        this.refreshChildEffectiveState(id);
        this.canvas.requestRenderAll();
        this.notify();
        return true;
    }

    toggle(id: string): boolean {
        return this.isEffectivelyVisible(id) ? this.hide(id) : this.show(id);
    }

    lock(id: string): boolean {
        const frame = this.frames.get(id);
        if (frame) {
            frame.locked = true;
            this.applyFrameInteractivity(frame);
            frame.childOrder.forEach((c) => this.refreshChildEffectiveState(c));
            this.canvas.requestRenderAll();
            this.notify();
            return true;
        }
        const child = this.children.get(id);
        if (!child) return false;
        child.locked = true;
        this.refreshChildEffectiveState(id);
        this.canvas.requestRenderAll();
        this.notify();
        return true;
    }

    unlock(id: string): boolean {
        const frame = this.frames.get(id);
        if (frame) {
            frame.locked = false;
            this.applyFrameInteractivity(frame);
            frame.childOrder.forEach((c) => this.refreshChildEffectiveState(c));
            this.canvas.requestRenderAll();
            this.notify();
            return true;
        }
        const child = this.children.get(id);
        if (!child) return false;
        child.locked = false;
        this.refreshChildEffectiveState(id);
        this.canvas.requestRenderAll();
        this.notify();
        return true;
    }

    // ---------- Ordering ----------
    // Child reorder is scoped to siblings within its own frame.
    // Frame reorder moves the whole frame block (frame + its children).

    private syncCanvasOrder(): void {
        const ordered: FabricObject[] = [];
        for (const frameId of this.frameOrder) {
            const frame = this.frames.get(frameId)!;
            ordered.push(frame.object);
            for (const childId of frame.childOrder) {
                ordered.push(this.children.get(childId)!.object);
            }
        }
        ordered.forEach((obj) => this.canvas.remove(obj));
        ordered.forEach((obj) => this.canvas.add(obj));
        this.canvas.requestRenderAll();
    }

    moveChildTo(childId: string, newIndex: number): boolean {
        const child = this.children.get(childId);
        if (!child) return false;
        const frame = this.frames.get(child.parentId);
        if (!frame) return false;

        const from = frame.childOrder.indexOf(childId);
        if (from === -1) return false;

        const clamped = Math.max(0, Math.min(newIndex, frame.childOrder.length - 1));
        frame.childOrder.splice(from, 1);
        frame.childOrder.splice(clamped, 0, childId);

        this.syncCanvasOrder();
        this.notify();

        this.selectLayers([childId]);
        return true;
    }

    moveChildUp(childId: string): boolean {
        const child = this.children.get(childId);
        const frame = child && this.frames.get(child.parentId);
        if (!child || !frame) return false;
        return this.moveChildTo(childId, frame.childOrder.indexOf(childId) + 1);
    }

    moveChildDown(childId: string): boolean {
        const child = this.children.get(childId);
        const frame = child && this.frames.get(child.parentId);
        if (!child || !frame) return false;
        return this.moveChildTo(childId, frame.childOrder.indexOf(childId) - 1);
    }

    moveFrameTo(frameId: string, newIndex: number): boolean {
        const from = this.frameOrder.indexOf(frameId);
        if (from === -1) return false;

        const clamped = Math.max(0, Math.min(newIndex, this.frameOrder.length - 1));
        this.frameOrder.splice(from, 1);
        this.frameOrder.splice(clamped, 0, frameId);

        this.syncCanvasOrder();
        this.notify();

        this.selectLayers([frameId]);
        return true;
    }

    moveFrameUp(frameId: string): boolean {
        return this.moveFrameTo(frameId, this.frameOrder.indexOf(frameId) + 1);
    }

    moveFrameDown(frameId: string): boolean {
        return this.moveFrameTo(frameId, this.frameOrder.indexOf(frameId) - 1);
    }

    // ---------- Resize reaction ----------

    /**
    * Call after resizing the canvas (canvas.setDimensions(...)); Fabric fires
    * no event for that. Clamps every frame back into the new usable area -
    * caps size if it no longer fits, repositions if out of bounds. Frames are
    * NOT rescaled proportionally to the new canvas size, just clamped.
    */
    handleCanvasResize(): void {
        this.canvasRealWidth = this.canvas.width - (this.padding.inlineStart + this.padding.inlineEnd);
        this.canvasRealHeight = this.canvas.height - (this.padding.blockStart + this.padding.blockEnd);

        for (const frame of this.frames.values()) {
            let clamped;
            if (frame.fillCanvas) {
                clamped = this.fullBounds();
            } else {
                const current = {
                    left: frame.object.left ?? 0,
                    top: frame.object.top ?? 0,
                    width: (frame.object.getScaledWidth() ?? 1),
                    height: (frame.object.getScaledHeight() ?? 1),
                };
                clamped = this.clampBounds(current);
            }

            // Express the clamped size via scaleX/scaleY on the unit path, same
            // convention used everywhere else in this class.
            frame.object.set({
                originX: 'left',
                originY: 'top',
                left: clamped.left,
                top: clamped.top,
                width: 1,
                height: 1,
                scaleX: clamped.width,
                scaleY: clamped.height,
            });
            frame.object.setCoords();
            this.syncClipShape(frame.id); // updates clip + notifies + re-renders per frame
        }

        this.syncCanvasOrder();
        this.notify();
    }

    /** Update padding insets and immediately reclamp all frames. */
    setPadding(padding: LayerManagerOptions['padding']): void {
        this.padding = {
            blockStart: padding?.blockStart ?? this.padding.blockStart,
            blockEnd: padding?.blockEnd ?? this.padding.blockEnd,
            inlineStart: padding?.inlineStart ?? this.padding.inlineStart,
            inlineEnd: padding?.inlineEnd ?? this.padding.inlineEnd,
        };
        this.handleCanvasResize();
    }

    // ---------- History (capture/restore for an external undo/redo manager) ----------
    // LayerManager has no undo stack itself. Not wired to notify()/subscribe(),
    // since that also fires on selection/focus changes, which aren't undoable.

    /** Serialize current state into plain data. Synchronous - only restore
     *  needs Fabric's async object enlivening. */
    captureSnapshot(): LayerManagerSnapshot {
        return {
            frameOrder: [...this.frameOrder],
            activeFrameId: this.activeFrameId,
            counter: this.counter,
            frameNameCounter: this.frameNameCounter,
            childNameCounter: this.childNameCounter,
            frames: [...this.frames.values()].map(f => ({
                id: f.id,
                name: f.name,
                visible: f.visible,
                locked: f.locked,
                childOrder: [...f.childOrder],
                objectData: f.object.toObject(['layerId', 'layerKind']),
                fillCanvas: f.fillCanvas,
            })),
            children: [...this.children.values()].map(c => ({
                id: c.id,
                name: c.name,
                parentId: c.parentId,
                visible: c.visible,
                locked: c.locked,
                objectData: c.object.toObject(['layerId', 'layerKind', 'qrConfig']),
            })),
        };
    }

    /** Restore a captured snapshot. Diffs against live state instead of
     *  rebuilding everything: existing ids get `.set()` with snapshot data
     *  (identity preserved), missing ids are recreated via Fabric's object
     *  enlivening. Selection/focus are always cleared, since they aren't
     *  part of what's captured.
     *
     *  UNVERIFIED: relies on fabric's `util.enlivenObjects` - not confirmed
     *  against this exact Fabric v7 build. Test the recreate-a-deleted-object
     *  path before relying on this.
     */
    async restoreSnapshot(snapshot: LayerManagerSnapshot): Promise<void> {
        const targetFrameIds = new Set(snapshot.frames.map(f => f.id));
        const targetChildIds = new Set(snapshot.children.map(c => c.id));

        // Drop anything live that isn't in the target state.
        for (const [id, frame] of [...this.frames]) {
            if (!targetFrameIds.has(id)) {
                this.canvas.remove(frame.object);
                this.frames.delete(id);
            }
        }
        for (const [id, child] of [...this.children]) {
            if (!targetChildIds.has(id)) {
                this.canvas.remove(child.object);
                this.children.delete(id);
            }
        }

        // Frames: update existing in place, recreate missing ones.
        for (const f of snapshot.frames) {
            const existing = this.frames.get(f.id);
            if (existing) {
                // `type` is getter-only on a live instance; toObject() includes
                // it, so .set() on an existing object must strip it or it throws.
                const { type: _frameType, ...frameUpdateData } = f.objectData;
                existing.object.set(frameUpdateData);
                existing.object.setCoords();
                // name is readonly at the type level; Object.assign bypasses that.
                // Only snapshot restore should do this.
                Object.assign(existing, { name: f.name });
                existing.visible = f.visible;
                existing.locked = f.locked;
                existing.childOrder = [...f.childOrder];
                existing.fillCanvas = f.fillCanvas;
            } else {
                const [object] = await util.enlivenObjects([f.objectData]);
                this.canvas.add(object as FabricObject);
                // clipShape is never serialized - regenerated here, same as createFrame.
                const clipShape = new Path(`M 0 0 H 1 V 1 H 0 Z`, { strokeWidth: 0 });
                clipShape.set({
                    originX: 'left',
                    originY: 'top',
                    left: (object as FabricObject).left,
                    top: (object as FabricObject).top,
                    width: 1,
                    height: 1,
                    scaleX: (object as FabricObject).scaleX,
                    scaleY: (object as FabricObject).scaleY,
                    absolutePositioned: true,
                });
                this.frames.set(f.id, {
                    kind: 'frame',
                    id: f.id,
                    name: f.name,
                    object: object as FabricObject,
                    clipShape,
                    visible: f.visible,
                    locked: f.locked,
                    childOrder: [...f.childOrder],
                    fillCanvas: f.fillCanvas,
                } satisfies FrameLayer);
            }
        }

        // Children: update existing in place, recreate missing ones.
        for (const c of snapshot.children) {
            const parentFrame = this.frames.get(c.parentId);
            const existing = this.children.get(c.id);
            if (existing) {
                const { type: _childType, ...childUpdateData } = c.objectData;
                // Refresh src when undoing a QR code change
                if (existing.object instanceof FabricImage && typeof childUpdateData.src === 'string'
                    && childUpdateData.src !== existing.object.getSrc()) {
                    await existing.object.setSrc(childUpdateData.src, { crossOrigin: 'anonymous' });
                }
                existing.object.set(childUpdateData);
                if (parentFrame) existing.object.clipPath = parentFrame.clipShape;
                existing.object.setCoords();
                Object.assign(existing, { name: c.name });
                existing.parentId = c.parentId;
                existing.visible = c.visible;
                existing.locked = c.locked;
            } else {
                const [object] = await util.enlivenObjects([c.objectData]);
                if (!object) {
                    console.error('Could not restore object:', c.objectData)
                    continue;
                }
                if (parentFrame) (object as FabricObject).clipPath = parentFrame.clipShape;
                this.canvas.add(object as FabricObject);
                this.children.set(c.id, {
                    kind: 'object',
                    id: c.id,
                    name: c.name,
                    object: object as FabricObject,
                    parentId: c.parentId,
                    visible: c.visible,
                    locked: c.locked,
                });
            }
        }

        this.frameOrder = [...snapshot.frameOrder];
        this.activeFrameId = this.frames.has(snapshot.activeFrameId)
            ? snapshot.activeFrameId
            : (this.frameOrder[this.frameOrder.length - 1] ?? '');
        this.counter = snapshot.counter;
        this.frameNameCounter = snapshot.frameNameCounter;
        this.childNameCounter = snapshot.childNameCounter;

        // Re-clip every frame's children fresh rather than tracking what changed.
        for (const frameId of this.frameOrder) this.syncClipShape(frameId);

        this.focusedScope = null;
        this.activeLayerIds = new Set();
        this.canvas.discardActiveObject();
        this.refreshAllChildInteractivity();
        for (const frame of this.frames.values()) this.applyFrameInteractivity(frame);

        this.syncCanvasOrder();
        this.canvas.requestRenderAll();
        this.notify();
    }

    // ---------- Transform read/write (for property-panel inputs) ----------

    /** Snapshot of a layer's geometry for X/Y/Width/Height/Rotation inputs.
     *  `rotatable` is false for frames - disable the rotation input then. */
    getTransform(
        id: string,
    ): Required<ObjectPropsPatch> | Required<FramePropsPatch> | null {
        const frame = this.frames.get(id);
        if (frame) {
            return {
                kind: frame.object.layerKind!,
                left: frame.object.left ?? 0,
                top: frame.object.top ?? 0,
                width: frame.object.getScaledWidth(),
                height: frame.object.getScaledHeight(),
                angle: 0,
                opacity: frame.object.opacity ?? 1,
                rotatable: false,
                fillCanvas: frame.fillCanvas,
            };
        }
        const child = this.children.get(id);
        if (!child) return null;
        return {
            kind: child.object.layerKind!,
            left: child.object.left ?? 0,
            top: child.object.top ?? 0,
            width: child.object.getScaledWidth(),
            height: child.object.getScaledHeight(),
            angle: child.object.angle ?? 0,
            opacity: child.object.opacity ?? 1,
            rotatable: true,
        };
    }

    /** Apply a property-panel edit to a layer's transform. Omitted fields are
     *  left untouched. Uses the same clamp/round logic as a canvas drag, so a
     *  typed value is never less constrained than a mouse edit.
     *
     *  Frames: clamped to the usable area, `angle` silently ignored (frames
     *  are axis-aligned - hide the rotation input in the panel for frames).
     *  Children: unclamped, rounded to whole pixels, `angle` applied directly.
     */
    updateTransform(
        id: string,
        patch: ObjectPropsPatch | FramePropsPatch,
    ): boolean {
        const frame = this.frames.get(id);
        if (frame) {
            const framePatch = patch as FramePropsPatch;
            if (framePatch.fillCanvas !== undefined) {
                frame.fillCanvas = framePatch.fillCanvas ?? false;
            }

            const obj = frame.object;
            if (patch.left !== undefined) obj.set({ left: patch.left });
            if (patch.top !== undefined) obj.set({ top: patch.top });
            // Frame width/height is expressed via scaleX/scaleY against a fixed 1x1
            // base path (see class doc) - setting scale directly IS setting pixel size.
            if (patch.width !== undefined) obj.set({ scaleX: Math.max(patch.width, 1) });
            if (patch.height !== undefined) obj.set({ scaleY: Math.max(patch.height, 1) });
            if (patch.opacity !== undefined) obj.set({ opacity: Math.min(Math.max(patch.opacity, 0), 1) });
            // No corner passed: a typed value has no anchored opposite edge,
            // so clampFrameBounds just clamps left/top in place.

            if (frame.fillCanvas) {
                obj.left = 0;
                obj.top = 0;
                obj.scaleX = this.canvasRealWidth;
                obj.scaleY = this.canvasRealHeight;
                obj.setCoords();
                this.applyFrameInteractivity(frame);
            } else {
                this.clampFrameBounds(obj);
            }
            this.syncClipShape(frame.id); // re-clips children, notifies, re-renders

            // reselect frame
            this.canvas.discardActiveObject();
            this.selectLayers([id]);
            return true;
        }

        const child = this.children.get(id);
        if (!child) return false;
        const obj = child.object;
        if (patch.left !== undefined) obj.set({ left: patch.left });
        if (patch.top !== undefined) obj.set({ top: patch.top });
        if (patch.width !== undefined) {
            const baseWidth = obj.width ?? 1;
            obj.set({ scaleX: baseWidth > 0 ? Math.max(patch.width, 1) / baseWidth : 1 });
        }
        if (patch.height !== undefined) {
            const baseHeight = obj.height ?? 1;
            obj.set({ scaleY: baseHeight > 0 ? Math.max(patch.height, 1) / baseHeight : 1 });
        }
        if (patch.opacity !== undefined) obj.set({ opacity: Math.min(Math.max(patch.opacity, 0), 1) });
        if (patch.angle !== undefined) {
            // Rotate around center point instead of originX/Y (top-left)
            const center = obj.getCenterPoint();
            obj.set({ angle: patch.angle });
            obj.setPositionByOrigin(center, 'center', 'center');
        }

        this.roundObjectBounds(obj); // rounds, re-sets coords, notifies - doesn't render
        this.canvas.requestRenderAll();
        return true;
    }

    // ---------- Shape style (fill/border) - children only ----------

    getShapeStyle(id: string): ShapeStylePatch | null {
        const child = this.children.get(id);
        if (!child) return null; // includes frames: frames aren't in this.children
        const obj = child.object;
        return {
            fill: typeof obj.fill === 'string' ? obj.fill : undefined,
            stroke: typeof obj.stroke === 'string' ? obj.stroke : undefined,
            strokeWidth: obj.strokeWidth,
            strokeDashArray: obj.strokeDashArray ?? null,
        };
    }

    getImageStyle(id: string): ImageStylesPatch | null {
        const child = this.children.get(id);
        if (!child) return null; // includes frames: frames aren't in this.children
        const obj = child.object as FabricImage;
        return {
            imageSmoothing: obj.imageSmoothing || false,
        };
    }

    // ---------- Text style (font/content) - IText/Textbox children only ----------

    getTextStyle(id: string): TextStylePatch | null {
        const child = this.children.get(id);
        if (!child) return null;
        const obj = child.object;
        if (!(obj instanceof IText) && !(obj instanceof Textbox)) return null;
        return {
            text: obj.text,
            fontFamily: obj.fontFamily,
            fontSize: obj.fontSize,
            fontWeight: obj.fontWeight,
            fontStyle: obj.fontStyle,
            fill: typeof obj.fill === 'string' ? obj.fill : undefined,
            backgroundColor: typeof obj.backgroundColor === 'string' ? obj.backgroundColor : undefined,
            textAlign: obj.textAlign,
            underline: obj.underline,
            linethrough: obj.linethrough,
        };
    }

    updateObject(id: string, patch: ImageStylesPatch | ShapeStylePatch | TextStylePatch): boolean {
        const child = this.children.get(id);
        if (!child) return false;
        const obj = child.object;
        obj.set(patch);

        if (obj instanceof IText || obj instanceof Textbox) {
            obj.initDimensions?.();  // recompute dimensions
        }
        obj.setCoords();

        this.canvas.requestRenderAll();
        this.notify();
        return true;
    }

    /** The frame that actually owns `obj` */
    private resolveContainerFrame(obj: FabricObject): FrameLayer | undefined {
        if (obj.layerKind === 'frame' && obj.layerId) {
            return this.frames.get(obj.layerId);
        }
        const child = obj.layerId ? this.children.get(obj.layerId) : undefined;
        if (child) {
            return this.frames.get(child.parentId);
        }
        return this.frames.get(this.activeFrameId);
    }

    alignObjects(alignments: ObjectAlignment[]) {
        const activeObject = this.canvas.getActiveObject();
        if (!activeObject) {
            return;
        }
        const frame = this.resolveContainerFrame(activeObject);
        if (!frame) {
            return;
        }

        const isFrame = activeObject.layerKind === 'frame';

        // getBoundingRect() accounts for rotation (visual footprint); left/top
        // don't. Convert via a fixed offset so the target matches what's on
        // screen. Frames are lockRotation, so the offset is (0,0) for them.
        const bbox = activeObject.getBoundingRect();
        const offsetLeft = (activeObject.left ?? 0) - bbox.left;
        const offsetTop = (activeObject.top ?? 0) - bbox.top;

        let coords: Partial<Record<'left' | 'top', number>> = {};
        alignments.forEach(alignment => {
            switch (alignment) {
                case 'h-left': {
                    const targetBboxLeft = isFrame ? 0 : (frame.object.left ?? 0);
                    coords.left = targetBboxLeft + offsetLeft;
                    break;
                }
                case 'h-center': {
                    const containerLeft = isFrame ? 0 : (frame.object.left ?? 0);
                    const containerWidth = isFrame ? this.canvasRealWidth : frame.object.getScaledWidth();
                    coords.left = containerLeft + (containerWidth - bbox.width) / 2 + offsetLeft;
                    break;
                }
                case 'h-right': {
                    const containerLeft = isFrame ? 0 : (frame.object.left ?? 0);
                    const containerWidth = isFrame ? this.canvasRealWidth : frame.object.getScaledWidth();
                    coords.left = containerLeft + containerWidth - bbox.width + offsetLeft;
                    break;
                }
                case 'v-top': {
                    const targetBboxTop = isFrame ? 0 : (frame.object.top ?? 0);
                    coords.top = targetBboxTop + offsetTop;
                    break;
                }
                case 'v-middle': {
                    const containerTop = isFrame ? 0 : (frame.object.top ?? 0);
                    const containerHeight = isFrame ? this.canvasRealHeight : frame.object.getScaledHeight();
                    coords.top = containerTop + (containerHeight - bbox.height) / 2 + offsetTop;
                    break;
                }
                case 'v-bottom': {
                    const containerTop = isFrame ? 0 : (frame.object.top ?? 0);
                    const containerHeight = isFrame ? this.canvasRealHeight : frame.object.getScaledHeight();
                    coords.top = containerTop + containerHeight - bbox.height + offsetTop;
                    break;
                }
                default:
                    return;
            }
        });

        activeObject.set(coords).setCoords();
        this.onObjectModified({ target: activeObject });
        this.canvas.requestRenderAll();
	}

    scaleObjects(type: ObjectScaleType) {
        const activeObject = this.canvas.getActiveObject();
        if (!activeObject) {
            return;
        }
        const frame = this.resolveContainerFrame(activeObject);
        if (!frame) {
            return;
        }

        if (activeObject.layerKind === 'frame' && frame.fillCanvas) {
            return;
        }

        if (activeObject.layerKind !== 'frame' && type === 'original-size') {
            activeObject.set({ scaleX: 1, scaleY: 1 });
            activeObject.setCoords();
            this.alignObjects(['h-center', 'v-middle']);
            this.onObjectModified({ target: activeObject });
            this.canvas.requestRenderAll();
            return;
        }

        const isFrame = activeObject.layerKind === 'frame';
        const targetWidth = isFrame ? this.canvasRealWidth : frame.object.getScaledWidth();
        const targetHeight = isFrame ? this.canvasRealHeight : frame.object.getScaledHeight();

        const bbox = activeObject.getBoundingRect();
        const currentScaleX = activeObject.scaleX ?? 1;
        const currentScaleY = activeObject.scaleY ?? 1;

        let factor: number | null = null;
        if (type === 'fit-width' && bbox.width > 0) {
            factor = targetWidth / bbox.width;
        } else if (type === 'fit-height' && bbox.height > 0) {
            factor = targetHeight / bbox.height;
        } else if (type === 'fit-both' && bbox.width > 0 && bbox.height > 0) {
            // Contain-fit: tighter ratio, so it fits both axes, aspect preserved.
            factor = Math.min(targetWidth / bbox.width, targetHeight / bbox.height);
        }

        if (factor !== null) {
            activeObject.set({ scaleX: currentScaleX * factor, scaleY: currentScaleY * factor });
            activeObject.setCoords();
        }

        this.alignObjects(['h-center', 'v-middle']);
        this.onObjectModified({ target: activeObject });
        this.canvas.requestRenderAll();
    }
}

export default LayerManager;
