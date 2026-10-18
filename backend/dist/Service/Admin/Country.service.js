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
exports.CountryService = void 0;
const common_1 = require("@nestjs/common");
const country_1 = require("../../Database/Table/Admin/country");
const AuditLogEnum_1 = require("../../Helper/Enum/AuditLogEnum");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const AuditLog_service_1 = require("./AuditLog.service");
const Cache_service_1 = require("../Cache.service");
const CacheEnum_1 = require("../../Helper/Enum/CacheEnum");
let CountryService = class CountryService {
    constructor(_AuditLogService, _CacheService) {
        this._AuditLogService = _AuditLogService;
        this._CacheService = _CacheService;
    }
    async GetAll() {
        const ResultData = await this._CacheService.Get(`${CacheEnum_1.CacheEnum.Country}:*`);
        if (ResultData.length > 0) {
            return ResultData;
        }
        else {
            const CountryList = await country_1.country.find({ relations: ["currency"] });
            await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Country}`, CountryList);
            return CountryList;
        }
    }
    async GetById(CountryId) {
        const ResultData = await this._CacheService.Get(`${CacheEnum_1.CacheEnum.UserRole}:${CountryId}`);
        if (ResultData.length > 0) {
            return ResultData[0];
        }
        else {
            const CountryData = await country_1.country.findOne({ relations: ["currency"], where: { id: CountryId } });
            await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Country}:${CountryId}`, [CountryData]);
            return CountryData;
        }
    }
    async Insert(CountryData, UserId) {
        const _CountryData = new country_1.country();
        _CountryData.name = CountryData.name;
        _CountryData.code = CountryData.code;
        _CountryData.currency_id = CountryData.currency_id;
        _CountryData.created_by_id = UserId;
        _CountryData.created_on = new Date();
        await country_1.country.insert(_CountryData);
        this._AuditLogService.AuditEmitEvent({ PerformedType: country_1.country.name, ActionType: AuditLogEnum_1.LogActionEnum.Insert, PrimaryId: [_CountryData.id] });
        const CacheCountryData = await country_1.country.find({ relations: ["currency"] });
        await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Country}`, [CacheCountryData]);
        return _CountryData;
    }
    async Update(Id, CountryData, UserId) {
        const CompanyUpdateData = await country_1.country.findOne({ where: { id: Id } });
        if (!CompanyUpdateData) {
            throw new Error('Record not found');
        }
        CompanyUpdateData.name = CountryData.name;
        CompanyUpdateData.code = CountryData.code;
        CompanyUpdateData.currency_id = CountryData.currency_id;
        CompanyUpdateData.updated_by_id = UserId;
        CompanyUpdateData.updated_on = new Date();
        await country_1.country.update(Id, CompanyUpdateData);
        this._AuditLogService.AuditEmitEvent({ PerformedType: country_1.country.name, ActionType: AuditLogEnum_1.LogActionEnum.Update, PrimaryId: [CompanyUpdateData.id] });
        await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Country}`, [Object.assign(Object.assign({}, CompanyUpdateData), { id: Id })]);
        return CompanyUpdateData;
    }
    async Delete(Id) {
        const CountryData = await country_1.country.findOne({ where: { id: Id } });
        if (!CountryData) {
            throw new Error(ResponseEnum_1.ResponseEnum.NotFound);
        }
        await CountryData.remove();
        this._AuditLogService.AuditEmitEvent({ PerformedType: country_1.country.name, ActionType: AuditLogEnum_1.LogActionEnum.Delete, PrimaryId: [Id] });
        await this._CacheService.Remove(`${CacheEnum_1.CacheEnum.Country}:${Id}`, CountryData);
        return true;
    }
};
exports.CountryService = CountryService;
exports.CountryService = CountryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [AuditLog_service_1.AuditLogService,
        Cache_service_1.CacheService])
], CountryService);
//# sourceMappingURL=Country.service.js.map