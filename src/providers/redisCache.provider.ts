import { CacheProvider } from './cache.provider';
import {RedisClientType, RedisFunctions, RedisModules, RedisScripts, RespVersions, TypeMapping} from "redis";
import Redis from "ioredis";

export class RedisCacheProvider implements CacheProvider {
    constructor(private readonly client: Redis) {}

    async get<T>(key: string): Promise<T | null> {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        const stringValue = JSON.stringify(value);
        if (ttl) {
            await this.client.setex(key, ttl, stringValue);
        } else {
            await this.client.set(key, stringValue);
        }
    }

    async del(key: string): Promise<void> {

        await this.client.del(key);
    }

    async increment(key: string): Promise<number> {

        return await this.client.incr(key);
    }
    async expire(key: string, seconds: number): Promise<void> {
        await this.client.expire(key, seconds);
    }
    async exists(key: string): Promise<boolean> {
        const result = await this.client.exists(key);
        return result === 1;
    }

    // For transaction support
    async withConnection<T>(fn: (client: Redis) => Promise<T>): Promise<T> {
        return fn(this.client);
    }
}