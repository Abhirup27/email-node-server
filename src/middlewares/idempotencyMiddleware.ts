
// if (!['POST', 'PATCH', 'PUT'].includes(req.method)) {
//     return next();
// }
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { CacheProvider } from "../providers/cache.provider";
import { EmailRequest } from "../types/express";

// Generate consistent SHA-256 hash of request body to check for the same email with different key ID.
const hashRequestBody = (body: any): string => {
    const str = JSON.stringify({
        to: body.to,
        subject: body.subject, 
        text: body.text,
        html: body.html
    });
    return crypto.createHash('sha256').update(str).digest('hex');
};

export const idempotencyMiddleware = (cacheInstance: CacheProvider) => {
    return async (req: EmailRequest, res: Response, next: NextFunction) => {
        if (req.method !== 'POST') return next();

        // Auto-generate key if not provided
        const providedKey = req.headers['idempotency-key'] as string;
        const requestHash = hashRequestBody(req.body);
        const idempotencyKey = providedKey || `auto_${requestHash}`;

        const redisKey = `${idempotencyKey}`;
        req.idempotencyKey = idempotencyKey; // Attach to request for later use

        try {
            const existing = await cacheInstance.get<string>(redisKey);

            if (existing) {
                const data = JSON.parse(existing);

                // Case 1: Different request with same key

                console.log(data);
                if (data.requestHash !== requestHash) {
                    return res.status(400).json({
                        error: "Idempotency key conflict",
                        message: "Key already used for different request"
                    });
                }
                if(req.user?.email == data.senderEmail) {
                    // Case 2: Completed request
                    if (data.status === "completed") {
                        return res.status(data.statusCode).json(data);
                    }

                    // Case 3: In-progress request
                    return res.status(data.statusCode).json({
                        status: data.status,
                        //id: data.jobId,
                        message: data.message
                    });
                }
                return res.status(401).json({error: "Unauthorized", message: "Unauthorized"});
            }

            // Reserve key for new request
            await cacheInstance.set(
                redisKey,
                JSON.stringify({
                    senderEmail: req.body.senderEmail,
                    status: "queued",
                    requestHash,
                    createdAt: new Date().toISOString()
                }),
                300 // 5-minute reservation
            );

            next();
        } catch (error) {
            console.error("Idempotency error:", error);
            next();
        }
    };
};