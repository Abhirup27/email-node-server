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
            const idempotencyKey = req.query.idempotencyKey as string;
            if (!idempotencyKey) {
                return res.status(400).json({ error: "idempotencyKey is required" });
            }

            const status = await this.emailService.getEmailStatus(idempotencyKey, req.user?.email as string);
            res.json(JSON.parse(status || '{}'));
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(error.message, error.stack);
            }
            res.status(500).json({ error: "Internal server error" });
        }
    }
    async sendEmail(req: EmailRequest, res: Response) {
        try {
            //console.log(req.user);
            const idempotencyKey = req.headers['idempotency-key'] as string;

            const result = await this.emailService.initSendEmail(req.body, idempotencyKey);

            //res.status(202).json(result);
            res.json(result);
        } catch(error){
            if(error instanceof Error){
                this.logger.error(error.message, error.stack);
            }
        }
    }
}