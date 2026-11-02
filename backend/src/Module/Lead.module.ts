import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { lead } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { JobOpening } from "@Database/Table/Lead/JobOpening.entity";
import { LeadController } from "@Controller/Lead/Lead.controller";
import { JobOpeningsController } from "@Controller/Lead/JobOpenings.controller";
import { LeadService } from "@Service/Lead/Lead.service";
import { JobOpeningsService } from "@Service/Lead/JobOpenings.service";

@Module({
  imports: [TypeOrmModule.forFeature([lead, lead_activity, JobOpening])],
  controllers: [LeadController, JobOpeningsController],
  providers: [LeadService, JobOpeningsService],
  exports: [LeadService, JobOpeningsService, TypeOrmModule],
})
export class LeadModule {}
