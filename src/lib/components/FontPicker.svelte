<script lang="ts">
	import { blurActive } from "$lib/utils";

const FONTS = {
    'Noto Sans Variable': 'Noto Sans',
    // 'Noto Sans JP Variable': 'Noto Sans JP',
    // 'Noto Sans KR Variable': 'Noto Sans KR',
    // 'Noto Sans SC Variable': 'Noto Sans ZH-CN',
    // 'Noto Sans TC Variable': 'Noto Sans ZH-HK',

    'Noto Serif Variable': 'Noto Serif',
    // 'Noto Serif JP Variable': 'Noto Serif JP',
    // 'Noto Serif KR Variable': 'Noto Serif KR',
    // 'Noto Serif SC Variable': 'Noto Serif ZH-CN',
    // 'Noto Serif TC Variable': 'Noto Serif ZH-HK',

    'JetBrains Mono Variable': 'JetBrains Mono',
} satisfies Record<string, string>;

let {
    font = $bindable('JetBrains Mono Variable'),
    class: className,
    onchange,
}: {
    font: keyof typeof FONTS;
    class?: string;
    onchange: (value: string) => void;
} = $props();

function selectFont(name: keyof typeof FONTS) {
    font = name;
    onchange(font);
}
</script>

<style>
@reference "tailwindcss";
</style>

<p>Font</p>
<div class={'w-full dropdown dithr-dropdown ' + (className ?? '')}>
    <div class="btn w-full text-lg" role="button" tabindex="-1" style={`font-family: "${font}"`}>
        {FONTS[font]}
    </div>

    <div tabindex="-1" class="m-0 mt-1 dropdown-content w-full max-h-80 overflow-auto bg-[#1f1f1f] scrollbar-thin shadow-xl/30 border-2 border-white overscroll-none">
        <ul class="menu flex gap-3 w-full p-4">
            {#each Object.entries(FONTS) as [rawName, name]}
                <li onclick={() => selectFont(rawName as keyof typeof FONTS)} class="text-lg" class:menu-active={rawName === font} style={`font-family: "${rawName}"`}>
                    <a>{name}</a>
                </li>
            {/each}
        </ul>
    </div>
</div>
