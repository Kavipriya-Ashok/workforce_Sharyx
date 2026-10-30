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
var CustomerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_1 = require("../../Database/Table/Customer/customer");
const crm_deal_1 = require("../../Database/Table/Customer/crm_deal");
const customer_interaction_1 = require("../../Database/Table/Customer/customer_interaction");
const lead_1 = require("../../Database/Table/Lead/lead");
let CustomerService = CustomerService_1 = class CustomerService {
    constructor(customerRepo, dealRepo, interactionRepo, leadRepo) {
        this.customerRepo = customerRepo;
        this.dealRepo = dealRepo;
        this.interactionRepo = interactionRepo;
        this.leadRepo = leadRepo;
        this.logger = new common_1.Logger(CustomerService_1.name);
    }
    async list(query, userContext) {
        const page = Math.max(1, parseInt(query.page || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(query.limit || "10", 10)));
        const skip = (page - 1) * limit;
        const tenantId = (userContext === null || userContext === void 0 ? void 0 : userContext.tenant_id) || query.tenant_id || "default";
        const qb = this.customerRepo.createQueryBuilder("c")
            .where("c.status = true")
            .andWhere("c.tenant_id = :tenantId", { tenantId });
        if (query.search && query.search.trim()) {
            const term = `%${query.search.trim()}%`;
            qb.andWhere("(c.name ILIKE :term OR c.email ILIKE :term OR c.phone ILIKE :term OR c.company_name ILIKE :term)", { term });
        }
        if (query.customer_status) {
            qb.andWhere("c.customer_status = :status", { status: query.customer_status });
        }
        if (query.tier) {
            qb.andWhere("c.tier = :tier", { tier: query.tier });
        }
        qb.orderBy("c.created_on", "DESC").skip(skip).take(limit);
        const [items, total] = await qb.getManyAndCount();
        const allCustomers = await this.customerRepo.find({ where: { tenant_id: tenantId, status: true } });
        const totalCustomers = allCustomers.length;
        const activeCustomers = allCustomers.filter((c) => c.customer_status === customer_1.CustomerStatus.ACTIVE).length;
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
    async getById(id) {
        const customer = await this.customerRepo.findOne({ where: { id, status: true } });
        if (!customer)
            throw new common_1.NotFoundException(`Customer ${id} not found`);
        const interactions = await this.interactionRepo.find({
            where: { customer_id: id, status: true },
            order: { created_on: "DESC" },
        });
        const deals = await this.dealRepo.find({
            where: { customer_id: id, status: true },
            order: { created_on: "DESC" },
        });
        let originalLead = null;
        if (customer.converted_from_lead_id) {
            originalLead = await this.leadRepo.findOne({ where: { id: customer.converted_from_lead_id } });
        }
        return Object.assign(Object.assign({}, customer), { interactions,
            deals,
            originalLead });
    }
    async insert(data, userId) {
        const cust = this.customerRepo.create(Object.assign(Object.assign({}, data), { created_by_id: userId || "system", created_on: new Date(), status: true }));
        return await this.customerRepo.save(cust);
    }
    async update(id, data, userId) {
        const cust = await this.customerRepo.findOne({ where: { id } });
        if (!cust)
            throw new common_1.NotFoundException(`Customer ${id} not found`);
        Object.assign(cust, data, { updated_by_id: userId || "system", updated_on: new Date() });
        return await this.customerRepo.save(cust);
    }
    async delete(id) {
        await this.customerRepo.update(id, { status: false });
        return { success: true };
    }
    async listDeals(tenantId = "default") {
        return await this.dealRepo.find({
            where: { tenant_id: tenantId, status: true },
            order: { created_on: "DESC" },
        });
    }
    async addInteraction(customerId, data, userId) {
        const inter = this.interactionRepo.create(Object.assign(Object.assign({}, data), { customer_id: customerId, created_by_id: userId || "system", created_on: new Date(), status: true }));
        return await this.interactionRepo.save(inter);
    }
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = CustomerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_1.Customer)),
    __param(1, (0, typeorm_1.InjectRepository)(crm_deal_1.CrmDeal)),
    __param(2, (0, typeorm_1.InjectRepository)(customer_interaction_1.CustomerInteraction)),
    __param(3, (0, typeorm_1.InjectRepository)(lead_1.lead)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CustomerService);
//# sourceMappingURL=Customer.service.js.map