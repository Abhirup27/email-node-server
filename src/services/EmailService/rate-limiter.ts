import { CacheProvider } from "../../providers/cache.provider";

export class RateLimiter {
    constructor(
        private cache: CacheProvider,
        private maxRequests: number,
        private windowInSeconds: number
    ) {}

    async checkLimit(providerName: string): Promise<boolean> {
        const key = `rate_limit:${providerName}`;
        const count = await this.cache.increment(key);
        console.log(count);
        if (count === 1) {
            await this.cache.expire(key, this.windowInSeconds);
        }

        return count <= this.maxRequests;
    }
}