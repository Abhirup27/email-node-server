import {CustomLogger} from "../logger.service";

export class EmailService {
    constructor(
        protected logger: CustomLogger,
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
}

// Export a singleton instance
//export const emailService = new EmailService();