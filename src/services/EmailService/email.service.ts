import {CustomLogger} from "../logger.service";
import {CacheProvider} from "../../providers/cache.provider";
import {Email} from "../../types/email";

export class EmailService {
    constructor(
        protected logger: CustomLogger,
        protected cacheInstance: CacheProvider,
       // private userRepository: Repository<User>,
    ) {
    }
    async getEmailStatus(): Promise<any[]> {
        this.logger.debug("Fetching email status", this.getEmailStatus.name);
        //const users = await this.userRepository.find({where: { }});
        return [];
    }

    async getEmails() {


    }
    async sendEmail(email: Email) {
        //send the email to the bullmq queue
    }
}

// Export a singleton instance
//export const emailService = new EmailService();