import {MailSenderProvider} from "./mailSender.provider";
import {Email} from "../../../../types/email";

export class MailSenderB implements MailSenderProvider {
    name = 'MockProviderB';

    async sendEmail(email: Email) {
        const r = Math.random();

        if (r < 0.75) {
            // Success case (75% probability)
            console.log(`[${this.name}] Email successfully sent to ${email.recipientEmail}`);
            return;
        }

        // Error cases (25% probability)
        const errorType = Math.floor(Math.random() * 4);
        switch (errorType) {
            case 0:
                throw new Error(`SMTP Error 451: Temporary local problem - Please retry later`);
            case 1:
                throw new Error(`SMTP Error 552: Attachment size exceeds limits`);
            case 2:
                throw new Error('SMTP Error 535: Authentication credentials invalid');
            case 3:
                throw new Error(`Provider Failure: ${this.name} service temporarily suspended`);
            default:
                throw new Error('SMTP Error 500: Unrecognized command');
        }
    }
}