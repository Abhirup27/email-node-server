import {QueueProvider} from "./providers/queue.provider";
import {CustomLogger} from "../logger.service";
import {CacheProvider} from "../../providers/cache.provider";
import {FIFOQueueProvider} from "./providers/FIFOQueue.provider";
import {Email} from "../../types/email";
import {EmailService} from "../EmailService/email.service";

export class QueueService {
    private provider: QueueProvider;

    constructor(
        private readonly logger: CustomLogger,
        cacheInstance: CacheProvider,  // this is only for checking if RedisCacheProvider is used, it is deleted after the constructor is finished
    ) {

        this.logger.log("Using simple FIFO queue system");
        this.provider = new FIFOQueueProvider(logger);

    }

    async addEmailJob(email: Email, jobId?: string) {

        return this.provider.addEmailJob(email, jobId);
    }

    async close() {
        await this.provider.close();
    }

    setEmailServiceInstance(emailService: EmailService) {
        this.provider.setEmailServiceInstance(emailService);
    }
}