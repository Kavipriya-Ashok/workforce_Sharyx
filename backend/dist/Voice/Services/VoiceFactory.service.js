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
var VoiceFactoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceFactoryService = void 0;
const common_1 = require("@nestjs/common");
const Vapi_provider_1 = require("../Providers/Vapi.provider");
const Retell_provider_1 = require("../Providers/Retell.provider");
const Bland_provider_1 = require("../Providers/Bland.provider");
const SaasFallback_provider_1 = require("../Providers/SaasFallback.provider");
let VoiceFactoryService = VoiceFactoryService_1 = class VoiceFactoryService {
    constructor(vapi, retell, bland, saasFallback) {
        this.vapi = vapi;
        this.retell = retell;
        this.bland = bland;
        this.saasFallback = saasFallback;
        this.logger = new common_1.Logger(VoiceFactoryService_1.name);
    }
    getProvider(providerName) {
        const key = (providerName || "vapi").toLowerCase().trim();
        switch (key) {
            case "vapi":
                return this.vapi;
            case "retell":
                return this.retell;
            case "bland":
                return this.bland;
            case "saas_fallback":
                return this.saasFallback;
            default:
                this.logger.warn(`Unknown voice provider "${providerName}", defaulting to Vapi`);
                return this.vapi;
        }
    }
    getAllProviders() {
        return [
            {
                id: "vapi",
                name: "Vapi.ai",
                description: "Ultra-low latency conversational AI with WebRTC & SIP telephony",
            },
            {
                id: "retell",
                name: "Retell AI",
                description: "High-naturalness conversational voice engine with built-in turn-taking",
            },
            {
                id: "bland",
                name: "Bland AI",
                description: "Scalable phone call infrastructure with fast prompt-driven conversational agents",
            },
            {
                id: "saas_fallback",
                name: "Sharyx SaaS Telephony",
                description: "Dedicated PBX trunk fallback for high-volume automated campaigns",
            },
        ];
    }
};
exports.VoiceFactoryService = VoiceFactoryService;
exports.VoiceFactoryService = VoiceFactoryService = VoiceFactoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Vapi_provider_1.VapiProvider,
        Retell_provider_1.RetellProvider,
        Bland_provider_1.BlandProvider,
        SaasFallback_provider_1.SaasFallbackProvider])
], VoiceFactoryService);
//# sourceMappingURL=VoiceFactory.service.js.map