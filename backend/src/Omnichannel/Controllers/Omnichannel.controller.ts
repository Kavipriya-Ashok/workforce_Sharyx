import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Headers,
  Res,
  VERSION_NEUTRAL,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Response } from "express";
import { OmnichannelService } from "../Services/Omnichannel.service";
import { OmnichannelRealtimeService } from "../Services/OmnichannelRealtime.service";
import { OmnichannelTimelineService } from "../Services/OmnichannelTimeline.service";
import { CustomerIdentityResolutionService } from "../Services/CustomerIdentityResolution.service";
import { OmnichannelCustomerIntelligenceService } from "../Services/OmnichannelCustomerIntelligence.service";
import {
  ConversationQueryDto,
  SendReplyDto,
  UpdateConversationDto,
  OmnichannelStatusEnum,
  LeadQueryDto,
  LeadTimelineQueryDto,
  SendLeadReplyDto,
} from "../Dto/Omnichannel.dto";

@Controller({
  path: ["omnichannel", "Omnichannel"],
  version: ["1", VERSION_NEUTRAL],
})
@ApiTags("Omnichannel Inbox")
export class OmnichannelController {
  private readonly logger = new Logger(OmnichannelController.name);

  constructor(
    private readonly omnichannelService: OmnichannelService,
    private readonly realtimeService: OmnichannelRealtimeService,
    private readonly timelineService: OmnichannelTimelineService,
    private readonly identityService: CustomerIdentityResolutionService,
    private readonly intelligenceService: OmnichannelCustomerIntelligenceService
  ) {}

  // ═════════════════════════════════════════════════════════════════════════
  // CUSTOMER-CENTRIC OMNICHANNEL 360° ENDPOINTS
  // ═════════════════════════════════════════════════════════════════════════

  @Get("customers")
  @ApiOperation({ summary: "Get unified Customer 360 directory with channel badges & counts" })
  async getCustomers(
    @Query("search") search?: string,
    @Query("channel") channel?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.getCustomerDirectory({ search, channel, page, limit }, tenantId);
  }

  @Get("customers/:id")
  @ApiOperation({ summary: "Get single unified customer profile" })
  async getCustomer(
    @Param("id") customerId: string,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.getCustomerDetail(customerId, tenantId);
  }

  @Get("customers/:id/timeline")
  @ApiOperation({ summary: "Get unified Customer 360 timeline across WhatsApp, Email, Calls, Meetings & Interviews" })
  async getCustomerTimeline(
    @Param("id") customerId: string,
    @Query("channel") channel?: any,
    @Query("direction") direction?: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("search") search?: string,
    @Query("sortOrder") sortOrder?: any,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.timelineService.getCustomerTimeline(
      customerId,
      { channel, direction, startDate, endDate, search, sortOrder, page, limit },
      tenantId
    );
  }

  @Get("customers/:id/summary")
  @ApiOperation({ summary: "Get grounded AI Customer Intelligence report across all channels" })
  async getCustomerSummary(
    @Param("id") customerId: string,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.intelligenceService.generateCustomerIntelligence(customerId, tenantId);
  }

  @Get("events/:id")
  @ApiOperation({ summary: "Get single event detail with fully resolved source payload" })
  async getEventDetail(
    @Param("id") eventId: string,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.timelineService.getEventDetail(eventId, tenantId);
  }

  @Post("customers/:id/link-identity")
  @ApiOperation({ summary: "Manually link phone or email to existing customer profile" })
  async linkIdentity(
    @Param("id") customerId: string,
    @Body() dto: { identity_type: "phone" | "email"; value: string },
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.identityService.manualLinkIdentity(
      customerId,
      dto.identity_type,
      dto.value,
      tenantId
    );
  }

  @Post("customers/:id/reply")
  @ApiOperation({ summary: "Send reply to a customer on WhatsApp, Email, or Call" })
  async sendCustomerReply(
    @Param("id") customerId: string,
    @Body() dto: SendLeadReplyDto,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.sendCustomerReply(customerId, dto, tenantId);
  }

  @Get("conversations")
  @ApiOperation({ summary: "Get omnichannel unified inbox list" })
  async getConversations(
    @Query() query: ConversationQueryDto,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.listConversations(query, tenantId);
  }

  @Get("conversations/:id")
  @ApiOperation({ summary: "Get conversation detail with messages and calls" })
  async getConversationDetail(
    @Param("id") id: string,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.getConversationDetail(id, tenantId);
  }

  @Patch("conversations/:id/status")
  @ApiOperation({ summary: "Update conversation status" })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateConversationDto,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    const status = dto.status || OmnichannelStatusEnum.OPEN;
    return await this.omnichannelService.updateStatus(id, status, tenantId);
  }

  @Post("conversations/:id/reply")
  @ApiOperation({ summary: "Reply inside conversation on the active channel" })
  async sendReply(
    @Param("id") id: string,
    @Body() dto: SendReplyDto,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.sendReply(id, dto, tenantId);
  }

  @Get("customers/:id/timeline")
  @ApiOperation({ summary: "Get Customer 360 combined timeline across all channels" })
  async getCustomer360(
    @Param("id") customerId: string,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.getCustomer360Timeline(customerId, tenantId);
  }

  @Get("stream")
  @ApiOperation({ summary: "Server-Sent Events (SSE) real-time stream" })
  streamUpdates(@Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders?.();

    this.realtimeService.registerClient(res);
  }

  @Get("leads")
  @ApiOperation({ summary: "Get leads list with last channel badge and last activity description" })
  async getLeads(
    @Query() query: LeadQueryDto,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.getLeads(query, tenantId);
  }

  @Get("leads/:id/timeline")
  @ApiOperation({ summary: "Get chronological multi-channel timeline for a lead (WhatsApp, Email, Call)" })
  async getLeadTimeline(
    @Param("id") leadId: string,
    @Query("channel") channelFilter?: string,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.getLeadTimeline(leadId, channelFilter, tenantId);
  }

  @Post("leads/:id/reply")
  @ApiOperation({ summary: "Send reply to a lead across WhatsApp, Email, or Call" })
  async sendLeadReply(
    @Param("id") leadId: string,
    @Body() dto: SendLeadReplyDto,
    @Headers("x-tenant-id") tenantHeader?: string
  ) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.sendLeadReply(leadId, dto, tenantId);
  }

  @Post("seed-demo")
  @ApiOperation({ summary: "Seed demo omnichannel data for testing" })
  async seedDemo(@Headers("x-tenant-id") tenantHeader?: string) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.seedDemoData(tenantId);
  }

  @Post("seed-ram")
  @ApiOperation({ summary: "Seed sample data for Ram (WhatsApp, Email, and Call entries)" })
  async seedRam(@Headers("x-tenant-id") tenantHeader?: string) {
    const tenantId = tenantHeader || "default";
    return await this.omnichannelService.seedSampleDataForRam(tenantId);
  }
}

