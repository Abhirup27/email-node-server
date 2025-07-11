import {MailSenderProvider} from "./mailSender.provider";
import {Email} from "../../../../types/email";

export class MailSenderB implements MailSenderProvider{
    name = 'MockProviderB';
    async sendEmail(email: Email) {
        if (Math.random() > 0.01) throw new Error('Provider2 failure');
        console.log(`[${this.name}] Email to ${email.recipientEmail}`);
    }
}