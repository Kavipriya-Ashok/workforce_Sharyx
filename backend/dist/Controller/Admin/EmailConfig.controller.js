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
exports.EmailConfigController = void 0;
const common_1 = require("@nestjs/common");
const EmailConfig_model_1 = require("../../Model/Admin/EmailConfig.model");
const Common_helper_1 = require("../../Helper/Common.helper");
const swagger_1 = require("@nestjs/swagger");
const EmailConfig_service_1 = require("../../Service/Admin/EmailConfig.service");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const JWTAuth_controller_1 = require("../JWTAuth.controller");
let EmailConfigController = class EmailConfigController extends JWTAuth_controller_1.JWTAuthController {
    constructor(_EmailConfigService) {
        super();
        this._EmailConfigService = _EmailConfigService;
    }
    async EmailConfig() {
        const EmailData = await this._EmailConfigService.GetWithoutPasswordById();
        return EmailData;
    }
    async Update(EmailConfigData, UserId) {
        if (EmailConfigData.id > "0") {
            await this._EmailConfigService.Update(EmailConfigData.id, EmailConfigData, UserId);
        }
        else {
            await this._EmailConfigService.Insert(EmailConfigData, UserId);
        }
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, ResponseEnum_1.ResponseEnum.Updated);
    }
};
exports.EmailConfigController = EmailConfigController;
__decorate([
    (0, common_1.Get)(''),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailConfigController.prototype, "EmailConfig", null);
__decorate([
    (0, common_1.Patch)('Update'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, Common_helper_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmailConfig_model_1.EmailConfigModel, String]),
    __metadata("design:returntype", Promise)
], EmailConfigController.prototype, "Update", null);
exports.EmailConfigController = EmailConfigController = __decorate([
    (0, common_1.Controller)({ path: "EmailConfig", version: '1' }),
    (0, swagger_1.ApiTags)("Email Config"),
    __metadata("design:paramtypes", [EmailConfig_service_1.EmailConfigService])
], EmailConfigController);
//# sourceMappingURL=EmailConfig.controller.js.map