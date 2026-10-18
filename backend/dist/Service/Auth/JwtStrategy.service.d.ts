import { ConfigService } from '@nestjs/config';
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private _ConfigService;
    constructor(_ConfigService: ConfigService);
    validate(payload: any): Promise<any>;
}
export {};
