<script lang="ts">
import { portal } from "svelte-portal";
let {
    wrapper = $bindable(),
    isOpen = $bindable(false),
    isDialog,
    children,
}: {
    wrapper: any;
    isOpen: boolean;
    isDialog: Boolean;
    children: any;
} = $props();
</script>

<style>
@reference "tailwindcss";
.is-open {
    @apply block;
}

</style>

<div
    use:portal={".color-picker-portal"}
    bind:this={wrapper}
    class="color-picker-wrapper"
    class:is-open={isOpen}
    role={isDialog ? 'dialog' : undefined}
    aria-label="color picker"
    >
    {@render children()}
</div>
