import { Express } from 'express';
import { Query } from 'express-serve-static-core';
import { User, Email } from './email';

declare global {
    namespace Express {
        export interface Request {
            user?: {
                email: string;
                role: string;
            };
            socket?: any;
        }
    }
}

export interface TGetRequest<Q extends Query> extends Express.Request {
    query?: Q;
    //need to add params
    headers: Record<string, unkown>;
    method: 'GET';
}
export interface TPostRequest<B, Q extends Query> extends Express.Request {
    query?: Q;
    body: B;
    headers: Record<string, unkown>;
    method: 'POST' | 'PATCH' | 'PUT';
    idempotencyKey?: string;
}


export type EmailRequest = TPostRequest<Email, {}>;
export {};