import {MailSenderProvider} from "./mailSender.provider";
import {Email} from "../../../../types/email";


export class MailSenderA implements MailSenderProvider{
    name = 'MockProviderA';
    async sendEmail(email: Email) {
        if (Math.random() > 0.01) throw new Error('Provider1 failure');
        console.log(`[${this.name}] Email to ${email.recipientEmail}`);
    }
}
