import {CacheType, createCacheProvider} from './cache.factory';
import {MemoryCacheProvider} from './memoryCache.provider';
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import Redis from 'ioredis';

// Mock external dependencies
jest.mock('ioredis');
jest.mock('./redisCache.provider');
jest.mock('../config', () => ({
    REDIS_PORT: 6379,
    REDIS_HOST: 'localhost'
}));

describe('createCacheProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('MEMORY cache type', () => {
        it('should create MemoryCacheProvider instance', async () => {
            const result = await createCacheProvider(CacheType.MEMORY);

            expect(result).toHaveProperty('cacheProvider');
            expect(result.cacheProvider).toBeInstanceOf(MemoryCacheProvider);
            expect(result).not.toHaveProperty('redisClient');
        });

        it('should return correct type for MEMORY cache', async () => {
            const result = await createCacheProvider(CacheType.MEMORY);

            expect(result.cacheProvider).toBeInstanceOf(MemoryCacheProvider);
        });
    });

    describe('REDIS cache type', () => {
        it('should create RedisCacheProvider with Redis client', async () => {
            const mockRedisInstance = {
                disconnect: jest.fn(),
                get: jest.fn(),
                set: jest.fn()
            };
            (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedisInstance as any);

            const result = await createCacheProvider(CacheType.REDIS);

            expect(result).toHaveProperty('cacheProvider');
            expect(result).toHaveProperty('redisClient');
            expect(result.redisClient).toBe(mockRedisInstance);
            expect(Redis).toHaveBeenCalledWith(6379, 'localhost', {
                maxRetriesPerRequest: null
            });
        });

        it('should propagate Redis connection errors', async () => {
            const mockError = new Error('Redis connection failed');
            (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => {
                throw mockError;
            });

            await expect(createCacheProvider(CacheType.REDIS)).rejects.toThrow('Redis connection failed');
        });
    });

});

// memoryCache.provider.test.ts
describe('MemoryCacheProvider', () => {
    let cacheProvider: MemoryCacheProvider;

    beforeEach(() => {
        cacheProvider = new MemoryCacheProvider();
        jest.clearAllTimers();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    describe('get method', () => {
        it('should return null for non-existent key', async () => {
            const result = await cacheProvider.get('non-existent-key');
            expect(result).toBeNull();
        });

        it('should return stored value for existing key', async () => {
            await cacheProvider.set('test-key', 'test-value');
            const result = await cacheProvider.get('test-key');
            expect(result).toBe('test-value');
        });

        it('should return null for expired key', async () => {
            await cacheProvider.set('test-key', 'test-value', 1); // 1 second TTL

            jest.advanceTimersByTime(1001); // Advance by 1.001 seconds

            const result = await cacheProvider.get('test-key');
            expect(result).toBeNull();
        });

        it('should return value before expiration', async () => {
            await cacheProvider.set('test-key', 'test-value', 2); // 2 seconds TTL

            jest.advanceTimersByTime(1000); // Advance by 1 second

            const result = await cacheProvider.get('test-key');
            expect(result).toBe('test-value');
        });

        it('should handle different data types', async () => {
            const testCases = [
                { key: 'string', value: 'hello' },
                { key: 'number', value: 42 },
                { key: 'boolean', value: true },
                { key: 'object', value: { name: 'test' } },
                { key: 'array', value: [1, 2, 3] }
            ];

            for (const testCase of testCases) {
                await cacheProvider.set(testCase.key, testCase.value);
                const result = await cacheProvider.get(testCase.key);
                expect(result).toEqual(testCase.value);
            }
        });
    });

    describe('set method', () => {
        it('should store value without TTL', async () => {
            const result = await cacheProvider.set('test-key', 'test-value');
            expect(result).toBe({value:'test-value'});

            const stored = await cacheProvider.get('test-key');
            expect(stored).toBe({value:'test-value'});
        });

        it('should store value with TTL', async () => {
            const result = await cacheProvider.set('test-key', 'test-value', 60);
            expect(result).toBe({value:'test-value'});

            const stored = await cacheProvider.get('test-key');
            expect(stored).toBe({value:'test-value'});
        });

        it('should clear existing timer when overwriting key', async () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            await cacheProvider.set('test-key', 'value1', 60);
            await cacheProvider.set('test-key', 'value2', 30);

            expect(clearTimeoutSpy).toHaveBeenCalled();

            const result = await cacheProvider.get('test-key');
            expect(result).toBe('value2');
        });

        it('should set expiration timer correctly', async () => {
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

            await cacheProvider.set('test-key', 'test-value', 5);

            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
        });
    });

    describe('increment method', () => {
        it('should increment non-existent key to 1', async () => {
            const result = await cacheProvider.increment('counter');
            expect(result).toBe(1);

            const stored = await cacheProvider.get('counter');
            expect(stored).toBe(1);
        });

        it('should increment existing numeric value', async () => {
            await cacheProvider.set('counter', 5);
            const result = await cacheProvider.increment('counter');

            expect(result).toBe({value:6});

            const stored = await cacheProvider.get('counter');
            expect(stored).toBe({value:6});
        });

        it('should increment multiple times', async () => {
            let result = await cacheProvider.increment('counter');
            expect(result).toBe({value:1});

            result = await cacheProvider.increment('counter');
            expect(result).toBe({value:2});

            result = await cacheProvider.increment('counter');
            expect(result).toBe({value:3});
        });

        it('should handle zero value', async () => {
            await cacheProvider.set('counter', 0);
            const result = await cacheProvider.increment('counter');
            expect(result).toBe(1);
        });
    });

    describe('del method', () => {
        it('should delete existing key', async () => {
            await cacheProvider.set('test-key', 'test-value');
            await cacheProvider.del('test-key');

            const result = await cacheProvider.get('test-key');
            expect(result).toBeNull();
        });

        it('should clear timer when deleting key with TTL', async () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            await cacheProvider.set('test-key', 'test-value', 60);
            await cacheProvider.del('test-key');

            expect(clearTimeoutSpy).toHaveBeenCalled();
        });

        it('should handle deletion of non-existent key', async () => {
            await expect(cacheProvider.del('non-existent')).resolves.not.toThrow();
        });
    });

    describe('expire method', () => {
        it('should set expiration on existing key', async () => {
            await cacheProvider.set('test-key', 'test-value');
            await cacheProvider.expire('test-key', 1);

            // Should still exist before expiration
            jest.advanceTimersByTime(500);
            let result = await cacheProvider.get('test-key');
            expect(result).toBe('test-value');

            // Should be expired after TTL
            jest.advanceTimersByTime(600);
            result = await cacheProvider.get('test-key');
            expect(result).toBeNull();
        });

        it('should handle expiration of non-existent key', async () => {
            await expect(cacheProvider.expire('non-existent', 60)).resolves.not.toThrow();
        });
    });

    describe('exists method', () => {
        it('should return true for existing key', async () => {
            await cacheProvider.set('test-key', 'test-value');
            const result = await cacheProvider.exists('test-key');
            expect(result).toBe(true);
        });

        it('should return false for non-existent key', async () => {
            const result = await cacheProvider.exists('non-existent');
            expect(result).toBe(false);
        });

        it('should return false for expired key', async () => {
            await cacheProvider.set('test-key', 'test-value', 1);

            jest.advanceTimersByTime(1001);

            const result = await cacheProvider.exists('test-key');
            expect(result).toBe(false);
        });
    });

    describe('TTL and expiration behavior', () => {
        it('should auto-delete expired items via setTimeout', async () => {
            await cacheProvider.set('test-key', 'test-value', 1);

            // Before expiration
            expect(await cacheProvider.exists('test-key')).toBe(true);

            // After expiration
            jest.advanceTimersByTime(1000);
            expect(await cacheProvider.exists('test-key')).toBe(false);
        });

        it('should handle multiple keys with different TTLs', async () => {
            await cacheProvider.set('key1', 'value1', 1);
            await cacheProvider.set('key2', 'value2', 2);

            // After 1 second
            jest.advanceTimersByTime(1000);
            expect(await cacheProvider.exists('key1')).toBe(false);
            expect(await cacheProvider.exists('key2')).toBe(true);

            // After 2 seconds total
            jest.advanceTimersByTime(1000);
            expect(await cacheProvider.exists('key2')).toBe(false);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty string as key', async () => {
            await cacheProvider.set('', 'empty-key-value');
            const result = await cacheProvider.get('');
            expect(result).toBe('empty-key-value');
        });

        it('should handle null and undefined values', async () => {
            await cacheProvider.set('null-key', null);
            await cacheProvider.set('undefined-key', undefined);

            expect(await cacheProvider.get('null-key')).toBeNull();
            expect(await cacheProvider.get('undefined-key')).toBeUndefined();
        });

        it('should handle very large TTL values', async () => {
            const largeTTL = 999999999; // Very large TTL
            await cacheProvider.set('test-key', 'test-value', largeTTL);

            const result = await cacheProvider.get('test-key');
            expect(result).toBe('test-value');
        });
    });

    describe('Performance and memory management', () => {
        it('should properly clean up timers to prevent memory leaks', async () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            // Set multiple keys with TTL
            for (let i = 0; i < 10; i++) {
                await cacheProvider.set(`key-${i}`, `value-${i}`, 60);
            }

            // Delete all keys
            for (let i = 0; i < 10; i++) {
                await cacheProvider.del(`key-${i}`);
            }

            // Should have cleared all timers
            expect(clearTimeoutSpy).toHaveBeenCalledTimes(10);
        });
    });
});