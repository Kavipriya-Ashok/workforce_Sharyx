import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "@Database/Table/Customer/customer";
import { CrmDeal } from "@Database/Table/Customer/crm_deal";
import { CustomerInteraction } from "@Database/Table/Customer/customer_interaction";
import { lead } from "@Database/Table/Lead/lead";
import { CustomerController } from "@Controller/Customer/Customer.controller";
import { CustomerService } from "@Service/Customer/Customer.service";

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CrmDeal, CustomerInteraction, lead])],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService, TypeOrmModule],
})
export class CustomerModule {}
