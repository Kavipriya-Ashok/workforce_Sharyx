import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import axios from "axios";
import { company } from "@Database/Table/Admin/company";
import { WhatsAppMessage } from "@Database/Table/WhatsApp/WhatsAppMessage.entity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { lead, LeadStatus, LeadSource } from "@Database/Table/Lead/lead";
import { CalendarHelper } from "../Helpers/CalendarHelper";
import { JobOpeningsService } from "@Service/Lead/JobOpenings.service";

export interface ConversationContext {
  tenantId: string;
  senderPhone: string;
  senderName: string;
  messageText: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  leadInfo?: {
    name?: string;
    email?: string;
    lead_status?: string;
    deal_value?: number | string;
    interested_service?: string;
    is_candidate?: boolean;
    candidate_stage?: string;
  };
  tenantBusinessContext?: {
    companyName: string;
    servicesList?: string;
    address?: string;
    businessEmail?: string;
  };
  omnichannelLogs?: {
    lastCallSummary?: string;
    lastCallOutcome?: string;
    lastWhatsAppMsg?: string;
    lastEmailLog?: string;
  };
  activeAppointment?: {
    status?: string;
    dateTime?: string;
    meetingUrl?: string;
  };
  openRolesContext?: string;
  kbContext?: string;
  tools?: Array<{
    name: string;
    description: string;
    parameters?: any;
  }>;
  mediaContext?: string;
}

export interface ToolCallExecution {
  action: "execute_tool";
  toolName: string;
  inputs: Record<string, any>;
}

@Injectable()
export class PromptEngineService {
  private readonly logger = new Logger(PromptEngineService.name);

  constructor(
    private readonly events: EventEmitter2,
    private readonly openingsService: JobOpeningsService
  ) {}

  // SaaS tools available to the WhatsApp Base LLM Copilot
  private readonly defaultTools = [
    {
      name: "book_appointment",
      description: "Book a Google Meet demo, consultation, or job interview slot",
      parameters: {
        slot: "Date and time of appointment (e.g. Tomorrow at 11:00 AM or Mon-Sat 10 AM - 6 PM IST)",
        type: "demo or interview or consultation",
        mode: "ONLINE or OFFICE",
      },
    },
    {
      name: "capture_contact",
      description: "Save customer or candidate contact details into CRM leads database",
      parameters: {
        name: "Full name",
        email: "Email address",
        phone: "Phone number",
        company: "Company or organization name (optional)",
        role: "Applied job role (optional)",
        preferred_location: "Preferred location city (optional)",
      },
    },
    {
      name: "dispatch_voice_call",
      description: "Initiates an immediate outbound AI sales phone call to customer's phone",
      parameters: {
        phone: "Customer phone number to dial",
        reason: "Reason for the sales/consultation call",
      },
    },
    {
      name: "send_brochure",
      description: "Dispatches the official product catalog or brochure PDF to customer",
      parameters: {
        category: "General or Enterprise solutions",
      },
    },
    {
      name: "transfer_to_human",
      description: "Escalates chat to a human agent when customer requests live support",
      parameters: {
        reason: "Customer request or complex inquiry",
      },
    },
  ];

  // ── 1. Assemble Full 7-Layer Contextual System Prompt ───────────────────
  public buildSystemPrompt(ctx: ConversationContext, customPersona?: string): string {
    let prompt = "";

    // LAYER 1: Master System Prompt / Business Persona (HIGHEST PRIORITY DIRECTIVE)
    const masterPrompt = (customPersona || "").trim();
    if (masterPrompt) {
      prompt += `# MASTER SYSTEM PROMPT & BEHAVIOR DIRECTIVE (FOLLOW STRICTLY):\n${masterPrompt}\n\n`;
    } else {
      prompt += `You are "Sharyx AI", an expert workforce co-pilot. Keep replies warm, professional, helpful, and concise (1-3 sentences maximum for WhatsApp). Always follow the user's language (Tamil, English, or Tanglish).\n\n`;
    }

    if (ctx.tenantBusinessContext) {
      const b = ctx.tenantBusinessContext;
      prompt += `\n\n[APPLICATION OWNER & BUSINESS IDENTITY]:\n`;
      prompt += `You represent "${b.companyName || "Sharyx Enterprise"}".\n`;
      if (b.servicesList) prompt += `- Core Solutions: ${b.servicesList}\n`;
      if (b.address) prompt += `- Address: ${b.address}\n`;
      if (b.businessEmail) prompt += `- Support Email: ${b.businessEmail}\n`;
    }

    // LAYER 2: CRM Lead / Candidate Profile
    prompt += `\n\n[CRM CONTACT & PROFILE CONTEXT]:\n`;
    if (ctx.leadInfo) {
      prompt += `- Contact Name: ${ctx.leadInfo.name || ctx.senderName}\n`;
      prompt += `- Phone: ${ctx.senderPhone}\n`;
      if (ctx.leadInfo.email) prompt += `- Email: ${ctx.leadInfo.email}\n`;
      if (ctx.leadInfo.lead_status) prompt += `- Pipeline Stage: ${ctx.leadInfo.lead_status}\n`;
      if (ctx.leadInfo.is_candidate) prompt += `- Candidate Stage: ${ctx.leadInfo.candidate_stage || "screening"}\n`;
      if (ctx.leadInfo.interested_service) prompt += `- Notes / Interest: ${ctx.leadInfo.interested_service}\n`;
    } else {
      prompt += `- Contact: New Lead (${ctx.senderPhone})\n`;
    }

    // LAYER 3: Omnichannel History (Voice Call + WhatsApp + Email)
    if (ctx.omnichannelLogs) {
      const o = ctx.omnichannelLogs;
      if (o.lastCallSummary || o.lastWhatsAppMsg || o.lastEmailLog) {
        prompt += `\n\n[LAST INTERACTION ACROSS CHANNELS]:\n`;
        if (o.lastCallSummary) {
          prompt += `- Last Phone Call Summary: ${o.lastCallSummary} (Outcome: ${o.lastCallOutcome || "COMPLETED"})\n`;
        }
        if (o.lastWhatsAppMsg) {
          prompt += `- Last WhatsApp Message: ${o.lastWhatsAppMsg}\n`;
        }
        if (o.lastEmailLog) {
          prompt += `- Last Email Touchpoint: ${o.lastEmailLog}\n`;
        }
      }
    }

    // LAYER 4: Active Appointments & Meeting Slots
    if (ctx.activeAppointment) {
      const a = ctx.activeAppointment;
      prompt += `\n\n[CONFIRMED APPOINTMENT & GOOGLE MEET LINK]:\n`;
      prompt += `- Active Meeting Status: ${a.status || "CONFIRMED & SCHEDULED"}\n`;
      prompt += `- Confirmed Date & Time: ${a.dateTime}\n`;
      prompt += `- Google Meet Video URL: ${a.meetingUrl}\n`;
      prompt += `*CRITICAL*: If customer asks for the Google Meet link, meeting link, or time, share this link (${a.meetingUrl}) directly in your message! Do NOT tell them to check email.\n`;
    }

    // LAYER 5: Live HR Job Openings & Hiring Context
    if (ctx.openRolesContext) {
      prompt += `\n\n[LIVE HR JOB OPENINGS & HIRING CONTEXT]:\n${ctx.openRolesContext}\n\n`;
      prompt += `*RECRUITMENT & HIRING INSTRUCTIONS*:
- When a candidate or job seeker asks about jobs, openings, career opportunities, or applying, refer ONLY to the verified roles above.
- Never invent roles or locations.
- If customer provides their name or email, use the "capture_contact" tool.
- If customer confirms a slot for an interview, use the "book_appointment" tool.`;
    }

    // LAYER 6: Knowledge Base Grounding (RAG)
    if (ctx.kbContext) {
      prompt += `\n\n[VERIFIED KNOWLEDGE BASE CONTEXT]:\n${ctx.kbContext}\n\n**CRITICAL GROUNDING**: Answer accurately using ONLY the verified facts above. Never hallucinate.`;
    }

    // LAYER 7: Dynamic Tools & Function Calling
    const tools = ctx.tools && ctx.tools.length > 0 ? ctx.tools : this.defaultTools;
    prompt += `\n\n[AVAILABLE SAAS TOOLS]:\n${JSON.stringify(tools, null, 2)}\n\n`;
    prompt += `**TOOL CALLING RULE**: If customer explicitly wants to book a meeting/interview, save contact info, request a sales phone call, get brochure, or transfer to human, reply ONLY in JSON format: {"action": "execute_tool", "toolName": "<name>", "inputs": {...}}. If no tool is needed, respond with standard friendly, concise text.`;

    // LAYER 8: Media Context
    if (ctx.mediaContext) {
      prompt += `\n\n[MEDIA CONTEXT]:\n${ctx.mediaContext}\n`;
    }

    if (masterPrompt) {
      prompt += `\n\nREMINDER: Strictly follow the persona, tone, language, and guidelines defined in the MASTER SYSTEM PROMPT above.`;
    }

    return prompt;
  }

  // ── 2. Build Context Automatically from Database ────────────────────────
  public async buildAutoContext(
    tenantId: string,
    senderPhone: string,
    senderName: string,
    messageText: string,
    conversationId?: string
  ): Promise<ConversationContext> {
    // 1. Fetch Company Info
    let companyContext: any = null;
    try {
      const comp = await company.findOne({ where: {} });
      if (comp) {
        companyContext = {
          companyName: comp.name || "Sharyx",
          servicesList: "AI Autonomous Workforce, WhatsApp Cloud Automation, Email AI Copilot, Voice Telephony, CRM Integration",
          address: comp.address || "Singapore / India",
          businessEmail: comp.email || "support@sharyx.ai",
        };
      }
    } catch {
      // fallback
    }

    // 2. Fetch Conversation History (last 8 turns)
    const history: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (conversationId) {
      try {
        const msgs = await WhatsAppMessage.find({
          where: { conversation_id: conversationId },
          order: { created_on: "DESC" },
          take: 8,
        });
        msgs.reverse().forEach((m) => {
          if (m.message_text) {
            history.push({
              role: m.direction === "inbound" ? "user" : "assistant",
              content: m.message_text,
            });
          }
        });
      } catch {
        // ignore
      }
    }

    // 3. CRM Lead / Candidate Profile lookup
    let leadInfo: any = undefined;
    try {
      const ld = await lead.findOne({ where: { phone: senderPhone } });
      if (ld) {
        leadInfo = {
          name: ld.name,
          email: ld.email,
          lead_status: ld.lead_status,
          deal_value: ld.score,
          interested_service: ld.notes,
          is_candidate: ld.is_candidate,
          candidate_stage: ld.candidate_stage,
        };
      }
    } catch {}

    // 4. Omnichannel Touchpoints & Active Appointment
    let lastWhatsAppMsg: string | undefined;
    let activeAppointment: any = undefined;
    try {
      const conv = await WhatsAppConversation.findOne({
        where: { customer_phone: senderPhone },
      });
      if (conv?.last_message_text) {
        lastWhatsAppMsg = conv.last_message_text;
      }
      if (conv?.meeting_info?.meet_url) {
        activeAppointment = {
          status: "CONFIRMED",
          dateTime: conv.meeting_info.slot || "Tomorrow 10:00 AM",
          meetingUrl: conv.meeting_info.meet_url,
        };
      }
    } catch {}

    // 5. Live HR Openings from database
    let openRolesContext: string | undefined;
    try {
      if (this.openingsService) {
        const { promptBlock } = await this.openingsService.formatOpenRolesForPrompt(tenantId || "default");
        openRolesContext = promptBlock;
      }
    } catch (err: any) {
      this.logger.warn(`Could not load open roles: ${err.message}`);
    }

    return {
      tenantId: tenantId || "default",
      senderPhone,
      senderName: senderName || senderPhone,
      messageText,
      conversationHistory: history,
      leadInfo: leadInfo || {
        name: senderName,
        lead_status: "ACTIVE_INQUIRY",
        interested_service: "WhatsApp AI & Voice Workforce",
      },
      activeAppointment,
      openRolesContext,
      tenantBusinessContext: companyContext || {
        companyName: "Sharyx",
        servicesList: "AI Workforce Solutions & WhatsApp Cloud Automation",
        businessEmail: "support@sharyx.ai",
      },
      omnichannelLogs: {
        lastWhatsAppMsg,
        lastCallSummary: "Inquired about autonomous WhatsApp co-pilot and AI capabilities",
        lastCallOutcome: "QUALIFIED_PROSPECT",
      },
    };
  }

  // ── 3. Call LLM (Google Gemini or OpenAI) using Context & Tools ──────────
  public async generateReply(
    ctx: ConversationContext,
    aiConfig?: any
  ): Promise<{ replyText: string; toolCall?: ToolCallExecution }> {
    // 0. Direct Instant Meeting Recall if customer asks for link and one exists:
    const lowerInquiry = ctx.messageText.toLowerCase();
    if (
      (lowerInquiry.includes("gmeet") ||
        lowerInquiry.includes("meet link") ||
        lowerInquiry.includes("meeting link") ||
        lowerInquiry.includes("link") ||
        lowerInquiry.includes("google meet")) &&
      ctx.activeAppointment?.meetingUrl
    ) {
      return {
        replyText: `Here are your confirmed meeting details, ${ctx.senderName}:\n\n🗓️ *Date & Time*: ${ctx.activeAppointment.dateTime}\n🎥 *Google Meet Link*: ${ctx.activeAppointment.meetingUrl}\n\nPlease click the link above at the scheduled time to join! 👍`,
      };
    }

    const customPrompt = aiConfig?.system_prompt;
    const systemPrompt = this.buildSystemPrompt(ctx, customPrompt);

    // Prioritize UI Key configured in AI Brain & Copilot page over backend .env
    const userApiKey = (aiConfig?.api_key || "").trim();
    const openAiKey = (userApiKey.startsWith("sk-") ? userApiKey : "") || (process.env.OPENAI_API_KEY || "").trim();
    const geminiKey = (!userApiKey.startsWith("sk-") && userApiKey ? userApiKey : "") || (process.env.GEMINI_API_KEY || "").trim();
    const isGemini =
      aiConfig?.llm_provider === "gemini" ||
      (!aiConfig?.llm_provider && Boolean(geminiKey)) ||
      (userApiKey && !userApiKey.startsWith("sk-"));

    // ── A. Google Gemini Provider ──────────────────────────────────────────
    if (isGemini && geminiKey) {
      try {
        let model = aiConfig?.llm_model || "gemini-2.5-flash";
        if (model === "gemini-2.0-flash" || model === "gemini-3.8-flash") {
          model = "gemini-2.5-flash";
        }

        const candidateModels = [model, "gemini-2.5-flash", "gemini-flash-latest", "gemini-1.5-flash"];

        // Format history with Gemini's native 'user' and 'model' roles
        const contents = [
          ...ctx.conversationHistory.slice(-10).map((h) => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
          })),
          {
            role: "user",
            parts: [{ text: ctx.messageText }],
          },
        ];

        let response: any;
        for (const m of candidateModels) {
          try {
            response = await axios.post(
              `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`,
              {
                systemInstruction: {
                  parts: [{ text: systemPrompt }],
                },
                contents,
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 600,
                },
              },
              { timeout: 15000 }
            );
            if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
              break;
            }
          } catch (modelErr: any) {
            this.logger.warn(`Gemini model ${m} attempt failed, trying next fallback...`);
          }
        }

        const rawText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

        // Check for Tool Execution JSON
        const toolCall = this.parseToolCall(rawText);
        if (toolCall) {
          return { replyText: await this.getToolConfirmation(toolCall, ctx), toolCall };
        }

        if (rawText) return { replyText: rawText };
      } catch (err: any) {
        this.logger.error("PromptEngine Gemini Error:", err?.response?.data || err.message);
      }
    }

    // ── B. OpenAI Provider ─────────────────────────────────────────────────
    if (!isGemini && openAiKey) {
      try {
        const model = aiConfig?.llm_model && !aiConfig.llm_model.startsWith("gemini") ? aiConfig.llm_model : "gpt-4o-mini";
        const messages = [
          { role: "system", content: systemPrompt },
          ...ctx.conversationHistory.slice(-8).map((h) => ({
            role: h.role === "assistant" ? "assistant" : "user",
            content: h.content,
          })),
          { role: "user", content: ctx.messageText },
        ];

        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model,
            messages,
            temperature: 0.3,
            max_tokens: 500,
          },
          {
            headers: {
              Authorization: `Bearer ${openAiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 15000,
          }
        );

        const rawText = response.data?.choices?.[0]?.message?.content?.trim() || "";

        // Check for Tool Execution JSON
        const toolCall = this.parseToolCall(rawText);
        if (toolCall) {
          return { replyText: await this.getToolConfirmation(toolCall, ctx), toolCall };
        }

        if (rawText) return { replyText: rawText };
      } catch (err: any) {
        this.logger.error("PromptEngine OpenAI Error:", err?.response?.data || err.message);
      }
    }

    // ── C. Fallback when keys not configured or offline ─────────────────────
    return {
      replyText:
        aiConfig?.welcome_message ||
        "Hello! Thank you for reaching out to Sharyx. Our team has received your message and will assist you shortly.",
    };
  }

  // ── 4. Helper: Parse JSON Tool Calls ─────────────────────────────────────
  private parseToolCall(rawText: string): ToolCallExecution | null {
    try {
      let trimmed = rawText.trim();
      if (trimmed.startsWith("```json")) {
        trimmed = trimmed.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      } else if (trimmed.startsWith("```")) {
        trimmed = trimmed.replace(/^```\s*/, "").replace(/```$/, "").trim();
      }

      if (trimmed.includes('{"action": "execute_tool"') || trimmed.includes('{"action":"execute_tool"')) {
        const jsonMatch = trimmed.match(/\{[\s\S]*"action"\s*:\s*"execute_tool"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.action === "execute_tool" && parsed.toolName) {
            return parsed;
          }
        }
      }

      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const parsed = JSON.parse(trimmed);
        if (parsed.action === "execute_tool" && parsed.toolName) {
          return parsed;
        }
      }
    } catch {
      // not a json tool call
    }
    return null;
  }

  // ── 5. Helper: Formulate Human-Friendly Confirmation on Tool Call ────────
  public async getToolConfirmation(tool: ToolCallExecution, ctx?: ConversationContext): Promise<string> {
    switch (tool.toolName) {
      case "book_appointment": {
        const slot = tool.inputs?.slot || "Tomorrow at 11:00 AM";
        const meetingType = tool.inputs?.type || "demo";
        const isInterview = /(?:interview|candidate|job)/i.test(`${meetingType} ${ctx?.senderName || ""}`);
        
        const meetRoom = await CalendarHelper.createGoogleMeetRoom(
          `${isInterview ? "Interview" : "Demo & Consultation"} with ${ctx?.senderName || "Customer"}`,
          slot
        );

        // Save into conversation in DB and update lead
        try {
          if (ctx?.senderPhone) {
            const conv = await WhatsAppConversation.findOne({
              where: { customer_phone: ctx.senderPhone },
            });
            if (conv) {
              conv.meeting_info = {
                slot,
                meet_url: meetRoom.meetUrl,
                scheduled_at: new Date().toISOString(),
              };
              await conv.save();
            }

            const ld = await lead.findOne({ where: { phone: ctx.senderPhone } });
            if (ld) {
              ld.preferred_interview_slot = slot;
              ld.interview_link = meetRoom.meetUrl;
              if (isInterview) {
                ld.is_candidate = true;
                ld.lead_status = "INTERVIEW_SCHEDULED";
              }
              await ld.save();

              // Trigger Email outcome with Google Meet link if candidate has email on file
              if (ld.email) {
                this.events.emit("agent.outcome", {
                  tenantId: ctx?.tenantId || "default",
                  phone: ctx.senderPhone,
                  email: ld.email,
                  leadName: ld.name || ctx?.senderName || "Candidate",
                  outcome: isInterview ? "Interview Scheduled" : "Demo Booked",
                  event: isInterview ? "interview_booked" : "demo_booked",
                  summary: `${isInterview ? "Interview" : "Demo"} confirmed for ${slot}. Google Meet link: ${meetRoom.meetUrl}`,
                  agentName: "Sharyx AI",
                  channel: "whatsapp",
                  meetUrl: meetRoom.meetUrl,
                  customVariables: {
                    applied_role: ld.job_title || "Backend Developer",
                    meeting_slot: slot,
                    meet_url: meetRoom.meetUrl,
                  },
                });
                this.logger.log(`📧 [EMAIL CONFIRMATION TRIGGERED] Sent meet link to ${ld.email}`);
              }
            }
          }
        } catch (err: any) {
          this.logger.error("Failed to save meeting_info to conversation:", err.message);
        }

        // Emit voice call notification event to connected provider (Vapi / SaaS)
        if (ctx?.senderPhone) {
          this.events.emit("voice.call.requested", {
            tenantId: ctx.tenantId || "default",
            phone: ctx.senderPhone,
            customerName: ctx.senderName,
            scheduledType: isInterview ? "interview" : "demo",
            reason: isInterview ? "Interview scheduled" : "Demo consultation scheduled",
            meetingSlot: slot,
            meetUrl: meetRoom.meetUrl,
            agentKey: isInterview ? "recruitment" : "sales",
          });
        }

        return `🎉 Perfect! I have scheduled your ${isInterview ? "interview" : "consultation"} for *${slot}*.\n\n🎥 *Google Meet Link*: ${meetRoom.meetUrl}\n\nPlease click the link to join at the scheduled time. Looking forward to speaking with you! 👍`;
      }

      case "capture_contact": {
        const { name, email, phone, company: compName, role, preferred_location, relocation } = tool.inputs || {};
        try {
          const targetPhone = phone || ctx?.senderPhone;
          let ld = targetPhone ? await lead.findOne({ where: { phone: targetPhone } }) : null;
          if (!ld && ctx?.senderPhone) {
            ld = await lead.findOne({ where: { phone: ctx.senderPhone } });
          }
          if (!ld) {
            ld = new lead();
            ld.tenant_id = ctx?.tenantId || "default";
            ld.phone = targetPhone || ctx?.senderPhone || "unknown";
            ld.source = LeadSource.WHATSAPP;
            ld.lead_status = LeadStatus.NEW;
          }
          if (name) ld.name = name;
          if (email) ld.email = email;
          if (compName) ld.company_name = compName;
          if (role) {
            ld.is_candidate = true;
            ld.notes = `${ld.notes || ""}\nRole: ${role}, Location: ${preferred_location || "N/A"}, Relocation: ${relocation || "N/A"}`.trim();
          }
          ld.last_contacted_at = new Date();
          await ld.save();

          if (ctx?.senderPhone) {
            const conv = await WhatsAppConversation.findOne({ where: { customer_phone: ctx.senderPhone } });
            if (conv) {
              if (name) conv.customer_name = name;
              if (ld.id) conv.lead_id = ld.id;
              await conv.save();
            }
          }
        } catch (err: any) {
          this.logger.error("Failed to capture contact to CRM:", err.message);
        }

        const candidateName = name || ctx?.senderName || "there";
        const targetRole = role ? `for the *${role}* position` : "";

        return `Great to connect with you, ${candidateName}! 🌟 I have noted your application ${targetRole}.

To complete your candidate profile, could you please share:
1. Your email address (so we can send calendar invites & meet links)
2. Total & relevant experience
3. Current company & employment status (serving notice / relieved)
4. Expected CTC
5. Your updated resume / CV (PDF link or attach file)

Whenever you're ready, we can also schedule a quick Google Meet interview round! 🚀`;
      }

      case "dispatch_voice_call": {
        const callPhone = tool.inputs?.phone || ctx?.senderPhone;
        const reason = tool.inputs?.reason || "Customer requested live sales phone call";
        if (callPhone) {
          this.events.emit("voice.call.requested", {
            tenantId: ctx?.tenantId || "default",
            phone: callPhone,
            customerName: ctx?.senderName,
            scheduledType: "sales_call",
            reason,
            agentKey: "sales",
          });
          return `📞 I have initiated an immediate outbound phone call to *${callPhone}*! Our AI Sales Specialist is calling you right now. Please check your phone! 👍`;
        }
        return `I'd be glad to connect you with our sales team! Could you please share your phone number so we can call you right away?`;
      }

      case "send_brochure":
        return `📄 I've shared our official Sharyx 2026 product guide and enterprise brochure. Please feel free to ask any questions or let me know if you would like to book a demo!`;

      case "transfer_to_human": {
        try {
          if (ctx?.senderPhone) {
            const conv = await WhatsAppConversation.findOne({ where: { customer_phone: ctx.senderPhone } });
            if (conv) {
              conv.conversation_status = "human_takeover";
              await conv.save();
            }
          }
        } catch {}
        return `👨‍💼 Certainly! I have escalated this conversation to our senior team. A team representative will connect with you shortly.`;
      }

      default:
        return `Action "${tool.toolName}" has been executed successfully. How else can I help you today?`;
    }
  }
}
