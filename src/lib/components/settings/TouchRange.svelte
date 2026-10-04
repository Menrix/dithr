<script lang="ts">
let {
    defaultValue,
    value = $bindable(50),
    min = 0,
    max = 100,
    step = 1,
    id = undefined,
    oninput = undefined,
    onchange = undefined,
    disabled = false,
    delay = 100,  // Delay in ms to confirm intent
    coloredState = true,
}: {
    defaultValue?: number;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    id?: string;
    delay?: number;
    disabled?: boolean;
    oninput?: (value: number) => void;
    onchange?: (value: number) => void;
    coloredState?: boolean;
} = $props();

let increased = $derived(typeof defaultValue !== 'undefined' ? value > defaultValue : false);
let decreased = $derived(typeof defaultValue !== 'undefined' ? value < defaultValue : false);

let startX = 0;
let startY = 0;
let initialValue = value;

let interactionStarted = $state(false);
let isScrollingY = false;
let delayPassed = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function handlePointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse') {
        interactionStarted = false;
        isScrollingY = false;
        timer && clearTimeout(timer);

        if (e.button === 0) {
            delayPassed = true;
        }
        return;
    }

    startX = e.clientX;
    startY = e.clientY;
    initialValue = value; // Freeze the value before any movement occurs
    isScrollingY = false;
    delayPassed = false;
    interactionStarted = true;

    timer && clearTimeout(timer);

    timer = setTimeout(() => {
        if (!isScrollingY) {
            delayPassed = true; // Timer finished without vertical scroll: Lock in changes
        }
    }, delay);
}

function handleKeyDown() {
    // Keyboard has no scroll ambiguity to guard against; unlock immediately
    delayPassed = true;
    isScrollingY = false;
}

function handleNativeInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const nextValue = parseFloat(target.value);

    // If a vertical scroll was detected, reject the input mutation immediately
    if (isScrollingY) {
        target.value = initialValue.toString();
        return;
    }

    // If the delay period has not passed, hold the value at its baseline state
    if (!delayPassed) {
        target.value = initialValue.toString();
        return;
    }

    // Delay passed and no scrolling occurred: Apply mutation and notify parent
    if (value !== nextValue) {
        value = nextValue;
        oninput && oninput(value);
    }
}

function handleGlobalPointerMove(e: PointerEvent) {
    const deltaX = Math.abs(e.clientX - startX);
    const deltaY = Math.abs(e.clientY - startY);

    // Determine if the movement vector is primarily vertical
    if (!delayPassed && deltaY > deltaX && deltaY > 5) {
        isScrollingY = true;
        interactionStarted = false;
        value = initialValue; // Revert state completely
        timer && clearTimeout(timer);
    }
}

function handleGlobalPointerUp() {
    interactionStarted = false;
    timer && clearTimeout(timer);
}

$effect(() => {
    if (!interactionStarted) {
        return;
    }

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
});
</script>

<style>
@reference "tailwindcss";

.range-container {
    /* Allows vertical gestures to pass through to container layout natively */
    @apply relative w-full box-border touch-pan-y;
    padding: 0.5rem 0 0;
}

input[type="range"] {
    @apply block w-full m-0 select-none;
    background: #373737;
    border-top: 2px solid #2e2e2e;
}
</style>


<div class="range-container">
    <input
        {id}
        type="range"
        class="dithr-range"
        class:range-increased={coloredState && increased}
        class:range-decreased={coloredState && decreased}
        disabled={disabled}
        {min}
        {max}
        {step}
        value={value}
        oninput={handleNativeInput}
        onchange={() => onchange?.(value)}
        onpointerdown={handlePointerDown}
        onkeydown={handleKeyDown}
        style:--min={min}
        style:--max={max}
        style:--default={typeof defaultValue !== 'undefined' ? defaultValue : min - 100}
    />
</div>
