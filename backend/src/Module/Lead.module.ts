import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { lead } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { LeadController } from "@Controller/Lead/Lead.controller";
import { LeadService } from "@Service/Lead/Lead.service";

@Module({
  imports: [TypeOrmModule.forFeature([lead, lead_activity])],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService, TypeOrmModule],
})
export class LeadModule {}
