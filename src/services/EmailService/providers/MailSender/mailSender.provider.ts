import {Email} from "../../../../types/email";


export interface MailSenderProvider {
    name: string;
    sendEmail(email: Email): Promise<void>;

}
