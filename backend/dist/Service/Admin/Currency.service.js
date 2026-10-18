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
exports.CurrencyService = void 0;
const common_1 = require("@nestjs/common");
const currency_1 = require("../../Database/Table/Admin/currency");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const AuditLog_service_1 = require("./AuditLog.service");
const AuditLogEnum_1 = require("../../Helper/Enum/AuditLogEnum");
const Cache_service_1 = require("../Cache.service");
const CacheEnum_1 = require("../../Helper/Enum/CacheEnum");
let CurrencyService = class CurrencyService {
    constructor(_AuditLogService, _CacheService) {
        this._AuditLogService = _AuditLogService;
        this._CacheService = _CacheService;
    }
    async GetAll() {
        const ResultData = await this._CacheService.Get(`${CacheEnum_1.CacheEnum.Currency}:*`);
        if (ResultData.length > 0) {
            return ResultData;
        }
        else {
            const CurrencyList = await currency_1.currency.find();
            await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Currency}`, CurrencyList);
            return CurrencyList;
        }
    }
    async GetById(CurrencyId) {
        const ResultData = await this._CacheService.Get(`${CacheEnum_1.CacheEnum.Currency}:${CurrencyId}`);
        if (ResultData.length > 0) {
            return ResultData[0];
        }
        else {
            const CurrencyData = await currency_1.currency.findOne({ where: { id: CurrencyId } });
            await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Currency}:${CurrencyId}`, [CurrencyData]);
            return CurrencyData;
        }
    }
    async Insert(CurrencyData, UserId) {
        const _CurrencyData = new currency_1.currency();
        _CurrencyData.name = CurrencyData.name;
        _CurrencyData.code = CurrencyData.code;
        _CurrencyData.symbol = CurrencyData.symbol;
        _CurrencyData.created_by_id = UserId;
        _CurrencyData.created_on = new Date();
        await currency_1.currency.insert(_CurrencyData);
        this._AuditLogService.AuditEmitEvent({ PerformedType: currency_1.currency.name, ActionType: AuditLogEnum_1.LogActionEnum.Insert, PrimaryId: [_CurrencyData.id] });
        await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Currency}`, [_CurrencyData]);
        return _CurrencyData;
    }
    async Update(Id, CurrencyData, UserId) {
        const CurrencyUpdateData = await currency_1.currency.findOne({ where: { id: Id } });
        if (!CurrencyUpdateData) {
            throw new Error('Record not found');
        }
        CurrencyUpdateData.name = CurrencyData.name;
        CurrencyUpdateData.code = CurrencyData.code;
        CurrencyUpdateData.symbol = CurrencyData.symbol;
        CurrencyUpdateData.updated_by_id = UserId;
        CurrencyUpdateData.updated_on = new Date();
        await currency_1.currency.update(Id, CurrencyUpdateData);
        this._AuditLogService.AuditEmitEvent({ PerformedType: currency_1.currency.name, ActionType: AuditLogEnum_1.LogActionEnum.Update, PrimaryId: [CurrencyUpdateData.id] });
        await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Currency}`, [Object.assign(Object.assign({}, CurrencyUpdateData), { id: Id })]);
        return CurrencyUpdateData;
    }
    async Delete(Id) {
        const CurrencyData = await currency_1.currency.findOne({ where: { id: Id } });
        if (!CurrencyData) {
            throw new Error(ResponseEnum_1.ResponseEnum.NotFound);
        }
        await CurrencyData.remove();
        this._AuditLogService.AuditEmitEvent({ PerformedType: currency_1.currency.name, ActionType: AuditLogEnum_1.LogActionEnum.Delete, PrimaryId: [CurrencyData.id] });
        await this._CacheService.Remove(`${CacheEnum_1.CacheEnum.Currency}:${Id}`, CurrencyData);
        return true;
    }
};
exports.CurrencyService = CurrencyService;
exports.CurrencyService = CurrencyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [AuditLog_service_1.AuditLogService,
        Cache_service_1.CacheService])
], CurrencyService);
//# sourceMappingURL=Currency.service.js.map