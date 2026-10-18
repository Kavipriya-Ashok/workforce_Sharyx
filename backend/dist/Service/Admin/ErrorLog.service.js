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
exports.ErrorLogService = void 0;
const common_1 = require("@nestjs/common");
const error_log_1 = require("../../Database/Table/Admin/error_log");
const typeorm_1 = require("typeorm");
let ErrorLogService = class ErrorLogService {
    constructor(_DataSource) {
        this._DataSource = _DataSource;
    }
    async LazyLoadList(ErrorLogLazyLoadData) {
        const queryBuilder = this._DataSource.manager.createQueryBuilder(error_log_1.error_log, 'el');
        queryBuilder
            .select(['el.*', 'SUM(1) OVER() AS total_count'])
            .where('el.created_on BETWEEN :start_date AND :end_date', {
            start_date: ErrorLogLazyLoadData.start_date,
            end_date: ErrorLogLazyLoadData.end_date,
        });
        queryBuilder.andWhere('el.created_by_id = :user_id', {
            user_id: ErrorLogLazyLoadData.user_id,
        });
        queryBuilder.orderBy('el.created_on', 'DESC');
        queryBuilder
            .limit(ErrorLogLazyLoadData.take)
            .offset(ErrorLogLazyLoadData.skip);
        return await queryBuilder.getRawMany();
    }
    async DeleteByAsOfDate(ErrorLogDeleteData) {
        if (ErrorLogDeleteData.password == "Login@321!!") {
            await error_log_1.error_log.delete({ created_on: (0, typeorm_1.LessThanOrEqual)(ErrorLogDeleteData.as_of_date) });
        }
        else {
            throw new Error("Password incorrect");
        }
    }
};
exports.ErrorLogService = ErrorLogService;
exports.ErrorLogService = ErrorLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ErrorLogService);
//# sourceMappingURL=ErrorLog.service.js.map