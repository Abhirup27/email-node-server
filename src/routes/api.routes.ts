import {authenticate} from "../middlewares/authMiddleware";
const router = require('express').Router();
import { ServiceFactory } from "../services/service.factory";

import {EmailController} from "../controllers/email.controller";
import {NextFunction, Response} from "express";
import {EmailRequest} from "../types/express";

export function createApiRoutes(serviceFactory: ServiceFactory,
                                idempotencyMiddlewareInstance: (req: EmailRequest, res: Response, next: NextFunction)=> Promise<void| Response>) {
    const emailController = new EmailController(serviceFactory);

    /**
     * I can avoid the long binding here by using the arrow function syntax
     * */
    router.get('/', authenticate,emailController.getEmailStatus.bind(emailController));
    router.post('/send-email', authenticate, idempotencyMiddlewareInstance,emailController.sendEmail.bind(emailController));
    return router;
}