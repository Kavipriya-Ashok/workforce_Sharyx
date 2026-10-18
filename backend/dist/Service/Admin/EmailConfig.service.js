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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailConfigService = void 0;
const common_1 = require("@nestjs/common");
const email_config_1 = require("../../Database/Table/Admin/email_config");
const Encryption_service_1 = require("../Encryption.service");
const Cache_service_1 = require("../Cache.service");
const CacheEnum_1 = require("../../Helper/Enum/CacheEnum");
let EmailConfigService = class EmailConfigService {
    constructor(_EncryptionService, _CacheService) {
        this._EncryptionService = _EncryptionService;
        this._CacheService = _CacheService;
    }
    async GetWithoutPasswordById() {
        const ResultData = await this._CacheService.Get(`${CacheEnum_1.CacheEnum.EmailConfig}:*`);
        if (ResultData.length > 0) {
            return ResultData[0];
        }
        else {
            const EmailConfigData = await email_config_1.email_config.find();
            if (EmailConfigData.length == 1) {
                delete EmailConfigData[0].password;
            }
            await this._CacheService.Store(`${CacheEnum_1.CacheEnum.EmailConfig}`, EmailConfigData);
            return EmailConfigData[0];
        }
    }
    async Update(Id, EmailConfigData, UserId) {
        const EmailConfigUpdateData = await email_config_1.email_config.findOne({ where: { id: Id } });
        if (!EmailConfigUpdateData) {
            throw new Error('Record not found');
        }
        EmailConfigUpdateData.email_id = EmailConfigData.email_id;
        EmailConfigUpdateData.password = EmailConfigData.password;
        EmailConfigUpdateData.mailer_name = EmailConfigData.mailer_name;
        EmailConfigUpdateData.host = EmailConfigData.host;
        EmailConfigUpdateData.password = this._EncryptionService.Encrypt(EmailConfigData.password);
        EmailConfigUpdateData.updated_by_id = UserId;
        EmailConfigUpdateData.updated_on = new Date();
        await email_config_1.email_config.update(Id, EmailConfigUpdateData);
        await this._CacheService.Store(`${CacheEnum_1.CacheEnum.EmailConfig}`, [Object.assign(Object.assign({}, EmailConfigUpdateData), { id: Id })]);
        return EmailConfigUpdateData;
    }
    async Insert(EmailConfigData, UserId) {
        const _EmailConfigData = new email_config_1.email_config();
        _EmailConfigData.email_id = EmailConfigData.email_id;
        _EmailConfigData.password = EmailConfigData.password;
        _EmailConfigData.mailer_name = EmailConfigData.mailer_name;
        _EmailConfigData.host = EmailConfigData.host;
        _EmailConfigData.password = this._EncryptionService.Encrypt(EmailConfigData.password);
        _EmailConfigData.created_by_id = UserId;
        _EmailConfigData.created_on = new Date();
        await email_config_1.email_config.insert(_EmailConfigData);
        await this._CacheService.Store(`${CacheEnum_1.CacheEnum.EmailConfig}`, [_EmailConfigData]);
        return _EmailConfigData;
    }
};
exports.EmailConfigService = EmailConfigService;
exports.EmailConfigService = EmailConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Encryption_service_1.EncryptionService,
        Cache_service_1.CacheService])
], EmailConfigService);
//# sourceMappingURL=EmailConfig.service.js.map