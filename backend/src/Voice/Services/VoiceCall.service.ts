import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { Like } from "typeorm";
import axios from "axios";
import { VoiceCallLog } from "@Database/Table/Voice/VoiceCallLog.entity";
import { VoiceAgent } from "@Database/Table/Voice/VoiceAgent.entity";
import { VoiceProviderConfig } from "@Database/Table/Voice/VoiceProviderConfig.entity";
import { WhatsAppMessage } from "@Database/Table/WhatsApp/WhatsAppMessage.entity";
import { ConversationAgentState } from "@Database/Table/Agent/ConversationAgentState.entity";
import { lead } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { VoiceFactoryService } from "./VoiceFactory.service";
import { MakeVoiceCallDto, NormalizedVoiceWebhookResult } from "../Interfaces/VoiceTypes";
import { AGENT_OUTCOME_EVENT, AgentOutcomeEvent } from "../../AgentOrchestrator/Services/AgentTools.service";

@Injectable()
export class VoiceCallService {
  private readonly logger = new Logger(VoiceCallService.name);
  private recentCallDispatches = new Map<string, number>();

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
    agentId?: string;
    agentKey?: string;
    scheduledType?: "demo" | "interview" | string;
    meetingSlot?: string;
    meetUrl?: string;
    firstMessage?: string;
    customVariables?: Record<string, any>;
  }) {
    const tenantId = event.tenantId || "default";

    // Deduplication & Debounce: Prevent double-calling the same customer within 90 seconds
    const cleanPhone = (event.phone || "").replace(/\D/g, "").slice(-10);
    const now = Date.now();
    const lastDispatched = this.recentCallDispatches.get(cleanPhone);
    if (lastDispatched && now - lastDispatched < 90000) {
      this.logger.warn(
        `⏳ [DUPLICATE CALL SUPPRESSED] Call to ${event.phone} already dispatched ${Math.round(
          (now - lastDispatched) / 1000
        )}s ago. Skipping duplicate request.`
      );
      return;
    }
    this.recentCallDispatches.set(cleanPhone, now);

    this.logger.log(
      `📞 [EVENT TRIGGERED CALL] Call to ${event.phone} (Tenant: ${tenantId}, Type: ${event.scheduledType || "auto"}, Target: ${event.agentKey || "sales"})`
    );

    // 1. Resolve currently connected / active voice platform (Vapi vs SaaS Telephony)
    const activeConfig = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, is_active: true },
    });
    let connectedProvider = activeConfig?.provider;
    if (!connectedProvider) {
      const allConfigs = await VoiceProviderConfig.find({ where: { tenant_id: tenantId } });
      const withKey = allConfigs.find((c) => c.api_key && c.api_key.trim().length > 0 && c.is_active !== false);
      if (withKey) {
        connectedProvider = withKey.provider;
      } else if (process.env.VAPI_API_KEY) {
        connectedProvider = "vapi";
      } else {
        connectedProvider = "saas_fallback";
      }
    }

    const isInterview =
      event.scheduledType === "interview" ||
      event.agentKey === "recruitment" ||
      /interview/i.test(event.reason || "");
    const targetAgentKey = isInterview ? "recruitment" : (event.agentKey || "sales");

    // 2. Prioritize finding an agent configured for the active connected provider
    let agent: VoiceAgent | null = null;
    if (event.agentId) {
      agent = await VoiceAgent.findOne({ where: { id: event.agentId, tenant_id: tenantId } });
      if (!agent) {
        agent = await VoiceAgent.findOne({ where: { remote_agent_id: event.agentId, tenant_id: tenantId } });
      }
    }
    if (!agent) {
      agent = await VoiceAgent.findOne({
        where: {
          tenant_id: tenantId,
          provider: connectedProvider,
          template_key: targetAgentKey,
          status: true,
          is_enabled: true,
        },
      });
    }
    if (!agent) {
      agent = await VoiceAgent.findOne({
        where: {
          tenant_id: tenantId,
          provider: connectedProvider,
          template_key: targetAgentKey,
          status: true,
        },
      });
    }
    if (!agent) {
      agent = await VoiceAgent.findOne({
        where: { tenant_id: tenantId, provider: connectedProvider, status: true, is_enabled: true },
      });
    }
    if (!agent) {
      agent = await VoiceAgent.findOne({
        where: { tenant_id: tenantId, provider: connectedProvider, status: true },
      });
    }
    if (!agent) {
      agent = await VoiceAgent.findOne({
        where: { tenant_id: tenantId, template_key: targetAgentKey, status: true },
      });
    }
    if (!agent) {
      agent = await VoiceAgent.findOne({ where: { tenant_id: tenantId, status: true } });
    }

    // Default fallback agent creation if none found in DB
    if (!agent) {
      try {
        agent = new VoiceAgent();
        agent.tenant_id = tenantId;
        agent.name = isInterview ? "Talent Recruiter (Sarah)" : "Sales Specialist (Alex)";
        agent.provider = connectedProvider;
        agent.template_key = targetAgentKey;
        agent.status = true;
        agent.is_enabled = true;
        agent.remote_agent_id = `${connectedProvider}_agent_${Date.now()}`;
        agent.system_prompt = isInterview
          ? "You are Sarah, an executive recruiter calling a candidate who just scheduled an interview on Google Meet. Acknowledge their scheduled slot, confirm their availability, and answer any quick questions."
          : "You are Alex, a sales specialist calling a prospect who just scheduled a product demo on Google Meet. Acknowledge their scheduled slot, warmly confirm the meeting, and ask if they have any initial questions.";
        agent.first_message = isInterview
          ? "Hello {{customer_name}}, this is Sarah from Sharyx AI following up on your interview scheduled for {{meeting_slot}}! We've sent your Google Meet link. Are you looking forward to the discussion?"
          : "Hello {{customer_name}}, this is Alex from Sharyx AI following up on the demo you just scheduled for {{meeting_slot}}! We've sent the Google Meet link. Do you have any quick questions before our session?";
        await agent.save();
      } catch (agentErr: any) {
        this.logger.warn(`Could not auto-create fallback VoiceAgent: ${agentErr.message}`);
      }
    }

    if (!agent) {
      this.logger.warn(`No VoiceAgent could be resolved for tenant ${tenantId} to handle voice.call.requested`);
      return;
    }

    // 3. Extract deep conversation context (slots, resume, interview details, WhatsApp chat history)
    let stateSlots: any = {};
    let matchedLead: lead | null = null;
    let candidateName = event.customerName || "";
    let customerEmail = "";

    try {
      if (cleanPhone) {
        const stateRec = await ConversationAgentState.findOne({
          where: [{ customer_phone: Like(`%${cleanPhone}%`) }],
          order: { updated_on: "DESC" },
        });
        if (stateRec) {
          stateSlots = stateRec.collected_slots || {};
          if (!candidateName && stateRec.customer_name) candidateName = stateRec.customer_name;
          if (stateRec.customer_email) customerEmail = stateRec.customer_email;
        }

        if (event.leadId) {
          matchedLead = await lead.findOne({ where: { id: event.leadId } });
        }
        if (!matchedLead) {
          matchedLead = await lead.findOne({
            where: [{ phone: Like(`%${cleanPhone}%`) }],
            order: { created_on: "DESC" },
          });
        }
        if (matchedLead) {
          if (!candidateName && matchedLead.name) candidateName = matchedLead.name;
          if (!customerEmail && matchedLead.email) customerEmail = matchedLead.email;
        }
      }
    } catch (ctxErr: any) {
      this.logger.warn(`Could not load candidate state/lead context: ${ctxErr.message}`);
    }

    const customerName = candidateName || "there";
    const appliedRole =
      stateSlots.applied_role ||
      stateSlots.job_title ||
      stateSlots.role ||
      matchedLead?.job_title ||
      "";
    const experience =
      stateSlots.experience ||
      stateSlots.total_experience ||
      (matchedLead?.total_experience ? `${matchedLead.total_experience} years` : "");
    const noticePeriod =
      stateSlots.notice_period ||
      stateSlots.employment_status ||
      matchedLead?.employment_status ||
      "";
    const expectedCtc =
      stateSlots.expected_ctc ||
      (matchedLead?.expected_ctc ? `${matchedLead.expected_ctc} LPA` : "");
    const resumeInfo =
      stateSlots.resume_filename ||
      stateSlots.resume_url ||
      matchedLead?.resume_url ||
      "";
    const companyName =
      stateSlots.company ||
      matchedLead?.company_name ||
      "";

    const slotText =
      event.meetingSlot ||
      stateSlots.appointment?.slot ||
      matchedLead?.preferred_interview_slot ||
      "your upcoming session";
    const meetUrlText =
      event.meetUrl ||
      stateSlots.appointment?.meet_url ||
      matchedLead?.interview_link ||
      "";
    const scheduledType = isInterview ? "interview" : "demo";
    const defaultReason = isInterview ? "Interview scheduled" : "You scheduled demo";
    const reasonText = event.reason || defaultReason;

    // Fetch recent WhatsApp chat messages so the AI voice agent knows what was spoken in chat!
    let chatSummary = "";
    try {
      if (cleanPhone) {
        const recentMsgs = await WhatsAppMessage.find({
          where: [
            { sender_phone: Like(`%${cleanPhone}%`) },
            { recipient_phone: Like(`%${cleanPhone}%`) },
          ],
          order: { created_on: "DESC" },
          take: 10,
        });
        if (recentMsgs && recentMsgs.length > 0) {
          chatSummary = recentMsgs
            .reverse()
            .map((m) => `${m.direction === "inbound" ? "Customer" : "Assistant"}: "${(m.message_text || "").replace(/\n+/g, " ").slice(0, 150)}"`)
            .join("\n");
        }
      }
    } catch (chatErr: any) {
      this.logger.warn(`Could not load chat history for voice call: ${chatErr.message}`);
    }

    const dynamicFirstMessage =
      event.firstMessage ||
      (isInterview
        ? `Hi ${customerName}, you just scheduled your interview, right? This is Maya from Sharyx Talent Acquisition following up on our chat! I saw you booked your Google Meet interview for ${slotText}${appliedRole ? ` for the ${appliedRole} role` : ""}. I've got your details and resume right here. I just wanted to confirm your slot and make sure you received the Google Meet link. Are you looking forward to the discussion?`
        : `Hi ${customerName}, you just scheduled a demo, right? This is Alex from Sharyx AI following up on our chat! I saw you booked your live walkthrough for ${slotText}${companyName ? ` for ${companyName}` : ""}. I wanted to confirm your slot and make sure you received the Google Meet link. Do you have any quick questions before our session?`);

    const dynamicSystemPrompt = isInterview
      ? `You are Maya, Senior Talent Acquisition Specialist at Sharyx AI. You are speaking on a live outbound phone call with ${customerName}, following up immediately after their conversation on WhatsApp.

CANDIDATE PROFILE DISCUSSED IN CHAT:
- Candidate Name: ${customerName}
${appliedRole ? `- Target Position: ${appliedRole}` : ""}
${experience ? `- Total Experience: ${experience}` : ""}
${noticePeriod ? `- Notice Period / Availability: ${noticePeriod}` : ""}
${expectedCtc ? `- Expected CTC: ${expectedCtc}` : ""}
${resumeInfo ? `- Resume on File: ${resumeInfo}` : ""}
- Confirmed Google Meet Slot: ${slotText}
- Google Meet URL: ${meetUrlText}

${chatSummary ? `[RECENT WHATSAPP CHAT DISCUSSION WITH THIS CANDIDATE]:\n${chatSummary}\n` : ""}

YOUR CONVERSATION INSTRUCTIONS:
1. GREETING: Speak your first greeting naturally: "Hi ${customerName}, you just scheduled your interview, right? This is Maya from Sharyx Talent Acquisition following up on our chat!"
2. SEAMLESS CHAT CONTINUITY: You already have all the candidate's details from WhatsApp (${appliedRole ? `Role: ${appliedRole}, ` : ""}${experience ? `Experience: ${experience}, ` : ""}Slot: ${slotText}). DO NOT re-ask questions they already answered (like their experience, resume, or CTC). Treat this call as a warm, human confirmation from the hiring team.
3. CONFIRM DETAILS: Reconfirm their Google Meet slot (${slotText}) and confirm they received the Google Meet invitation link (${meetUrlText}).
4. CANDIDATE QUESTIONS: Answer any questions they have about the company (Sharyx builds AI Workforce solutions like voice bots and copilots), the interview structure (30-minute technical & cultural discussion), or preparations.
5. TONE & STYLE: Speak in a warm, friendly, confident human recruiter voice. Keep every response concise (1 to 2 short sentences per turn) so it feels like a real phone conversation. Never sound robotic, never repeat yourself, and never read out long paragraphs.`
      : `You are Alex, Senior Solutions Specialist at Sharyx AI. You are speaking on a live outbound phone call with ${customerName}, following up immediately after their conversation on WhatsApp.

PROSPECT PROFILE DISCUSSED IN CHAT:
- Name: ${customerName}
${companyName ? `- Company: ${companyName}` : ""}
- Confirmed Live Demo Slot: ${slotText}
- Google Meet URL: ${meetUrlText}

${chatSummary ? `[RECENT WHATSAPP CHAT DISCUSSION WITH THIS PROSPECT]:\n${chatSummary}\n` : ""}

YOUR CONVERSATION INSTRUCTIONS:
1. GREETING: Speak your first greeting naturally: "Hi ${customerName}, you just scheduled a demo, right? This is Alex from Sharyx AI following up on our chat!"
2. SEAMLESS CHAT CONTINUITY: You already know who they are and what they booked. Do not ask them generic qualifying questions they already answered in chat.
3. CONFIRM DETAILS: Reconfirm their live product demo walkthrough for ${slotText} and verify they received the Google Meet link (${meetUrlText}).
4. DISCOVERY: Ask if there are specific workflows (Voice AI telephony, WhatsApp copilots, or CRM automation) they want to focus on during the walkthrough.
5. TONE & STYLE: Friendly, consultative, natural human tone. Keep responses short and conversational suitable for a phone call.`;

    const callPayload: Record<string, any> = {
      scheduled_type: scheduledType,
      reason: reasonText,
      meeting_slot: slotText,
      meet_url: meetUrlText,
      customer_name: customerName,
      first_message: dynamicFirstMessage,
      system_prompt: dynamicSystemPrompt,
      event_type: isInterview ? "interview_scheduled" : "demo_scheduled",
      ...(event.customVariables || {}),
    };

    this.logger.log(
      `📞 [ROUTED TO VOICE AGENT] Platform: ${agent.provider.toUpperCase()} | Agent: ${agent.name} (${agent.id}) | Reason: "${reasonText}"`
    );

    await this.dispatchCall({
      agent_id: agent.id,
      phone_number: event.phone,
      customer_name: event.customerName,
      lead_id: event.leadId,
      tenantId: tenantId,
      custom_variables: callPayload,
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

    // 1. Resolve active connected voice platform
    const activeConfig = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, is_active: true },
    });
    const connectedProvider = activeConfig?.provider || (process.env.VAPI_API_KEY ? "vapi" : "saas_fallback");

    let agent: VoiceAgent | null = null;
    if (dto.agent_id) {
      agent = await VoiceAgent.findOne({ where: { id: dto.agent_id, tenant_id: tenantId } });
      if (!agent) {
        agent = await VoiceAgent.findOne({ where: { remote_agent_id: dto.agent_id, tenant_id: tenantId } });
      }
      // If requested agent's provider does not match the active connected provider, try to find the counterpart
      if (agent && agent.provider !== connectedProvider) {
        const preferredCounterpart = await VoiceAgent.findOne({
          where: {
            tenant_id: tenantId,
            provider: connectedProvider,
            template_key: agent.template_key || "sales",
            status: true,
          },
        });
        if (preferredCounterpart) {
          this.logger.log(
            `🔄 [CONNECTED PLATFORM ROUTING] Re-routing from ${agent.provider} agent to active ${connectedProvider} agent: ${preferredCounterpart.name}`
          );
          agent = preferredCounterpart;
        }
      }
    }

    if (!agent) {
      const scheduledType = dto.custom_variables?.scheduled_type || dto.custom_variables?.event_type || "";
      const isInterview = /interview/i.test(scheduledType) || /interview/i.test(dto.custom_variables?.reason || "");
      const desiredTemplate = isInterview ? "recruitment" : "sales";

      agent = await VoiceAgent.findOne({
        where: { tenant_id: tenantId, provider: connectedProvider, template_key: desiredTemplate, status: true, is_enabled: true },
      });
      if (!agent) {
        agent = await VoiceAgent.findOne({
          where: { tenant_id: tenantId, provider: connectedProvider, template_key: desiredTemplate, status: true },
        });
      }
      if (!agent) {
        agent = await VoiceAgent.findOne({
          where: { tenant_id: tenantId, provider: connectedProvider, status: true, is_enabled: true },
        });
      }
      if (!agent) {
        agent = await VoiceAgent.findOne({
          where: { tenant_id: tenantId, provider: connectedProvider, status: true },
        });
      }
      if (!agent) {
        agent = await VoiceAgent.findOne({ where: { tenant_id: tenantId, status: true } });
      }
      if (!agent) throw new NotFoundException(`No active Voice Agent found for tenant ${tenantId}`);
    }

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
    const promptTemplate = dynamicVariables.system_prompt || agent.system_prompt;
    const interpolatedSystemPrompt = this.interpolatePrompt(promptTemplate, dynamicVariables);
    dynamicVariables.system_prompt = interpolatedSystemPrompt;

    const interpolatedGreeting = this.interpolatePrompt(
      dynamicVariables.first_message || agent.first_message || "Hello! How can I assist you today?",
      dynamicVariables
    );
    dynamicVariables.first_message = interpolatedGreeting;

    dto.custom_variables = dynamicVariables;

    // Call provider with auto-fallback to SaasFallback if primary fails
    let res;
    try {
      try {
        res = await provider.makeCall(agent.remote_agent_id, dto, config || undefined);
      } catch (err: any) {
        if (agent.provider !== "saas_fallback") {
          const fallbackConfig = await VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: "saas_fallback", is_active: true },
          });
          if (fallbackConfig && fallbackConfig.is_active) {
            this.logger.warn(`Primary voice provider ${agent.provider} failed: ${err.message}. Attempting SaaS Fallback...`);
            const fallbackProvider = this.factory.getProvider("saas_fallback");
            res = await fallbackProvider.makeCall(agent.remote_agent_id, dto, fallbackConfig);
          } else {
            throw err;
          }
        } else {
          // Only attempt Vapi fallback if Vapi is explicitly active and configured with a real API key
          const vapiConfig = await VoiceProviderConfig.findOne({
            where: { tenant_id: tenantId, provider: "vapi", is_active: true },
          });
          if (vapiConfig && vapiConfig.api_key && vapiConfig.api_key.trim().length > 0) {
            this.logger.warn(`SaaS Telephony call failed: ${err.message}. Attempting Vapi fallback...`);
            const vapiProvider = this.factory.getProvider("vapi");
            res = await vapiProvider.makeCall(agent.remote_agent_id, dto, vapiConfig);
          } else {
            // Throw the genuine SaaS / Plivo error directly so it's not masked by a fake Vapi ID
            throw err;
          }
        }
      }
    } catch (dispatchErr: any) {
      try {
        const failedCallLog = new VoiceCallLog();
        failedCallLog.tenant_id = tenantId;
        failedCallLog.agent_id = agent.id;
        failedCallLog.agent_name = agent.name;
        failedCallLog.provider = agent.provider;
        failedCallLog.provider_call_id = `failed_${Date.now()}`;
        failedCallLog.customer_phone = dto.phone_number;
        failedCallLog.customer_name = dto.customer_name || leadRec?.name || "Customer";
        failedCallLog.lead_id = leadRec?.id;
        failedCallLog.direction = "outbound";
        failedCallLog.call_status = "failed";
        failedCallLog.summary = dispatchErr.message || "Outbound call failed";
        failedCallLog.extracted_slots = dynamicVariables;
        failedCallLog.created_by_id = "voice_call_service";
        failedCallLog.created_on = new Date();
        await failedCallLog.save();
      } catch (logErr: any) {
        this.logger.error(`Failed to record failed call log: ${logErr.message}`);
      }
      throw dispatchErr;
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

    // Log in Lead Timeline & update lead custom fields so the Leads Section reflects this immediately
    if (leadRec) {
      const callReason = dynamicVariables.reason || (dynamicVariables.scheduled_type === "interview" ? "Interview scheduled" : "You scheduled demo");
      const activity = new lead_activity();
      activity.lead_id = leadRec.id;
      activity.tenant_id = tenantId;
      activity.activity_type = "CALL";
      activity.title = `📞 Outbound Call: ${callReason} (${agent.provider.toUpperCase()})`;
      activity.description = `Provider: ${agent.provider.toUpperCase()} | Agent: ${agent.name} | Call ID: ${res.callId} | Slot: ${dynamicVariables.meeting_slot || "Scheduled"}${dynamicVariables.meet_url ? ` | Meet: ${dynamicVariables.meet_url}` : ""}`;
      activity.metadata = {
        call_id: res.callId,
        provider: agent.provider,
        scheduled_type: dynamicVariables.scheduled_type,
        meeting_slot: dynamicVariables.meeting_slot,
        meet_url: dynamicVariables.meet_url,
        reason: callReason,
      };
      activity.performer_name = `Voice AI (${agent.provider.toUpperCase()})`;
      activity.created_by_id = "voice_service";
      activity.created_on = new Date();
      await activity.save().catch(() => null);

      // Update Lead entity with the latest voice call record and meet link
      try {
        leadRec.custom_fields = {
          ...(leadRec.custom_fields || {}),
          last_voice_call: {
            call_id: res.callId,
            provider: agent.provider,
            status: res.status || "initiated",
            scheduled_type: dynamicVariables.scheduled_type || "demo",
            reason: callReason,
            meeting_slot: dynamicVariables.meeting_slot || null,
            meet_url: dynamicVariables.meet_url || null,
            timestamp: new Date().toISOString(),
          },
        };
        if (dynamicVariables.meet_url && !leadRec.interview_link) {
          leadRec.interview_link = dynamicVariables.meet_url;
        }
        leadRec.updated_on = new Date();
        await leadRec.save().catch(() => null);
      } catch (saveLeadErr: any) {
        this.logger.warn(`Could not update lead custom_fields: ${saveLeadErr.message}`);
      }
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
      callLog.customer_phone =
        payload?.call?.customer?.number ||
        payload?.message?.call?.customer?.number ||
        payload?.customer?.number ||
        payload?.to_number ||
        payload?.phone_number ||
        "unknown";
      callLog.customer_name =
        payload?.call?.customer?.name ||
        payload?.message?.call?.customer?.name ||
        payload?.customer?.name ||
        "Customer";
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

      // Trigger Lead-to-Customer conversion & automation rule evaluation
      if (normalized.outcome || normalized.summary || normalized.transcript) {
        const text = `${normalized.outcome || ""} ${normalized.summary || ""} ${normalized.transcript || ""}`.toLowerCase();
        const slots: any = callLog.extracted_slots || {};

        let detectedOutcome = normalized.outcome;
        let eventName = "call_completed";

        if (
          text.includes("quotation") ||
          text.includes("quote") ||
          text.includes("proposal") ||
          text.includes("pricing") ||
          text.includes("price list") ||
          text.includes("cost estimate")
        ) {
          detectedOutcome = "Quotation Requested";
          eventName = "quotation_requested";
        } else if (text.includes("interview")) {
          detectedOutcome = "Interview Scheduled";
          eventName = "interview_booked";
        } else if (text.includes("demo") || text.includes("meet") || text.includes("appointment") || text.includes("schedule")) {
          detectedOutcome = "Demo Booked";
          eventName = "appointment_booked";
        } else if (text.includes("callback") || text.includes("call back") || text.includes("call me later")) {
          detectedOutcome = "Callback Requested";
          eventName = "callback_requested";
        } else if (text.includes("not interested") || text.includes("uninterested")) {
          detectedOutcome = "Not Interested";
          eventName = "not_interested";
        } else if (text.includes("interested")) {
          detectedOutcome = "Interested";
          eventName = "lead_qualified";
        }

        callLog.call_outcome = detectedOutcome || callLog.call_outcome || "Call Completed";
        await callLog.save();

        const meetUrl = slots.meet_url || slots.google_meet_url || slots.meeting_link || `https://meet.google.com/new`;

        this.logger.log(`🎯 [VOICE OUTCOME ATTAINED] "${detectedOutcome}" (Event: ${eventName}) for ${callLog.customer_phone}`);

        this.events.emit(AGENT_OUTCOME_EVENT, {
          tenantId: callLog.tenant_id,
          channel: "voice",
          outcome: detectedOutcome,
          event: eventName,
          phone: callLog.customer_phone,
          leadName: callLog.customer_name,
          summary: normalized.summary,
          agentName: callLog.agent_name || "Voice Agent",
          meetUrl: meetUrl,
          dealValue: slots.deal_value || slots.price || 15000,
          currency: slots.currency || "INR",
        } as AgentOutcomeEvent);

        this.events.emit("voice.call.outcome", {
          tenantId: callLog.tenant_id,
          outcome: detectedOutcome,
          durationSeconds: callLog.duration_seconds || 0,
          phone: callLog.customer_phone,
          leadId: callLog.lead_id,
          leadName: callLog.customer_name,
          callSummary: normalized.summary,
          goalAchieved: true,
        });
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

  async getCallLogs(
    tenantId: string = "default",
    limit: number = 50,
    agentId?: string,
    skipSync: boolean = false
  ): Promise<VoiceCallLog[]> {
    if (!skipSync) {
      try {
        await this.syncCallLogsFromVapi(tenantId);
      } catch (e: any) {
        this.logger.warn(`Auto-sync call logs from Vapi failed: ${e.message}`);
      }
    }

    // created_on is select:false on BaseTable -> explicitly select it so UI shows real timestamps
    const qb = VoiceCallLog.createQueryBuilder("log")
      .addSelect("log.created_on")
      .where("log.tenant_id = :tenantId", { tenantId });

    if (agentId) {
      // Match either local agent UUID or the remote Vapi assistant id stored in raw payload
      const agent = await VoiceAgent.findOne({ where: { id: agentId } });
      qb.andWhere(
        "(log.agent_id = :agentId OR log.raw_webhook_payload->>'assistantId' = :remoteId OR log.agent_name = :agentName)",
        { agentId, remoteId: agent?.remote_agent_id || "__none__", agentName: agent?.name || "__none__" }
      );
    }

    return await qb.orderBy("log.created_on", "DESC").take(limit).getMany();
  }

  /** @deprecated legacy implementation kept for reference (auto-syncs Vapi + SaaS) */
  async getCallLogsLegacy(tenantId: string = "default", limit: number = 50): Promise<VoiceCallLog[]> {
    // Auto-sync from Vapi & SaaS before returning logs
    try {
      await this.syncCallLogsFromVapi(tenantId);
    } catch (e: any) {
      this.logger.warn(`Auto-sync call logs from Vapi failed: ${e.message}`);
    }
    try {
      await this.syncCallLogsFromSaas(tenantId);
    } catch (e: any) {
      this.logger.warn(`Auto-sync call logs from SaaS failed: ${e.message}`);
    }

    return await VoiceCallLog.find({
      where: { tenant_id: tenantId },
      order: { created_on: "DESC" },
      take: limit,
    });
  }

  /**
   * Pulls call history directly from Vapi API (https://api.vapi.ai/call)
   * and upserts call records (with recordingUrl, transcript, duration, status) into VoiceCallLog.
   */
  async syncCallLogsFromVapi(tenantId: string = "default"): Promise<number> {
    const config = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, provider: "vapi" as any, is_active: true },
    });
    const apiKey = (config?.api_key || process.env.VAPI_API_KEY || "").trim();
    if (!apiKey) return 0;

    try {
      const res = await axios.get("https://api.vapi.ai/call?limit=50", {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      });

      if (!Array.isArray(res.data) || res.data.length === 0) return 0;

      const vapiAgents = await VoiceAgent.find({
        where: { tenant_id: tenantId, provider: "vapi" as any },
      });
      const agentMap = new Map<string, VoiceAgent>();
      vapiAgents.forEach((a) => {
        if (a.remote_agent_id) agentMap.set(a.remote_agent_id, a);
      });

      let synced = 0;
      for (const rc of res.data) {
        const callId = rc.id;
        if (!callId) continue;

        const matchedAgent = agentMap.get(rc.assistantId);
        const agentName = matchedAgent ? matchedAgent.name : rc.assistant?.name || "Vapi Assistant";
        const agentId = matchedAgent ? matchedAgent.id : null;

        let duration = 0;
        if (rc.startedAt && rc.endedAt) {
          duration = Math.round((new Date(rc.endedAt).getTime() - new Date(rc.startedAt).getTime()) / 1000);
        } else if (rc.duration) {
          duration = Math.round(rc.duration);
        }

        const customerPhone = rc.customer?.number || "Unknown";
        const customerName = rc.customer?.name || "Customer";
        const status = rc.status === "ended" ? "completed" : rc.status || "completed";

        let log = await VoiceCallLog.findOne({ where: { provider_call_id: callId } });
        if (!log) {
          log = new VoiceCallLog();
          log.tenant_id = tenantId;
          log.provider = "vapi" as any;
          log.provider_call_id = callId;
          log.created_by_id = "vapi_sync";
          log.created_on = rc.createdAt ? new Date(rc.createdAt) : new Date();
          log.direction = (rc.type === "inboundPhoneCall" ? "inbound" : "outbound") as any;
        }

        log.agent_id = agentId || log.agent_id;
        log.agent_name = agentName || log.agent_name;
        log.customer_phone = customerPhone !== "Unknown" ? customerPhone : log.customer_phone;
        log.customer_name = customerName !== "Customer" ? customerName : log.customer_name;
        log.call_status = status as any;
        log.duration_seconds = duration || log.duration_seconds || 0;
        log.transcript = rc.transcript || log.transcript || "";
        log.recording_url = rc.recordingUrl || log.recording_url || "";
        log.summary = rc.analysis?.summary || rc.summary || rc.endedReason || log.summary || "Call completed";

        // Detect call outcome semantically or from structured data
        const combinedText = `${rc.analysis?.summary || ""} ${rc.transcript || ""} ${rc.summary || ""}`.toLowerCase();
        let detectedOutcome = rc.analysis?.structuredData?.outcome;
        if (!detectedOutcome) {
          if (combinedText.includes("quotation") || combinedText.includes("quote") || combinedText.includes("pricing") || combinedText.includes("proposal")) {
            detectedOutcome = "Quotation Requested";
          } else if (combinedText.includes("interview")) {
            detectedOutcome = "Interview Scheduled";
          } else if (combinedText.includes("demo") || combinedText.includes("appointment") || combinedText.includes("meeting")) {
            detectedOutcome = "Demo Booked";
          } else if (combinedText.includes("callback") || combinedText.includes("call me")) {
            detectedOutcome = "Callback Requested";
          } else if (combinedText.includes("not interested")) {
            detectedOutcome = "Not Interested";
          } else if (combinedText.includes("interested")) {
            detectedOutcome = "Interested";
          }
        }
        log.call_outcome = detectedOutcome || log.call_outcome || rc.endedReason || "Call Completed";
        log.raw_webhook_payload = rc;
        log.updated_on = new Date();

        try {
          await log.save();
          synced++;
        } catch (err: any) {
          this.logger.warn(`Failed to save Vapi call ${callId}: ${err.message}`);
        }
      }

      this.logger.log(`✅ [VAPI CALL SYNC] Synced ${synced} call logs from Vapi platform`);
      return synced;
    } catch (err: any) {
      this.logger.warn(`Vapi call sync error: ${err.message}`);
      return 0;
    }
  }

  /**
   * Pulls call history from Sharyx SaaS platform (fallback-voice.sharyx.ai/api/call/list)
   * and upserts each call record into our local VoiceCallLog table.
   * This is how call records made via SaaS appear in our UI.
   */
  async syncCallLogsFromSaas(tenantId: string = "default"): Promise<number> {
    const config = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, provider: "saas_fallback" as any },
    });

    if (!config || !config.api_key) {
      this.logger.debug("[SAAS SYNC] No SaaS config/key found, skipping call log sync");
      return 0;
    }

    const baseUrl = (config.base_url || process.env.VOICE_BACKEND_URL || "https://fallback-voice.sharyx.ai").replace(/\/$/, "");
    const apiKey = config.api_key.trim();

    // Try multiple known call list endpoints
    const endpoints = [
      `${baseUrl}/api/call/list`,
      `${baseUrl}/api/calls`,
      `${baseUrl}/api/agent/calls`,
      `${baseUrl}/api/call-logs`,
    ];

    let remoteCalls: any[] = [];
    for (const endpoint of endpoints) {
      try {
        const res = await axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "x-api-key": apiKey,
            "X-API-Key": apiKey,
            Cookie: `token=${apiKey}`,
          },
          params: { limit: 100, page: 1 },
          timeout: 10000,
        });
        const list = res.data?.AddtionalData || res.data?.data || res.data?.calls || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(list) && list.length >= 0) {
          remoteCalls = list;
          this.logger.log(`📥 [SAAS CALL SYNC] Fetched ${list.length} calls from ${endpoint}`);
          break;
        }
      } catch (err: any) {
        this.logger.debug(`[SAAS CALL SYNC] ${endpoint} failed: ${err.response?.status || err.message}`);
      }
    }

    if (remoteCalls.length === 0) {
      this.logger.debug("[SAAS CALL SYNC] No remote calls found or all endpoints failed");
      return 0;
    }

    let synced = 0;
    for (const rc of remoteCalls) {
      const providerCallId = String(rc.id || rc.call_id || rc.callId || "");
      if (!providerCallId) continue;

      let log = await VoiceCallLog.findOne({ where: { provider_call_id: providerCallId } });
      if (!log) {
        log = new VoiceCallLog();
        log.tenant_id = tenantId;
        log.provider = "saas_fallback" as any;
        log.provider_call_id = providerCallId;
        log.created_by_id = "saas_sync";
        log.created_on = rc.created_at ? new Date(rc.created_at) : new Date();
        log.direction = (rc.direction === "inbound" ? "inbound" : "outbound") as any;
      }

      // Map SaaS call fields to our schema
      const statusMap: Record<string, string> = {
        completed: "completed",
        ended: "completed",
        failed: "failed",
        "no-answer": "no-answer",
        busy: "busy",
        initiated: "initiated",
        ringing: "ringing",
        in_progress: "in-progress",
        in_call: "in-progress",
      };
      const rawStatus = rc.status || rc.call_status || "completed";
      log.call_status = (statusMap[rawStatus.toLowerCase()] || rawStatus) as any;
      log.customer_phone = rc.to_number || rc.phone_number || rc.customer_phone || log.customer_phone || "unknown";
      log.customer_name = rc.customer_name || rc.name || log.customer_name || "SaaS Customer";
      log.agent_name = rc.agent_name || rc.agent?.name || log.agent_name || "AI Agent";

      // Find local agent by name or remote_agent_id
      if (!log.agent_id && (rc.agent_id || rc.agent?.id)) {
        const matchedAgent = await VoiceAgent.findOne({
          where: { tenant_id: tenantId, remote_agent_id: String(rc.agent_id || rc.agent?.id) },
        });
        if (matchedAgent) log.agent_id = matchedAgent.id;
      }

      if (rc.duration_seconds || rc.duration) log.duration_seconds = rc.duration_seconds || rc.duration;
      if (rc.transcript || rc.conversation_text) log.transcript = rc.transcript || rc.conversation_text;
      if (rc.recording_url || rc.audio_url) log.recording_url = rc.recording_url || rc.audio_url;
      if (rc.summary || rc.call_summary) log.summary = rc.summary || rc.call_summary;
      if (rc.outcome) log.call_outcome = rc.outcome;
      log.raw_webhook_payload = rc;
      log.updated_on = new Date();

      try {
        await log.save();
        synced++;
      } catch (saveErr: any) {
        this.logger.warn(`[SAAS CALL SYNC] Failed to save call ${providerCallId}: ${saveErr.message}`);
      }
    }

    this.logger.log(`✅ [SAAS CALL SYNC] Synced ${synced} call logs from SaaS platform`);
    return synced;
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
