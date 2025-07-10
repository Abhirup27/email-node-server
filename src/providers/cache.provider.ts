
export interface CacheProvider {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<T | void>;
    increment(key: string): Promise<number>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    expire(key: string, ttl: number): Promise<void>;
    withConnection?<T>(fn: () => Promise<T>): Promise<T>;
}