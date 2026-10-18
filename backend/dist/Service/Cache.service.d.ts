import { Redis } from 'ioredis';
export declare class CacheService {
    private readonly redisClient;
    private ProjectName;
    constructor(redisClient: Redis);
    Get(Key: string): Promise<any[]>;
    Store(Key: string, DataList: any): Promise<void>;
    Remove(Key: string, DataList: any): Promise<void>;
}
