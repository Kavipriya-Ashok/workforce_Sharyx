import { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
export declare class ExceptionHelper implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost): Promise<void>;
}
