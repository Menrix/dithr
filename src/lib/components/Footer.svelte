<script lang="ts">
import pkg from '../../../package.json';
import GithubLogoIcon from "phosphor-svelte/lib/GithubLogoIcon";
import HandHeartIcon from "phosphor-svelte/lib/HandHeartIcon";
import HouseIcon from "phosphor-svelte/lib/HouseIcon";
</script>

<style>
@reference "tailwindcss";

.btn {
    @apply flex p-3;
}
</style>

<footer class="self-end mx-4 pt-8 pb-4 opacity-60">
    <div class="grid grid-cols-3 mb-2 w-full">
        <a href="https://dithr.github.io" target="_blank" class="btn btn-xs btn-ghost tooltip tooltip-start" data-tip="Home page">
            <HouseIcon color="currentColor" size={16} />
        </a>
        <a href="https://github.com/redphx/dithr" target="_blank" class="btn btn-xs btn-ghost tooltip" data-tip="Github repo">
            <GithubLogoIcon color="currentColor" size={16} />
        </a>
        <a href="https://ko-fi.com/redphx" target="_blank" class="btn btn-xs btn-ghost tooltip tooltip-end" data-tip="Support this project">
            <HandHeartIcon color="currentColor" size={16} />
        </a>
    </div>
    <div class="text-xs text-center font-bold">DITHR v{pkg.version}-{__GIT_HASH__}</div>
    <p class="text-[10px] text-center mt-1">
        No uploads. No servers. All on-device.</p>
</footer>
