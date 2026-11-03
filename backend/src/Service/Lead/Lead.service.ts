import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { lead, LeadStatus, LeadSource, CandidateStage } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    @InjectRepository(lead) private readonly leadRepo: Repository<lead>,
    @InjectRepository(lead_activity) private readonly activityRepo: Repository<lead_activity>,
    private readonly events: EventEmitter2
  ) {}

  async getAll(filter: any, userContext?: any) {
    const take = parseInt(filter?.take || "50", 10);
    const skip = parseInt(filter?.skip || "0", 10);
    const tenantId = userContext?.active_tenant_id || userContext?.tenant_id || "default";

    const query = this.leadRepo.createQueryBuilder("l")
      .where("l.status = :active", { active: true });

    if (tenantId && tenantId !== "default") {
      query.andWhere("(l.tenant_id = :tenantId OR l.tenant_id = 'default' OR l.tenant_id IS NULL)", { tenantId });
    }

    if (filter?.is_candidate !== undefined && filter?.is_candidate !== "undefined") {
      const isCand = filter.is_candidate === "true" || filter.is_candidate === true;
      if (isCand) {
        query.andWhere(
          `(l.is_candidate = true OR l.candidate_stage IN ('screening', 'scheduled', 'offered', 'joined', 'interview_scheduled') OR LOWER(COALESCE(l.notes, '')) ~ '(placement|interview|resume|candidate|fresher|vacancy|hiring|recruitment)' OR LOWER(COALESCE(l.job_title, '')) ~ '(developer|engineer|intern|fresher|candidate|placement)' OR COALESCE(l.custom_fields::text, '') ILIKE '%interview%' OR COALESCE(l.custom_fields::text, '') ILIKE '%placement%' OR COALESCE(l.custom_fields::text, '') ILIKE '%Talent Acquisition%')`
        );
      } else {
        query.andWhere("l.is_candidate = :isCand", { isCand: false });
      }
    }

    if (filter?.status && filter?.status !== "ALL") {
      query.andWhere("l.lead_status = :status", { status: filter.status });
    }

    if (filter?.source && filter?.source !== "ALL") {
      query.andWhere("l.source = :source", { source: filter.source });
    }

    // Filter by candidate_stage
    if (filter?.candidate_stage && filter?.candidate_stage !== "ALL") {
      query.andWhere("l.candidate_stage = :cstage", { cstage: filter.candidate_stage });
    }

    if (filter?.keyword && filter.keyword.trim()) {
      const kw = `%${filter.keyword.trim().toLowerCase()}%`;
      query.andWhere(
        "(LOWER(l.name) LIKE :kw OR LOWER(l.email) LIKE :kw OR l.phone LIKE :kw OR LOWER(l.company_name) LIKE :kw)",
        { kw }
      );
    }

    query.orderBy("l.created_on", "DESC").take(take).skip(skip);

    const [items, total] = await query.getManyAndCount();
    return { items, total, take, skip };
  }

  async getStats(userContext?: any, isCandidate?: boolean) {
    const tenantId = userContext?.active_tenant_id || userContext?.tenant_id;
    const qb = this.leadRepo.createQueryBuilder("l").where("l.status = true");
    if (tenantId && tenantId !== "default") {
      qb.andWhere("(l.tenant_id = :tenantId OR l.tenant_id = 'default' OR l.tenant_id IS NULL)", { tenantId });
    }
    if (isCandidate !== undefined) {
      if (isCandidate) {
        qb.andWhere(
          `(l.is_candidate = true OR l.candidate_stage IN ('screening', 'scheduled', 'offered', 'joined', 'interview_scheduled') OR LOWER(COALESCE(l.notes, '')) ~ '(placement|interview|resume|candidate|fresher|vacancy|hiring|recruitment)' OR LOWER(COALESCE(l.job_title, '')) ~ '(developer|engineer|intern|fresher|candidate|placement)' OR COALESCE(l.custom_fields::text, '') ILIKE '%interview%' OR COALESCE(l.custom_fields::text, '') ILIKE '%placement%' OR COALESCE(l.custom_fields::text, '') ILIKE '%Talent Acquisition%')`
        );
      } else {
        qb.andWhere("l.is_candidate = :isCandidate", { isCandidate: false });
      }
    }

    const leads = await qb.select([
      "l.lead_status", "l.candidate_stage", "l.deal_value", "l.created_on", "l.source"
    ]).getMany();

    const totalLeads = leads.length;
    const newToday = leads.filter(l => new Date(l.created_on).toDateString() === new Date().toDateString()).length;
    const qualifiedLeads = leads.filter(l => l.lead_status === LeadStatus.QUALIFIED).length;
    const inProgressLeads = leads.filter(l => l.lead_status === LeadStatus.CONTACTED).length;
    const wonLeads = leads.filter(l => l.lead_status === LeadStatus.WON).length;
    const pipelineValue = leads.reduce((sum, l) => sum + Number(l.deal_value || 0), 0);
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // Candidate stage counts
    const stageCounts: Record<string, number> = {};
    for (const stage of Object.values(CandidateStage)) {
      stageCounts[stage] = leads.filter(l => l.candidate_stage === stage).length;
    }

    return {
      totalLeads,
      newToday,
      qualifiedLeads,
      inProgressLeads,
      wonLeads,
      pipelineValue,
      conversionRate,
      stageCounts
    };
  }

  async getById(id: string, userContext?: any) {
    const foundLead = await this.leadRepo.findOne({ where: { id, status: true } });
    if (!foundLead) throw new NotFoundException("Lead not found");

    const activities = await this.activityRepo.find({
      where: { lead_id: id, status: true },
      order: { created_on: "DESC" }
    });

    const cleanPhone = (foundLead.phone || "").replace(/\D/g, "").slice(-10);

    // Fetch Omnichannel WhatsApp Messages
    let whatsappMessages: any[] = [];
    try {
      const { WhatsAppMessage } = await import("@Database/Table/WhatsApp/WhatsAppMessage.entity");
      const waQb = WhatsAppMessage.createQueryBuilder("w")
        .where("w.status = true");
      if (cleanPhone) {
        waQb.andWhere("(w.sender_phone LIKE :ph OR w.recipient_phone LIKE :ph)", { ph: `%${cleanPhone}` });
      } else {
        waQb.andWhere("1=0");
      }
      whatsappMessages = await waQb.orderBy("w.created_on", "ASC").take(50).getMany();
    } catch (err: any) {
      this.logger.debug(`Could not load whatsapp messages for lead ${id}: ${err.message}`);
    }

    // Fetch Omnichannel Email Logs
    let emailLogs: any[] = [];
    try {
      const { EmailLog } = await import("@Database/Table/Email/EmailLog.entity");
      const emQb = EmailLog.createQueryBuilder("e")
        .where("e.status = true");
      if (foundLead.email && foundLead.email.trim()) {
        emQb.andWhere("(e.lead_id = :id OR LOWER(e.to_email) = :em OR LOWER(e.from_email) = :em)", {
          id,
          em: foundLead.email.trim().toLowerCase(),
        });
      } else {
        emQb.andWhere("e.lead_id = :id", { id });
      }
      emailLogs = await emQb.orderBy("e.created_on", "ASC").take(50).getMany();
    } catch (err: any) {
      this.logger.debug(`Could not load email logs for lead ${id}: ${err.message}`);
    }

    // Fetch Omnichannel Voice Call Logs
    let voiceCalls: any[] = [];
    try {
      const { VoiceCallLog } = await import("@Database/Table/Voice/VoiceCallLog.entity");
      const vcQb = VoiceCallLog.createQueryBuilder("v")
        .where("v.status = true");
      if (cleanPhone) {
        vcQb.andWhere("(v.lead_id = :id OR v.customer_phone LIKE :ph)", { id, ph: `%${cleanPhone}` });
      } else {
        vcQb.andWhere("v.lead_id = :id", { id });
      }
      voiceCalls = await vcQb.orderBy("v.created_on", "DESC").take(50).getMany();
    } catch (err: any) {
      this.logger.debug(`Could not load voice calls for lead ${id}: ${err.message}`);
    }

    return {
      ...foundLead,
      activities,
      whatsappMessages,
      emailLogs,
      voiceCalls,
    };
  }

  async checkDuplicatePhone(phone: string, excludeId?: string, userContext?: any) {
    if (!phone || phone.trim().length < 8) return { is_duplicate: false };
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    const qb = this.leadRepo.createQueryBuilder("l")
      .where("l.status = true")
      .andWhere("l.phone LIKE :phone", { phone: `%${cleaned}` });

    if (excludeId) qb.andWhere("l.id != :excludeId", { excludeId });

    const existing = await qb.getOne();
    return {
      is_duplicate: !!existing,
      existing_lead: existing ? { id: existing.id, name: existing.name, phone: existing.phone, lead_status: existing.lead_status } : null
    };
  }

  async checkDuplicateEmail(email: string, excludeId?: string) {
    if (!email || !email.includes("@")) return { is_duplicate: false };
    const qb = this.leadRepo.createQueryBuilder("l")
      .where("l.status = true")
      .andWhere("LOWER(l.email) = :email", { email: email.toLowerCase().trim() });
    if (excludeId) qb.andWhere("l.id != :excludeId", { excludeId });
    const existing = await qb.getOne();
    return {
      is_duplicate: !!existing,
      existing_lead: existing ? { id: existing.id, name: existing.name, email: existing.email, lead_status: existing.lead_status } : null
    };
  }

  async insert(data: any, userId?: string, userContext?: any) {
    const cleanNumber = (val: any) => {
      if (val === "" || val === null || val === undefined) return null;
      const parsed = Number(val);
      return isNaN(parsed) ? null : parsed;
    };

    const sanitizedData = {
      ...data,
      deal_value: cleanNumber(data.deal_value) ?? 0,
      total_experience: cleanNumber(data.total_experience),
      relevant_experience: cleanNumber(data.relevant_experience),
      current_ctc: cleanNumber(data.current_ctc),
      expected_ctc: cleanNumber(data.expected_ctc),
      relieving_date: data.relieving_date ? new Date(data.relieving_date) : null,
    };

    const resolvedCreatedById =
      userId ||
      userContext?.userId ||
      userContext?.id ||
      data.created_by_id ||
      "00000000-0000-0000-0000-000000000001";

    const isPlacementOrCandidate =
      Boolean(sanitizedData.is_candidate) ||
      Boolean(sanitizedData.resume_url) ||
      sanitizedData.total_experience !== null ||
      sanitizedData.expected_ctc !== null ||
      /\b(placement|candidate|interview|resume|fresher|internship|vacancy|hiring|recruitment|career|job opening)\b/i.test(
        `${sanitizedData.notes || ""} ${sanitizedData.agentKey || ""}`
      );

    const leadEntity = this.leadRepo.create({
      ...sanitizedData,
      is_candidate: isPlacementOrCandidate,
      name: sanitizedData.name || `${sanitizedData.first_name || ""} ${sanitizedData.last_name || ""}`.trim() || sanitizedData.phone,
      tenant_id: userContext?.active_tenant_id || userContext?.tenant_id || "default",
      assigned_to_id: sanitizedData.assigned_to_id || userId || undefined,
      created_by_id: resolvedCreatedById,
      created_on: new Date(),
      candidate_stage: isPlacementOrCandidate ? (sanitizedData.candidate_stage || CandidateStage.NEW) : undefined
    });

    const saved = (await this.leadRepo.save(leadEntity as any)) as lead;

    // Write initial activity
    const activity = this.activityRepo.create({
      lead_id: saved.id,
      activity_type: "CREATION",
      title: saved.is_candidate ? "Candidate Created" : "Lead Created",
      description: `Created from ${saved.source || 'MANUAL'}`,
      performer_name: userContext?.name || "System",
      tenant_id: saved.tenant_id
    });
    await this.activityRepo.save(activity);

    // Auto-trigger outbound voice call if phone is present and auto_trigger_call is not explicitly false
    if (saved.phone && data.auto_trigger_call !== false && saved.source !== LeadSource.CSV_IMPORT) {
      const requestedAgentId =
        data.assigned_voice_agent_id ||
        data.agentId ||
        data.agent_id ||
        data.custom_fields?.assigned_voice_agent_id;
      const requestedAgentKey = data.agentKey || (saved.is_candidate ? "recruitment" : "receptionist");

      if (requestedAgentId) {
        this.triggerVoiceCall(saved.id, {
          agentId: requestedAgentId,
          agentKey: requestedAgentKey,
          scheduledType: saved.is_candidate ? "interview" : "outbound",
        }, userContext).catch((err) => this.logger.warn(`Auto voice call on insert failed: ${err.message}`));
      } else {
        // Wait briefly in case frontend sends a separate TriggerVoiceCall with a chosen agentId;
        // VoiceCallService deduplicates per phone number so it will never double-call.
        setTimeout(() => {
          this.triggerVoiceCall(saved.id, {
            agentKey: requestedAgentKey,
            scheduledType: saved.is_candidate ? "interview" : "outbound",
          }, userContext).catch((err) => this.logger.warn(`Delayed auto voice call on insert failed: ${err.message}`));
        }, 1200);
      }
    }

    return saved;
  }

  async update(id: string, data: any, userId?: string) {
    const target = await this.leadRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException("Lead not found");

    const oldStatus = (target.lead_status || "").toUpperCase().trim();
    Object.assign(target, data);
    if (data.lead_status) {
      target.lead_status = data.lead_status.toUpperCase().trim();
    }
    const saved = await this.leadRepo.save(target);

    const newStatus = (saved.lead_status || "").toUpperCase().trim();
    if (newStatus === "WON" && oldStatus !== "WON") {
      this.logger.log(`🏆 Lead ${saved.name} (${id}) transitioned to WON via update()! Emitting lead.stage.won...`);
      this.events.emit("lead.stage.won", {
        leadId: id,
        tenantId: saved.tenant_id,
        dealValue: Number(saved.deal_value) || 5000,
        lead: saved,
      });
    }

    return saved;
  }

  async updateStatus(id: string, newStatus: string, userId?: string) {
    const target = await this.leadRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException("Lead not found");

    const oldStatus = (target.lead_status || "").toUpperCase().trim();
    const normalizedNewStatus = (newStatus || "").toUpperCase().trim();
    target.lead_status = normalizedNewStatus;
    const updated = await this.leadRepo.save(target);

    const activity = this.activityRepo.create({
      lead_id: id,
      activity_type: "STATUS_CHANGE",
      title: `Status Changed to ${normalizedNewStatus}`,
      description: `Transitioned from ${oldStatus} ➔ ${normalizedNewStatus}`,
      tenant_id: target.tenant_id
    });
    await this.activityRepo.save(activity);

    // Auto-trigger Lead-to-Customer conversion if moved to WON
    if (normalizedNewStatus === "WON" || normalizedNewStatus === LeadStatus.WON) {
      this.logger.log(`🏆 Lead ${target.name} (${id}) transitioned to WON! Emitting lead.stage.won...`);
      this.events.emit("lead.stage.won", {
        leadId: id,
        tenantId: target.tenant_id,
        dealValue: Number(target.deal_value) || 5000,
        lead: target,
      });
    }

    return updated;
  }

  async updateCandidateStage(id: string, candidate_stage: string, userId?: string) {
    const target = await this.leadRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException("Candidate not found");

    const oldStage = target.candidate_stage;
    target.candidate_stage = candidate_stage;
    const updated = await this.leadRepo.save(target);

    await this.activityRepo.save(this.activityRepo.create({
      lead_id: id,
      activity_type: "STAGE_CHANGE",
      title: `Stage Changed: ${oldStage} → ${candidate_stage}`,
      description: `Candidate moved to ${candidate_stage} stage`,
      tenant_id: target.tenant_id
    }));

    return updated;
  }

  async delete(id: string) {
    await this.leadRepo.update(id, { status: false });
    return { success: true };
  }

  async bulkDelete(ids: string[]) {
    await this.leadRepo.update({ id: In(ids) }, { status: false });
    return { success: true, count: ids.length };
  }

  async bulkUpdateStatus(ids: string[], lead_status: string, userId?: string) {
    const normalized = (lead_status || "").toUpperCase().trim();
    await this.leadRepo.update({ id: In(ids) }, { lead_status: normalized });
    if (normalized === "WON" || normalized === LeadStatus.WON) {
      for (const id of ids) {
        const l = await this.leadRepo.findOne({ where: { id } });
        if (l) {
          this.logger.log(`🏆 Bulk update: Lead ${l.name} (${id}) transitioned to WON! Emitting lead.stage.won...`);
          this.events.emit("lead.stage.won", {
            leadId: id,
            tenantId: l.tenant_id,
            dealValue: Number(l.deal_value) || 5000,
            lead: l,
          });
        }
      }
    }
    return { success: true, count: ids.length };
  }

  async addActivity(body: any, userId?: string) {
    const act = this.activityRepo.create({
      lead_id: body.lead_id,
      activity_type: body.activity_type || "NOTE",
      title: body.title || "Manual Note",
      description: body.description || "",
      performer_name: body.performer_name || "Admin",
      tenant_id: body.tenant_id || "default",
      metadata: body.metadata || {}
    });
    return await this.activityRepo.save(act);
  }

  async importLeads(model: any, userId?: string, userContext?: any) {
    const rows: any[] = model.rows || [];
    const strategy = model.duplicate_strategy || "skip";
    let imported = 0;
    let skipped = 0;

    for (const r of rows) {
      if (!r.phone && !r.name && !r.email) continue;
      const cleanPhone = (r.phone || "").replace(/\D/g, "").slice(-10);

      if (cleanPhone && strategy !== "allow") {
        const dup = await this.checkDuplicatePhone(cleanPhone);
        if (dup.is_duplicate) {
          if (strategy === "skip") {
            skipped++;
            continue;
          } else if (strategy === "update" && dup.existing_lead?.id) {
            await this.update(dup.existing_lead.id, r, userId);
            imported++;
            continue;
          }
        }
      }

      await this.insert({
        ...r,
        source: model.source || LeadSource.CSV_IMPORT,
        is_candidate: model.is_candidate || false
      }, userId, userContext);
      imported++;
    }

    return { success: true, imported, skipped, total: rows.length };
  }

  async approveCandidateInterview(id: string, body: any, userContext?: any) {
    const l = await this.leadRepo.findOne({ where: { id } });
    if (!l) throw new NotFoundException("Candidate not found");

    // Set interview date on the entity so the reminder cron can find it
    const interviewDateStr = body.interview_date;
    l.interview_date = interviewDateStr ? new Date(interviewDateStr) : null;
    l.interview_link = body.gmeet_link || null;
    l.candidate_stage = CandidateStage.SCHEDULED;
    l.lead_status = LeadStatus.QUALIFIED;
    l.reminder_sent = false;
    l.followup_sent = false;
    l.custom_fields = {
      ...(l.custom_fields || {}),
      interview: {
        mode: body.mode || "ONLINE",
        interview_date: body.interview_date,
        interview_time: body.interview_time,
        gmeet_link: body.gmeet_link,
        approved_at: new Date().toISOString()
      }
    };
    await this.leadRepo.save(l);

    await this.activityRepo.save(this.activityRepo.create({
      lead_id: id,
      activity_type: "MEETING",
      title: `Interview Approved (${body.mode || "ONLINE"})`,
      description: `Scheduled for ${body.interview_date || "Upcoming"} at ${body.interview_time || "10:00 AM"} via ${body.gmeet_link || "Office"}`,
      tenant_id: l.tenant_id
    }));

    // Auto-trigger voice call on connected platform (Vapi / SaaS) with scheduled interview payload
    if (l.phone) {
      const slot = `${body.interview_date || "Upcoming"} at ${body.interview_time || "10:00 AM"}`;
      this.events.emit("voice.call.requested", {
        tenantId: l.tenant_id || "default",
        phone: l.phone,
        customerName: l.name,
        scheduledType: "interview",
        reason: "Interview scheduled",
        meetingSlot: slot,
        meetUrl: body.gmeet_link || "https://meet.google.com",
        leadId: l.id,
        agentKey: "recruitment",
      });
      this.logger.log(`📞 [INTERVIEW APPROVAL CALL TRIGGERED] Outbound call requested to ${l.phone} with payload "Interview scheduled"`);
    }

    return { success: true, lead: l };
  }

  async triggerVoiceCall(id: string, body: any = {}, userContext?: any) {
    const l = await this.leadRepo.findOne({ where: { id } });
    if (!l) throw new NotFoundException("Lead not found");
    if (!l.phone) throw new BadRequestException("Lead does not have a phone number on file");

    const chosenAgentId = body.agentId || body.agent_id || (l.custom_fields as any)?.assigned_voice_agent_id;
    const chosenAgentKey = body.agentKey;
    const isInterview = body.scheduledType === "interview" || l.is_candidate;
    const scheduledType = body.scheduledType || (isInterview ? "interview" : "outbound");
    const slot = body.slot || (l.custom_fields?.interview?.interview_date ? `${l.custom_fields.interview.interview_date} at ${l.custom_fields.interview.interview_time || "10:00 AM"}` : "");
    const meetUrl = body.meetUrl || l.interview_link || l.custom_fields?.interview?.gmeet_link || "";
    const reason = body.reason || "Outbound AI Voice Call";

    this.events.emit("voice.call.requested", {
      tenantId: l.tenant_id || userContext?.active_tenant_id || "default",
      phone: l.phone,
      customerName: l.name,
      scheduledType,
      reason,
      meetingSlot: slot,
      meetUrl,
      leadId: l.id,
      agentId: chosenAgentId,
      agentKey: chosenAgentKey,
    });

    this.logger.log(`📞 [MANUAL LEAD CALL TRIGGERED] Dispatched voice call to ${l.phone} (AgentID: ${chosenAgentId || chosenAgentKey || "auto"}) via connected platform`);
    return { success: true, message: `Voice call dispatched to ${l.phone} via connected voice engine`, leadId: l.id };
  }

  // ─── Reminder Cron: runs every hour, sends 1-day-before reminders ─────────
  @Cron(CronExpression.EVERY_HOUR)
  async sendInterviewReminders() {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000);

      // Find candidates with interview in ~24h who haven't been reminded
      const candidates = await this.leadRepo
        .createQueryBuilder("l")
        .where("l.status = true")
        .andWhere("l.is_candidate = true")
        .andWhere("l.reminder_sent = false")
        .andWhere("l.interview_date IS NOT NULL")
        .andWhere("l.interview_date > :from", { from: in24h })
        .andWhere("l.interview_date < :to", { to: in26h })
        .getMany();

      for (const c of candidates) {
        // Log reminder activity
        await this.activityRepo.save(this.activityRepo.create({
          lead_id: c.id,
          activity_type: "REMINDER",
          title: "1-Day Interview Reminder Sent",
          description: `Reminder sent to ${c.name} (${c.email || c.phone}) for interview on ${c.interview_date?.toISOString()}`,
          tenant_id: c.tenant_id
        }));
        c.reminder_sent = true;
        await this.leadRepo.save(c);
        console.log(`[Reminder] Sent 1-day reminder for candidate: ${c.name}`);
        // TODO: plug in WhatsApp / Email send here using OutcomeTriggerService
      }
    } catch (err) {
      console.error("[Reminder Cron] Error:", err);
    }
  }

  // ─── Follow-up Cron: runs every hour, sends post-interview follow-up ──────
  @Cron(CronExpression.EVERY_HOUR)
  async sendPostInterviewFollowup() {
    try {
      const now = new Date();
      const past1h = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const past3h = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      // Find candidates whose interview was 1-3 hours ago and haven't had follow-up
      const candidates = await this.leadRepo
        .createQueryBuilder("l")
        .where("l.status = true")
        .andWhere("l.is_candidate = true")
        .andWhere("l.followup_sent = false")
        .andWhere("l.interview_date IS NOT NULL")
        .andWhere("l.interview_date > :from", { from: past3h })
        .andWhere("l.interview_date < :to", { to: past1h })
        .getMany();

      for (const c of candidates) {
        await this.activityRepo.save(this.activityRepo.create({
          lead_id: c.id,
          activity_type: "FOLLOWUP",
          title: "Post-Interview Follow-up Sent",
          description: `Follow-up sent to ${c.name} after their interview`,
          tenant_id: c.tenant_id
        }));
        c.followup_sent = true;
        await this.leadRepo.save(c);
        console.log(`[Follow-up] Sent post-interview follow-up for candidate: ${c.name}`);
        // TODO: plug in WhatsApp / Email send here
      }
    } catch (err) {
      console.error("[Follow-up Cron] Error:", err);
    }
  }
}
