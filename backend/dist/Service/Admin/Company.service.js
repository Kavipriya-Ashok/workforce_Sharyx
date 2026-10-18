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
exports.CompanyService = void 0;
const common_1 = require("@nestjs/common");
const company_1 = require("../../Database/Table/Admin/company");
const AuditLogEnum_1 = require("../../Helper/Enum/AuditLogEnum");
const typeorm_1 = require("typeorm");
const AuditLog_service_1 = require("./AuditLog.service");
const Cache_service_1 = require("../Cache.service");
const CacheEnum_1 = require("../../Helper/Enum/CacheEnum");
let CompanyService = class CompanyService {
    constructor(_AuditLogService, _DataSource, _CacheService) {
        this._AuditLogService = _AuditLogService;
        this._DataSource = _DataSource;
        this._CacheService = _CacheService;
    }
    async Get() {
        const ResultData = await this._CacheService.Get(`${CacheEnum_1.CacheEnum.Company}:*`);
        if (ResultData.length > 0) {
            return ResultData[0];
        }
        else {
            const CompanyData = await company_1.company.find();
            await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Company}`, CompanyData);
            return CompanyData[0];
        }
    }
    async Update(Id, CompanyData, UserId) {
        const CompanyUpdateData = await company_1.company.findOne({ where: { id: Id } });
        if (!CompanyUpdateData) {
            throw new Error('Record not found');
        }
        CompanyUpdateData.name = CompanyData.name;
        CompanyUpdateData.address = CompanyData.address;
        CompanyUpdateData.country_id = CompanyData.country_id;
        CompanyUpdateData.currency_id = CompanyData.currency_id;
        CompanyUpdateData.postal_code = CompanyData.postal_code;
        CompanyUpdateData.email = CompanyData.email;
        CompanyUpdateData.website = CompanyData.website;
        CompanyUpdateData.uen_no = CompanyData.uen_no;
        CompanyUpdateData.bank_name = CompanyData.bank_name;
        CompanyUpdateData.bank_acct_no = CompanyData.bank_acct_no;
        CompanyUpdateData.telephone_no = CompanyData.telephone_no;
        CompanyUpdateData.fax_no = CompanyData.fax_no;
        CompanyUpdateData.invoice_footer = CompanyData.invoice_footer;
        CompanyUpdateData.updated_by_id = UserId;
        CompanyUpdateData.updated_on = new Date();
        await company_1.company.update(Id, CompanyUpdateData);
        this._AuditLogService.AuditEmitEvent({ PerformedType: company_1.company.name, ActionType: AuditLogEnum_1.LogActionEnum.Update, PrimaryId: [CompanyUpdateData.id] });
        await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Company}`, [Object.assign(Object.assign({}, CompanyUpdateData), { id: Id })]);
        return CompanyUpdateData;
    }
    async Insert(CompanyData, UserId) {
        const _CompanyData = new company_1.company();
        _CompanyData.name = CompanyData.name;
        _CompanyData.address = CompanyData.address;
        _CompanyData.country_id = CompanyData.country_id;
        _CompanyData.currency_id = CompanyData.currency_id;
        _CompanyData.postal_code = CompanyData.postal_code;
        _CompanyData.email = CompanyData.email;
        _CompanyData.website = CompanyData.website;
        _CompanyData.uen_no = CompanyData.uen_no;
        _CompanyData.bank_name = CompanyData.bank_name;
        _CompanyData.bank_acct_no = CompanyData.bank_acct_no;
        _CompanyData.telephone_no = CompanyData.telephone_no;
        _CompanyData.fax_no = CompanyData.fax_no;
        _CompanyData.invoice_footer = CompanyData.invoice_footer;
        _CompanyData.created_by_id = UserId;
        _CompanyData.created_on = new Date();
        await company_1.company.insert(_CompanyData);
        this._AuditLogService.AuditEmitEvent({ PerformedType: company_1.company.name, ActionType: AuditLogEnum_1.LogActionEnum.Insert, PrimaryId: [_CompanyData.id] });
        await this._CacheService.Store(`${CacheEnum_1.CacheEnum.Company}`, [_CompanyData]);
        return _CompanyData;
    }
};
exports.CompanyService = CompanyService;
exports.CompanyService = CompanyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [AuditLog_service_1.AuditLogService,
        typeorm_1.DataSource,
        Cache_service_1.CacheService])
], CompanyService);
//# sourceMappingURL=Company.service.js.map