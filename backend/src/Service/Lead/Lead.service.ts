import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { lead, LeadStatus, LeadSource } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";

@Injectable()
export class LeadService {
  constructor(
    @InjectRepository(lead) private readonly leadRepo: Repository<lead>,
    @InjectRepository(lead_activity) private readonly activityRepo: Repository<lead_activity>
  ) {}

  async getAll(filter: any, userContext?: any) {
    const take = parseInt(filter?.take || "50", 10);
    const skip = parseInt(filter?.skip || "0", 10);
    const tenantId = userContext?.active_tenant_id || userContext?.tenant_id || "default";

    const query = this.leadRepo.createQueryBuilder("l")
      .where("l.status = :active", { active: true });

    if (tenantId && tenantId !== "default") {
      query.andWhere("l.tenant_id = :tenantId", { tenantId });
    }

    if (filter?.is_candidate !== undefined && filter?.is_candidate !== "undefined") {
      const isCand = filter.is_candidate === "true" || filter.is_candidate === true;
      query.andWhere("l.is_candidate = :isCand", { isCand });
    }

    if (filter?.status && filter?.status !== "ALL") {
      query.andWhere("l.lead_status = :status", { status: filter.status });
    }

    if (filter?.source && filter?.source !== "ALL") {
      query.andWhere("l.source = :source", { source: filter.source });
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
    if (tenantId && tenantId !== "default") qb.andWhere("l.tenant_id = :tenantId", { tenantId });
    if (isCandidate !== undefined) qb.andWhere("l.is_candidate = :isCandidate", { isCandidate });

    const leads = await qb.select(["l.lead_status", "l.deal_value", "l.created_on", "l.source"]).getMany();

    const totalLeads = leads.length;
    const newToday = leads.filter(l => new Date(l.created_on).toDateString() === new Date().toDateString()).length;
    const qualifiedLeads = leads.filter(l => l.lead_status === LeadStatus.QUALIFIED).length;
    const inProgressLeads = leads.filter(l => l.lead_status === LeadStatus.CONTACTED).length;
    const wonLeads = leads.filter(l => l.lead_status === LeadStatus.WON).length;
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

  async getById(id: string, userContext?: any) {
    const foundLead = await this.leadRepo.findOne({ where: { id, status: true } });
    if (!foundLead) throw new NotFoundException("Lead not found");

    const activities = await this.activityRepo.find({
      where: { lead_id: id, status: true },
      order: { created_on: "DESC" }
    });

    return { ...foundLead, activities };
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

  async insert(data: any, userId?: string, userContext?: any) {
    const leadEntity = this.leadRepo.create({
      ...data,
      name: data.name || `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.phone,
      tenant_id: userContext?.active_tenant_id || userContext?.tenant_id || "default",
      assigned_to_id: data.assigned_to_id || userId || undefined
    });

    const saved = (await this.leadRepo.save(leadEntity as any)) as lead;

    // Write initial activity
    const activity = this.activityRepo.create({
      lead_id: saved.id,
      activity_type: "CREATION",
      title: "Lead Created",
      description: `Created from ${saved.source || 'MANUAL'}`,
      performer_name: userContext?.name || "System",
      tenant_id: saved.tenant_id
    });
    await this.activityRepo.save(activity);

    return saved;
  }

  async update(id: string, data: any, userId?: string) {
    const target = await this.leadRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException("Lead not found");

    Object.assign(target, data);
    return await this.leadRepo.save(target);
  }

  async updateStatus(id: string, newStatus: string, userId?: string) {
    const target = await this.leadRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException("Lead not found");

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

  async delete(id: string) {
    await this.leadRepo.update(id, { status: false });
    return { success: true };
  }

  async bulkDelete(ids: string[]) {
    await this.leadRepo.update({ id: In(ids) }, { status: false });
    return { success: true, count: ids.length };
  }

  async bulkUpdateStatus(ids: string[], lead_status: string, userId?: string) {
    await this.leadRepo.update({ id: In(ids) }, { lead_status });
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

    l.lead_status = LeadStatus.QUALIFIED;
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

    return { success: true, lead: l };
  }
}
