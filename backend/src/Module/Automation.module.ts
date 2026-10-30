import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LeadConversionRule } from "@Database/Table/Automation/lead_conversion_rule";
import { Customer } from "@Database/Table/Customer/customer";
import { CrmDeal } from "@Database/Table/Customer/crm_deal";
import { CustomerInteraction } from "@Database/Table/Customer/customer_interaction";
import { lead } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { AutomationController } from "@Controller/Automation/Automation.controller";
import { RuleEngineService } from "@Service/Automation/RuleEngine.service";
import { EmailModule } from "@Email/email.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeadConversionRule,
      Customer,
      CrmDeal,
      CustomerInteraction,
      lead,
      lead_activity,
    ]),
    EmailModule,
  ],
  controllers: [AutomationController],
  providers: [RuleEngineService],
  exports: [RuleEngineService, TypeOrmModule],
})
export class AutomationModule {}
