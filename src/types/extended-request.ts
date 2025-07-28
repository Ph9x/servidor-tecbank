import { Request } from "express";

export type ExtendedRequest = Request & {
    userId?: number;
}

export interface ExtendedRequestConta extends Request {
    user?: {
        id: string;
        contaOrigemId?: string;
    };
}
