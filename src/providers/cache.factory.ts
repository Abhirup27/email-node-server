import { CacheProvider } from './cache.provider';
import { RedisCacheProvider } from './redisCache.provider';
import { MemoryCacheProvider } from './memoryCache.provider';
import { createClient } from 'redis';
import config from "../config";

export enum CacheType {
    REDIS = 'redis',
    MEMORY = 'memory'
}

export async function createCacheProvider(
    type: CacheType,
   // redisConfig?: { url: string }
): Promise<CacheProvider> {
    switch (type) {
        case CacheType.REDIS:
          //  if (!redisConfig) throw new Error('Redis config required');

            const redisClient = await createClient({socket: {host: config.REDIS_HOST, port: config.REDIS_PORT}, })
                                                                .on('error', (err) => {throw err;})
                                                                .connect();

           // const client = new Redis(redisConfig.url);
            return new RedisCacheProvider(redisClient);
        case CacheType.MEMORY:
            return new MemoryCacheProvider();
        default:
            throw new Error(`Invalid cache type: ${type}`);
    }
}