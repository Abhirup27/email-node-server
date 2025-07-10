import { Express } from 'express';
import { Query } from 'express-serve-static-core';
import { User, Email } from './email';

declare global {
    namespace Express {
        export interface Request {
            user?: {
                id: string;
                role: string;
            };

        }
    }
}

export interface TGetRequest<Q extends Query> extends Express.Request {
    user?: User;
    query?: Q;
    //need to add params
    headers: Record<string, unkown>;
    method: 'GET';
}
export interface TPostRequest<B, Q extends Query> extends Express.Request {
    user?: User;
    query?: Q;
    body: B;
    headers: Record<string, unkown>;
    method: 'POST' | 'PATCH' | 'PUT';
}


export type EmailRequest = TPostRequest<Email, {}>;
export {};