import { CacheProvider } from './cache.provider';
import { MemoryCacheProvider } from './memoryCache.provider';

import config from "../config";
import Redis from "ioredis";

export enum CacheType {
    MEMORY = 'memory',
}
export function createCacheProvider(type: CacheType.MEMORY): Promise<{
    cacheProvider: MemoryCacheProvider;
}>;

export async function createCacheProvider(
    type: CacheType,
): Promise<{ cacheProvider: CacheProvider; redisClient?: Redis }> {
    switch (type) {
        case CacheType.MEMORY: {
            const cacheProvider = new MemoryCacheProvider();
            return { cacheProvider };
        }
        default: {
           // const exhaustiveCheck: CacheType.INVALID = type;
            throw new Error(`Invalid cache type: ${type}`);
        }
    }
}