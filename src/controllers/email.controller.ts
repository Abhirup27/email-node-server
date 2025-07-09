import {Request, Response} from 'express';
import {BaseController} from "./base.controller";
import {EmailService} from "../services/EmailService/email.service";

export class EmailController extends BaseController {
    private get emailService(): EmailService {
        return this.serviceFactory.createEmailService();
    }

    async getEmails(req: Request, res: Response) {
        try {
            this.logger.log(req.user);
            const emails = await this.emailService.getEmails();
            res.json(emails);
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async getEmailStatus(req: Request, res: Response) {
        try {
            console.log(req.user);
            const email = await this.emailService.getEmailStatus();
            res.json(email);
        } catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
}