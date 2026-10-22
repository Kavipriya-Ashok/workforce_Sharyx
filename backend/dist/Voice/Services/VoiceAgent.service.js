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
var VoiceAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceAgentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const VoiceAgent_entity_1 = require("../../Database/Table/Voice/VoiceAgent.entity");
const VoiceProviderConfig_entity_1 = require("../../Database/Table/Voice/VoiceProviderConfig.entity");
const VoiceFactory_service_1 = require("./VoiceFactory.service");
let VoiceAgentService = VoiceAgentService_1 = class VoiceAgentService {
    constructor(factory) {
        this.factory = factory;
        this.logger = new common_1.Logger(VoiceAgentService_1.name);
    }
    async list(tenantId = "default") {
        const activeConfigs = await VoiceProviderConfig_entity_1.VoiceProviderConfig.find({
            where: { tenant_id: tenantId, is_active: true },
        });
        const activeProviders = activeConfigs
            .filter((c) => c.api_key && c.api_key.trim().length > 0)
            .map((c) => c.provider);
        if (activeProviders.length === 0) {
            return [];
        }
        for (const cfg of activeConfigs) {
            if (cfg.api_key && cfg.is_active) {
                try {
                    await this.syncFromProvider(cfg.provider, tenantId);
                }
                catch (err) {
                    this.logger.warn(`Auto-sync on list failed for ${cfg.provider}: ${err.message}`);
                }
            }
        }
        const agents = await VoiceAgent_entity_1.VoiceAgent.find({
            where: {
                tenant_id: tenantId,
                status: true,
                provider: (0, typeorm_1.In)(activeProviders),
            },
            order: { created_on: "DESC" },
        });
        return agents;
    }
    async syncFromProvider(providerName = "vapi", tenantId = "default") {
        var _a, _b, _c, _d, _e, _f, _g;
        const provider = this.factory.getProvider(providerName);
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: providerName, is_active: true },
        });
        if (provider.listRemoteAgents) {
            const remotes = await provider.listRemoteAgents(config || undefined);
            this.logger.log(`🔄 [SYNC] Found ${remotes.length} assistants on ${providerName}`);
            for (const rem of remotes) {
                const remoteId = String(rem.id || rem.agent_id || rem.remote_id);
                let existing = await VoiceAgent_entity_1.VoiceAgent.findOne({
                    where: { tenant_id: tenantId, remote_agent_id: remoteId },
                });
                if (!existing && rem.name) {
                    existing = await VoiceAgent_entity_1.VoiceAgent.findOne({
                        where: { tenant_id: tenantId, name: rem.name, provider: providerName },
                    });
                }
                if (!existing) {
                    existing = new VoiceAgent_entity_1.VoiceAgent();
                    existing.tenant_id = tenantId;
                    existing.created_by_id = "provider_sync";
                    existing.created_on = new Date();
                }
                existing.name = rem.name || "Remote Voice Agent";
                existing.provider = providerName;
                existing.remote_agent_id = remoteId;
                existing.system_prompt =
                    ((_c = (_b = (_a = rem.model) === null || _a === void 0 ? void 0 : _a.messages) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) ||
                        rem.prompt ||
                        rem.system_prompt ||
                        rem.description ||
                        existing.system_prompt ||
                        "You are an AI assistant.";
                existing.first_message =
                    rem.firstMessage ||
                        rem.first_message ||
                        rem.welcome_message ||
                        existing.first_message ||
                        "Hello! How can I help you?";
                existing.voice_id =
                    ((_d = rem.voice) === null || _d === void 0 ? void 0 : _d.voiceId) ||
                        ((_e = rem.voice) === null || _e === void 0 ? void 0 : _e.id) ||
                        rem.voice_id ||
                        existing.voice_id ||
                        (providerName === "saas_fallback" ? "en-IN-Wavenet-D" : "21m00Tcm4TlvDq8ikWAM");
                existing.voice_provider =
                    ((_f = rem.voice) === null || _f === void 0 ? void 0 : _f.provider) ||
                        rem.voice_provider ||
                        existing.voice_provider ||
                        (providerName === "saas_fallback" ? "google" : "elevenlabs");
                existing.llm_model =
                    ((_g = rem.model) === null || _g === void 0 ? void 0 : _g.model) ||
                        rem.model ||
                        existing.llm_model ||
                        (providerName === "saas_fallback" ? "gemini-2.0-flash" : "gpt-4o-mini");
                existing.status = true;
                existing.raw_provider_response = rem;
                existing.updated_on = new Date();
                await existing.save();
                this.logger.log(`✅ [SYNCED AGENT] ${existing.name} (${existing.remote_agent_id})`);
            }
            if (remotes.length > 0) {
                const existingList = await VoiceAgent_entity_1.VoiceAgent.find({
                    where: { tenant_id: tenantId, provider: providerName, status: true },
                });
                for (const ag of existingList) {
                    if (ag.remote_agent_id &&
                        (ag.remote_agent_id.startsWith("vapi_asst_") ||
                            ag.remote_agent_id.startsWith("saas_agent_") ||
                            ag.remote_agent_id.startsWith("retell_agent_") ||
                            ag.remote_agent_id.startsWith("bland_agent_"))) {
                        ag.status = false;
                        await ag.save();
                    }
                }
            }
        }
        return await VoiceAgent_entity_1.VoiceAgent.find({
            where: { tenant_id: tenantId, status: true },
            order: { created_on: "DESC" },
        });
    }
    async getOne(id, tenantId = "default") {
        const agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { id, tenant_id: tenantId, status: true } });
        if (!agent)
            throw new common_1.NotFoundException(`Voice Agent ${id} not found`);
        return agent;
    }
    async create(dto, tenantId = "default") {
        var _a;
        const provider = this.factory.getProvider(dto.provider);
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: dto.provider, is_active: true },
        });
        const remote = await provider.createAgent(dto, config || undefined);
        const agent = new VoiceAgent_entity_1.VoiceAgent();
        agent.tenant_id = tenantId;
        agent.name = dto.name;
        agent.provider = dto.provider;
        agent.remote_agent_id = remote.remoteAgentId;
        agent.system_prompt = dto.system_prompt;
        agent.first_message = dto.first_message || "Hello! Thank you for connecting with us.";
        agent.voice_id = dto.voice_id || "21m00Tcm4TlvDq8ikWAM";
        agent.voice_provider = dto.voice_provider || "elevenlabs";
        agent.llm_model = dto.llm_model || "gpt-4o-mini";
        agent.temperature = (_a = dto.temperature) !== null && _a !== void 0 ? _a : 0.4;
        agent.language = dto.language || "en";
        agent.allowed_tools = dto.allowed_tools || ["book_appointment", "qualify_lead", "email_meeting_link"];
        agent.transfer_agent_id = dto.transfer_agent_id;
        agent.transfer_phone_number = dto.transfer_phone_number;
        agent.raw_provider_response = remote.raw;
        agent.created_by_id = "voice_service";
        agent.created_on = new Date();
        await agent.save();
        this.logger.log(`🎙️ Voice Agent saved: ${agent.name} [${agent.provider} | ${agent.remote_agent_id}]`);
        return agent;
    }
    async update(id, dto, tenantId = "default") {
        const agent = await this.getOne(id, tenantId);
        const provider = this.factory.getProvider(agent.provider);
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: agent.provider, is_active: true },
        });
        if (agent.remote_agent_id) {
            await provider.updateAgent(agent.remote_agent_id, dto, config || undefined);
        }
        if (dto.name)
            agent.name = dto.name;
        if (dto.system_prompt)
            agent.system_prompt = dto.system_prompt;
        if (dto.first_message)
            agent.first_message = dto.first_message;
        if (dto.voice_id)
            agent.voice_id = dto.voice_id;
        if (dto.voice_provider)
            agent.voice_provider = dto.voice_provider;
        if (dto.llm_model)
            agent.llm_model = dto.llm_model;
        if (dto.temperature !== undefined)
            agent.temperature = dto.temperature;
        if (dto.language)
            agent.language = dto.language;
        if (dto.allowed_tools)
            agent.allowed_tools = dto.allowed_tools;
        if (dto.transfer_agent_id !== undefined)
            agent.transfer_agent_id = dto.transfer_agent_id;
        if (dto.transfer_phone_number !== undefined)
            agent.transfer_phone_number = dto.transfer_phone_number;
        agent.updated_on = new Date();
        await agent.save();
        return agent;
    }
    async remove(id, tenantId = "default") {
        const agent = await this.getOne(id, tenantId);
        const provider = this.factory.getProvider(agent.provider);
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: agent.provider, is_active: true },
        });
        if (agent.remote_agent_id) {
            await provider.deleteAgent(agent.remote_agent_id, config || undefined);
        }
        agent.status = false;
        await agent.save();
        return true;
    }
    async seedDefaults(tenantId) {
        const count = await VoiceAgent_entity_1.VoiceAgent.count({ where: { tenant_id: tenantId } });
        if (count > 0)
            return;
        this.logger.log(`🌱 Seeding default multi-provider voice agents for tenant ${tenantId}...`);
        const defaults = [
            {
                name: "Voice Receptionist (Vapi)",
                provider: "vapi",
                system_prompt: `You are the AI Front-Desk Receptionist for Sharyx. Warmly greet the customer, ask for their name and inquiry, explain our AI Workforce solutions (Voice Calling, WhatsApp Copilots, and Email Automation), and offer to connect them with a specialist or book a demo. Keep responses concise and conversational for voice.`,
                first_message: "Hello! Welcome to Sharyx AI Workforce. My name is Maya, your AI assistant. May I know who I have the pleasure of speaking with?",
                voice_id: "21m00Tcm4TlvDq8ikWAM",
                voice_provider: "elevenlabs",
                llm_model: "gpt-4o-mini",
                temperature: 0.4,
            },
            {
                name: "Sales Closer (Retell AI)",
                provider: "retell",
                system_prompt: `You are the Senior Sales Specialist for Sharyx. Your goal is to understand the customer's business size, qualify their requirements for automated customer engagement, explain our Starter (₹4,999/mo) and Growth (₹14,999/mo) plans, and schedule a 15-minute live Google Meet demo.`,
                first_message: "Hi there! This is Alex from Sharyx. Thanks for reaching out about our AI sales solutions. How many team members or agents are you looking to equip?",
                voice_id: "11labs-Adrian",
                voice_provider: "elevenlabs",
                llm_model: "gpt-4o-mini",
                temperature: 0.3,
            },
            {
                name: "Appointment Scheduler (SaaS Fallback)",
                provider: "saas_fallback",
                system_prompt: `You are the Appointment Desk Voice Agent for Sharyx. Propose available meeting slots (Tomorrow at 10 AM or 3 PM IST) and confirm the customer's email address to send the Google Meet calendar invite.`,
                first_message: "Hello! I am calling from Sharyx to help you schedule your personalized product walkthrough. Would tomorrow morning work for you?",
                voice_id: "en-IN-Wavenet-D",
                voice_provider: "google",
                llm_model: "gemini-2.0-flash",
                temperature: 0.3,
            },
        ];
        for (const d of defaults) {
            try {
                await this.create(d, tenantId);
            }
            catch (err) {
                this.logger.warn(`Could not seed default voice agent ${d.name}: ${err.message}`);
            }
        }
    }
};
exports.VoiceAgentService = VoiceAgentService;
exports.VoiceAgentService = VoiceAgentService = VoiceAgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [VoiceFactory_service_1.VoiceFactoryService])
], VoiceAgentService);
//# sourceMappingURL=VoiceAgent.service.js.map