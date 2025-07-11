import {MailSenderProvider} from "./mailSender.provider";
import {Email} from "../../../../types/email";

export class MailSenderA implements MailSenderProvider {
    name = 'MockProviderA';

    async sendEmail(email: Email) {
        const r = Math.random();

        if (r < 0.85) {
            // Success case (85% probability)
            console.log(`[${this.name}] Email successfully sent to ${email.recipientEmail}`);
            return;
        }

        // Error cases (15% probability)
        const errorType = Math.floor(Math.random() * 4);
        switch (errorType) {
            case 0:
                throw new Error(`SMTP Error 554: Invalid sender address - ${email.senderEmail}`);
            case 1:
                throw new Error(`SMTP Error 550: Invalid recipient - ${email.recipientEmail}`);
            case 2:
                throw new Error('SMTP Error 421: Service unavailable - Connection timeout');
            case 3:
                throw new Error(`Provider Failure: ${this.name} API quota exceeded`);
            default:
                throw new Error('Unknown SMTP transmission error');
        }
    }
}