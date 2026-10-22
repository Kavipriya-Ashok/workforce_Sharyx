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
var AgentOutcomeListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOutcomeListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const OutcomeTrigger_service_1 = require("../../Service/OutcomeTrigger.service");
const AgentTools_service_1 = require("../../AgentOrchestrator/Services/AgentTools.service");
let AgentOutcomeListener = AgentOutcomeListener_1 = class AgentOutcomeListener {
    constructor(outcomeTrigger) {
        this.outcomeTrigger = outcomeTrigger;
        this.logger = new common_1.Logger(AgentOutcomeListener_1.name);
    }
    async handle(evt) {
        try {
            const res = await this.outcomeTrigger.executeTrigger("both", evt.event, {
                tenantId: evt.tenantId || "default",
                phone: evt.phone,
                email: evt.email,
                leadName: evt.leadName,
                outcome: evt.outcome,
                callSummary: evt.summary,
                agentName: evt.agentName,
                meetUrl: evt.meetUrl,
            });
            this.logger.log(`⚡ [AGENT OUTCOME] ${evt.outcome} (${evt.event}) -> sent ${res.sent}, failed ${res.failed}`);
        }
        catch (err) {
            this.logger.warn(`Agent outcome trigger failed: ${err.message}`);
        }
    }
};
exports.AgentOutcomeListener = AgentOutcomeListener;
__decorate([
    (0, event_emitter_1.OnEvent)(AgentTools_service_1.AGENT_OUTCOME_EVENT, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgentOutcomeListener.prototype, "handle", null);
exports.AgentOutcomeListener = AgentOutcomeListener = AgentOutcomeListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [OutcomeTrigger_service_1.OutcomeTriggerService])
], AgentOutcomeListener);
//# sourceMappingURL=AgentOutcome.listener.js.map