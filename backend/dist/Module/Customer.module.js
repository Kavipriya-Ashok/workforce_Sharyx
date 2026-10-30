"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const customer_1 = require("../Database/Table/Customer/customer");
const crm_deal_1 = require("../Database/Table/Customer/crm_deal");
const customer_interaction_1 = require("../Database/Table/Customer/customer_interaction");
const lead_1 = require("../Database/Table/Lead/lead");
const Customer_controller_1 = require("../Controller/Customer/Customer.controller");
const Customer_service_1 = require("../Service/Customer/Customer.service");
let CustomerModule = class CustomerModule {
};
exports.CustomerModule = CustomerModule;
exports.CustomerModule = CustomerModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([customer_1.Customer, crm_deal_1.CrmDeal, customer_interaction_1.CustomerInteraction, lead_1.lead])],
        controllers: [Customer_controller_1.CustomerController],
        providers: [Customer_service_1.CustomerService],
        exports: [Customer_service_1.CustomerService, typeorm_1.TypeOrmModule],
    })
], CustomerModule);
//# sourceMappingURL=Customer.module.js.map