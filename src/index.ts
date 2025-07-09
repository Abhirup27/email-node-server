import express = require('express');
import {urlencoded} from "express";
import cookieParser from "cookie-parser";
import config from './config';
import {createApiRoutes} from "./routes/api.routes";
import {ServiceFactory} from "./services/service.factory";
import {logger } from "./services/logger.service";


async function bootstrap() {
    const app = express();

    try {
        process.on('SIGINT', () => { gracefulShutdown('SIGINT') });
        process.on('SIGTERM', () =>  { gracefulShutdown('SIGTERM') });
        logger.log("Initializing Services");
        // Create service factory
        const serviceFactory = new ServiceFactory(logger);

        logger.log("Initializing middlewares");
        // Middleware
        app.use(express.json());
        app.use(cookieParser());
        app.use(urlencoded({ extended: false }));

        logger.log("Initializing routes");
        // Routes with dependency injection
        app.use('/api/v1/', createApiRoutes(serviceFactory));
        //app.use('/api/v1/notes', createNoteRoutes(serviceFactory));

        app.listen(config.PORT, () => {
            logger.log(`Server running on port ${config.PORT}`);
        });
        process.on('SIGTERM', async () => {
            try {
                logger.log('Received SIGTERM signal. Gracefully shutting down...');
                process.exit(0);
            } catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        });

    } catch (error: any) {
        console.error(error);
        logger.error("Initialization error", error.stack);
        process.exit(1);
    }
}

bootstrap();


function gracefulShutdown(signal: string): void {
    console.log(`\nReceived ${signal}, shutting down...`);
   // logger.close();

    // Force exit after 100ms if cleanup takes too long
    setTimeout(() => {
        console.error(`Forcing shutdown after ${signal}`);
        process.exit(0);
    }, 100).unref();
}

