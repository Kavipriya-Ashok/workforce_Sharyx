import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, In } from "typeorm";
import { Customer, CustomerStatus, CustomerTier } from "@Database/Table/Customer/customer";
import { CrmDeal } from "@Database/Table/Customer/crm_deal";
import { CustomerInteraction } from "@Database/Table/Customer/customer_interaction";
import { lead } from "@Database/Table/Lead/lead";

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CrmDeal)
    private readonly dealRepo: Repository<CrmDeal>,
    @InjectRepository(CustomerInteraction)
    private readonly interactionRepo: Repository<CustomerInteraction>,
    @InjectRepository(lead)
    private readonly leadRepo: Repository<lead>
  ) {}

  async list(query: any, userContext?: any) {
    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "10", 10)));
    const skip = (page - 1) * limit;

    const tenantId = userContext?.tenant_id || query.tenant_id || "default";

    const qb = this.customerRepo.createQueryBuilder("c")
      .where("c.status = true")
      .andWhere("c.tenant_id = :tenantId", { tenantId });

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        "(c.name ILIKE :term OR c.email ILIKE :term OR c.phone ILIKE :term OR c.company_name ILIKE :term)",
        { term }
      );
    }

    if (query.customer_status) {
      qb.andWhere("c.customer_status = :status", { status: query.customer_status });
    }

    if (query.tier) {
      qb.andWhere("c.tier = :tier", { tier: query.tier });
    }

    qb.orderBy("c.created_on", "DESC").skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Calculate KPI metrics
    const allCustomers = await this.customerRepo.find({ where: { tenant_id: tenantId, status: true } });
    const totalCustomers = allCustomers.length;
    const activeCustomers = allCustomers.filter((c) => c.customer_status === CustomerStatus.ACTIVE).length;
    const totalRevenue = allCustomers.reduce((acc, c) => acc + (Number(c.total_spend) || 0), 0);
    const convertedFromLeads = allCustomers.filter((c) => !!c.converted_from_lead_id).length;
    const autoConversionRate = totalCustomers > 0 ? Math.round((convertedFromLeads / totalCustomers) * 100) : 0;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      metrics: {
        totalCustomers,
        activeCustomers,
        totalRevenue,
        convertedFromLeads,
        autoConversionRate,
      },
    };
  }

  async getById(id: string) {
    const customer = await this.customerRepo.findOne({ where: { id, status: true } });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);

    const interactions = await this.interactionRepo.find({
      where: { customer_id: id, status: true },
      order: { created_on: "DESC" },
    });

    const deals = await this.dealRepo.find({
      where: { customer_id: id, status: true },
      order: { created_on: "DESC" },
    });

    let originalLead: lead | null = null;
    if (customer.converted_from_lead_id) {
      originalLead = await this.leadRepo.findOne({ where: { id: customer.converted_from_lead_id } });
    }

    return {
      ...customer,
      interactions,
      deals,
      originalLead,
    };
  }

  async insert(data: Partial<Customer>, userId?: string) {
    const cust = this.customerRepo.create({
      ...data,
      created_by_id: userId || "system",
      created_on: new Date(),
      status: true,
    });
    return await this.customerRepo.save(cust);
  }

  async update(id: string, data: Partial<Customer>, userId?: string) {
    const cust = await this.customerRepo.findOne({ where: { id } });
    if (!cust) throw new NotFoundException(`Customer ${id} not found`);

    Object.assign(cust, data, { updated_by_id: userId || "system", updated_on: new Date() });
    return await this.customerRepo.save(cust);
  }

  async delete(id: string) {
    await this.customerRepo.update(id, { status: false });
    return { success: true };
  }

  async listDeals(tenantId: string = "default") {
    return await this.dealRepo.find({
      where: { tenant_id: tenantId, status: true },
      order: { created_on: "DESC" },
    });
  }

  async addInteraction(customerId: string, data: Partial<CustomerInteraction>, userId?: string) {
    const inter = this.interactionRepo.create({
      ...data,
      customer_id: customerId,
      created_by_id: userId || "system",
      created_on: new Date(),
      status: true,
    });
    return await this.interactionRepo.save(inter);
  }
}
