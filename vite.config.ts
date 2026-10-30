import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'child_process';
import fs from 'node:fs';

// Works also when the folder was downloaded as ZIP (no .git folder)
function gitHash() {
    try {
        return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trimEnd();
    } catch {
        return 'local';
    }
}

/**
 * Used by the Mac "DITHR" app (env DITHR_AUTO_EXIT=1): stop the server by itself
 * when no browser tab is connected anymore (tab closed). A page reload reconnects
 * within a second, so it does not count.
 */
function autoExitWhenNoTabs(): Plugin {
    const IDLE_MS = 20_000;
    const STARTUP_GRACE_MS = 90_000;
    return {
        name: 'dithr-auto-exit',
        apply: 'serve',
        configureServer(server) {
            if (process.env.DITHR_AUTO_EXIT !== '1') return;
            let clients = 0;
            let everConnected = false;
            let idleSince = Date.now() + STARTUP_GRACE_MS;

            server.ws.on('connection', (socket: { on(e: 'close', cb: () => void): void }) => {
                clients++;
                everConnected = true;
                socket.on('close', () => {
                    clients = Math.max(0, clients - 1);
                    if (clients === 0) idleSince = Date.now();
                });
            });

            const timer = setInterval(async () => {
                const idleFor = Date.now() - idleSince;
                const limit = everConnected ? IDLE_MS : 0;
                if (clients === 0 && idleFor > limit) {
                    clearInterval(timer);
                    console.log('[dithr] no browser tab open anymore, stopping.');
                    await server.close().catch(() => {});
                    process.exit(0);
                }
            }, 2000);
            timer.unref?.();
            // When DITHR restarts itself (e.g. after vite.config.ts changed), this old
            // watcher must stop, otherwise it would shut down the new server too
            server.httpServer?.once('close', () => clearInterval(timer));
        },
    };
}

/**
 * "Send via Mac": passes images from the phone to the Mac tab with the NFC writer
 * (the "station") and progress messages back. See src/lib/remote-sync.ts.
 */
function phoneRelay(): Plugin {
    return {
        name: 'dithr-phone-relay',
        apply: 'serve',
        configureServer(server) {
            type Client = { send(event: string, payload?: unknown): void; socket?: { readyState: number } };
            let station: Client | null = null;
            let stationSeen = 0;
            // The station counts as long as its connection is open (background tabs
            // are slowed down by Chrome, so we must not rely on regular "hello"s)
            const stationAlive = () => !!station && (station.socket ? station.socket.readyState === 1 : Date.now() - stationSeen < 12_000);
            const requesters = new Map<string, Client>();

            server.ws.on('dithr:station-hello', (_data: unknown, client: Client) => {
                station = client;
                stationSeen = Date.now();
            });

            server.ws.on('dithr:remote-sync', (data: { id: string }, client: Client) => {
                if (!stationAlive()) {
                    client.send('dithr:remote-progress', {
                        id: data.id,
                        type: 'error',
                        message: 'No Mac station found. Open DITHR in Chrome on the Mac (Safari on the Mac cannot be the station).',
                    });
                    return;
                }
                requesters.set(data.id, client);
                station!.send('dithr:remote-sync', data);
            });

            server.ws.on('dithr:remote-progress', (data: { id: string; type: string }) => {
                const client = requesters.get(data.id);
                client?.send('dithr:remote-progress', data);
                if (data.type === 'done' || data.type === 'error') requesters.delete(data.id);
            });
        },
    };
}

const deviceImagesList = fs.readdirSync('./static/images/devices').map(item => item.split('.')[0]);

export default defineConfig({
    server: {
        // Allow opening DITHR on the iPhone via the Mac's network name, e.g. http://MacBook-Pro.local:5173/app/
        allowedHosts: ['.local'],
    },
    define: {
        __GIT_HASH__: JSON.stringify(gitHash()),
        __DEVICE_IMAGES__: JSON.stringify(deviceImagesList),
    },
    plugins: [
        tailwindcss(),
        sveltekit(),
        autoExitWhenNoTabs(),
        phoneRelay(),
    ],
});
