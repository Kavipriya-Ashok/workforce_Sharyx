import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '@Service/Admin/Request-Context.service';
export declare class IpMiddleware implements NestMiddleware {
    private readonly contextService;
    constructor(contextService: RequestContextService);
    use(req: Request, res: Response, next: NextFunction): void;
}
