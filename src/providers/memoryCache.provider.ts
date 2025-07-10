import { CacheProvider } from './cache.provider';

interface MemoryCacheItem {
    value: any;
    expiresAt?: number;
}

export class MemoryCacheProvider implements CacheProvider {
    //Map instead of a Record because it has built in functions, and potentially faster.
    private store: Map<string, MemoryCacheItem> = new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();

    async get<T>(key: string): Promise<T | null> {
        const item = this.store.get(key);
        if (!item) return null;

        if (item.expiresAt && item.expiresAt <= Date.now()) {
            this.store.delete(key);
            return null;
        }

        return item.value as T;
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        // Clear existing timer if any
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key)!);
            this.timers.delete(key);
        }

        const item: MemoryCacheItem = { value };

        if (ttl) {
            item.expiresAt = Date.now() + ttl * 1000;
            this.timers.set(
                key,
                setTimeout(() => this.store.delete(key), ttl * 1000)
            );
        }

        this.store.set(key, item);
    }

    async del(key: string): Promise<void> {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key)!);
            this.timers.delete(key);
        }
        this.store.delete(key);
    }

    async exists(key: string): Promise<boolean> {
        return this.store.has(key);
    }
}