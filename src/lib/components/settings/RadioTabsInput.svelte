<script lang="ts">
let {
    id,
    label,
    radioTabs,
    value = $bindable(),
    equally = false,
    onchange,
    disabled,
    visible,
    class: className,
}: {
    id?: string;
    label: string;
    radioTabs: Record<string, string>;
    value: string;
    equally?: boolean;
    onchange?: (value: string) => void,
    disabled?: boolean | (() => boolean);
    visible?: boolean | (() => boolean);
    class?: string;
} = $props();

const uid = $props.id();

let isDisabled = $derived(typeof disabled === 'boolean' ? disabled : disabled ? disabled() : false);
let isVisible = $derived(typeof visible === 'boolean' ? visible : visible ? visible() : true);
</script>

<div class={className ?? ''} class:hidden={!isVisible}>
    <div class="setting-label flex-1 mb-1">{label}</div>
    <div class="tabs tabs-box gap-1">
        {#each Object.entries(radioTabs) as [tabValue, tabName]}
            <input
                bind:group={value}
                type="radio"
                name={(id ?? uid) + '-input'}
                class="tab border-2 border-white grow shrink"
                class:flex-1={equally}
                onchange={e => onchange && onchange(tabValue)}
                disabled={isDisabled}
                aria-label={tabName}
                value={tabValue}
            />
        {/each}
    </div>
</div>
