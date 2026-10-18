"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppModule = void 0;
const common_1 = require("@nestjs/common");
const WhatsApp_controller_1 = require("./Controllers/WhatsApp.controller");
const WhatsAppWebhook_controller_1 = require("./Controllers/WhatsAppWebhook.controller");
const WhatsAppAI_controller_1 = require("./Controllers/WhatsAppAI.controller");
const WhatsAppCampaign_controller_1 = require("./Controllers/WhatsAppCampaign.controller");
const WhatsAppTemplate_controller_1 = require("./Controllers/WhatsAppTemplate.controller");
const WhatsApp_service_1 = require("./Services/WhatsApp.service");
const WhatsAppAI_service_1 = require("./Services/WhatsAppAI.service");
const WhatsAppWebhook_service_1 = require("./Services/WhatsAppWebhook.service");
const WhatsAppCampaign_service_1 = require("./Services/WhatsAppCampaign.service");
const WhatsAppTemplate_service_1 = require("./Services/WhatsAppTemplate.service");
const PromptEngine_service_1 = require("./Services/PromptEngine.service");
let WhatsAppModule = class WhatsAppModule {
};
exports.WhatsAppModule = WhatsAppModule;
exports.WhatsAppModule = WhatsAppModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            WhatsApp_controller_1.WhatsAppController,
            WhatsAppWebhook_controller_1.WhatsAppWebhookController,
            WhatsAppAI_controller_1.WhatsAppAIController,
            WhatsAppCampaign_controller_1.WhatsAppCampaignController,
            WhatsAppTemplate_controller_1.WhatsAppTemplateController,
        ],
        providers: [
            WhatsApp_service_1.WhatsAppService,
            WhatsAppAI_service_1.WhatsAppAIService,
            WhatsAppWebhook_service_1.WhatsAppWebhookService,
            WhatsAppCampaign_service_1.WhatsAppCampaignService,
            WhatsAppTemplate_service_1.WhatsAppTemplateService,
            PromptEngine_service_1.PromptEngineService,
        ],
        exports: [
            WhatsApp_service_1.WhatsAppService,
            WhatsAppAI_service_1.WhatsAppAIService,
            WhatsAppWebhook_service_1.WhatsAppWebhookService,
            WhatsAppCampaign_service_1.WhatsAppCampaignService,
            WhatsAppTemplate_service_1.WhatsAppTemplateService,
            PromptEngine_service_1.PromptEngineService,
        ],
    })
], WhatsAppModule);
//# sourceMappingURL=whatsapp.module.js.map