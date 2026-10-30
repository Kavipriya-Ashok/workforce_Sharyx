"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const lead_conversion_rule_1 = require("../Database/Table/Automation/lead_conversion_rule");
const customer_1 = require("../Database/Table/Customer/customer");
const crm_deal_1 = require("../Database/Table/Customer/crm_deal");
const customer_interaction_1 = require("../Database/Table/Customer/customer_interaction");
const lead_1 = require("../Database/Table/Lead/lead");
const lead_activity_1 = require("../Database/Table/Lead/lead_activity");
const Automation_controller_1 = require("../Controller/Automation/Automation.controller");
const RuleEngine_service_1 = require("../Service/Automation/RuleEngine.service");
const email_module_1 = require("../Email/email.module");
let AutomationModule = class AutomationModule {
};
exports.AutomationModule = AutomationModule;
exports.AutomationModule = AutomationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                lead_conversion_rule_1.LeadConversionRule,
                customer_1.Customer,
                crm_deal_1.CrmDeal,
                customer_interaction_1.CustomerInteraction,
                lead_1.lead,
                lead_activity_1.lead_activity,
            ]),
            email_module_1.EmailModule,
        ],
        controllers: [Automation_controller_1.AutomationController],
        providers: [RuleEngine_service_1.RuleEngineService],
        exports: [RuleEngine_service_1.RuleEngineService, typeorm_1.TypeOrmModule],
    })
], AutomationModule);
//# sourceMappingURL=Automation.module.js.map