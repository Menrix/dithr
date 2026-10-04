<script lang="ts">
import type { HTMLInputAttributes } from "svelte/elements";

type Props = {
    value: HTMLInputAttributes['value'];
    tabindex?: 0 | -1;
    class?: HTMLInputAttributes['class'];
    onfocus?: HTMLInputAttributes['onfocus'];
    disabled?: HTMLInputAttributes['disabled'];
    visible?: boolean;
    min?: HTMLInputAttributes['min'];
    oncommit?: (value: any) => void;
} & ({
    type: 'text';
} | {
    type: 'number';
});

let {
    type,
    tabindex,
    value = $bindable(''),
    onfocus,
    oncommit,
    disabled,
    visible = true,
    class: className,

    // number only
    min,
}: Props = $props();

let input: HTMLInputElement;
// svelte-ignore state_referenced_locally
let lastValue: string | number = type === 'number' ? Math.round(value) : value;

function onKeyDown(e: KeyboardEvent) {
    const key = e.key;

    if (key === 'Enter') {
        // Enter = blur input
        input.blur();
    } else if (key === 'Escape') {
        // Escape = restore back to the previous value
        value = lastValue;
        input.blur();
    }
}

function onBlur(e: Event) {
    if (!oncommit) {
        return;
    }

    if (lastValue !== value) {
        if (type === 'number') {
            oncommit(parseFloat(value));
        } else {
            oncommit(value);
        }
    }
}
</script>

<style>
@reference "tailwindcss";

input {
    @apply flex-1 w-0 px-1.5 py-1 text-xs rounded-none;
    background: #282828;
    color: #c6c6c6;
    border: 2px solid #3c3c3c;
    outline: 2px solid black;
}

input:focus {
    outline: none;
    border-color: #c6c6c6;
}

input:disabled {
    cursor: not-allowed;
}
</style>

<input
    bind:this={input}
    // bind:value={() => type === 'number' ? Math.round(value) : value, v => type === 'number' ? value = Math.round(v) : v}
    bind:value={value}
    {type}
    {tabindex}
    {disabled}
    {min}
    class={className}
    onfocus={e => { lastValue = value; onfocus?.(e) }}
    onblur={onBlur}
    onkeydown={onKeyDown}
    class:hidden={!visible}
    />
