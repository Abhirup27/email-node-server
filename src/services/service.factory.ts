import { EmailService } from "./EmailService/email.service";
import { CustomLogger } from "./logger.service";
import { CacheProvider } from "../providers/cache.provider";
import { QueueService } from "./QueueService/queue.service";
import Redis from "ioredis";
import {RedisCacheProvider} from "../providers/redisCache.provider";

export class ServiceFactory {
    private queueService: QueueService;

    constructor(
        public readonly logger: CustomLogger,
        private readonly cacheInstance: CacheProvider,
        private readonly redisInstance?:  Redis,


    ) {
        cacheInstance instanceof RedisCacheProvider? this.logger.log("Redis cache provider is used") : this.logger.log("Memory cache provider is used");

        this.queueService = new QueueService(logger, cacheInstance, redisInstance);
    }

    createEmailService(): EmailService {
        const emailServiceInstance = new EmailService(
            this.logger,
            this.cacheInstance,
            this.queueService
        );
        this.queueService.setEmailServiceInstance(emailServiceInstance);
        return emailServiceInstance;
    }

    // this is unused
    async shutdown() {
        await this.queueService.close();
    }
}