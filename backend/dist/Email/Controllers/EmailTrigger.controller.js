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
exports.EmailTriggerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const AuthBase_controller_1 = require("../../Controller/AuthBase.controller");
const ResponseEnum_1 = require("../../Helper/Enum/ResponseEnum");
const OutcomeTrigger_service_1 = require("../../Service/OutcomeTrigger.service");
let EmailTriggerController = class EmailTriggerController extends AuthBase_controller_1.AuthBaseController {
    constructor(triggerService) {
        super();
        this.triggerService = triggerService;
    }
    async executeTrigger(body) {
        const result = await this.triggerService.executeTrigger(body.channel || "both", body.event, body.context);
        return this.SendResponse(ResponseEnum_1.ResponseEnum.Success, `Trigger executed`, result);
    }
};
exports.EmailTriggerController = EmailTriggerController;
__decorate([
    (0, common_1.Post)("Execute"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailTriggerController.prototype, "executeTrigger", null);
exports.EmailTriggerController = EmailTriggerController = __decorate([
    (0, common_1.Controller)({ path: "Email/Trigger", version: "1" }),
    (0, swagger_1.ApiTags)("Email Outcome Trigger"),
    __metadata("design:paramtypes", [OutcomeTrigger_service_1.OutcomeTriggerService])
], EmailTriggerController);
//# sourceMappingURL=EmailTrigger.controller.js.map