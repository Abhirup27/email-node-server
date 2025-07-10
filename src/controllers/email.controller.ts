import {Request, Response} from 'express';
import {BaseController} from "./base.controller";
import {EmailService} from "../services/EmailService/email.service";
import {EmailRequest} from "../types/express";

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
            if(error instanceof Error){
                this.logger.error(error.message, error.stack);
            }
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async getEmailStatus(req: Request, res: Response) {
        try {
            console.log(req.user);
            const email = await this.emailService.getEmailStatus();
            res.json(email);
        } catch (error) {
            if(error instanceof Error){
                this.logger.error(error.message, error.stack);
            }
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async sendEmail(req: EmailRequest, res: Response) {
        try {
            console.log(req.user);
            const email = await this.emailService.sendEmail(req.body);
            res.json(email);
        } catch(error){
            if(error instanceof Error){
                this.logger.error(error.message, error.stack);
            }
        }
    }
}