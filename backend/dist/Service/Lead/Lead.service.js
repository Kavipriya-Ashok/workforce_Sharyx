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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const lead_1 = require("../../Database/Table/Lead/lead");
const lead_activity_1 = require("../../Database/Table/Lead/lead_activity");
let LeadService = class LeadService {
    constructor(leadRepo, activityRepo) {
        this.leadRepo = leadRepo;
        this.activityRepo = activityRepo;
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
        const leads = await qb.select(["l.lead_status", "l.deal_value", "l.created_on", "l.source"]).getMany();
        const totalLeads = leads.length;
        const newToday = leads.filter(l => new Date(l.created_on).toDateString() === new Date().toDateString()).length;
        const qualifiedLeads = leads.filter(l => l.lead_status === lead_1.LeadStatus.QUALIFIED).length;
        const inProgressLeads = leads.filter(l => l.lead_status === lead_1.LeadStatus.CONTACTED).length;
        const wonLeads = leads.filter(l => l.lead_status === lead_1.LeadStatus.WON).length;
        const pipelineValue = leads.reduce((sum, l) => sum + Number(l.deal_value || 0), 0);
        const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
        return {
            totalLeads,
            newToday,
            qualifiedLeads,
            inProgressLeads,
            wonLeads,
            pipelineValue,
            conversionRate
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
    async insert(data, userId, userContext) {
        const leadEntity = this.leadRepo.create(Object.assign(Object.assign({}, data), { name: data.name || `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.phone, tenant_id: (userContext === null || userContext === void 0 ? void 0 : userContext.active_tenant_id) || (userContext === null || userContext === void 0 ? void 0 : userContext.tenant_id) || "default", assigned_to_id: data.assigned_to_id || userId || undefined }));
        const saved = (await this.leadRepo.save(leadEntity));
        const activity = this.activityRepo.create({
            lead_id: saved.id,
            activity_type: "CREATION",
            title: "Lead Created",
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
        l.lead_status = lead_1.LeadStatus.QUALIFIED;
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
        return { success: true, lead: l };
    }
};
exports.LeadService = LeadService;
exports.LeadService = LeadService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(lead_1.lead)),
    __param(1, (0, typeorm_1.InjectRepository)(lead_activity_1.lead_activity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], LeadService);
//# sourceMappingURL=Lead.service.js.map