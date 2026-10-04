class BlobRegistry {
    private registry = new Map<string, Blob>();

    public create(blob: Blob): string {
        const url = URL.createObjectURL(blob);
        this.registry.set(url, blob);
        return url;
    }

    public get(url: string): Blob | undefined {
        return this.registry.get(url);
    }

    public has(url: string): boolean {
        return this.registry.has(url);
    }

    public revoke(url: string): void {
        if (this.registry.has(url)) {
            console.log('BlobRegistry.revoke', url);
            URL.revokeObjectURL(url);
            this.registry.delete(url);
        }
    }

    public clear(): void {
        for (const url of this.registry.keys()) {
            URL.revokeObjectURL(url);
        }
        this.registry.clear();
    }
}

export const blobRegistry = new BlobRegistry();
