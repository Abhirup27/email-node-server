import {NextFunction, Request} from "express";

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // we will assume that the client and the user is authenticated and the same as in the request body for now
    req.user = { email:req.body.senderEmail ,role: 'admin' };
    next();
};