import {Email} from "../../../types/email";
import {EmailService} from "../../EmailService/email.service";


export interface QueueProvider {

    name: string;
   // sendMail(email: Email): Promise<void>;
    addEmailJob(email: Email, jobId?: string): Promise<void>;
    close(): Promise<void>;
    setEmailServiceInstance(emailService: EmailService): void;
}