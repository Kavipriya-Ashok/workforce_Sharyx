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
var RuleEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngineService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const lead_conversion_rule_1 = require("../../Database/Table/Automation/lead_conversion_rule");
const customer_1 = require("../../Database/Table/Customer/customer");
const crm_deal_1 = require("../../Database/Table/Customer/crm_deal");
const customer_interaction_1 = require("../../Database/Table/Customer/customer_interaction");
const lead_1 = require("../../Database/Table/Lead/lead");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const OutcomeTrigger_service_1 = require("../OutcomeTrigger.service");
let RuleEngineService = RuleEngineService_1 = class RuleEngineService {
    constructor(ruleRepo, customerRepo, dealRepo, interactionRepo, leadRepo, activityRepo, events, outcomeTriggerService) {
        this.ruleRepo = ruleRepo;
        this.customerRepo = customerRepo;
        this.dealRepo = dealRepo;
        this.interactionRepo = interactionRepo;
        this.leadRepo = leadRepo;
        this.activityRepo = activityRepo;
        this.events = events;
        this.outcomeTriggerService = outcomeTriggerService;
        this.logger = new common_1.Logger(RuleEngineService_1.name);
    }
    async seedDefaultRules(tenantId = "default") {
        const existing = await this.ruleRepo.count({ where: { tenant_id: tenantId } });
        if (existing > 0) {
            return await this.ruleRepo.find({ where: { tenant_id: tenantId }, order: { priority: "DESC" } });
        }
        const defaultRules = [
            {
                tenant_id: tenantId,
                name: "High-Intent Booking ➔ Auto-Convert Customer",
                description: "Converts qualified leads into active customers immediately upon appointment confirmation.",
                trigger_event: lead_conversion_rule_1.WorkflowTriggerEvent.CALL_OUTCOME,
                outcome_trigger: "Appointment Scheduled",
                match_type: "contains",
                min_call_duration_seconds: 10,
                require_goal_achieved: false,
                priority: 20,
                is_active: true,
                action_move_lead_stage: "WON",
                action_create_crm_deal: true,
                action_crm_deal_stage: "Won",
                action_deal_value: 5000.0,
                action_convert_to_customer: true,
                target_customer_status: customer_1.CustomerStatus.ACTIVE,
                target_customer_tier: customer_1.CustomerTier.PROFESSIONAL,
                action_send_whatsapp: true,
                action_whatsapp_trigger: "deal_won",
                action_send_email: true,
                action_email_trigger_type: "lead_converted",
                auto_tags: ["auto-converted", "appointment-booked"],
            },
            {
                tenant_id: tenantId,
                name: "Sale Completed ➔ Auto-Convert Customer",
                description: "Instantly provisions Customer profile when AI Sales specialist closes a deal.",
                trigger_event: lead_conversion_rule_1.WorkflowTriggerEvent.CALL_OUTCOME,
                outcome_trigger: "Sale Completed",
                match_type: "contains",
                min_call_duration_seconds: 15,
                require_goal_achieved: false,
                priority: 25,
                is_active: true,
                action_move_lead_stage: "WON",
                action_create_crm_deal: true,
                action_crm_deal_stage: "Won",
                action_deal_value: 10000.0,
                action_convert_to_customer: true,
                target_customer_status: customer_1.CustomerStatus.ACTIVE,
                target_customer_tier: customer_1.CustomerTier.ENTERPRISE,
                action_send_whatsapp: true,
                action_whatsapp_trigger: "deal_won",
                action_send_email: true,
                action_email_trigger_type: "lead_converted",
                auto_tags: ["auto-converted", "sale-completed", "vip"],
            },
            {
                tenant_id: tenantId,
                name: "Purchase Confirmed ➔ Auto-Convert Customer",
                description: "Transforms inquiring prospect to active client upon order confirmation.",
                trigger_event: lead_conversion_rule_1.WorkflowTriggerEvent.CALL_OUTCOME,
                outcome_trigger: "Purchase Confirmed",
                match_type: "contains",
                min_call_duration_seconds: 10,
                require_goal_achieved: false,
                priority: 15,
                is_active: true,
                action_move_lead_stage: "WON",
                action_create_crm_deal: true,
                action_crm_deal_stage: "Won",
                action_deal_value: 7500.0,
                action_convert_to_customer: true,
                target_customer_status: customer_1.CustomerStatus.ACTIVE,
                target_customer_tier: customer_1.CustomerTier.PROFESSIONAL,
                action_send_whatsapp: true,
                action_whatsapp_trigger: "deal_won",
                action_send_email: true,
                action_email_trigger_type: "lead_converted",
                auto_tags: ["auto-converted", "purchase-confirmed"],
            },
            {
                tenant_id: tenantId,
                name: "Payment Committed ➔ Auto-Convert Customer",
                description: "Converts lead when customer explicitly commits to payment or subscription.",
                trigger_event: lead_conversion_rule_1.WorkflowTriggerEvent.CALL_OUTCOME,
                outcome_trigger: "Payment Committed",
                match_type: "contains",
                min_call_duration_seconds: 10,
                require_goal_achieved: false,
                priority: 10,
                is_active: true,
                action_move_lead_stage: "WON",
                action_create_crm_deal: true,
                action_crm_deal_stage: "Won",
                action_deal_value: 5000.0,
                action_convert_to_customer: true,
                target_customer_status: customer_1.CustomerStatus.ACTIVE,
                target_customer_tier: customer_1.CustomerTier.PROFESSIONAL,
                action_send_whatsapp: true,
                action_whatsapp_trigger: "deal_won",
                action_send_email: true,
                action_email_trigger_type: "lead_converted",
                auto_tags: ["auto-converted", "payment-committed"],
            },
        ];
        const created = [];
        for (const r of defaultRules) {
            const ent = this.ruleRepo.create(Object.assign(Object.assign({}, r), { created_by_id: "system", created_on: new Date(), status: true }));
            created.push(await this.ruleRepo.save(ent));
        }
        this.logger.log(`✅ Seeded ${created.length} default conversion automation rules for tenant: ${tenantId}`);
        return created;
    }
    async getRules(tenantId = "default") {
        let rules = await this.ruleRepo.find({
            where: { tenant_id: tenantId },
            order: { priority: "DESC", created_on: "DESC" },
        });
        if (rules.length === 0) {
            rules = await this.seedDefaultRules(tenantId);
        }
        return rules;
    }
    async getRuleById(id) {
        const rule = await this.ruleRepo.findOne({ where: { id } });
        if (!rule)
            throw new common_1.NotFoundException(`Rule ${id} not found`);
        return rule;
    }
    async createRule(data, userId) {
        const rule = this.ruleRepo.create(Object.assign(Object.assign({}, data), { created_by_id: userId || "system", created_on: new Date() }));
        return await this.ruleRepo.save(rule);
    }
    async updateRule(id, data, userId) {
        const rule = await this.getRuleById(id);
        Object.assign(rule, data, { updated_by_id: userId || "system", updated_on: new Date() });
        return await this.ruleRepo.save(rule);
    }
    async deleteRule(id) {
        await this.ruleRepo.delete(id);
        return { success: true };
    }
    matchOutcome(outcome, trigger, matchType = "contains") {
        if (!outcome || !trigger)
            return false;
        const o = outcome.toLowerCase().trim();
        const t = trigger.toLowerCase().trim();
        if (matchType === "exact") {
            return o === t;
        }
        if (matchType === "regex") {
            try {
                const re = new RegExp(t, "i");
                return re.test(o);
            }
            catch (_a) {
                return o.includes(t);
            }
        }
        if (o.includes(t) || t.includes(o))
            return true;
        const tokens = t.split(/\s+/).filter((w) => w.length > 3);
        if (tokens.length > 0 && tokens.every((token) => o.includes(token)))
            return true;
        return false;
    }
    async dryRunTest(payload) {
        var _a, _b;
        const tenantId = payload.tenantId || "default";
        const rules = await this.getRules(tenantId);
        const activeRules = rules.filter((r) => r.is_active);
        const duration = (_a = payload.duration_seconds) !== null && _a !== void 0 ? _a : 60;
        const goalAchieved = (_b = payload.goal_achieved) !== null && _b !== void 0 ? _b : true;
        for (const rule of activeRules) {
            if (this.matchOutcome(payload.outcome, rule.outcome_trigger, rule.match_type)) {
                if (rule.min_call_duration_seconds && duration < rule.min_call_duration_seconds) {
                    continue;
                }
                if (rule.require_goal_achieved && !goalAchieved) {
                    continue;
                }
                return {
                    matched: true,
                    matchedRule: {
                        id: rule.id,
                        name: rule.name,
                        outcome_trigger: rule.outcome_trigger,
                        match_type: rule.match_type,
                        priority: rule.priority,
                    },
                    willConvertToCustomer: rule.action_convert_to_customer,
                    targetStage: rule.action_move_lead_stage || "WON",
                    actions: {
                        moveLeadStage: rule.action_move_lead_stage || "WON",
                        convertToCustomer: rule.action_convert_to_customer,
                        targetCustomerStatus: rule.target_customer_status || "ACTIVE",
                        targetCustomerTier: rule.target_customer_tier || "PROFESSIONAL",
                        createCrmDeal: rule.action_create_crm_deal,
                        crmDealStage: rule.action_crm_deal_stage || "Won",
                        dealValue: Number(rule.action_deal_value) || 5000,
                        sendWhatsApp: rule.action_send_whatsapp,
                        whatsappTrigger: rule.action_whatsapp_trigger || "deal_won",
                        sendEmail: rule.action_send_email,
                        emailTriggerType: rule.action_email_trigger_type || "lead_converted",
                        autoTags: rule.auto_tags || ["auto-converted"],
                    },
                };
            }
        }
        return {
            matched: false,
            reason: "No active conversion rule matched the provided outcome or call duration threshold.",
            testedOutcome: payload.outcome,
            activeRulesCount: activeRules.length,
        };
    }
    async evaluateCallOutcome(payload) {
        const tenantId = payload.tenantId || "default";
        this.logger.log(`🔍 [RULE ENGINE] Evaluating call outcome for ${payload.phone || payload.leadId}: "${payload.outcome}"`);
        const dryRun = await this.dryRunTest({
            outcome: payload.outcome,
            duration_seconds: payload.durationSeconds,
            goal_achieved: payload.goalAchieved,
            tenantId,
        });
        if (!dryRun.matched || !dryRun.willConvertToCustomer) {
            this.logger.log(`ℹ️ [RULE ENGINE] Outcome did not trigger auto-conversion.`);
            return { triggered: false, dryRun };
        }
        let targetLead = null;
        if (payload.leadId) {
            targetLead = await this.leadRepo.findOne({ where: { id: payload.leadId } });
        }
        if (!targetLead && payload.phone) {
            const cleanPhone = payload.phone.replace(/\D/g, "").slice(-10);
            targetLead = await this.leadRepo
                .createQueryBuilder("l")
                .where("l.phone LIKE :p", { p: `%${cleanPhone}` })
                .andWhere("l.status = true")
                .orderBy("l.created_on", "DESC")
                .getOne();
        }
        if (!targetLead) {
            this.logger.warn(`⚠️ [RULE ENGINE] Rule matched but could not locate Lead for phone=${payload.phone}`);
            return { triggered: true, dryRun, error: "Lead not found" };
        }
        const result = await this.convertLeadToCustomer(targetLead.id, Object.assign(Object.assign({}, dryRun.actions), { ruleName: dryRun.matchedRule.name, triggerOutcome: payload.outcome, callSummary: payload.callSummary }));
        return { triggered: true, dryRun, conversion: result };
    }
    async convertLeadToCustomer(leadId, options) {
        var _a, _b;
        const targetLead = await this.leadRepo.findOne({ where: { id: leadId } });
        if (!targetLead)
            throw new common_1.NotFoundException(`Lead ${leadId} not found`);
        const tenantId = targetLead.tenant_id || "default";
        const dealValue = Number((_b = (_a = options === null || options === void 0 ? void 0 : options.dealValue) !== null && _a !== void 0 ? _a : targetLead.deal_value) !== null && _b !== void 0 ? _b : 5000);
        const targetStatus = (options === null || options === void 0 ? void 0 : options.targetCustomerStatus) || customer_1.CustomerStatus.ACTIVE;
        const targetTier = (options === null || options === void 0 ? void 0 : options.targetCustomerTier) || customer_1.CustomerTier.PROFESSIONAL;
        this.logger.log(`🚀 [LEAD CONVERSION] Converting Lead ${targetLead.name} (${targetLead.id}) to Customer...`);
        let existingCustomer = null;
        existingCustomer = await this.customerRepo.findOne({
            where: { converted_from_lead_id: targetLead.id, tenant_id: tenantId },
        });
        if (!existingCustomer && targetLead.email) {
            const cleanEmail = targetLead.email.toLowerCase().trim();
            existingCustomer = await this.customerRepo
                .createQueryBuilder("c")
                .where("LOWER(c.email) = :email", { email: cleanEmail })
                .andWhere("c.tenant_id = :tenantId", { tenantId })
                .getOne();
        }
        if (!existingCustomer && targetLead.phone) {
            const cleanPhone = targetLead.phone.replace(/\D/g, "").slice(-10);
            existingCustomer = await this.customerRepo
                .createQueryBuilder("c")
                .where("c.phone LIKE :p", { p: `%${cleanPhone}` })
                .andWhere("c.tenant_id = :tenantId", { tenantId })
                .getOne();
        }
        let customer;
        const isNew = !existingCustomer;
        if (existingCustomer) {
            customer = existingCustomer;
            customer.customer_status = targetStatus;
            customer.tier = targetTier;
            customer.total_spend = Number(customer.total_spend || 0) + dealValue;
            if (!customer.converted_from_lead_id)
                customer.converted_from_lead_id = targetLead.id;
            if (!customer.company_name && targetLead.company_name)
                customer.company_name = targetLead.company_name;
            if (!customer.job_title && targetLead.job_title)
                customer.job_title = targetLead.job_title;
            const mergedTags = new Set([...(customer.tags || []), "converted-from-lead", ...((options === null || options === void 0 ? void 0 : options.autoTags) || [])]);
            customer.tags = Array.from(mergedTags);
            customer.updated_on = new Date();
            customer = await this.customerRepo.save(customer);
            this.logger.log(`🔄 [LEAD CONVERSION] Updated existing Customer profile: ${customer.name} (${customer.id})`);
        }
        else {
            customer = this.customerRepo.create({
                tenant_id: tenantId,
                name: targetLead.name || `${targetLead.first_name || ""} ${targetLead.last_name || ""}`.trim() || "Valued Customer",
                first_name: targetLead.first_name,
                last_name: targetLead.last_name,
                email: targetLead.email,
                phone: targetLead.phone,
                company_name: targetLead.company_name,
                job_title: targetLead.job_title,
                customer_status: targetStatus,
                tier: targetTier,
                total_spend: dealValue,
                currency: targetLead.currency || "INR",
                converted_from_lead_id: targetLead.id,
                conversion_date: new Date(),
                tags: Array.from(new Set(["auto-converted", "converted-from-lead", ...(targetLead.tags || []), ...((options === null || options === void 0 ? void 0 : options.autoTags) || [])])),
                notes: `Auto-converted from Lead on ${new Date().toLocaleDateString("en-IN")}. ${(options === null || options === void 0 ? void 0 : options.ruleName) ? `Triggered by rule: "${options.ruleName}".` : ""}`,
                created_by_id: "rule_engine",
                created_on: new Date(),
                status: true,
            });
            customer = await this.customerRepo.save(customer);
            this.logger.log(`✨ [LEAD CONVERSION] Created brand new Customer: ${customer.name} (${customer.id})`);
        }
        let deal;
        if ((options === null || options === void 0 ? void 0 : options.createCrmDeal) !== false) {
            const dealTitle = `Deal - ${customer.company_name || customer.name} (${(options === null || options === void 0 ? void 0 : options.crmDealStage) || "Won"})`;
            deal = this.dealRepo.create({
                tenant_id: tenantId,
                title: dealTitle,
                lead_id: targetLead.id,
                customer_id: customer.id,
                deal_value: dealValue,
                currency: customer.currency || "INR",
                stage: (options === null || options === void 0 ? void 0 : options.crmDealStage) || "Won",
                pipeline: "Standard Pipeline",
                probability: 100,
                expected_close_date: new Date(),
                closed_at: new Date(),
                notes: `Auto-generated deal from Lead-to-Customer conversion. Reason: ${(options === null || options === void 0 ? void 0 : options.triggerOutcome) || "High Intent Outcome"}`,
                tags: ["auto-generated", "conversion-deal"],
                created_by_id: "rule_engine",
                created_on: new Date(),
                status: true,
            });
            deal = await this.dealRepo.save(deal);
            this.logger.log(`💰 [LEAD CONVERSION] Generated CRM Deal: "${deal.title}" with value ${deal.deal_value} ${deal.currency}`);
        }
        const oldLeadStatus = targetLead.lead_status;
        targetLead.lead_status = (options === null || options === void 0 ? void 0 : options.moveLeadStage) || lead_1.LeadStatus.WON;
        targetLead.deal_value = dealValue;
        targetLead.score = 100;
        targetLead.custom_fields = Object.assign(Object.assign({}, (targetLead.custom_fields || {})), { converted_customer_id: customer.id, converted_customer_tier: customer.tier, converted_at: new Date().toISOString(), conversion_rule: (options === null || options === void 0 ? void 0 : options.ruleName) || "Direct Transition" });
        await this.leadRepo.save(targetLead);
        await this.activityRepo.save(this.activityRepo.create({
            lead_id: targetLead.id,
            activity_type: "CONVERSION",
            title: "Converted to Customer 🏆",
            description: `Lead transitioned from ${oldLeadStatus} ➔ ${targetLead.lead_status}. Activated Customer profile (#${customer.id.slice(0, 8)}) with deal value ${dealValue} ${targetLead.currency}.`,
            tenant_id: tenantId,
            performer_name: "AI Automation Engine",
            metadata: { customer_id: customer.id, deal_id: deal === null || deal === void 0 ? void 0 : deal.id, rule: options === null || options === void 0 ? void 0 : options.ruleName },
            created_on: new Date(),
        }));
        await this.interactionRepo.save(this.interactionRepo.create({
            tenant_id: tenantId,
            customer_id: customer.id,
            interaction_type: "CONVERSION",
            title: isNew ? "Customer Account Activated 🚀" : "Customer Tier & Spend Updated ⭐",
            description: `Converted from Lead ${targetLead.name} (${targetLead.phone || targetLead.email}). Initial value: ${dealValue} ${targetLead.currency}.`,
            performer_name: "Rule Engine",
            metadata: { lead_id: targetLead.id, deal_id: deal === null || deal === void 0 ? void 0 : deal.id, rule: options === null || options === void 0 ? void 0 : options.ruleName },
            created_on: new Date(),
        }));
        if ((options === null || options === void 0 ? void 0 : options.sendWhatsApp) !== false && customer.phone) {
            try {
                await this.outcomeTriggerService.executeTrigger("whatsapp", "deal_won", {
                    tenantId,
                    phone: customer.phone,
                    leadName: customer.name,
                    company: customer.company_name || undefined,
                    dealValue,
                    currency: customer.currency,
                    outcome: (options === null || options === void 0 ? void 0 : options.triggerOutcome) || "Deal Closed",
                });
                this.logger.log(`📱 [LEAD CONVERSION] Dispatched onboarding WhatsApp sequence to ${customer.phone}`);
            }
            catch (err) {
                this.logger.warn(`Could not dispatch conversion WhatsApp: ${err.message}`);
            }
        }
        if ((options === null || options === void 0 ? void 0 : options.sendEmail) !== false && customer.email) {
            try {
                await this.outcomeTriggerService.executeTrigger("email", "lead_converted", {
                    tenantId,
                    email: customer.email,
                    leadName: customer.name,
                    company: customer.company_name || undefined,
                    dealValue,
                    currency: customer.currency,
                    outcome: (options === null || options === void 0 ? void 0 : options.triggerOutcome) || "Customer Onboarding",
                });
                this.logger.log(`📧 [LEAD CONVERSION] Dispatched onboarding Email sequence to ${customer.email}`);
            }
            catch (err) {
                this.logger.warn(`Could not dispatch conversion Email: ${err.message}`);
            }
        }
        this.events.emit("lead.converted.to.customer", {
            tenantId,
            leadId: targetLead.id,
            customerId: customer.id,
            dealId: deal === null || deal === void 0 ? void 0 : deal.id,
            dealValue,
            customerName: customer.name,
            phone: customer.phone,
            email: customer.email,
        });
        return { customer, deal, lead: targetLead };
    }
    async handleVoiceCallOutcome(evt) {
        try {
            await this.evaluateCallOutcome(evt);
        }
        catch (err) {
            this.logger.error(`Error in handleVoiceCallOutcome: ${err.message}`);
        }
    }
    async handleLeadStageWon(evt) {
        try {
            this.logger.log(`🎯 [EVENT: lead.stage.won] Triggering auto-conversion for lead ${evt.leadId}`);
            await this.convertLeadToCustomer(evt.leadId, {
                moveLeadStage: "WON",
                dealValue: evt.dealValue,
                ruleName: "Lead Stage Transition to WON",
            });
        }
        catch (err) {
            this.logger.error(`Error in handleLeadStageWon: ${err.message}`);
        }
    }
};
exports.RuleEngineService = RuleEngineService;
__decorate([
    (0, event_emitter_1.OnEvent)("voice.call.outcome", { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RuleEngineService.prototype, "handleVoiceCallOutcome", null);
__decorate([
    (0, event_emitter_1.OnEvent)("lead.stage.won", { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RuleEngineService.prototype, "handleLeadStageWon", null);
exports.RuleEngineService = RuleEngineService = RuleEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(lead_conversion_rule_1.LeadConversionRule)),
    __param(1, (0, typeorm_1.InjectRepository)(customer_1.Customer)),
    __param(2, (0, typeorm_1.InjectRepository)(crm_deal_1.CrmDeal)),
    __param(3, (0, typeorm_1.InjectRepository)(customer_interaction_1.CustomerInteraction)),
    __param(4, (0, typeorm_1.InjectRepository)(lead_1.lead)),
    __param(5, (0, typeorm_1.InjectRepository)(lead_activity_1.lead_activity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        event_emitter_1.EventEmitter2,
        OutcomeTrigger_service_1.OutcomeTriggerService])
], RuleEngineService);
//# sourceMappingURL=RuleEngine.service.js.map