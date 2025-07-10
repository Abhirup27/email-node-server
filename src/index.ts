import express = require('express');
import {urlencoded} from "express";
import cookieParser from "cookie-parser";
import config from './config';
import {createApiRoutes} from "./routes/api.routes";
import {ServiceFactory} from "./services/service.factory";
import {logger} from "./services/logger.service";
import {CacheType, createCacheProvider} from "./providers/cache.factory";
import {idempotencyMiddleware} from "./middlewares/idempotencyMiddleware";
import {rateLimitMiddleware} from "./middlewares/rateLimitingMiddleware";
async function bootstrap() {
    const app = express();

    try {
        process.on('SIGINT', () => { gracefulShutdown('SIGINT') });
        process.on('SIGTERM', () =>  { gracefulShutdown('SIGTERM') });

        logger.log("Initializing Services and Middlewares");

        const cacheInstance = await createCacheProvider(CacheType.REDIS);
        await cacheInstance.set('test', 'test', 10);
        cacheInstance.get('test').then(res => {
            console.log(res);
        }
        )
        // Middleware
        app.use(express.json());
        app.use(cookieParser());
        app.use(urlencoded({ extended: false }));
        const idemInstance = idempotencyMiddleware(cacheInstance);
        const rateLimitingInstance = rateLimitMiddleware(10, 30);

        // Create service factory
        const serviceFactory = new ServiceFactory(logger, cacheInstance);

        logger.log("Initializing routes");

        /**
         * routes with dependency injection
         * I could have set the idempotency middleware here, but I wanted it to be a router level middleware so it applies to only the post /api/v1/send-email route
         */
        app.use('/api/v1/', rateLimitingInstance, createApiRoutes(serviceFactory, idemInstance));
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

