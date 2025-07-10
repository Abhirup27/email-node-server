import { CacheProvider } from './cache.provider';
import { RedisCacheProvider } from './redisCache.provider';
import { MemoryCacheProvider } from './memoryCache.provider';

import config from "../config";
import Redis from "ioredis";

export enum CacheType {
    REDIS = 'redis',
    MEMORY = 'memory'
}
export function createCacheProvider(type: CacheType.REDIS): Promise<{
    cacheProvider: RedisCacheProvider;
    redisClient: Redis;
}>;
export function createCacheProvider(type: CacheType.MEMORY): Promise<{
    cacheProvider: MemoryCacheProvider;
}>;
export async function createCacheProvider(
    type: CacheType,
): Promise<{ cacheProvider: CacheProvider; redisClient?: Redis }> {
    switch (type) {
        case CacheType.REDIS: {
            try {
                const redisClient = new Redis(config.REDIS_PORT, config.REDIS_HOST, {
                    maxRetriesPerRequest: null
                });
                const cacheProvider = new RedisCacheProvider(redisClient);
                return { cacheProvider, redisClient };
            } catch (e) {
                throw e;
            }
        }
        case CacheType.MEMORY: {
            const cacheProvider = new MemoryCacheProvider();
            return { cacheProvider };
        }
        default: {
            const exhaustiveCheck: never = type;
            throw new Error(`Invalid cache type: ${exhaustiveCheck}`);
        }
    }
}