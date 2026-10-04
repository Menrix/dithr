<script lang="ts">
// Supports weights 100-800
import '@fontsource-variable/jetbrains-mono/wght.css';
// Supports weights 100-900
import '@fontsource-variable/noto-sans/wght.css';
// import '@fontsource-variable/noto-sans-jp/wght.css';
// import '@fontsource-variable/noto-sans-kr/wght.css';
// import '@fontsource-variable/noto-sans-sc/wght.css';
// import '@fontsource-variable/noto-sans-tc/wght.css';
import '@fontsource-variable/noto-serif/wght.css';
// import '@fontsource-variable/noto-serif-jp/wght.css';
// import '@fontsource-variable/noto-serif-kr/wght.css';
// import '@fontsource-variable/noto-serif-sc/wght.css';
// import '@fontsource-variable/noto-serif-tc/wght.css';


import Footer from '$lib/components/Footer.svelte';
import { appReady } from '$lib/stores/editorSettings.svelte';
import App from '../lib/components/App.svelte';

const canvas = document.createElement('canvas');
const supportWebGl = !!(window.WebGLRenderingContext && canvas.getContext('webgl'));

</script>

{#if !supportWebGl}
    <div class="grid grid-rows-[min-content_1fr] min-h-screen pb-10">
        <div class="bg-error text-error-content p-10">
            ERROR: WebGL support is required. Please turn it on or use another browser.
        </div>
        <Footer></Footer>
    </div>
{:else if $appReady}
    <App />
{/if}
