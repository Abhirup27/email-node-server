import { Request, Response } from "express";

export const rateLimitMiddleware = (maxRequests: number, windowSeconds: number) => {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res:Response, next: () => void) => {
        const clientId = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const clientData = requests.get(clientId as string);

        if (!clientData || now > clientData.resetTime) {
            //reset the counter
            requests.set(clientId as string, { count: 1, resetTime: now + ( windowSeconds * 1000) });
            next();
        } else if (clientData.count < maxRequests) {
            clientData.count++;
            next();
        } else {
            res.statusCode = 429;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Too Many Requests' }));
        }
    };
};
