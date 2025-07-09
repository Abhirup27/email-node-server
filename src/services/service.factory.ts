import { EmailService} from "./EmailService/email.service";
import {CustomLogger} from "./logger.service";

export class ServiceFactory {
    constructor(
        public readonly logger: CustomLogger,
        //private dataSource: DataSource
    ) {}

    createEmailService(): EmailService {
        return new EmailService(this.logger);
    }



}