export declare class RequestContextService {
    private readonly namespace;
    constructor();
    set(key: string, value: any): void;
    get<T>(key: string): T;
    run(callback: () => void): void;
}
