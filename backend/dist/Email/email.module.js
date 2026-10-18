"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailModule = void 0;
const common_1 = require("@nestjs/common");
const Email_controller_1 = require("./Controllers/Email.controller");
const EmailAI_controller_1 = require("./Controllers/EmailAI.controller");
const EmailCampaign_controller_1 = require("./Controllers/EmailCampaign.controller");
const Email_service_1 = require("./Services/Email.service");
const EmailAI_service_1 = require("./Services/EmailAI.service");
const EmailCampaign_service_1 = require("./Services/EmailCampaign.service");
const EmailImap_service_1 = require("./Services/EmailImap.service");
const Encryption_service_1 = require("../Service/Encryption.service");
let EmailModule = class EmailModule {
};
exports.EmailModule = EmailModule;
exports.EmailModule = EmailModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            Email_controller_1.EmailController,
            EmailAI_controller_1.EmailAIController,
            EmailCampaign_controller_1.EmailCampaignController,
        ],
        providers: [
            Email_service_1.EmailService,
            EmailAI_service_1.EmailAIService,
            EmailCampaign_service_1.EmailCampaignService,
            EmailImap_service_1.EmailImapService,
            Encryption_service_1.EncryptionService,
        ],
        exports: [
            Email_service_1.EmailService,
            EmailAI_service_1.EmailAIService,
            EmailCampaign_service_1.EmailCampaignService,
            EmailImap_service_1.EmailImapService,
        ],
    })
], EmailModule);
//# sourceMappingURL=email.module.js.map