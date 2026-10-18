"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const lead_1 = require("../Database/Table/Lead/lead");
const lead_activity_1 = require("../Database/Table/Lead/lead_activity");
const Lead_controller_1 = require("../Controller/Lead/Lead.controller");
const Lead_service_1 = require("../Service/Lead/Lead.service");
let LeadModule = class LeadModule {
};
exports.LeadModule = LeadModule;
exports.LeadModule = LeadModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([lead_1.lead, lead_activity_1.lead_activity])],
        controllers: [Lead_controller_1.LeadController],
        providers: [Lead_service_1.LeadService],
        exports: [Lead_service_1.LeadService, typeorm_1.TypeOrmModule],
    })
], LeadModule);
//# sourceMappingURL=Lead.module.js.map