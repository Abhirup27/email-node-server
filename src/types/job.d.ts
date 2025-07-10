import {Email} from "./email";

export interface EmailJobData {
    idempotencyKey?: string;
   email: Email;
    metadata?: {
        userId?: string;
    };
}