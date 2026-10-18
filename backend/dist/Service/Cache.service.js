"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let CacheService = class CacheService {
    constructor(redisClient) {
        this.redisClient = redisClient;
        this.ProjectName = "BoilerPlate:";
    }
    async Get(Key) {
        if (process.env.REDIS_ENABLE == "false") {
            return [];
        }
        const Keys = await this.redisClient.keys(this.ProjectName + Key);
        if (Keys.length > 0) {
            const ResultData = await this.redisClient.mget(...Keys);
            return ResultData.map((data) => JSON.parse(data));
        }
        else {
            return [];
        }
    }
    async Store(Key, DataList) {
        if (process.env.REDIS_ENABLE == "false") {
            return;
        }
        for (const Data of DataList) {
            if (Data.Type == "E") {
                return;
            }
            await this.redisClient.set(`${this.ProjectName + Key}:${Data.id}`, JSON.stringify(Data));
        }
    }
    async Remove(Key, DataList) {
        if (process.env.REDIS_ENABLE == "false") {
            return;
        }
        if (DataList.Type == "E") {
            return;
        }
        await this.redisClient.del(`${this.ProjectName + Key}`);
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)("REDIS_CLIENT")),
    __metadata("design:paramtypes", [ioredis_1.Redis])
], CacheService);
//# sourceMappingURL=Cache.service.js.map