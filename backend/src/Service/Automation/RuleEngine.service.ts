import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { LeadConversionRule, WorkflowTriggerEvent } from "@Database/Table/Automation/lead_conversion_rule";
import { Customer, CustomerStatus, CustomerTier } from "@Database/Table/Customer/customer";
import { CrmDeal } from "@Database/Table/Customer/crm_deal";
import { CustomerInteraction } from "@Database/Table/Customer/customer_interaction";
import { lead, LeadStatus } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { OutcomeTriggerService } from "@Service/OutcomeTrigger.service";

export interface DryRunPayload {
  outcome: string;
  duration_seconds?: number;
  score?: number;
  goal_achieved?: boolean;
  tenantId?: string;
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    @InjectRepository(LeadConversionRule)
    private readonly ruleRepo: Repository<LeadConversionRule>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CrmDeal)
    private readonly dealRepo: Repository<CrmDeal>,
    @InjectRepository(CustomerInteraction)
    private readonly interactionRepo: Repository<CustomerInteraction>,
    @InjectRepository(lead)
    private readonly leadRepo: Repository<lead>,
    @InjectRepository(lead_activity)
    private readonly activityRepo: Repository<lead_activity>,
    private readonly events: EventEmitter2,
    private readonly outcomeTriggerService: OutcomeTriggerService
  ) {}

  /**
   * Seed default conversion rules if none exist in tenant
   */
  async seedDefaultRules(tenantId: string = "default"): Promise<LeadConversionRule[]> {
    const existing = await this.ruleRepo.count({ where: { tenant_id: tenantId } });
    if (existing > 0) {
      return await this.ruleRepo.find({ where: { tenant_id: tenantId }, order: { priority: "DESC" } });
    }

    const defaultRules: Partial<LeadConversionRule>[] = [
      {
        tenant_id: tenantId,
        name: "High-Intent Booking ➔ Auto-Convert Customer",
        description: "Converts qualified leads into active customers immediately upon appointment confirmation.",
        trigger_event: WorkflowTriggerEvent.CALL_OUTCOME,
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
        target_customer_status: CustomerStatus.ACTIVE,
        target_customer_tier: CustomerTier.PROFESSIONAL,
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
        trigger_event: WorkflowTriggerEvent.CALL_OUTCOME,
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
        target_customer_status: CustomerStatus.ACTIVE,
        target_customer_tier: CustomerTier.ENTERPRISE,
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
        trigger_event: WorkflowTriggerEvent.CALL_OUTCOME,
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
        target_customer_status: CustomerStatus.ACTIVE,
        target_customer_tier: CustomerTier.PROFESSIONAL,
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
        trigger_event: WorkflowTriggerEvent.CALL_OUTCOME,
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
        target_customer_status: CustomerStatus.ACTIVE,
        target_customer_tier: CustomerTier.PROFESSIONAL,
        action_send_whatsapp: true,
        action_whatsapp_trigger: "deal_won",
        action_send_email: true,
        action_email_trigger_type: "lead_converted",
        auto_tags: ["auto-converted", "payment-committed"],
      },
    ];

    const created: LeadConversionRule[] = [];
    for (const r of defaultRules) {
      const ent = this.ruleRepo.create({
        ...r,
        created_by_id: "system",
        created_on: new Date(),
        status: true,
      });
      created.push(await this.ruleRepo.save(ent));
    }
    this.logger.log(`✅ Seeded ${created.length} default conversion automation rules for tenant: ${tenantId}`);
    return created;
  }

  async getRules(tenantId: string = "default"): Promise<LeadConversionRule[]> {
    let rules = await this.ruleRepo.find({
      where: { tenant_id: tenantId },
      order: { priority: "DESC", created_on: "DESC" },
    });
    if (rules.length === 0) {
      rules = await this.seedDefaultRules(tenantId);
    }
    return rules;
  }

  async getRuleById(id: string): Promise<LeadConversionRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Rule ${id} not found`);
    return rule;
  }

  async createRule(data: Partial<LeadConversionRule>, userId?: string): Promise<LeadConversionRule> {
    const rule = this.ruleRepo.create({
      ...data,
      created_by_id: userId || "system",
      created_on: new Date(),
    });
    return await this.ruleRepo.save(rule);
  }

  async updateRule(id: string, data: Partial<LeadConversionRule>, userId?: string): Promise<LeadConversionRule> {
    const rule = await this.getRuleById(id);
    Object.assign(rule, data, { updated_by_id: userId || "system", updated_on: new Date() });
    return await this.ruleRepo.save(rule);
  }

  async deleteRule(id: string): Promise<{ success: boolean }> {
    await this.ruleRepo.delete(id);
    return { success: true };
  }

  /**
   * Evaluates text outcome against a rule trigger
   */
  private matchOutcome(outcome: string, trigger: string, matchType: string = "contains"): boolean {
    if (!outcome || !trigger) return false;
    const o = outcome.toLowerCase().trim();
    const t = trigger.toLowerCase().trim();

    if (matchType === "exact") {
      return o === t;
    }
    if (matchType === "regex") {
      try {
        const re = new RegExp(t, "i");
        return re.test(o);
      } catch {
        return o.includes(t);
      }
    }
    // Default 'contains' + token fuzzy check
    if (o.includes(t) || t.includes(o)) return true;
    const tokens = t.split(/\s+/).filter((w) => w.length > 3);
    if (tokens.length > 0 && tokens.every((token) => o.includes(token))) return true;
    return false;
  }

  /**
   * Dry-run test endpoint for simulation
   */
  async dryRunTest(payload: DryRunPayload): Promise<any> {
    const tenantId = payload.tenantId || "default";
    const rules = await this.getRules(tenantId);
    const activeRules = rules.filter((r) => r.is_active);

    const duration = payload.duration_seconds ?? 60;
    const goalAchieved = payload.goal_achieved ?? true;

    for (const rule of activeRules) {
      if (this.matchOutcome(payload.outcome, rule.outcome_trigger, rule.match_type)) {
        if (rule.min_call_duration_seconds && duration < rule.min_call_duration_seconds) {
          continue; // Duration too short
        }
        if (rule.require_goal_achieved && !goalAchieved) {
          continue; // Goal not met
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

  /**
   * Evaluates post-call outcome from Telephony / Webhook
   */
  async evaluateCallOutcome(payload: {
    tenantId?: string;
    outcome: string;
    durationSeconds?: number;
    phone?: string;
    leadId?: string;
    leadName?: string;
    goalAchieved?: boolean;
    callSummary?: string;
  }): Promise<any> {
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

    // Resolve the Lead
    let targetLead: lead | null = null;
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

    // Execute Lead-to-Customer conversion
    const result = await this.convertLeadToCustomer(targetLead.id, {
      ...dryRun.actions,
      ruleName: dryRun.matchedRule.name,
      triggerOutcome: payload.outcome,
      callSummary: payload.callSummary,
    });

    return { triggered: true, dryRun, conversion: result };
  }

  /**
   * Core Lead-to-Customer conversion engine with deduplication & CRM deal generation
   */
  async convertLeadToCustomer(leadId: string, options?: any): Promise<{ customer: Customer; deal?: CrmDeal; lead: lead }> {
    const targetLead = await this.leadRepo.findOne({ where: { id: leadId } });
    if (!targetLead) throw new NotFoundException(`Lead ${leadId} not found`);

    const tenantId = targetLead.tenant_id || "default";
    const dealValue = Number(options?.dealValue ?? targetLead.deal_value ?? 5000);
    const targetStatus = options?.targetCustomerStatus || CustomerStatus.ACTIVE;
    const targetTier = options?.targetCustomerTier || CustomerTier.PROFESSIONAL;

    this.logger.log(`🚀 [LEAD CONVERSION] Converting Lead ${targetLead.name} (${targetLead.id}) to Customer...`);

    // ─── 1. Deduplication Check ──────────────────────────────────────────────
    let existingCustomer: Customer | null = null;

    // A. Check by converted_from_lead_id
    existingCustomer = await this.customerRepo.findOne({
      where: { converted_from_lead_id: targetLead.id, tenant_id: tenantId },
    });

    // B. Fallback search by normalized email
    if (!existingCustomer && targetLead.email) {
      const cleanEmail = targetLead.email.toLowerCase().trim();
      existingCustomer = await this.customerRepo
        .createQueryBuilder("c")
        .where("LOWER(c.email) = :email", { email: cleanEmail })
        .andWhere("c.tenant_id = :tenantId", { tenantId })
        .getOne();
    }

    // C. Fallback search by phone number
    if (!existingCustomer && targetLead.phone) {
      const cleanPhone = targetLead.phone.replace(/\D/g, "").slice(-10);
      existingCustomer = await this.customerRepo
        .createQueryBuilder("c")
        .where("c.phone LIKE :p", { p: `%${cleanPhone}` })
        .andWhere("c.tenant_id = :tenantId", { tenantId })
        .getOne();
    }

    // ─── 2. Create or Update Customer Profile ────────────────────────────────
    let customer: Customer;
    const isNew = !existingCustomer;

    if (existingCustomer) {
      customer = existingCustomer;
      customer.customer_status = targetStatus;
      customer.tier = targetTier;
      customer.total_spend = Number(customer.total_spend || 0) + dealValue;
      if (!customer.converted_from_lead_id) customer.converted_from_lead_id = targetLead.id;
      if (!customer.company_name && targetLead.company_name) customer.company_name = targetLead.company_name;
      if (!customer.job_title && targetLead.job_title) customer.job_title = targetLead.job_title;

      const mergedTags = new Set([...(customer.tags || []), "converted-from-lead", ...(options?.autoTags || [])]);
      customer.tags = Array.from(mergedTags);
      customer.updated_on = new Date();
      customer = await this.customerRepo.save(customer);
      this.logger.log(`🔄 [LEAD CONVERSION] Updated existing Customer profile: ${customer.name} (${customer.id})`);
    } else {
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
        tags: Array.from(new Set(["auto-converted", "converted-from-lead", ...(targetLead.tags || []), ...(options?.autoTags || [])])),
        notes: `Auto-converted from Lead on ${new Date().toLocaleDateString("en-IN")}. ${options?.ruleName ? `Triggered by rule: "${options.ruleName}".` : ""}`,
        created_by_id: "rule_engine",
        created_on: new Date(),
        status: true,
      });
      customer = await this.customerRepo.save(customer);
      this.logger.log(`✨ [LEAD CONVERSION] Created brand new Customer: ${customer.name} (${customer.id})`);
    }

    // ─── 3. Generate Linked CRM Deal ─────────────────────────────────────────
    let deal: CrmDeal | undefined;
    if (options?.createCrmDeal !== false) {
      const dealTitle = `Deal - ${customer.company_name || customer.name} (${options?.crmDealStage || "Won"})`;
      deal = this.dealRepo.create({
        tenant_id: tenantId,
        title: dealTitle,
        lead_id: targetLead.id,
        customer_id: customer.id,
        deal_value: dealValue,
        currency: customer.currency || "INR",
        stage: options?.crmDealStage || "Won",
        pipeline: "Standard Pipeline",
        probability: 100,
        expected_close_date: new Date(),
        closed_at: new Date(),
        notes: `Auto-generated deal from Lead-to-Customer conversion. Reason: ${options?.triggerOutcome || "High Intent Outcome"}`,
        tags: ["auto-generated", "conversion-deal"],
        created_by_id: "rule_engine",
        created_on: new Date(),
        status: true,
      });
      deal = await this.dealRepo.save(deal);
      this.logger.log(`💰 [LEAD CONVERSION] Generated CRM Deal: "${deal.title}" with value ${deal.deal_value} ${deal.currency}`);
    }

    // ─── 4. Transition Lead Stage to WON & Record Lead Activity ──────────────
    const oldLeadStatus = targetLead.lead_status;
    targetLead.lead_status = options?.moveLeadStage || LeadStatus.WON;
    targetLead.deal_value = dealValue;
    targetLead.score = 100;
    targetLead.custom_fields = {
      ...(targetLead.custom_fields || {}),
      converted_customer_id: customer.id,
      converted_customer_tier: customer.tier,
      converted_at: new Date().toISOString(),
      conversion_rule: options?.ruleName || "Direct Transition",
    };
    await this.leadRepo.save(targetLead);

    // Lead Activity
    await this.activityRepo.save(
      this.activityRepo.create({
        lead_id: targetLead.id,
        activity_type: "CONVERSION",
        title: "Converted to Customer 🏆",
        description: `Lead transitioned from ${oldLeadStatus} ➔ ${targetLead.lead_status}. Activated Customer profile (#${customer.id.slice(0, 8)}) with deal value ${dealValue} ${targetLead.currency}.`,
        tenant_id: tenantId,
        performer_name: "AI Automation Engine",
        metadata: { customer_id: customer.id, deal_id: deal?.id, rule: options?.ruleName },
        created_on: new Date(),
      })
    );

    // ─── 5. Record Customer Interaction Timeline ──────────────────────────────
    await this.interactionRepo.save(
      this.interactionRepo.create({
        tenant_id: tenantId,
        customer_id: customer.id,
        interaction_type: "CONVERSION",
        title: isNew ? "Customer Account Activated 🚀" : "Customer Tier & Spend Updated ⭐",
        description: `Converted from Lead ${targetLead.name} (${targetLead.phone || targetLead.email}). Initial value: ${dealValue} ${targetLead.currency}.`,
        performer_name: "Rule Engine",
        metadata: { lead_id: targetLead.id, deal_id: deal?.id, rule: options?.ruleName },
        created_on: new Date(),
      })
    );

    // ─── 6. Omnichannel Follow-Up / Onboarding (WhatsApp & Email) ─────────────
    if (options?.sendWhatsApp !== false && customer.phone) {
      try {
        await this.outcomeTriggerService.executeTrigger("whatsapp", "deal_won", {
          tenantId,
          phone: customer.phone,
          leadName: customer.name,
          company: customer.company_name || undefined,
          dealValue,
          currency: customer.currency,
          outcome: options?.triggerOutcome || "Deal Closed",
        });
        this.logger.log(`📱 [LEAD CONVERSION] Dispatched onboarding WhatsApp sequence to ${customer.phone}`);
      } catch (err: any) {
        this.logger.warn(`Could not dispatch conversion WhatsApp: ${err.message}`);
      }
    }

    if (options?.sendEmail !== false && customer.email) {
      try {
        await this.outcomeTriggerService.executeTrigger("email", "lead_converted", {
          tenantId,
          email: customer.email,
          leadName: customer.name,
          company: customer.company_name || undefined,
          dealValue,
          currency: customer.currency,
          outcome: options?.triggerOutcome || "Customer Onboarding",
        });
        this.logger.log(`📧 [LEAD CONVERSION] Dispatched onboarding Email sequence to ${customer.email}`);
      } catch (err: any) {
        this.logger.warn(`Could not dispatch conversion Email: ${err.message}`);
      }
    }

    // ─── 7. Emit Global Event ─────────────────────────────────────────────────
    this.events.emit("lead.converted.to.customer", {
      tenantId,
      leadId: targetLead.id,
      customerId: customer.id,
      dealId: deal?.id,
      dealValue,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email,
    });

    return { customer, deal, lead: targetLead };
  }

  // ─── Event Listeners ────────────────────────────────────────────────────────

  @OnEvent("voice.call.outcome", { async: true })
  async handleVoiceCallOutcome(evt: {
    tenantId?: string;
    outcome: string;
    durationSeconds?: number;
    phone?: string;
    leadId?: string;
    leadName?: string;
    goalAchieved?: boolean;
    callSummary?: string;
  }) {
    try {
      await this.evaluateCallOutcome(evt);
    } catch (err: any) {
      this.logger.error(`Error in handleVoiceCallOutcome: ${err.message}`);
    }
  }

  @OnEvent("lead.stage.won", { async: true })
  async handleLeadStageWon(evt: { leadId: string; tenantId?: string; dealValue?: number }) {
    try {
      this.logger.log(`🎯 [EVENT: lead.stage.won] Triggering auto-conversion for lead ${evt.leadId}`);
      await this.convertLeadToCustomer(evt.leadId, {
        moveLeadStage: "WON",
        dealValue: evt.dealValue,
        ruleName: "Lead Stage Transition to WON",
      });
    } catch (err: any) {
      this.logger.error(`Error in handleLeadStageWon: ${err.message}`);
    }
  }
}
