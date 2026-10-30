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
exports.CustomerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const Customer_service_1 = require("../../Service/Customer/Customer.service");
let CustomerController = class CustomerController {
    constructor(customerService) {
        this.customerService = customerService;
    }
    async list(query, req) {
        return await this.customerService.list(query, req.user);
    }
    async listDeals(tenantId) {
        return await this.customerService.listDeals(tenantId || "default");
    }
    async getById(id) {
        return await this.customerService.getById(id);
    }
    async insert(body, req) {
        var _a;
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || "system";
        return await this.customerService.insert(body, userId);
    }
    async update(id, body, req) {
        var _a;
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || "system";
        return await this.customerService.update(id, body, userId);
    }
    async delete(id) {
        return await this.customerService.delete(id);
    }
};
exports.CustomerController = CustomerController;
__decorate([
    (0, common_1.Get)("List"),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("Deals"),
    __param(0, (0, common_1.Query)("tenant_id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "listDeals", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getById", null);
__decorate([
    (0, common_1.Post)("Insert"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "insert", null);
__decorate([
    (0, common_1.Put)("Update/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)("Delete/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "delete", null);
exports.CustomerController = CustomerController = __decorate([
    (0, common_1.Controller)({
        path: ["Customer", "api/Customer", "api/v1/Customer"],
        version: ["1", common_1.VERSION_NEUTRAL],
    }),
    (0, swagger_1.ApiTags)("Customer 360"),
    __metadata("design:paramtypes", [Customer_service_1.CustomerService])
], CustomerController);
//# sourceMappingURL=Customer.controller.js.map