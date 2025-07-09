// src/controllers/base.controller.ts
import { ServiceFactory } from "../services/service.factory";
import {CustomLogger} from "../services/logger.service";

export abstract class BaseController {
    //protected serviceFactory: ServiceFactory;
    constructor(protected serviceFactory: ServiceFactory) {
        this.serviceFactory = serviceFactory;
    }
    protected get logger() {
        return this.serviceFactory.logger;
    }
}