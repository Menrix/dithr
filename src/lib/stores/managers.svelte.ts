import { CanvasHistoryManager } from "$lib/editor/CanvasHistoryManager";
import LayerManager from "$lib/editor/LayerManager";
import { EDITOR_CANVAS_PADDING } from "$lib/shared";

export const layerManager = $state(new LayerManager({
    padding: {
        blockStart: EDITOR_CANVAS_PADDING,
        blockEnd: EDITOR_CANVAS_PADDING,
        inlineStart: EDITOR_CANVAS_PADDING,
        inlineEnd: EDITOR_CANVAS_PADDING,
    },
}));

export const canvasHistoryManager = $state(new CanvasHistoryManager(layerManager));
canvasHistoryManager.subscribe(() => {
  console.log('undo stack:', (canvasHistoryManager as any).undoStack?.length, 'redo stack:', (canvasHistoryManager as any).redoStack?.length);
});
