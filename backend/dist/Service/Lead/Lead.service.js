"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
    ctxTenant(ctx) {
        var _a, _b;
        if (!ctx)
            return undefined;
        return (_b = (_a = ctx.tenant_id) !== null && _a !== void 0 ? _a : ctx.active_tenant_id) !== null && _b !== void 0 ? _b : null;
    }
    requireCtxTenant(ctx) {
        const t = this.ctxTenant(ctx);
        if (!t)
            throw new common_1.BadRequestException("A specific tenant is required to create records.");
        return t;
    }
    owned(id, tenantId, extra = {}) {
        return tenantId ? Object.assign({ id, tenant_id: tenantId }, extra) : Object.assign({ id }, extra);
    }
    async getAll(filter, userContext) {
        const take = parseInt((filter === null || filter === void 0 ? void 0 : filter.take) || "50", 10);
        const skip = parseInt((filter === null || filter === void 0 ? void 0 : filter.skip) || "0", 10);
        const tenantId = this.ctxTenant(userContext);
        const query = this.leadRepo.createQueryBuilder("l")
            .where("l.status = :active", { active: true });
        if (tenantId) {
            query.andWhere("l.tenant_id = :tenantId", { tenantId });
        }
        if ((filter === null || filter === void 0 ? void 0 : filter.is_candidate) !== undefined && (filter === null || filter === void 0 ? void 0 : filter.is_candidate) !== "undefined") {
            const isCand = filter.is_candidate === "true" || filter.is_candidate === true;
            if (isCand) {
                query.andWhere(`(l.is_candidate = true OR l.candidate_stage IN ('screening', 'scheduled', 'offered', 'joined', 'interview_scheduled') OR LOWER(COALESCE(l.notes, '')) ~ '(placement|interview|resume|candidate|fresher|vacancy|hiring|recruitment)' OR LOWER(COALESCE(l.job_title, '')) ~ '(developer|engineer|intern|fresher|candidate|placement)' OR COALESCE(l.custom_fields::text, '') ILIKE '%interview%' OR COALESCE(l.custom_fields::text, '') ILIKE '%placement%' OR COALESCE(l.custom_fields::text, '') ILIKE '%Talent Acquisition%')`);
            }
            else {
                query.andWhere("l.is_candidate = :isCand", { isCand: false });
            }
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
        const tenantId = this.ctxTenant(userContext);
        const qb = this.leadRepo.createQueryBuilder("l").where("l.status = true");
        if (tenantId) {
            qb.andWhere("l.tenant_id = :tenantId", { tenantId });
        }
        if (isCandidate !== undefined) {
            if (isCandidate) {
                qb.andWhere(`(l.is_candidate = true OR l.candidate_stage IN ('screening', 'scheduled', 'offered', 'joined', 'interview_scheduled') OR LOWER(COALESCE(l.notes, '')) ~ '(placement|interview|resume|candidate|fresher|vacancy|hiring|recruitment)' OR LOWER(COALESCE(l.job_title, '')) ~ '(developer|engineer|intern|fresher|candidate|placement)' OR COALESCE(l.custom_fields::text, '') ILIKE '%interview%' OR COALESCE(l.custom_fields::text, '') ILIKE '%placement%' OR COALESCE(l.custom_fields::text, '') ILIKE '%Talent Acquisition%')`);
            }
            else {
                qb.andWhere("l.is_candidate = :isCandidate", { isCandidate: false });
            }
        }
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
        const foundLead = await this.leadRepo.findOne({ where: this.owned(id, this.ctxTenant(userContext), { status: true }) });
        if (!foundLead)
            throw new common_1.NotFoundException("Lead not found");
        const activities = await this.activityRepo.find({
            where: { lead_id: id, status: true },
            order: { created_on: "DESC" }
        });
        const cleanPhone = (foundLead.phone || "").replace(/\D/g, "").slice(-10);
        let whatsappMessages = [];
        try {
            const { WhatsAppMessage } = await Promise.resolve().then(() => __importStar(require("@Database/Table/WhatsApp/WhatsAppMessage.entity")));
            const waQb = WhatsAppMessage.createQueryBuilder("w")
                .where("w.status = true");
            if (cleanPhone) {
                waQb.andWhere("(w.sender_phone LIKE :ph OR w.recipient_phone LIKE :ph)", { ph: `%${cleanPhone}` });
            }
            else {
                waQb.andWhere("1=0");
            }
            whatsappMessages = await waQb.orderBy("w.created_on", "ASC").take(50).getMany();
        }
        catch (err) {
            this.logger.debug(`Could not load whatsapp messages for lead ${id}: ${err.message}`);
        }
        let emailLogs = [];
        try {
            const { EmailLog } = await Promise.resolve().then(() => __importStar(require("@Database/Table/Email/EmailLog.entity")));
            const emQb = EmailLog.createQueryBuilder("e")
                .where("e.status = true");
            if (foundLead.email && foundLead.email.trim()) {
                emQb.andWhere("(e.lead_id = :id OR LOWER(e.to_email) = :em OR LOWER(e.from_email) = :em)", {
                    id,
                    em: foundLead.email.trim().toLowerCase(),
                });
            }
            else {
                emQb.andWhere("e.lead_id = :id", { id });
            }
            emailLogs = await emQb.orderBy("e.created_on", "ASC").take(50).getMany();
        }
        catch (err) {
            this.logger.debug(`Could not load email logs for lead ${id}: ${err.message}`);
        }
        let voiceCalls = [];
        try {
            const { VoiceCallLog } = await Promise.resolve().then(() => __importStar(require("@Database/Table/Voice/VoiceCallLog.entity")));
            const vcQb = VoiceCallLog.createQueryBuilder("v")
                .where("v.status = true");
            if (cleanPhone) {
                vcQb.andWhere("(v.lead_id = :id OR v.customer_phone LIKE :ph)", { id, ph: `%${cleanPhone}` });
            }
            else {
                vcQb.andWhere("v.lead_id = :id", { id });
            }
            voiceCalls = await vcQb.orderBy("v.created_on", "DESC").take(50).getMany();
        }
        catch (err) {
            this.logger.debug(`Could not load voice calls for lead ${id}: ${err.message}`);
        }
        return Object.assign(Object.assign({}, foundLead), { activities,
            whatsappMessages,
            emailLogs,
            voiceCalls });
    }
    async checkDuplicatePhone(phone, excludeId, userContext) {
        if (!phone || phone.trim().length < 8)
            return { is_duplicate: false };
        const cleaned = phone.replace(/\D/g, "").slice(-10);
        const qb = this.leadRepo.createQueryBuilder("l")
            .where("l.status = true")
            .andWhere("l.phone LIKE :phone", { phone: `%${cleaned}` });
        const dupTenant = this.ctxTenant(userContext);
        if (dupTenant)
            qb.andWhere("l.tenant_id = :dupTenant", { dupTenant });
        if (excludeId)
            qb.andWhere("l.id != :excludeId", { excludeId });
        const existing = await qb.getOne();
        return {
            is_duplicate: !!existing,
            existing_lead: existing ? { id: existing.id, name: existing.name, phone: existing.phone, lead_status: existing.lead_status } : null
        };
    }
    async checkDuplicateEmail(email, excludeId, userContext) {
        if (!email || !email.includes("@"))
            return { is_duplicate: false };
        const qb = this.leadRepo.createQueryBuilder("l")
            .where("l.status = true")
            .andWhere("LOWER(l.email) = :email", { email: email.toLowerCase().trim() });
        const dupTenant = this.ctxTenant(userContext);
        if (dupTenant)
            qb.andWhere("l.tenant_id = :dupTenant", { dupTenant });
        if (excludeId)
            qb.andWhere("l.id != :excludeId", { excludeId });
        const existing = await qb.getOne();
        return {
            is_duplicate: !!existing,
            existing_lead: existing ? { id: existing.id, name: existing.name, email: existing.email, lead_status: existing.lead_status } : null
        };
    }
    async insert(data, userId, userContext) {
        var _a, _b;
        const cleanNumber = (val) => {
            if (val === "" || val === null || val === undefined)
                return null;
            const parsed = Number(val);
            return isNaN(parsed) ? null : parsed;
        };
        const sanitizedData = Object.assign(Object.assign({}, data), { deal_value: (_a = cleanNumber(data.deal_value)) !== null && _a !== void 0 ? _a : 0, total_experience: cleanNumber(data.total_experience), relevant_experience: cleanNumber(data.relevant_experience), current_ctc: cleanNumber(data.current_ctc), expected_ctc: cleanNumber(data.expected_ctc), relieving_date: data.relieving_date ? new Date(data.relieving_date) : null });
        const resolvedCreatedById = userId ||
            (userContext === null || userContext === void 0 ? void 0 : userContext.userId) ||
            (userContext === null || userContext === void 0 ? void 0 : userContext.id) ||
            data.created_by_id ||
            "00000000-0000-0000-0000-000000000001";
        const isPlacementOrCandidate = Boolean(sanitizedData.is_candidate) ||
            Boolean(sanitizedData.resume_url) ||
            sanitizedData.total_experience !== null ||
            sanitizedData.expected_ctc !== null ||
            /\b(placement|candidate|interview|resume|fresher|internship|vacancy|hiring|recruitment|career|job opening)\b/i.test(`${sanitizedData.notes || ""} ${sanitizedData.agentKey || ""}`);
        const leadEntity = this.leadRepo.create(Object.assign(Object.assign({}, sanitizedData), { is_candidate: isPlacementOrCandidate, name: sanitizedData.name || `${sanitizedData.first_name || ""} ${sanitizedData.last_name || ""}`.trim() || sanitizedData.phone, tenant_id: this.requireCtxTenant(userContext), assigned_to_id: sanitizedData.assigned_to_id || userId || undefined, created_by_id: resolvedCreatedById, created_on: new Date(), candidate_stage: isPlacementOrCandidate ? (sanitizedData.candidate_stage || lead_1.CandidateStage.NEW) : undefined }));
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
        if (saved.phone && data.auto_trigger_call !== false && saved.source !== lead_1.LeadSource.CSV_IMPORT) {
            const requestedAgentId = data.assigned_voice_agent_id ||
                data.agentId ||
                data.agent_id ||
                ((_b = data.custom_fields) === null || _b === void 0 ? void 0 : _b.assigned_voice_agent_id);
            const requestedAgentKey = data.agentKey || (saved.is_candidate ? "recruitment" : "receptionist");
            if (requestedAgentId) {
                this.triggerVoiceCall(saved.id, {
                    agentId: requestedAgentId,
                    agentKey: requestedAgentKey,
                    scheduledType: saved.is_candidate ? "interview" : "outbound",
                }, userContext).catch((err) => this.logger.warn(`Auto voice call on insert failed: ${err.message}`));
            }
            else {
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
    async update(id, data, userId, tenantId) {
        const target = await this.leadRepo.findOne({ where: this.owned(id, tenantId) });
        if (!target)
            throw new common_1.NotFoundException("Lead not found");
        const oldStatus = (target.lead_status || "").toUpperCase().trim();
        const _a = data || {}, { id: _ignoreId, tenant_id: _ignoreTenant } = _a, safeData = __rest(_a, ["id", "tenant_id"]);
        Object.assign(target, safeData);
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
    async updateStatus(id, newStatus, userId, tenantId) {
        const target = await this.leadRepo.findOne({ where: this.owned(id, tenantId) });
        if (!target)
            throw new common_1.NotFoundException("Lead not found");
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
        if (normalizedNewStatus === "WON" || normalizedNewStatus === lead_1.LeadStatus.WON) {
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
    async updateCandidateStage(id, candidate_stage, userId, tenantId) {
        const target = await this.leadRepo.findOne({ where: this.owned(id, tenantId) });
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
    async delete(id, tenantId) {
        const res = await this.leadRepo.update(this.owned(id, tenantId), { status: false });
        if (!res.affected)
            throw new common_1.NotFoundException("Lead not found");
        return { success: true };
    }
    async bulkDelete(ids, tenantId) {
        const where = tenantId ? { id: (0, typeorm_2.In)(ids), tenant_id: tenantId } : { id: (0, typeorm_2.In)(ids) };
        const res = await this.leadRepo.update(where, { status: false });
        return { success: true, count: res.affected || 0 };
    }
    async bulkUpdateStatus(ids, lead_status, userId, tenantId) {
        const normalized = (lead_status || "").toUpperCase().trim();
        const bulkWhere = tenantId ? { id: (0, typeorm_2.In)(ids), tenant_id: tenantId } : { id: (0, typeorm_2.In)(ids) };
        await this.leadRepo.update(bulkWhere, { lead_status: normalized });
        if (normalized === "WON" || normalized === lead_1.LeadStatus.WON) {
            for (const id of ids) {
                const l = await this.leadRepo.findOne({ where: this.owned(id, tenantId) });
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
    async addActivity(body, userId, tenantId) {
        const parent = await this.leadRepo.findOne({ where: this.owned(body.lead_id, tenantId) });
        if (!parent)
            throw new common_1.NotFoundException("Lead not found");
        const act = this.activityRepo.create({
            lead_id: body.lead_id,
            activity_type: body.activity_type || "NOTE",
            title: body.title || "Manual Note",
            description: body.description || "",
            performer_name: body.performer_name || "Admin",
            tenant_id: parent.tenant_id,
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
                const dup = await this.checkDuplicatePhone(cleanPhone, undefined, userContext);
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
        const l = await this.leadRepo.findOne({ where: this.owned(id, this.ctxTenant(userContext)) });
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
        var _a, _b, _c, _d, _e;
        const l = await this.leadRepo.findOne({ where: this.owned(id, this.ctxTenant(userContext)) });
        if (!l)
            throw new common_1.NotFoundException("Lead not found");
        if (!l.phone)
            throw new common_1.BadRequestException("Lead does not have a phone number on file");
        const chosenAgentId = body.agentId || body.agent_id || ((_a = l.custom_fields) === null || _a === void 0 ? void 0 : _a.assigned_voice_agent_id);
        const chosenAgentKey = body.agentKey;
        const isInterview = body.scheduledType === "interview" || l.is_candidate;
        const scheduledType = body.scheduledType || (isInterview ? "interview" : "outbound");
        const slot = body.slot || (((_c = (_b = l.custom_fields) === null || _b === void 0 ? void 0 : _b.interview) === null || _c === void 0 ? void 0 : _c.interview_date) ? `${l.custom_fields.interview.interview_date} at ${l.custom_fields.interview.interview_time || "10:00 AM"}` : "");
        const meetUrl = body.meetUrl || l.interview_link || ((_e = (_d = l.custom_fields) === null || _d === void 0 ? void 0 : _d.interview) === null || _e === void 0 ? void 0 : _e.gmeet_link) || "";
        const reason = body.reason || "Outbound AI Voice Call";
        this.events.emit("voice.call.requested", {
            tenantId: l.tenant_id,
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