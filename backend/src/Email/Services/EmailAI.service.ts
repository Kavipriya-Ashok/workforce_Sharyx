import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { EmailAIConfig } from "@Database/Table/Email/EmailAIConfig.entity";
import { lead } from "@Database/Table/Lead/lead";
import { EmailAIConfigModel, GenerateEmailAIDraftModel } from "../Models/EmailAIConfig.model";

@Injectable()
export class EmailAIService {
  private readonly logger = new Logger(EmailAIService.name);

  async getConfig(tenantId: string = "default"): Promise<EmailAIConfig | null> {
    let config = await EmailAIConfig.findOne({ where: { tenant_id: tenantId, status: true } });
    if (!config) {
      config = new EmailAIConfig();
      config.tenant_id = tenantId;
      config.auto_reply_enabled = true;
      config.tone = "professional";
      config.llm_provider = process.env.GEMINI_API_KEY ? "gemini" : "openai";
      config.llm_model = "gemini-1.5-flash";
      config.system_prompt = "You are a professional AI sales and support copilot. Draft courteous, concise, and helpful replies to client inquiries.";
      config.created_by_id = "system";
      config.created_on = new Date();
      try {
        await config.save();
      } catch (err: any) {
        this.logger.debug(`Could not save default AI config: ${err.message}`);
      }
    }
    return config;
  }

  async saveConfig(data: EmailAIConfigModel, userId?: string): Promise<EmailAIConfig> {
    let config = await EmailAIConfig.findOne({ where: { tenant_id: data.tenant_id || "default" } });
    if (!config) {
      config = new EmailAIConfig();
      config.tenant_id = data.tenant_id || "default";
      config.created_by_id = userId || "system";
      config.created_on = new Date();
    }
    config.auto_reply_enabled = data.auto_reply_enabled ?? true;
    config.system_prompt = data.system_prompt || null;
    config.tone = data.tone || "professional";
    config.llm_provider = data.llm_provider || "openai";
    config.llm_model = data.llm_model || "gpt-4o-mini";
    config.updated_by_id = userId || "system";
    config.updated_on = new Date();
    return await config.save();
  }

  async generateDraft(dto: GenerateEmailAIDraftModel, tenantId: string = "default") {
    const config = await this.getConfig(tenantId);
    const recipientName = dto.lead_name || "Valued Client";
    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Generate live Google Meet Room Link
    let gmeetUrl = "https://meet.google.com/shx-demo-room";
    try {
      const { CalendarHelper } = await import("../../WhatsApp/Helpers/CalendarHelper");
      const meetRes = await CalendarHelper.createGoogleMeetRoom(`Sharyx Session - ${recipientName}`);
      if (meetRes?.meetUrl) {
        gmeetUrl = meetRes.meetUrl;
      }
    } catch {}

    // 2. Classify intent (Recruitment vs Sales) & Demo acceptance
    const combinedText = `${dto.subject || ""} ${dto.incoming_body || ""}`.toLowerCase();
    const isRecruitment = /(?:job|vacancy|career|resume|cv|hiring|apply|applicant|candidate|interview|opening|employment|ctc|notice period|reliev)/i.test(combinedText);
    const isDemoAccepted = /(?:(?:yes|yeah|sure|okay|ok|let's|book|schedule|share|send|provide).*(?:demo|meet|link|call|walkthrough|session|slot)|^(?:yes|yeah|sure|okay|ok|fine|yep|definitely|let's do it|let's book|agreed)[!.,\s]*$)/i.test(dto.incoming_body?.trim() || "");

    // Compose context with thread history if available
    let threadSection = "";
    if (dto.conversation_history && dto.conversation_history.length > 0) {
      threadSection = `\n\nRecent Conversation Thread History:\n` +
        dto.conversation_history
          .map((m) => `[${m.direction.toUpperCase()}]: ${m.body.slice(0, 300)}`)
          .join("\n");
    }

    const phoneInfo = dto.phone_number
      ? `Customer Phone on File: YES (${dto.phone_number})`
      : dto.has_phone
      ? `Customer Phone on File: YES (Provided)`
      : `Customer Phone on File: NO (Not provided yet)`;

    const systemPrompt = `You are "Sharyx AI", the official executive assistant and qualification copilot for Sharyx.
Tone: ${config?.tone || "professional, warm, direct, and helpful"}.

CRITICAL CONVERSATIONAL RULES (Follow strictly based on track):

TRACK A: RECRUITMENT & JOB CANDIDATE (REC Use Cases):
- If the sender is inquiring about jobs, vacancies, or submitted a resume:
  * Acknowledge their application warmly.
  * Collect any missing screening details: Role applied for, Total/relevant experience, Current employment status (working, serving notice, or relieved), Notice period / relieving date, and Expected salary/CTC.
  * If the candidate is ready for an interview or confirmed their slot, confirm the interview and share this confirmed Google Meet link: ${gmeetUrl}.

TRACK B: SERVICES INQUIRY & SALES DEMO QUALIFICATION (SAL Use Cases):
- DO NOT mention WhatsApp! Keep the communication professional and direct.
- STEP 1 (If Customer Phone is NO):
  * Answer their question or acknowledge their message warmly.
  * Ask: "Could you please share your phone number so our team can coordinate directly with you?"
- STEP 2 (If Customer Phone is YES, but Demo is NOT yet booked):
  * Acknowledge their contact number.
  * Strictly ask: "Do you have any doubts regarding our services, or shall we book a quick live demo to walk you through everything?"
- STEP 3 (If Customer accepted demo / said "Yes / Okay / Sure / Book demo / Share link"):
  * Confirm the demo session enthusiastically.
  * Share the confirmed Google Meet link: ${gmeetUrl}
  * Invite them to join or confirm their preferred time slot.

GENERAL MEMORY & FORMATTING:
- Read the thread history below. Directly continue the conversation from the customer's last message.
- Do NOT repeat greetings or restart from scratch if an ongoing thread exists.
- Keep the response short (2 to 3 paragraphs max) and human-like. Include proper greeting and sign-off.`;

    const userPromptContent = `RECIPIENT CONTEXT:
- Recipient Name: ${recipientName}
- Company: ${dto.company_name || "Not specified"}
- ${phoneInfo}
- Track Detected: ${isRecruitment ? "RECRUITMENT_CANDIDATE" : "SALES_SERVICES"}
- Demo Requested/Accepted: ${isDemoAccepted ? "YES" : "NO"}
- Google Meet Link Available: ${gmeetUrl}
- Subject: ${dto.subject || "No subject"}
- Incoming Message: ${dto.incoming_body || ""}${threadSection}`;

    if (openAiKey) {
      try {
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: config?.llm_model || "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPromptContent },
            ],
            temperature: 0.7,
            max_tokens: 500,
          },
          {
            headers: {
              Authorization: `Bearer ${openAiKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        const draftedText = response.data?.choices?.[0]?.message?.content?.trim();
        return {
          subject: dto.subject?.startsWith("Re:") ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
          draft: draftedText,
        };
      } catch (err: any) {
        this.logger.error("OpenAI email draft generation failed:", err?.response?.data || err.message);
      }
    }

    if (geminiKey) {
      const fullPrompt = `${systemPrompt}\n\n${userPromptContent}`;
      const modelsToTry = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-flash-latest"];
      for (const model of modelsToTry) {
        try {
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              contents: [{ parts: [{ text: fullPrompt }] }],
            },
            { timeout: 15000 }
          );
          const draftedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (draftedText) {
            return {
              subject: dto.subject?.startsWith("Re:") ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
              draft: draftedText,
            };
          }
        } catch (err: any) {
          const errMsg = err?.response?.data?.error?.message || err.message;
          this.logger.warn(`Gemini (${model}) draft failed: ${errMsg}`);
          if (errMsg?.includes("API_KEY_INVALID") || errMsg?.includes("API key not valid")) {
            this.logger.error("The provided GEMINI_API_KEY in .env is invalid. Gemini keys from Google AI Studio must start with 'AIzaSy'.");
            break;
          }
        }
      }
    }

    // Dynamic prompt-aligned fallback when LLM keys are absent/invalid
    let fallbackDraft = "";
    if (isRecruitment) {
      if (isDemoAccepted || combinedText.includes("interview")) {
        fallbackDraft = `Dear ${recipientName},\n\nThank you for sharing your availability. We are pleased to invite you for an interview discussion regarding your application.\n\n🔗 Google Meet Interview Link: ${gmeetUrl}\n\nPlease join the meeting at the scheduled time or let us know if you need to adjust the timing. Looking forward to speaking with you!\n\nBest regards,\nSharyx Talent Acquisition`;
      } else {
        fallbackDraft = `Dear ${recipientName},\n\nThank you for your interest in joining Sharyx! We have received your application regarding "${dto.subject || "Open Roles"}".\n\nTo proceed with the screening round, could you please confirm your total experience, current employment status (serving notice/relieved), and share your updated resume/CV?\n\nBest regards,\nSharyx Talent Acquisition`;
      }
    } else {
      // Sales & Services Track
      if (isDemoAccepted) {
        fallbackDraft = `Dear ${recipientName},\n\nWonderful! We would be delighted to host a live demo and walk you through our workforce automation platform.\n\n🔗 Google Meet Demo Link: ${gmeetUrl}\n\nPlease feel free to join or reply with your preferred time slot tomorrow so we can ensure our solutions team is ready for you.\n\nBest regards,\nSharyx AI Team`;
      } else if (dto.phone_number || dto.has_phone) {
        const ph = dto.phone_number ? ` (${dto.phone_number})` : "";
        fallbackDraft = `Dear ${recipientName},\n\nThank you for reaching out! We have noted your contact number${ph}.\n\nDo you have any doubts regarding our services, or shall we book a quick live demo to walk you through everything?\n\nBest regards,\nSharyx AI Team`;
      } else {
        fallbackDraft = `Dear ${recipientName},\n\nThank you for reaching out regarding "${dto.subject || "our services"}".\n\nWe have received your inquiry and our team is eager to assist you! Could you please share your phone number so our specialist can coordinate directly with you?\n\nBest regards,\nSharyx AI Team`;
      }
    }

    return {
      subject: dto.subject?.startsWith("Re:") ? dto.subject : `Re: ${dto.subject || "Inquiry"}`,
      draft: fallbackDraft,
    };
  }

  async generateLeadFollowupDraft(
    leadId: string,
    customPrompt?: string,
    intent?: string,
    tenantId: string = "default"
  ) {
    const foundLead = await lead.findOne({ where: { id: leadId } });

    const leadName = foundLead ? foundLead.name || `${foundLead.first_name || ""} ${foundLead.last_name || ""}`.trim() : "Valued Client";
    const company = foundLead?.company_name || "your company";
    const status = foundLead?.lead_status || "Active";
    const notes = foundLead?.notes || "Expressed interest in our services";

    const promptText = `
You are an expert sales representative and business development executive.
Draft a highly personalized, compelling B2B email to:
- Recipient Name: ${leadName}
- Company: ${company}
- Current Pipeline Status: ${status}
- Background Context / Notes: ${notes}
- Email Goal / Objective: ${intent || "Follow up on previous touchpoint and schedule a quick 15-minute call"}
- User Instructions: ${customPrompt || "Keep it concise, friendly, respectful, and include a clear call-to-action."}

STRICT INSTRUCTION: Output ONLY a valid JSON object without markdown or code fences. Format:
{
  "subject": "Compelling subject line here",
  "body_html": "<p>Hi ${leadName},</p><p>Message content...</p><p>Best regards,<br/>Team</p>"
}
    `.trim();

    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      const modelsToTry = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-flash-latest"];
      for (const model of modelsToTry) {
        try {
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              contents: [{ parts: [{ text: promptText }] }],
            },
            { timeout: 15000 }
          );
          let rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(rawText);
          if (parsed.subject && parsed.body_html) {
            return {
              subject: parsed.subject,
              body_html: parsed.body_html,
            };
          }
        } catch (err: any) {
          const errMsg = err?.response?.data?.error?.message || err.message;
          this.logger.warn(`Gemini (${model}) attempt failed: ${errMsg}`);
          // If the key itself is invalid, stop trying other models
          if (errMsg?.includes("API_KEY_INVALID") || errMsg?.includes("API key not valid")) {
            this.logger.error("The provided GEMINI_API_KEY in .env is invalid. Gemini keys from Google AI Studio must start with 'AIzaSy'.");
            break;
          }
        }
      }
    }

    if (openAiKey) {
      try {
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: promptText }],
            temperature: 0.7,
            max_tokens: 600,
          },
          {
            headers: {
              Authorization: `Bearer ${openAiKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        let rawText = response.data?.choices?.[0]?.message?.content?.trim() || "";
        rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(rawText);
        return {
          subject: parsed.subject,
          body_html: parsed.body_html,
        };
      } catch (err: any) {
        this.logger.warn(`OpenAI lead draft generation failed: ${err.message}`);
      }
    }

    // High quality personalized fallback
    return {
      subject: `Following up regarding ${company}`,
      body_html: `<p>Hi ${leadName},</p><p>I hope this email finds you well.</p><p>I'm following up on our recent conversation regarding how we can support ${company}. Based on your interests, I'd love to share a quick demonstration of how our automation solutions can streamline your operations.</p><p>Would you have 15 minutes open later this week for a brief conversation?</p><p>Best regards,<br/><strong>Business Development Team</strong><br/>Sharyx</p>`,
    };
  }
}

