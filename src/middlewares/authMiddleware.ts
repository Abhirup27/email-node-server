import {NextFunction, Request} from "express";

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // ... auth logic
    req.user = { id: '123', role: 'admin' };
    next();
};