import { EmailService} from "./EmailService/email.service";
import {CustomLogger} from "./logger.service";
import {CacheProvider} from "../providers/cache.provider";

export class ServiceFactory {
    constructor(
        public readonly logger: CustomLogger,
        private readonly cacheInstance: CacheProvider

    ) {}

    createEmailService(): EmailService {
        return new EmailService(this.logger, this.cacheInstance);
    }



}