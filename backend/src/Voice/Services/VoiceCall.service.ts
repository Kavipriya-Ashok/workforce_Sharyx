import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import axios from "axios";
import { VoiceCallLog } from "@Database/Table/Voice/VoiceCallLog.entity";
import { VoiceAgent } from "@Database/Table/Voice/VoiceAgent.entity";
import { VoiceProviderConfig } from "@Database/Table/Voice/VoiceProviderConfig.entity";
import { lead } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { VoiceFactoryService } from "./VoiceFactory.service";
import { MakeVoiceCallDto, NormalizedVoiceWebhookResult } from "../Interfaces/VoiceTypes";
import { AGENT_OUTCOME_EVENT, AgentOutcomeEvent } from "../../AgentOrchestrator/Services/AgentTools.service";

@Injectable()
export class VoiceCallService {
  private readonly logger = new Logger(VoiceCallService.name);

  constructor(
    private readonly factory: VoiceFactoryService,
    private readonly events: EventEmitter2
  ) {}

  @OnEvent("voice.call.requested")
  async handleVoiceCallRequest(event: {
    tenantId: string;
    phone: string;
    customerName?: string;
    reason?: string;
    leadId?: string;
  }) {
    this.logger.log(`📞 [EVENT TRIGGERED CALL] Requested voice call to ${event.phone} (Tenant: ${event.tenantId})`);
    const agent = await VoiceAgent.findOne({ where: { tenant_id: event.tenantId, status: true } });
    if (!agent) {
      this.logger.warn(`No active VoiceAgent found for tenant ${event.tenantId} to handle voice.call.requested`);
      return;
    }
    await this.dispatchCall({
      agent_id: agent.id,
      phone_number: event.phone,
      customer_name: event.customerName,
      lead_id: event.leadId,
      tenantId: event.tenantId,
      custom_variables: { reason: event.reason || "Customer requested a direct telephone call" },
    }).catch((err) => this.logger.error(`Failed to handle voice.call.requested: ${err.message}`));
  }

  /**
   * Helper to replace {{key}} or {key} placeholders with runtime data
   */
  private interpolatePrompt(template: string, vars: Record<string, any>): string {
    if (!template) return template;
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{{${key}}}`;
    });
  }

  async dispatchCall(dto: MakeVoiceCallDto): Promise<VoiceCallLog> {
    const tenantId = dto.tenantId || "default";
    let agent = await VoiceAgent.findOne({ where: { id: dto.agent_id, tenant_id: tenantId, status: true } });
    if (!agent) {
      agent = await VoiceAgent.findOne({ where: { remote_agent_id: dto.agent_id, tenant_id: tenantId, status: true } });
    }
    if (!agent) {
      agent = await VoiceAgent.findOne({ where: { tenant_id: tenantId, status: true } });
    }
    if (!agent) throw new NotFoundException(`Voice Agent ${dto.agent_id} not found`);

    const provider = this.factory.getProvider(agent.provider);
    const config = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, provider: agent.provider, is_active: true },
    });

    // Resolve or create CRM Lead
    let leadRec = dto.lead_id ? await lead.findOne({ where: { id: dto.lead_id } }) : null;
    if (!leadRec && dto.phone_number) {
      const cleanPhone = dto.phone_number.replace(/\D/g, "").slice(-10);
      leadRec = await lead.findOne({ where: { phone: cleanPhone, tenant_id: tenantId } });
      if (!leadRec) {
        leadRec = new lead();
        leadRec.tenant_id = tenantId;
        leadRec.name = dto.customer_name || "Voice Lead";
        leadRec.phone = dto.phone_number;
        leadRec.source = "voice";
        leadRec.lead_status = "new";
        leadRec.created_by_id = "voice_dispatch";
        leadRec.created_on = new Date();
        await leadRec.save();
      }
    }

    // Dynamic Variables Assembly
    const dynamicVariables: Record<string, any> = {
      customer_name: dto.customer_name || leadRec?.name || "Customer",
      phone_number: dto.phone_number,
      lead_status: leadRec?.lead_status || "new",
      lead_source: leadRec?.source || "voice",
      current_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      current_time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      agent_name: agent.name,
      ...(dto.custom_variables || {}),
    };

    // Interpolate dynamic variables into greeting & prompt if provided in variables
    const interpolatedGreeting = this.interpolatePrompt(
      dynamicVariables.first_message || agent.first_message || "Hello! How can I assist you today?",
      dynamicVariables
    );
    dynamicVariables.first_message = interpolatedGreeting;

    const interpolatedSystemPrompt = this.interpolatePrompt(agent.system_prompt, dynamicVariables);
    dynamicVariables.system_prompt = interpolatedSystemPrompt;

    dto.custom_variables = dynamicVariables;

    // Call provider with auto-fallback to SaasFallback if primary fails
    let res;
    try {
      res = await provider.makeCall(agent.remote_agent_id, dto, config || undefined);
    } catch (err: any) {
      if (agent.provider !== "saas_fallback") {
        this.logger.warn(`Primary voice provider ${agent.provider} failed: ${err.message}. Attempting SaaS Fallback...`);
        const fallbackProvider = this.factory.getProvider("saas_fallback");
        const fallbackConfig = await VoiceProviderConfig.findOne({
          where: { tenant_id: tenantId, provider: "saas_fallback", is_active: true },
        });
        res = await fallbackProvider.makeCall(agent.remote_agent_id, dto, fallbackConfig || undefined);
      } else {
        throw err;
      }
    }

    // Save Call Log
    const callLog = new VoiceCallLog();
    callLog.tenant_id = tenantId;
    callLog.agent_id = agent.id;
    callLog.agent_name = agent.name;
    callLog.provider = agent.provider;
    callLog.provider_call_id = res.callId;
    callLog.customer_phone = dto.phone_number;
    callLog.customer_name = dto.customer_name || leadRec?.name || "Customer";
    callLog.lead_id = leadRec?.id;
    callLog.direction = "outbound";
    callLog.call_status = res.status || "initiated";
    callLog.extracted_slots = dynamicVariables;
    callLog.created_by_id = "voice_call_service";
    callLog.created_on = new Date();
    await callLog.save();

    // Log in Lead Timeline
    if (leadRec) {
      const activity = new lead_activity();
      activity.lead_id = leadRec.id;
      activity.tenant_id = tenantId;
      activity.activity_type = "CALL";
      activity.title = `📞 Outbound Call Initiated (${agent.provider.toUpperCase()})`;
      activity.description = `Agent: ${agent.name} | Call ID: ${res.callId}`;
      activity.performer_name = "Voice AI Engine";
      activity.created_by_id = "voice_service";
      activity.created_on = new Date();
      await activity.save().catch(() => null);
    }

    this.logger.log(`📞 [CALL INITIATED] ${dto.phone_number} via ${agent.provider} (Log ID: ${callLog.id})`);
    return callLog;
  }

  async handleWebhook(providerName: string, payload: any): Promise<NormalizedVoiceWebhookResult> {
    const provider = this.factory.getProvider(providerName);
    const normalized = provider.normalizeWebhook(payload);

    this.logger.log(`📡 [VOICE WEBHOOK RECEIVED] ${providerName} Call ${normalized.providerCallId} -> ${normalized.status}`);

    let callLog = await VoiceCallLog.findOne({
      where: { provider_call_id: normalized.providerCallId },
    });

    if (!callLog && normalized.providerCallId) {
      callLog = new VoiceCallLog();
      callLog.provider = providerName as any;
      callLog.provider_call_id = normalized.providerCallId;
      callLog.customer_phone = payload?.customer?.number || payload?.to_number || payload?.phone_number || "unknown";
      callLog.created_by_id = "voice_webhook";
      callLog.created_on = new Date();
    }

    if (callLog) {
      callLog.call_status = normalized.status || callLog.call_status;
      if (normalized.durationSeconds) callLog.duration_seconds = normalized.durationSeconds;
      if (normalized.transcript) callLog.transcript = normalized.transcript;
      if (normalized.recordingUrl) callLog.recording_url = normalized.recordingUrl;
      if (normalized.summary) callLog.summary = normalized.summary;
      if (normalized.outcome) callLog.call_outcome = normalized.outcome;
      if (normalized.extractedSlots) {
        callLog.extracted_slots = { ...(callLog.extracted_slots || {}), ...normalized.extractedSlots };
      }
      callLog.raw_webhook_payload = payload;
      callLog.updated_on = new Date();
      await callLog.save();

      // If call summary or outcome indicates appointment or meeting booked -> emit event!
      if (normalized.summary || normalized.outcome) {
        const text = `${normalized.summary} ${normalized.transcript}`.toLowerCase();
        if (text.includes("demo") || text.includes("meet") || text.includes("appointment") || text.includes("schedule")) {
          this.events.emit(AGENT_OUTCOME_EVENT, {
            tenantId: callLog.tenant_id,
            channel: "voice",
            outcome: "Voice Demo Booked",
            event: "appointment_booked",
            phone: callLog.customer_phone,
            leadName: callLog.customer_name,
            summary: normalized.summary,
            agentName: callLog.agent_name || "Voice Agent",
          } as AgentOutcomeEvent);
        }
      }

      // Dynamic 3rd-Party Webhook Forwarding
      this.forwardWebhookToExternal(callLog).catch((err) =>
        this.logger.warn(`External webhook dispatch error: ${err.message}`)
      );
    }

    return normalized;
  }

  private async forwardWebhookToExternal(callLog: VoiceCallLog): Promise<void> {
    const config = await VoiceProviderConfig.findOne({
      where: { tenant_id: callLog.tenant_id, provider: callLog.provider as any },
    });

    const forwardUrl = config?.metadata?.webhook_forward_url;
    if (!forwardUrl) return;

    try {
      this.logger.log(`🚀 [FORWARDING VOICE LOG] Sending call ${callLog.provider_call_id} to external URL: ${forwardUrl}`);
      await axios.post(
        forwardUrl,
        {
          event: "voice_call.completed",
          timestamp: new Date().toISOString(),
          provider: callLog.provider,
          call_id: callLog.provider_call_id,
          customer_phone: callLog.customer_phone,
          customer_name: callLog.customer_name,
          duration_seconds: callLog.duration_seconds,
          status: callLog.call_status,
          transcript: callLog.transcript,
          summary: callLog.summary,
          recording_url: callLog.recording_url,
          outcome: callLog.call_outcome,
          extracted_slots: callLog.extracted_slots,
        },
        { timeout: 8000 }
      );
    } catch (err: any) {
      this.logger.warn(`Failed to forward call log to ${forwardUrl}: ${err.message}`);
    }
  }

  async getCallLogs(tenantId: string = "default", limit: number = 50): Promise<VoiceCallLog[]> {
    return await VoiceCallLog.find({
      where: { tenant_id: tenantId },
      order: { created_on: "DESC" },
      take: limit,
    });
  }

  async getCallStats(tenantId: string = "default") {
    const logs = await VoiceCallLog.find({ where: { tenant_id: tenantId } });
    const totalCalls = logs.length;
    const completed = logs.filter((l) => l.call_status === "completed").length;
    const avgDuration =
      totalCalls > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.duration_seconds || 0), 0) / totalCalls) : 0;

    return {
      totalCalls,
      completedCalls: completed,
      avgDurationSeconds: avgDuration,
      completionRate: totalCalls > 0 ? Math.round((completed / totalCalls) * 100) : 0,
    };
  }
}
