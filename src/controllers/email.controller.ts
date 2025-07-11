import {Request, Response} from 'express';
import {BaseController} from "./base.controller";
import {EmailService} from "../services/EmailService/email.service";
import {EmailRequest, TGetRequest} from "../types/express";

export class EmailController extends BaseController {
    private get emailService(): EmailService {
        return this.serviceFactory.createEmailService();
    }

    // This endpoint is not implemented
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
    //**
    // This is used to query the status of the email.
    // Possible states
    // - processing
    // - sent
    // - failed
    // - cancelled
    // - expired
    // - unknown
    //
    // If the email is not found, it returns a 404.
    // If the email is found, it returns a 200 with the status.
    // */
    async getEmailStatus(req: TGetRequest<{idempotencyKey: string}>, res: Response) {
        try {
            this.logger.log(req.params.key);
            const idempotencyKey = req.params.id as string ?? req.params.key;
            if (!idempotencyKey) {
                return res.status(400).json({ error: "idempotencyKey is required" });
            }

            const status = await this.emailService.getEmailStatus(idempotencyKey, req.user?.email as string);
            const parsedStatus = status ? JSON.parse(status) : null;
            res.status(parsedStatus?.statusCode ?? 404).json(parsedStatus ?? {});
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