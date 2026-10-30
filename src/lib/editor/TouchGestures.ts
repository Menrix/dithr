/**
 * Two-finger gestures for the editor on phones/tablets:
 * pinch to scale and twist to rotate the selected object (image, text, shape).
 *
 * Fabric.js (v6+) has no built-in pinch/rotate, so we listen to the touch
 * events ourselves (Fabric itself uses touch events too). While two fingers are down we block Fabric's own drag
 * handling, and when the gesture ends we fire `object:modified` so undo/redo
 * records it like any other change.
 */
import type { Canvas, FabricObject, Point } from 'fabric';

type Gesture = {
    target: FabricObject;
    startDistance: number;
    startAngle: number;
    startScaleX: number;
    startScaleY: number;
    startObjectAngle: number;
    center: Point;
};

export function enableTouchGestures(canvas: Canvas): () => void {
    let gesture: Gesture | null = null;
    const area = canvas.wrapperEl;

    const fingerInfo = (e: TouchEvent) => {
        const a = e.touches[0];
        const b = e.touches[1];
        const dx = b.clientX - a.clientX;
        const dy = b.clientY - a.clientY;
        return { distance: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) * 180 / Math.PI };
    };

    const findTarget = (e: TouchEvent): FabricObject | undefined => {
        // Use the selected object; if nothing is selected, the one under the first finger
        const active = canvas.getActiveObject() as FabricObject | undefined;
        if (active) return active;
        const first = e.touches[0];
        const point = canvas.getScenePoint({ clientX: first.clientX, clientY: first.clientY } as unknown as PointerEvent);
        const hit = canvas.getObjects().slice().reverse().find(o =>
            o.selectable !== false && o.evented !== false && !(o as any).isWorkspace && o.containsPoint(point),
        );
        if (hit) canvas.setActiveObject(hit);
        return hit;
    };

    const onStart = (e: TouchEvent) => {
        if (e.touches.length !== 2 || !area.contains(e.touches[0].target as Node)) return;
        const target = findTarget(e);
        if (!target || target.lockScalingX || target.lockRotation) return;

        const { distance, angle } = fingerInfo(e);
        if (distance < 10) return;

        gesture = {
            target,
            startDistance: distance,
            startAngle: angle,
            startScaleX: target.scaleX ?? 1,
            startScaleY: target.scaleY ?? 1,
            startObjectAngle: target.angle ?? 0,
            center: target.getCenterPoint(),
        };
        // Stop the drag Fabric started with the first finger
        (canvas as any)._currentTransform = null;
        e.stopImmediatePropagation();
        e.preventDefault();
    };

    const onMove = (e: TouchEvent) => {
        if (!gesture) return;
        // Fabric must not also drag the object, and the page must not zoom
        e.stopImmediatePropagation();
        e.preventDefault();
        if (e.touches.length < 2) return;

        const { distance, angle } = fingerInfo(e);
        const factor = distance / gesture.startDistance;
        const t = gesture.target;
        const minScale = 0.02;

        t.set({
            scaleX: Math.max(minScale, gesture.startScaleX * factor),
            scaleY: Math.max(minScale, gesture.startScaleY * factor),
            angle: gesture.startObjectAngle + (angle - gesture.startAngle),
        });
        // Scale/rotate around the object's center, so it doesn't jump away
        t.setPositionByOrigin(gesture.center, 'center', 'center');
        t.setCoords();
        canvas.requestRenderAll();
    };

    const onEnd = (e: TouchEvent) => {
        if (!gesture || e.touches.length >= 2) return;
        const target = gesture.target;
        gesture = null;
        (canvas as any)._currentTransform = null; // remaining finger must not start a jumpy drag
        // Let Fabric see touchend (it cleans up its own listeners), then record for undo/redo
        canvas.fire('object:modified', { target } as any);
        canvas.requestRenderAll();
    };

    // Capture phase on window: runs before Fabric's own listeners (on the canvas and document)
    const opts = { capture: true, passive: false } as AddEventListenerOptions;
    window.addEventListener('touchstart', onStart, opts);
    window.addEventListener('touchmove', onMove, opts);
    window.addEventListener('touchend', onEnd, opts);
    window.addEventListener('touchcancel', onEnd, opts);

    return () => {
        window.removeEventListener('touchstart', onStart, opts);
        window.removeEventListener('touchmove', onMove, opts);
        window.removeEventListener('touchend', onEnd, opts);
        window.removeEventListener('touchcancel', onEnd, opts);
    };
}

/** Bigger, finger-friendly corner handles on touch screens. */
export function useTouchFriendlyControls(FabricObjectClass: { ownDefaults: Record<string, unknown> }) {
    if (typeof matchMedia === 'undefined' || !matchMedia('(pointer: coarse)').matches) return;
    FabricObjectClass.ownDefaults.cornerSize = 22;
    FabricObjectClass.ownDefaults.touchCornerSize = 44;
    FabricObjectClass.ownDefaults.padding = 4;
}

let baseControlSizes: { cornerSize: number; touchCornerSize: number; padding: number } | null = null;

/**
 * DITHR zooms the canvas with CSS, which also shrinks/grows the corner handles.
 * Counter that: draw handles bigger when zoomed out and smaller when zoomed in,
 * so they keep the same size on screen.
 */
export function keepControlSizeOnZoom(
    canvas: Canvas,
    FabricObjectClass: { ownDefaults: Record<string, unknown> },
    zoomFactor: number,
) {
    const d = FabricObjectClass.ownDefaults;
    if (!baseControlSizes) {
        baseControlSizes = {
            cornerSize: Number(d.cornerSize ?? 13),
            touchCornerSize: Number(d.touchCornerSize ?? 24),
            padding: Number(d.padding ?? 0),
        };
    }
    const z = zoomFactor > 0 ? zoomFactor : 1;
    const sizes = {
        cornerSize: baseControlSizes.cornerSize / z,
        touchCornerSize: baseControlSizes.touchCornerSize / z,
        padding: baseControlSizes.padding / z,
        borderScaleFactor: 1 / z,
    };
    Object.assign(d, sizes);
    for (const obj of canvas.getObjects()) {
        obj.set(sizes);
        obj.setCoords();
    }
    canvas.requestRenderAll();
}

