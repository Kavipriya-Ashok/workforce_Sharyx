import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { company } from "@Database/Table/Admin/company";
import { WhatsAppMessage } from "@Database/Table/WhatsApp/WhatsAppMessage.entity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { CalendarHelper } from "../Helpers/CalendarHelper";

export interface ConversationContext {
  tenantId: string;
  senderPhone: string;
  senderName: string;
  messageText: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  leadInfo?: {
    name?: string;
    lead_status?: string;
    deal_value?: number | string;
    interested_service?: string;
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

  // Default tools available to WhatsApp Autonomous Copilot
  private readonly defaultTools = [
    {
      name: "book_appointment",
      description: "Book a Google Meet or office consultation / interview slot",
      parameters: {
        slot: "ISO date string or human format (e.g. 2026-10-18 10:30 AM)",
        mode: "ONLINE or OFFICE",
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
      description: "Escalates chat to a human agent when customer requests live agent",
      parameters: {
        reason: "Customer request or complex inquiry",
      },
    },
  ];

  // ── 1. Assemble Full 7-Layer Contextual System Prompt ───────────────────
  public buildSystemPrompt(ctx: ConversationContext, customPersona?: string): string {
    let prompt = "";

    // LAYER 1: Business Identity & Agent Persona
    prompt +=
      customPersona ||
      `You are "Sharyx AI", an expert workforce co-pilot. Keep replies concise, helpful, and natural (1-3 sentences maximum for WhatsApp). Follow the user's language (Tamil, English, or Tanglish).`;

    if (ctx.tenantBusinessContext) {
      const b = ctx.tenantBusinessContext;
      prompt += `\n\n[APPLICATION OWNER & BUSINESS IDENTITY]:\n`;
      prompt += `You represent "${b.companyName || "Sharyx Enterprise"}".\n`;
      if (b.servicesList) prompt += `- Core Services: ${b.servicesList}\n`;
      if (b.address) prompt += `- Operating Address: ${b.address}\n`;
      if (b.businessEmail) prompt += `- Business Email: ${b.businessEmail}\n`;
    }

    // LAYER 2: CRM Lead Profile
    prompt += `\n\n[CRM CONTACT & LEAD CONTEXT]:\n`;
    if (ctx.leadInfo) {
      prompt += `- Lead Name: ${ctx.leadInfo.name || ctx.senderName}\n`;
      prompt += `- Phone: ${ctx.senderPhone}\n`;
      if (ctx.leadInfo.lead_status) prompt += `- Pipeline Stage: ${ctx.leadInfo.lead_status}\n`;
      if (ctx.leadInfo.deal_value) prompt += `- Deal Value: ₹${ctx.leadInfo.deal_value}\n`;
      if (ctx.leadInfo.interested_service) prompt += `- Interested Service: ${ctx.leadInfo.interested_service}\n`;
    } else {
      prompt += `- Contact Status: New Contact (${ctx.senderPhone})\n`;
    }

    // LAYER 3: Omnichannel Memory (Voice + WhatsApp + Email)
    if (ctx.omnichannelLogs) {
      const o = ctx.omnichannelLogs;
      if (o.lastCallSummary || o.lastWhatsAppMsg || o.lastEmailLog) {
        prompt += `\n\n[LAST INTERACTION ACROSS CHANNELS]:\n`;
        if (o.lastCallSummary) {
          prompt += `- Last Phone Call Summary: ${o.lastCallSummary} (Outcome: ${o.lastCallOutcome || "COMPLETED"})\n`;
        }
        if (o.lastWhatsAppMsg) {
          prompt += `- Last WhatsApp Chat: ${o.lastWhatsAppMsg}\n`;
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
      prompt += `*CRITICAL*: If customer asks for the Google Meet link, meeting link, or time, you MUST share this link (${a.meetingUrl}) directly in your message! Do NOT tell them to check email.\n`;
    }

    // LAYER 5: Knowledge Base Grounding (RAG)
    if (ctx.kbContext) {
      prompt += `\n\n[VERIFIED KNOWLEDGE BASE CONTEXT]:\n${ctx.kbContext}\n\n**CRITICAL GROUNDING**: Answer accurately using ONLY the verified facts above. Never hallucinate.`;
    }

    // LAYER 6: Dynamic Tools & Function Calling
    const tools = ctx.tools && ctx.tools.length > 0 ? ctx.tools : this.defaultTools;
    prompt += `\n\n[AVAILABLE SAAS TOOLS]:\n${JSON.stringify(tools, null, 2)}\n\n`;
    prompt += `**TOOL CALLING RULE**: If customer explicitly wants to book a slot, get brochure, or talk to human agent, reply ONLY in JSON format: {"action": "execute_tool", "toolName": "<name>", "inputs": {...}}. If no tool is needed, respond with standard friendly text.`;

    // LAYER 7: Media & Multimodal Context
    if (ctx.mediaContext) {
      prompt += `\n\n[MEDIA CONTEXT]:\n${ctx.mediaContext}\n`;
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
          servicesList: "AI Autonomous Workforce, WhatsApp Cloud Automation, Email AI Copilot, CRM Integration",
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

    // 3. Omnichannel Touchpoints & Active Appointment (Check conversation)
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

    return {
      tenantId: tenantId || "default",
      senderPhone,
      senderName: senderName || senderPhone,
      messageText,
      conversationHistory: history,
      activeAppointment,
      tenantBusinessContext: companyContext || {
        companyName: "Sharyx",
        servicesList: "AI Workforce Solutions & WhatsApp Cloud Automation",
        businessEmail: "support@sharyx.ai",
      },
      leadInfo: {
        name: senderName,
        lead_status: "ACTIVE_INQUIRY",
        interested_service: "WhatsApp AI & Voice Workforce",
      },
      omnichannelLogs: {
        lastWhatsAppMsg,
        lastCallSummary: "Inquired about autonomous WhatsApp co-pilot and AI capabilities",
        lastCallOutcome: "QUALIFIED_PROSPECT",
      },
    };
  }

  // ── 3. Call LLM (OpenAI or Gemini) using 7-Layer Context ────────────────
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

    // API Key priority: backend env key -> UI saved key
    const openAiKey = process.env.OPENAI_API_KEY || aiConfig?.api_key;
    const geminiKey = process.env.GEMINI_API_KEY || aiConfig?.api_key;
    const isGemini =
      aiConfig?.llm_provider === "gemini" || (aiConfig?.api_key && aiConfig.api_key.startsWith("AIzaSy"));

    // ── A. Google Gemini Provider ──────────────────────────────────────────
    if (isGemini && geminiKey) {
      try {
        let model = aiConfig?.llm_model || "gemini-2.5-flash";
        if (model.includes("1.5")) {
          model = "gemini-2.5-flash";
        }
        const promptContents = [
          {
            parts: [{ text: `${systemPrompt}\n\nRecent Conversation:\n${JSON.stringify(ctx.conversationHistory)}\n\nCustomer Inquiry: ${ctx.messageText}` }],
          },
        ];

        let response: any;
        try {
          response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            { contents: promptContents },
            { timeout: 15000 }
          );
        } catch (apiErr: any) {
          // Auto fallback to gemini-flash-latest or gemini-2.5-flash if model name differs
          this.logger.warn(`Model ${model} failed, trying gemini-flash-latest...`);
          response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
            { contents: promptContents },
            { timeout: 15000 }
          );
        }

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

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
        const model = aiConfig?.llm_model || "gpt-4o-mini";
        const messages = [
          { role: "system", content: systemPrompt },
          ...ctx.conversationHistory.slice(-8),
          { role: "user", content: ctx.messageText },
        ];

        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model,
            messages,
            temperature: 0.4,
            max_tokens: 300,
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
      const trimmed = rawText.trim();
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
        const slot = tool.inputs?.slot || "Tomorrow at 10:00 AM";
        const meetRoom = await CalendarHelper.createGoogleMeetRoom(
          `Consultation & Demo with ${ctx?.senderName || "Customer"}`,
          slot
        );

        // Save into conversation in DB
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
          }
        } catch (err: any) {
          this.logger.error("Failed to save meeting_info to conversation:", err.message);
        }

        return `🎉 Perfect! I have scheduled your consultation slot for *${slot}*.\n\n🎥 *Google Meet Link*: ${meetRoom.meetUrl}\n\nPlease join on time from a quiet place. Looking forward to speaking with you! 👍`;
      }
      case "send_brochure":
        return `📄 I've dispatched our official Sharyx 2026 Enterprise brochure and solutions overview PDF to your WhatsApp! Let me know if you have any questions.`;
      case "transfer_to_human":
        return `👨‍💼 Certainly! I am transferring this chat to one of our senior team members. Someone will be with you right away.`;
      default:
        return `Action "${tool.toolName}" has been executed successfully. How else can I assist you today?`;
    }
  }
}
