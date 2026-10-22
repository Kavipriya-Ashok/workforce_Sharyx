"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceModule = void 0;
const common_1 = require("@nestjs/common");
const Vapi_provider_1 = require("./Providers/Vapi.provider");
const Retell_provider_1 = require("./Providers/Retell.provider");
const Bland_provider_1 = require("./Providers/Bland.provider");
const SaasFallback_provider_1 = require("./Providers/SaasFallback.provider");
const VoiceFactory_service_1 = require("./Services/VoiceFactory.service");
const VoiceAgent_service_1 = require("./Services/VoiceAgent.service");
const VoiceCall_service_1 = require("./Services/VoiceCall.service");
const VoiceConfig_service_1 = require("./Services/VoiceConfig.service");
const VoiceAgent_controller_1 = require("./Controllers/VoiceAgent.controller");
const VoiceCall_controller_1 = require("./Controllers/VoiceCall.controller");
const VoiceConfig_controller_1 = require("./Controllers/VoiceConfig.controller");
const VoiceWebhook_controller_1 = require("./Controllers/VoiceWebhook.controller");
let VoiceModule = class VoiceModule {
};
exports.VoiceModule = VoiceModule;
exports.VoiceModule = VoiceModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            VoiceAgent_controller_1.VoiceAgentController,
            VoiceCall_controller_1.VoiceCallController,
            VoiceConfig_controller_1.VoiceConfigController,
            VoiceWebhook_controller_1.VoiceWebhookController,
        ],
        providers: [
            Vapi_provider_1.VapiProvider,
            Retell_provider_1.RetellProvider,
            Bland_provider_1.BlandProvider,
            SaasFallback_provider_1.SaasFallbackProvider,
            VoiceFactory_service_1.VoiceFactoryService,
            VoiceAgent_service_1.VoiceAgentService,
            VoiceCall_service_1.VoiceCallService,
            VoiceConfig_service_1.VoiceConfigService,
        ],
        exports: [VoiceAgent_service_1.VoiceAgentService, VoiceCall_service_1.VoiceCallService, VoiceFactory_service_1.VoiceFactoryService, VoiceConfig_service_1.VoiceConfigService],
    })
], VoiceModule);
//# sourceMappingURL=voice.module.js.map