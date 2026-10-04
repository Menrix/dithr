<script lang="ts">

let {
    id,
    label,
    checked = $bindable(false),
    onchange,
    disabled,
    visible,
    class: className,
}: {
    id?: string;
    label?: string;
    checked: boolean;
    onchange: (value: boolean) => void,
    disabled?: boolean | (() => boolean);
    visible?: boolean | (() => boolean);
    class?: string;
} = $props();

const uid = $props.id();

let isDisabled = $derived(typeof disabled === 'boolean' ? disabled : disabled ? disabled() : false);
let isVisible = $derived(typeof visible === 'boolean' ? visible : visible ? visible() : true);
</script>

<div class={`flex text-xs mt-1 mb-1 ` + (className ?? '')} class:hidden={!isVisible}>
    {#if label}
        <label class="setting-label flex-1" for={(id ?? uid) + '-cbx'}>{label}</label>
    {/if}
    <input
        bind:checked={checked}
        onchange={e => onchange(checked)}
        id={(id ?? uid) + '-cbx'}
        name={(id ?? uid) + '-cbx'}
        type="checkbox"
        class="toggle"
        disabled={isDisabled}
        />
</div>
