import {authenticate} from "../middlewares/authMiddleware";
const router = require('express').Router();
import { ServiceFactory } from "../services/service.factory";

import {EmailController} from "../controllers/email.controller";


export function createApiRoutes(serviceFactory: ServiceFactory) {
    const emailController = new EmailController(serviceFactory);

    router.get('/', authenticate,emailController.getEmailStatus.bind(emailController));

    return router;
}