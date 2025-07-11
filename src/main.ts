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
import {RedisCacheProvider} from "./providers/redisCache.provider";
import {CacheProvider} from "./providers/cache.provider";
import Redis from "ioredis";

async function bootstrap() {

    const app = express();

    try {
        process.on('SIGINT', () => { gracefulShutdown('SIGINT') });
        process.on('SIGTERM', () =>  { gracefulShutdown('SIGTERM') });

        logger.log("Initializing Services and Middlewares");

        const cache: {cacheProvider: CacheProvider , redisClient?: Redis} = await createCacheProvider(CacheType.MEMORY);
        const cacheInstance = cache.cacheProvider;

        // Middleware
        app.use(express.json());
        app.use(cookieParser());
        app.use(urlencoded({ extended: false }));
        const idemInstance = idempotencyMiddleware(cache.cacheProvider);
        const rateLimitingInstance = rateLimitMiddleware(10, 30);

        // Create service factory
        const serviceFactory = new ServiceFactory(logger, cache.cacheProvider, cache.cacheProvider instanceof RedisCacheProvider ? cache.redisClient : undefined);

        logger.log("Initializing routes");

        /**
         * routes with dependency injection
         * I could have set the idempotency middleware here, but I wanted it to be a router level middleware so it applies to only the post /api/v1/send-email route
         */
        app.use('/api/v1/', rateLimitingInstance, createApiRoutes(serviceFactory, idemInstance));

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

    // Force exit after 1 second if cleanup takes too long. In cleanup, we are stopping the bullmq queue, redis connection and the logger.
    setTimeout(() => {
        console.error(`Forcing shutdown after ${signal}`);
        process.exit(0);
    }, 1000).unref();
}

