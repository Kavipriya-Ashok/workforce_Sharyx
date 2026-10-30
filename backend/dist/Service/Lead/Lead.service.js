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
var LeadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const lead_1 = require("../../Database/Table/Lead/lead");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
const schedule_1 = require("@nestjs/schedule");
let LeadService = LeadService_1 = class LeadService {
    constructor(leadRepo, activityRepo, events) {
        this.leadRepo = leadRepo;
        this.activityRepo = activityRepo;
        this.events = events;
        this.logger = new common_1.Logger(LeadService_1.name);
    }
    async getAll(filter, userContext) {
        const take = parseInt((filter === null || filter === void 0 ? void 0 : filter.take) || "50", 10);
        const skip = parseInt((filter === null || filter === void 0 ? void 0 : filter.skip) || "0", 10);
        const tenantId = (userContext === null || userContext === void 0 ? void 0 : userContext.active_tenant_id) || (userContext === null || userContext === void 0 ? void 0 : userContext.tenant_id) || "default";
        const query = this.leadRepo.createQueryBuilder("l")
            .where("l.status = :active", { active: true });
        if (tenantId && tenantId !== "default") {
            query.andWhere("l.tenant_id = :tenantId", { tenantId });
        }
        if ((filter === null || filter === void 0 ? void 0 : filter.is_candidate) !== undefined && (filter === null || filter === void 0 ? void 0 : filter.is_candidate) !== "undefined") {
            const isCand = filter.is_candidate === "true" || filter.is_candidate === true;
            query.andWhere("l.is_candidate = :isCand", { isCand });
        }
        if ((filter === null || filter === void 0 ? void 0 : filter.status) && (filter === null || filter === void 0 ? void 0 : filter.status) !== "ALL") {
            query.andWhere("l.lead_status = :status", { status: filter.status });
        }
        if ((filter === null || filter === void 0 ? void 0 : filter.source) && (filter === null || filter === void 0 ? void 0 : filter.source) !== "ALL") {
            query.andWhere("l.source = :source", { source: filter.source });
        }
        if ((filter === null || filter === void 0 ? void 0 : filter.candidate_stage) && (filter === null || filter === void 0 ? void 0 : filter.candidate_stage) !== "ALL") {
            query.andWhere("l.candidate_stage = :cstage", { cstage: filter.candidate_stage });
        }
        if ((filter === null || filter === void 0 ? void 0 : filter.keyword) && filter.keyword.trim()) {
            const kw = `%${filter.keyword.trim().toLowerCase()}%`;
            query.andWhere("(LOWER(l.name) LIKE :kw OR LOWER(l.email) LIKE :kw OR l.phone LIKE :kw OR LOWER(l.company_name) LIKE :kw)", { kw });
        }
        query.orderBy("l.created_on", "DESC").take(take).skip(skip);
        const [items, total] = await query.getManyAndCount();
        return { items, total, take, skip };
    }
    async getStats(userContext, isCandidate) {
        const tenantId = (userContext === null || userContext === void 0 ? void 0 : userContext.active_tenant_id) || (userContext === null || userContext === void 0 ? void 0 : userContext.tenant_id);
        const qb = this.leadRepo.createQueryBuilder("l").where("l.status = true");
        if (tenantId && tenantId !== "default")
            qb.andWhere("l.tenant_id = :tenantId", { tenantId });
        if (isCandidate !== undefined)
            qb.andWhere("l.is_candidate = :isCandidate", { isCandidate });
        const leads = await qb.select([
            "l.lead_status", "l.candidate_stage", "l.deal_value", "l.created_on", "l.source"
        ]).getMany();
        const totalLeads = leads.length;
        const newToday = leads.filter(l => new Date(l.created_on).toDateString() === new Date().toDateString()).length;
        const qualifiedLeads = leads.filter(l => l.lead_status === lead_1.LeadStatus.QUALIFIED).length;
        const inProgressLeads = leads.filter(l => l.lead_status === lead_1.LeadStatus.CONTACTED).length;
        const wonLeads = leads.filter(l => l.lead_status === lead_1.LeadStatus.WON).length;
        const pipelineValue = leads.reduce((sum, l) => sum + Number(l.deal_value || 0), 0);
        const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
        const stageCounts = {};
        for (const stage of Object.values(lead_1.CandidateStage)) {
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
    async getById(id, userContext) {
        const foundLead = await this.leadRepo.findOne({ where: { id, status: true } });
        if (!foundLead)
            throw new common_1.NotFoundException("Lead not found");
        const activities = await this.activityRepo.find({
            where: { lead_id: id, status: true },
            order: { created_on: "DESC" }
        });
        return Object.assign(Object.assign({}, foundLead), { activities });
    }
    async checkDuplicatePhone(phone, excludeId, userContext) {
        if (!phone || phone.trim().length < 8)
            return { is_duplicate: false };
        const cleaned = phone.replace(/\D/g, "").slice(-10);
        const qb = this.leadRepo.createQueryBuilder("l")
            .where("l.status = true")
            .andWhere("l.phone LIKE :phone", { phone: `%${cleaned}` });
        if (excludeId)
            qb.andWhere("l.id != :excludeId", { excludeId });
        const existing = await qb.getOne();
        return {
            is_duplicate: !!existing,
            existing_lead: existing ? { id: existing.id, name: existing.name, phone: existing.phone, lead_status: existing.lead_status } : null
        };
    }
    async checkDuplicateEmail(email, excludeId) {
        if (!email || !email.includes("@"))
            return { is_duplicate: false };
        const qb = this.leadRepo.createQueryBuilder("l")
            .where("l.status = true")
            .andWhere("LOWER(l.email) = :email", { email: email.toLowerCase().trim() });
        if (excludeId)
            qb.andWhere("l.id != :excludeId", { excludeId });
        const existing = await qb.getOne();
        return {
            is_duplicate: !!existing,
            existing_lead: existing ? { id: existing.id, name: existing.name, email: existing.email, lead_status: existing.lead_status } : null
        };
    }
    async insert(data, userId, userContext) {
        const leadEntity = this.leadRepo.create(Object.assign(Object.assign({}, data), { name: data.name || `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.phone, tenant_id: (userContext === null || userContext === void 0 ? void 0 : userContext.active_tenant_id) || (userContext === null || userContext === void 0 ? void 0 : userContext.tenant_id) || "default", assigned_to_id: data.assigned_to_id || userId || undefined, candidate_stage: data.is_candidate ? (data.candidate_stage || lead_1.CandidateStage.NEW) : undefined }));
        const saved = (await this.leadRepo.save(leadEntity));
        const activity = this.activityRepo.create({
            lead_id: saved.id,
            activity_type: "CREATION",
            title: saved.is_candidate ? "Candidate Created" : "Lead Created",
            description: `Created from ${saved.source || 'MANUAL'}`,
            performer_name: (userContext === null || userContext === void 0 ? void 0 : userContext.name) || "System",
            tenant_id: saved.tenant_id
        });
        await this.activityRepo.save(activity);
        return saved;
    }
    async update(id, data, userId) {
        const target = await this.leadRepo.findOne({ where: { id } });
        if (!target)
            throw new common_1.NotFoundException("Lead not found");
        Object.assign(target, data);
        return await this.leadRepo.save(target);
    }
    async updateStatus(id, newStatus, userId) {
        const target = await this.leadRepo.findOne({ where: { id } });
        if (!target)
            throw new common_1.NotFoundException("Lead not found");
        const oldStatus = target.lead_status;
        target.lead_status = newStatus;
        const updated = await this.leadRepo.save(target);
        const activity = this.activityRepo.create({
            lead_id: id,
            activity_type: "STATUS_CHANGE",
            title: `Status Changed to ${newStatus}`,
            description: `Transitioned from ${oldStatus} ➔ ${newStatus}`,
            tenant_id: target.tenant_id
        });
        await this.activityRepo.save(activity);
        if (newStatus === lead_1.LeadStatus.WON || newStatus === "WON") {
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
    async updateCandidateStage(id, candidate_stage, userId) {
        const target = await this.leadRepo.findOne({ where: { id } });
        if (!target)
            throw new common_1.NotFoundException("Candidate not found");
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
    async delete(id) {
        await this.leadRepo.update(id, { status: false });
        return { success: true };
    }
    async bulkDelete(ids) {
        await this.leadRepo.update({ id: (0, typeorm_2.In)(ids) }, { status: false });
        return { success: true, count: ids.length };
    }
    async bulkUpdateStatus(ids, lead_status, userId) {
        await this.leadRepo.update({ id: (0, typeorm_2.In)(ids) }, { lead_status });
        return { success: true, count: ids.length };
    }
    async addActivity(body, userId) {
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
    async importLeads(model, userId, userContext) {
        var _a;
        const rows = model.rows || [];
        const strategy = model.duplicate_strategy || "skip";
        let imported = 0;
        let skipped = 0;
        for (const r of rows) {
            if (!r.phone && !r.name && !r.email)
                continue;
            const cleanPhone = (r.phone || "").replace(/\D/g, "").slice(-10);
            if (cleanPhone && strategy !== "allow") {
                const dup = await this.checkDuplicatePhone(cleanPhone);
                if (dup.is_duplicate) {
                    if (strategy === "skip") {
                        skipped++;
                        continue;
                    }
                    else if (strategy === "update" && ((_a = dup.existing_lead) === null || _a === void 0 ? void 0 : _a.id)) {
                        await this.update(dup.existing_lead.id, r, userId);
                        imported++;
                        continue;
                    }
                }
            }
            await this.insert(Object.assign(Object.assign({}, r), { source: model.source || lead_1.LeadSource.CSV_IMPORT, is_candidate: model.is_candidate || false }), userId, userContext);
            imported++;
        }
        return { success: true, imported, skipped, total: rows.length };
    }
    async approveCandidateInterview(id, body, userContext) {
        const l = await this.leadRepo.findOne({ where: { id } });
        if (!l)
            throw new common_1.NotFoundException("Candidate not found");
        const interviewDateStr = body.interview_date;
        l.interview_date = interviewDateStr ? new Date(interviewDateStr) : null;
        l.interview_link = body.gmeet_link || null;
        l.candidate_stage = lead_1.CandidateStage.SCHEDULED;
        l.lead_status = lead_1.LeadStatus.QUALIFIED;
        l.reminder_sent = false;
        l.followup_sent = false;
        l.custom_fields = Object.assign(Object.assign({}, (l.custom_fields || {})), { interview: {
                mode: body.mode || "ONLINE",
                interview_date: body.interview_date,
                interview_time: body.interview_time,
                gmeet_link: body.gmeet_link,
                approved_at: new Date().toISOString()
            } });
        await this.leadRepo.save(l);
        await this.activityRepo.save(this.activityRepo.create({
            lead_id: id,
            activity_type: "MEETING",
            title: `Interview Approved (${body.mode || "ONLINE"})`,
            description: `Scheduled for ${body.interview_date || "Upcoming"} at ${body.interview_time || "10:00 AM"} via ${body.gmeet_link || "Office"}`,
            tenant_id: l.tenant_id
        }));
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
    async triggerVoiceCall(id, body = {}, userContext) {
        var _a, _b, _c, _d;
        const l = await this.leadRepo.findOne({ where: { id } });
        if (!l)
            throw new common_1.NotFoundException("Lead not found");
        if (!l.phone)
            throw new common_1.BadRequestException("Lead does not have a phone number on file");
        const isInterview = body.scheduledType === "interview" || l.is_candidate;
        const scheduledType = isInterview ? "interview" : "demo";
        const slot = body.slot || (((_b = (_a = l.custom_fields) === null || _a === void 0 ? void 0 : _a.interview) === null || _b === void 0 ? void 0 : _b.interview_date) ? `${l.custom_fields.interview.interview_date} at ${l.custom_fields.interview.interview_time || "10:00 AM"}` : "Scheduled Session");
        const meetUrl = body.meetUrl || l.interview_link || ((_d = (_c = l.custom_fields) === null || _c === void 0 ? void 0 : _c.interview) === null || _d === void 0 ? void 0 : _d.gmeet_link) || "https://meet.google.com";
        const reason = isInterview ? "Interview scheduled" : "You scheduled demo";
        const chosenAgentId = body.agentId || body.agent_id;
        const chosenAgentKey = body.agentKey || (isInterview ? "recruitment" : "sales");
        this.events.emit("voice.call.requested", {
            tenantId: l.tenant_id || (userContext === null || userContext === void 0 ? void 0 : userContext.active_tenant_id) || "default",
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
        this.logger.log(`📞 [MANUAL LEAD CALL TRIGGERED] Dispatched voice call to ${l.phone} (${reason}) via connected platform`);
        return { success: true, message: `Voice call dispatched to ${l.phone} via connected voice engine`, leadId: l.id };
    }
    async sendInterviewReminders() {
        var _a;
        try {
            const now = new Date();
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000);
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
                await this.activityRepo.save(this.activityRepo.create({
                    lead_id: c.id,
                    activity_type: "REMINDER",
                    title: "1-Day Interview Reminder Sent",
                    description: `Reminder sent to ${c.name} (${c.email || c.phone}) for interview on ${(_a = c.interview_date) === null || _a === void 0 ? void 0 : _a.toISOString()}`,
                    tenant_id: c.tenant_id
                }));
                c.reminder_sent = true;
                await this.leadRepo.save(c);
                console.log(`[Reminder] Sent 1-day reminder for candidate: ${c.name}`);
            }
        }
        catch (err) {
            console.error("[Reminder Cron] Error:", err);
        }
    }
    async sendPostInterviewFollowup() {
        try {
            const now = new Date();
            const past1h = new Date(now.getTime() - 1 * 60 * 60 * 1000);
            const past3h = new Date(now.getTime() - 3 * 60 * 60 * 1000);
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
            }
        }
        catch (err) {
            console.error("[Follow-up Cron] Error:", err);
        }
    }
};
exports.LeadService = LeadService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeadService.prototype, "sendInterviewReminders", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeadService.prototype, "sendPostInterviewFollowup", null);
exports.LeadService = LeadService = LeadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(lead_1.lead)),
    __param(1, (0, typeorm_1.InjectRepository)(lead_activity_1.lead_activity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        event_emitter_1.EventEmitter2])
], LeadService);
//# sourceMappingURL=Lead.service.js.map