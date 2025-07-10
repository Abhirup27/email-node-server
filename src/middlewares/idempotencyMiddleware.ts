import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {CacheProvider} from "../providers/cache.provider";
import {EmailRequest} from "../types/express";

// Generate consistent SHA-256 hash of request body
const hashRequestBody = (body: any): string => {
    const str = JSON.stringify(body);
    return crypto.createHash('sha256').update(str).digest('hex');
};

export const idempotencyMiddleware =  ( cacheInstance: CacheProvider) => {

    return async(req: EmailRequest, res: Response, next: NextFunction) => {
        if (!['POST', 'PATCH', 'PUT'].includes(req.method)) {
            return next();
        }
        const idempotencyKey = req.headers['idempotency-key'] as string;
        // Skip if no key provided
        if (!idempotencyKey) return next();

        const redisKey = `idempotency:${idempotencyKey}`;
        const currentHash = hashRequestBody(req.body);

        try {
            // Check existing key
            const existing = await cacheInstance.get<string>(redisKey);

            if (existing) {
                const data = JSON.parse(existing);

                // If the key already exists for a different request, return error
                if (data.requestHash !== currentHash) {
                    return res.status(400).json({
                        error: "Idempotency key used for different request payload"
                    });
                }

                // Return cached response
                return res.status(data.statusCode).json(data.response);
            }

            // Set processing state (10s TTL)
            await cacheInstance.set(
                redisKey,
                JSON.stringify({
                    status: "processing",
                    requestHash: currentHash,
                    createdAt: new Date().toISOString()
                }),
                10  // Short expiry for safety
            );

            // Proceed with request
            const originalSend = res.send.bind(res);
            let responseBody: any;

            res.send = (body: any) => {
                responseBody = body;
                return originalSend(body);
            };

            res.on("finish", async () => {
                // Cache final response for 24hr TTL
                await cacheInstance.set(
                    redisKey,
                    JSON.stringify({
                        status: "completed",
                        requestHash: currentHash,
                        response: responseBody,
                        statusCode: res.statusCode,
                        createdAt: new Date().toISOString()
                    }),
                     3600  // 24 hours
                );
            });

            next();
        } catch (error) {
            console.error("Idempotency error:", error);
            next();
        }
    }
};