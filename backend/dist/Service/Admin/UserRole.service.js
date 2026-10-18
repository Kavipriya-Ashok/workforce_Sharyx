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
exports.UserRoleService = void 0;
const common_1 = require("@nestjs/common");
const user_role_1 = require("../../Database/Table/Admin/user_role");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const typeorm_1 = require("typeorm");
const AuditLog_service_1 = require("./AuditLog.service");
const AuditLogEnum_1 = require("../../Helper/Enum/AuditLogEnum");
const Cache_service_1 = require("../Cache.service");
const CacheEnum_1 = require("../../Helper/Enum/CacheEnum");
let UserRoleService = class UserRoleService {
    constructor(_AuditLogService, _CacheService) {
        this._AuditLogService = _AuditLogService;
        this._CacheService = _CacheService;
    }
    async GetAll() {
        const ResultData = await this._CacheService.Get(`${CacheEnum_1.CacheEnum.UserRole}:*`);
        if (ResultData.length > 0) {
            return ResultData;
        }
        else {
            const UserRoleList = await user_role_1.user_role.find();
            await this._CacheService.Store(`${CacheEnum_1.CacheEnum.UserRole}`, UserRoleList);
            return UserRoleList;
        }
    }
    async GetAllExpectSuperAdmin() {
        const ResultData = await this._CacheService.Get(`${CacheEnum_1.CacheEnum.UserRole}:*`);
        if (ResultData.length > 0) {
            return ResultData;
        }
        else {
            const UserRoleList = await user_role_1.user_role.find({
                where: { created_by_id: (0, typeorm_1.Not)("0") },
            });
            await this._CacheService.Store(`${CacheEnum_1.CacheEnum.UserRole}`, UserRoleList);
            return UserRoleList;
        }
    }
    async GetById(UserRoleId) {
        const ResultData = await this._CacheService.Get(`${CacheEnum_1.CacheEnum.UserRole}:${UserRoleId}`);
        if (ResultData.length > 0) {
            return ResultData[0];
        }
        else {
            const UserRoleData = await user_role_1.user_role.findOne({
                where: { id: UserRoleId },
            });
            await this._CacheService.Store(`${CacheEnum_1.CacheEnum.UserRole}:${UserRoleId}`, [
                UserRoleData,
            ]);
            return UserRoleData;
        }
    }
    async Insert(UserRoleData, UserId) {
        const _UserRoleData = new user_role_1.user_role();
        _UserRoleData.name = UserRoleData.name;
        _UserRoleData.code = UserRoleData.code;
        _UserRoleData.created_by_id = UserId;
        _UserRoleData.created_on = new Date();
        await user_role_1.user_role.insert(_UserRoleData);
        this._AuditLogService.AuditEmitEvent({
            PerformedType: user_role_1.user_role.name,
            ActionType: AuditLogEnum_1.LogActionEnum.Insert,
            PrimaryId: [_UserRoleData.id],
        });
        await this._CacheService.Store(`${CacheEnum_1.CacheEnum.UserRole}`, [_UserRoleData]);
        return _UserRoleData;
    }
    async Update(Id, UserRoleData, UserId) {
        const UserRoleUpdateData = await user_role_1.user_role.findOne({ where: { id: Id } });
        if (!UserRoleUpdateData) {
            throw new Error("Record not found");
        }
        UserRoleUpdateData.name = UserRoleData.name;
        UserRoleUpdateData.code = UserRoleData.code;
        UserRoleUpdateData.updated_by_id = UserId;
        UserRoleUpdateData.updated_on = new Date();
        await user_role_1.user_role.update(Id, UserRoleUpdateData);
        this._AuditLogService.AuditEmitEvent({
            PerformedType: user_role_1.user_role.name,
            ActionType: AuditLogEnum_1.LogActionEnum.Update,
            PrimaryId: [UserRoleUpdateData.id],
        });
        await this._CacheService.Store(`${CacheEnum_1.CacheEnum.UserRole}`, [
            Object.assign(Object.assign({}, UserRoleUpdateData), { id: Id }),
        ]);
        return UserRoleUpdateData;
    }
    async Delete(Id) {
        const UserRoleData = await user_role_1.user_role.findOne({ where: { id: Id } });
        if (!UserRoleData) {
            throw new Error(ResponseEnum_1.ResponseEnum.NotFound);
        }
        await UserRoleData.remove();
        this._AuditLogService.AuditEmitEvent({
            PerformedType: user_role_1.user_role.name,
            ActionType: AuditLogEnum_1.LogActionEnum.Delete,
            PrimaryId: [UserRoleData.id],
        });
        await this._CacheService.Remove(`${CacheEnum_1.CacheEnum.UserRole}:${Id}`, UserRoleData);
        return true;
    }
};
exports.UserRoleService = UserRoleService;
exports.UserRoleService = UserRoleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [AuditLog_service_1.AuditLogService,
        Cache_service_1.CacheService])
], UserRoleService);
//# sourceMappingURL=UserRole.service.js.map