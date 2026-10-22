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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var VoiceCallService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceCallService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const axios_1 = __importDefault(require("axios"));
const VoiceCallLog_entity_1 = require("../../Database/Table/Voice/VoiceCallLog.entity");
const VoiceAgent_entity_1 = require("../../Database/Table/Voice/VoiceAgent.entity");
const VoiceProviderConfig_entity_1 = require("../../Database/Table/Voice/VoiceProviderConfig.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const VoiceFactory_service_1 = require("./VoiceFactory.service");
const AgentTools_service_1 = require("../../AgentOrchestrator/Services/AgentTools.service");
let VoiceCallService = VoiceCallService_1 = class VoiceCallService {
    constructor(factory, events) {
        this.factory = factory;
        this.events = events;
        this.logger = new common_1.Logger(VoiceCallService_1.name);
    }
    async handleVoiceCallRequest(event) {
        this.logger.log(`📞 [EVENT TRIGGERED CALL] Requested voice call to ${event.phone} (Tenant: ${event.tenantId})`);
        const agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { tenant_id: event.tenantId, status: true } });
        if (!agent) {
            this.logger.warn(`No active VoiceAgent found for tenant ${event.tenantId} to handle voice.call.requested`);
            return;
        }
        await this.dispatchCall({
            agent_id: agent.id,
            phone_number: event.phone,
            customer_name: event.customerName,
            lead_id: event.leadId,
            tenantId: event.tenantId,
            custom_variables: { reason: event.reason || "Customer requested a direct telephone call" },
        }).catch((err) => this.logger.error(`Failed to handle voice.call.requested: ${err.message}`));
    }
    interpolatePrompt(template, vars) {
        if (!template)
            return template;
        return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
            return vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{{${key}}}`;
        });
    }
    async dispatchCall(dto) {
        const tenantId = dto.tenantId || "default";
        let agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { id: dto.agent_id, tenant_id: tenantId, status: true } });
        if (!agent) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { remote_agent_id: dto.agent_id, tenant_id: tenantId, status: true } });
        }
        if (!agent) {
            agent = await VoiceAgent_entity_1.VoiceAgent.findOne({ where: { tenant_id: tenantId, status: true } });
        }
        if (!agent)
            throw new common_1.NotFoundException(`Voice Agent ${dto.agent_id} not found`);
        const provider = this.factory.getProvider(agent.provider);
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: agent.provider, is_active: true },
        });
        let leadRec = dto.lead_id ? await lead_1.lead.findOne({ where: { id: dto.lead_id } }) : null;
        if (!leadRec && dto.phone_number) {
            const cleanPhone = dto.phone_number.replace(/\D/g, "").slice(-10);
            leadRec = await lead_1.lead.findOne({ where: { phone: cleanPhone, tenant_id: tenantId } });
            if (!leadRec) {
                leadRec = new lead_1.lead();
                leadRec.tenant_id = tenantId;
                leadRec.name = dto.customer_name || "Voice Lead";
                leadRec.phone = dto.phone_number;
                leadRec.source = "voice";
                leadRec.lead_status = "new";
                leadRec.created_by_id = "voice_dispatch";
                leadRec.created_on = new Date();
                await leadRec.save();
            }
        }
        const dynamicVariables = Object.assign({ customer_name: dto.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name) || "Customer", phone_number: dto.phone_number, lead_status: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.lead_status) || "new", lead_source: (leadRec === null || leadRec === void 0 ? void 0 : leadRec.source) || "voice", current_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), current_time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), agent_name: agent.name }, (dto.custom_variables || {}));
        const interpolatedGreeting = this.interpolatePrompt(dynamicVariables.first_message || agent.first_message || "Hello! How can I assist you today?", dynamicVariables);
        dynamicVariables.first_message = interpolatedGreeting;
        const interpolatedSystemPrompt = this.interpolatePrompt(agent.system_prompt, dynamicVariables);
        dynamicVariables.system_prompt = interpolatedSystemPrompt;
        dto.custom_variables = dynamicVariables;
        let res;
        try {
            res = await provider.makeCall(agent.remote_agent_id, dto, config || undefined);
        }
        catch (err) {
            if (agent.provider !== "saas_fallback") {
                this.logger.warn(`Primary voice provider ${agent.provider} failed: ${err.message}. Attempting SaaS Fallback...`);
                const fallbackProvider = this.factory.getProvider("saas_fallback");
                const fallbackConfig = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
                    where: { tenant_id: tenantId, provider: "saas_fallback", is_active: true },
                });
                res = await fallbackProvider.makeCall(agent.remote_agent_id, dto, fallbackConfig || undefined);
            }
            else {
                throw err;
            }
        }
        const callLog = new VoiceCallLog_entity_1.VoiceCallLog();
        callLog.tenant_id = tenantId;
        callLog.agent_id = agent.id;
        callLog.agent_name = agent.name;
        callLog.provider = agent.provider;
        callLog.provider_call_id = res.callId;
        callLog.customer_phone = dto.phone_number;
        callLog.customer_name = dto.customer_name || (leadRec === null || leadRec === void 0 ? void 0 : leadRec.name) || "Customer";
        callLog.lead_id = leadRec === null || leadRec === void 0 ? void 0 : leadRec.id;
        callLog.direction = "outbound";
        callLog.call_status = res.status || "initiated";
        callLog.extracted_slots = dynamicVariables;
        callLog.created_by_id = "voice_call_service";
        callLog.created_on = new Date();
        await callLog.save();
        if (leadRec) {
            const activity = new lead_activity_1.lead_activity();
            activity.lead_id = leadRec.id;
            activity.tenant_id = tenantId;
            activity.activity_type = "CALL";
            activity.title = `📞 Outbound Call Initiated (${agent.provider.toUpperCase()})`;
            activity.description = `Agent: ${agent.name} | Call ID: ${res.callId}`;
            activity.performer_name = "Voice AI Engine";
            activity.created_by_id = "voice_service";
            activity.created_on = new Date();
            await activity.save().catch(() => null);
        }
        this.logger.log(`📞 [CALL INITIATED] ${dto.phone_number} via ${agent.provider} (Log ID: ${callLog.id})`);
        return callLog;
    }
    async handleWebhook(providerName, payload) {
        var _a;
        const provider = this.factory.getProvider(providerName);
        const normalized = provider.normalizeWebhook(payload);
        this.logger.log(`📡 [VOICE WEBHOOK RECEIVED] ${providerName} Call ${normalized.providerCallId} -> ${normalized.status}`);
        let callLog = await VoiceCallLog_entity_1.VoiceCallLog.findOne({
            where: { provider_call_id: normalized.providerCallId },
        });
        if (!callLog && normalized.providerCallId) {
            callLog = new VoiceCallLog_entity_1.VoiceCallLog();
            callLog.provider = providerName;
            callLog.provider_call_id = normalized.providerCallId;
            callLog.customer_phone = ((_a = payload === null || payload === void 0 ? void 0 : payload.customer) === null || _a === void 0 ? void 0 : _a.number) || (payload === null || payload === void 0 ? void 0 : payload.to_number) || (payload === null || payload === void 0 ? void 0 : payload.phone_number) || "unknown";
            callLog.created_by_id = "voice_webhook";
            callLog.created_on = new Date();
        }
        if (callLog) {
            callLog.call_status = normalized.status || callLog.call_status;
            if (normalized.durationSeconds)
                callLog.duration_seconds = normalized.durationSeconds;
            if (normalized.transcript)
                callLog.transcript = normalized.transcript;
            if (normalized.recordingUrl)
                callLog.recording_url = normalized.recordingUrl;
            if (normalized.summary)
                callLog.summary = normalized.summary;
            if (normalized.outcome)
                callLog.call_outcome = normalized.outcome;
            if (normalized.extractedSlots) {
                callLog.extracted_slots = Object.assign(Object.assign({}, (callLog.extracted_slots || {})), normalized.extractedSlots);
            }
            callLog.raw_webhook_payload = payload;
            callLog.updated_on = new Date();
            await callLog.save();
            if (normalized.summary || normalized.outcome) {
                const text = `${normalized.summary} ${normalized.transcript}`.toLowerCase();
                if (text.includes("demo") || text.includes("meet") || text.includes("appointment") || text.includes("schedule")) {
                    this.events.emit(AgentTools_service_1.AGENT_OUTCOME_EVENT, {
                        tenantId: callLog.tenant_id,
                        channel: "voice",
                        outcome: "Voice Demo Booked",
                        event: "appointment_booked",
                        phone: callLog.customer_phone,
                        leadName: callLog.customer_name,
                        summary: normalized.summary,
                        agentName: callLog.agent_name || "Voice Agent",
                    });
                }
            }
            this.forwardWebhookToExternal(callLog).catch((err) => this.logger.warn(`External webhook dispatch error: ${err.message}`));
        }
        return normalized;
    }
    async forwardWebhookToExternal(callLog) {
        var _a;
        const config = await VoiceProviderConfig_entity_1.VoiceProviderConfig.findOne({
            where: { tenant_id: callLog.tenant_id, provider: callLog.provider },
        });
        const forwardUrl = (_a = config === null || config === void 0 ? void 0 : config.metadata) === null || _a === void 0 ? void 0 : _a.webhook_forward_url;
        if (!forwardUrl)
            return;
        try {
            this.logger.log(`🚀 [FORWARDING VOICE LOG] Sending call ${callLog.provider_call_id} to external URL: ${forwardUrl}`);
            await axios_1.default.post(forwardUrl, {
                event: "voice_call.completed",
                timestamp: new Date().toISOString(),
                provider: callLog.provider,
                call_id: callLog.provider_call_id,
                customer_phone: callLog.customer_phone,
                customer_name: callLog.customer_name,
                duration_seconds: callLog.duration_seconds,
                status: callLog.call_status,
                transcript: callLog.transcript,
                summary: callLog.summary,
                recording_url: callLog.recording_url,
                outcome: callLog.call_outcome,
                extracted_slots: callLog.extracted_slots,
            }, { timeout: 8000 });
        }
        catch (err) {
            this.logger.warn(`Failed to forward call log to ${forwardUrl}: ${err.message}`);
        }
    }
    async getCallLogs(tenantId = "default", limit = 50) {
        return await VoiceCallLog_entity_1.VoiceCallLog.find({
            where: { tenant_id: tenantId },
            order: { created_on: "DESC" },
            take: limit,
        });
    }
    async getCallStats(tenantId = "default") {
        const logs = await VoiceCallLog_entity_1.VoiceCallLog.find({ where: { tenant_id: tenantId } });
        const totalCalls = logs.length;
        const completed = logs.filter((l) => l.call_status === "completed").length;
        const avgDuration = totalCalls > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.duration_seconds || 0), 0) / totalCalls) : 0;
        return {
            totalCalls,
            completedCalls: completed,
            avgDurationSeconds: avgDuration,
            completionRate: totalCalls > 0 ? Math.round((completed / totalCalls) * 100) : 0,
        };
    }
};
exports.VoiceCallService = VoiceCallService;
__decorate([
    (0, event_emitter_1.OnEvent)("voice.call.requested"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceCallService.prototype, "handleVoiceCallRequest", null);
exports.VoiceCallService = VoiceCallService = VoiceCallService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [VoiceFactory_service_1.VoiceFactoryService,
        event_emitter_1.EventEmitter2])
], VoiceCallService);
//# sourceMappingURL=VoiceCall.service.js.map