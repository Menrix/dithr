/**
 * CanvasHistoryManager - undo/redo for LayerManager
 */

import { FabricImage, type Canvas } from 'fabric';
import type { LayerManager, LayerManagerSnapshot } from './LayerManager';
import { blobRegistry } from './BlobRegistry';
import type { Options } from 'qr-code-styling';

const DEFAULT_MAX_DEPTH = 20;

export interface CanvasHistoryManagerOptions {
    // Max undo entries retained
    maxDepth?: number;
}

export class CanvasHistoryManager {
    private layerManager: LayerManager;
    private maxDepth: number;

    private undoStack: LayerManagerSnapshot[] = [];
    private redoStack: LayerManagerSnapshot[] = [];
    private listeners = new Set<() => void>();

    // Captured once at construction: the state as of "nothing undoable has
    // happened yet." Restoring past the last undo entry lands here, not on
    // nothing - there is always a valid floor state.
    private baseline: LayerManagerSnapshot;

    constructor(layerManager: LayerManager, options: CanvasHistoryManagerOptions = {}) {
        this.layerManager = layerManager;
        this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
        this.baseline = layerManager.captureSnapshot();
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
                console.error('CanvasHistoryManager listener error:', err);
            }
        }
    }

    initCanvas(canvas: Canvas) {
        const result = this.layerManager.initCanvas(canvas);
        if (result) {
            canvas.on('object:modified', () => this.checkpoint());
            this.layerManager.createFullFrame(true);
        }

        this.layerManager.handleCanvasResize();

        // Don't call checkpoint when switching device
        if (result) {
            this.checkpoint();
        }
    }

    canUndo(): boolean {
        // First checkpoint is frame creation -> don't allow undo
        return this.undoStack.length > 1;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    private pruneActiveReferences(set: Set<string>, stack: LayerManagerSnapshot[]) {
        for (const item of stack) {
            for (const child of item.children) {
                const { src, type } = child.objectData;
                if (type === 'Image' && (src as string)?.startsWith('blob:')) {
                    set.delete(src as string);
                }
            }
        }
    }

    private cleanupSnapshot(snapshot: LayerManagerSnapshot) {
        const toRemove: Set<string> = new Set();

        // Find images with blob src from removed snapshot
        for (const child of snapshot.children) {
            const { src, type } = child.objectData;
            // Check if it's image with blob src
            if (type === 'Image' && (src as string)?.startsWith('blob:')) {
                toRemove.add(src as string);
            }
        }

        this.pruneActiveReferences(toRemove, this.undoStack);

        for (const url of toRemove) {
            blobRegistry.revoke(url);
        }
    }

    /** Call after a mutation completes to record a checkpoint.
     *  Any new checkpoint clears the redo stack.
     */
    private checkpoint(): void {
        this.undoStack.push(this.layerManager.captureSnapshot());
        if (this.undoStack.length > this.maxDepth) {
            const removed = this.undoStack.shift();
            if (removed) {
                // Remove image blob from registry
                this.cleanupSnapshot(removed);
            }
        }

        this.redoStack = [];
        this.notify();
    }

    async undo(): Promise<void> {
        if (!this.canUndo()) return;

        // The entry on top of undoStack is the state we're undoing AWAY from -
        // push it to redo before popping, so redo can bring it back.
        const current = this.undoStack.pop()!;
        this.redoStack.push(current);
        const target = this.undoStack[this.undoStack.length - 1] ?? this.baseline;
        await this.layerManager.restoreSnapshot(target);
        this.notify();
    }

    async redo(): Promise<void> {
        if (!this.canRedo()) return;

        const target = this.redoStack.pop()!;
        this.undoStack.push(target);
        await this.layerManager.restoreSnapshot(target);
        this.notify();
    }

    /** Reset history entirely, re-baselining on the manager's current state.
     *  Use if you ever load a new document into the same LayerManager instance -
     *  otherwise old undo entries would try to restore state from a previous document. */
    reset(): void {
        // TODO: clean snapshots
        this.undoStack = [];
        this.redoStack = [];
        this.baseline = this.layerManager.captureSnapshot();
        this.notify();
    }

    createFrame(bounds: { left: number; top: number; width: number; height: number }): string {
        const id = this.layerManager.createFrame(bounds);
        this.checkpoint();
        return id;
    }

    removeFrame(frameId: string): boolean {
        const result = this.layerManager.removeFrame(frameId);
        if (result) this.checkpoint();
        return result;
    }

    removeChild(childId: string): boolean {
        const result = this.layerManager.removeChild(childId);
        if (result) this.checkpoint();
        return result;
    }

    addObject(fabricObject: Parameters<LayerManager['addObject']>[0]): string {
        const id = this.layerManager.addObject(fabricObject);
        this.checkpoint();
        return id;
    }

    async addText(...args: Parameters<LayerManager['addText']>): Promise<string> {
        const id = await this.layerManager.addText(...args);
        this.checkpoint();
        return id;
    }

    addRect(...args: Parameters<LayerManager['addRect']>): string {
        const id = this.layerManager.addRect(...args);
        this.checkpoint();
        return id;
    }

    addCircle(...args: Parameters<LayerManager['addCircle']>): string {
        const id = this.layerManager.addCircle(...args);
        this.checkpoint();
        return id;
    }

    addTriangle(...args: Parameters<LayerManager['addTriangle']>): string {
        const id = this.layerManager.addTriangle(...args);
        this.checkpoint();
        return id;
    }

    async addQrCode(blob: Blob, config: Partial<Options>): Promise<string> {
        const url = blobRegistry.create(blob);
        const id = await this.layerManager.addQrCode(url, config);
        this.checkpoint();
        return id;
    }

    async updateQrCode(childId: string, blob: Blob, config: Partial<Options>, resetScaling: boolean = false): Promise<boolean> {
        const url = blobRegistry.create(blob);
        const result = await this.layerManager.updateQrCode(childId, url, config, resetScaling);
        if (result) {
            this.checkpoint();
        } else {
            blobRegistry.revoke(url);
        }

        return result;
    }

    show(id: string): boolean {
        const result = this.layerManager.show(id);
        if (result) this.checkpoint();
        return result;
    }

    hide(id: string): boolean {
        const result = this.layerManager.hide(id);
        if (result) this.checkpoint();
        return result;
    }

    toggle(id: string): boolean {
        const result = this.layerManager.toggle(id);
        this.checkpoint();
        return result;
    }

    lock(id: string): boolean {
        const result = this.layerManager.lock(id);
        if (result) this.checkpoint();
        return result;
    }

    unlock(id: string): boolean {
        const result = this.layerManager.unlock(id);
        if (result) this.checkpoint();
        return result;
    }

    moveChildTo(childId: string, newIndex: number): boolean {
        const result = this.layerManager.moveChildTo(childId, newIndex);
        if (result) this.checkpoint();
        return result;
    }

    moveChildUp(childId: string): boolean {
        const result = this.layerManager.moveChildUp(childId);
        if (result) this.checkpoint();
        return result;
    }

    moveChildDown(childId: string): boolean {
        const result = this.layerManager.moveChildDown(childId);
        if (result) this.checkpoint();
        return result;
    }

    moveFrameTo(frameId: string, newIndex: number): boolean {
        const result = this.layerManager.moveFrameTo(frameId, newIndex);
        if (result) this.checkpoint();
        return result;
    }

    moveFrameUp(frameId: string): boolean {
        const result = this.layerManager.moveFrameUp(frameId);
        if (result) this.checkpoint();
        return result;
    }

    moveFrameDown(frameId: string): boolean {
        const result = this.layerManager.moveFrameDown(frameId);
        if (result) this.checkpoint();
        return result;
    }

    updateTransform(id: string, patch: Parameters<LayerManager['updateTransform']>[1]): boolean {
        const result = this.layerManager.updateTransform(id, patch);
        if (result) this.checkpoint();
        return result;
    }

    updateObject(id: string, patch: Parameters<LayerManager['updateObject']>[1]): boolean {
        const result = this.layerManager.updateObject(id, patch);
        if (result) this.checkpoint();
        return result;
    }

    alignObjects(alignments: Parameters<LayerManager['alignObjects']>[0]): void {
        this.layerManager.alignObjects(alignments);
        this.checkpoint();
    }

    scaleObjects(type: Parameters<LayerManager['scaleObjects']>[0]): void {
        this.layerManager.scaleObjects(type);
        this.checkpoint();
    }
}
