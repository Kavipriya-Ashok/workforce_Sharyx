import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { In } from "typeorm";
import { VoiceAgent } from "@Database/Table/Voice/VoiceAgent.entity";
import { VoiceProviderConfig } from "@Database/Table/Voice/VoiceProviderConfig.entity";
import { VoiceFactoryService } from "./VoiceFactory.service";
import { CreateVoiceAgentDto, UpdateVoiceAgentDto } from "../Interfaces/VoiceTypes";

@Injectable()
export class VoiceAgentService {
  private readonly logger = new Logger(VoiceAgentService.name);

  constructor(private readonly factory: VoiceFactoryService) { }

  async list(tenantId: string = "default"): Promise<VoiceAgent[]> {
    // 1. Identify active providers with valid credentials
    const activeConfigs = await VoiceProviderConfig.find({
      where: { tenant_id: tenantId, is_active: true },
    });

    const activeProviders = activeConfigs
      .filter((c) => c.provider === "saas_fallback" || (c.api_key && c.api_key.trim().length > 0))
      .map((c) => c.provider);

    // If no provider is active/connected, all agents vanish
    if (activeProviders.length === 0) {
      return [];
    }

    // Auto-sync only active providers
    for (const cfg of activeConfigs) {
      if ((cfg.api_key || cfg.provider === "saas_fallback") && cfg.is_active) {
        try {
          await this.syncFromProvider(cfg.provider, tenantId);
        } catch (err: any) {
          this.logger.warn(`Auto-sync on list failed for ${cfg.provider}: ${err.message}`);
        }
      }
    }

    // Return ONLY agents belonging to active, connected provider(s) and currently enabled
    const agents = await VoiceAgent.find({
      where: {
        tenant_id: tenantId,
        status: true,
        provider: In(activeProviders as any),
      },
      order: { created_on: "DESC" },
    });

    const seenRemoteIds = new Set<string>();
    return agents.filter((a) => {
      if (a.is_enabled === false) return false;
      if (a.remote_agent_id) {
        if (seenRemoteIds.has(a.remote_agent_id)) return false;
        seenRemoteIds.add(a.remote_agent_id);
      }
      return true;
    });
  }

  async syncFromProvider(providerName: string = "vapi", tenantId: string = "default"): Promise<VoiceAgent[]> {
    const provider = this.factory.getProvider(providerName);
    const config = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, provider: providerName as any, is_active: true },
    });

    if (provider.listRemoteAgents) {
      const remotes = await provider.listRemoteAgents(config || undefined);
      this.logger.log(`🔄 [SYNC] Found ${remotes.length} assistants on ${providerName}`);

      for (const rem of remotes) {
        const remoteId = String(rem.id || rem.agent_id || rem.remote_id);
        const allMatches = await VoiceAgent.find({
          where: { tenant_id: tenantId, remote_agent_id: remoteId, provider: providerName as any },
          order: { created_on: "DESC" },
        });

        let existing = allMatches[0] || null;

        // Clean up duplicate rows if multiple exist
        if (allMatches.length > 1) {
          for (let i = 1; i < allMatches.length; i++) {
            try {
              await allMatches[i].remove();
            } catch {}
          }
        }

        if (!existing && rem.name) {
          existing = await VoiceAgent.findOne({
            where: { tenant_id: tenantId, name: rem.name, provider: providerName as any },
          });
        }

        if (!existing) {
          existing = new VoiceAgent();
          existing.tenant_id = tenantId;
          existing.created_by_id = "provider_sync";
          existing.created_on = new Date();
        }

        existing.name = rem.name || "Remote Voice Agent";
        existing.provider = providerName as any;
        existing.remote_agent_id = remoteId;
        existing.status = true;
        existing.is_enabled = true; // Always enable live assistants returned by provider

        // Smart template_key auto-tagging
        const lowerName = (existing.name || "").toLowerCase();
        if (!existing.template_key) {
          if (lowerName.includes("talent") || lowerName.includes("recruit") || lowerName.includes("interview") || lowerName.includes("maya")) {
            existing.template_key = "recruitment";
          } else if (lowerName.includes("sales") || lowerName.includes("closer") || lowerName.includes("alex")) {
            existing.template_key = "sales";
          } else if (lowerName.includes("appoint") || lowerName.includes("schedule") || lowerName.includes("rachel")) {
            existing.template_key = "appointment";
          } else if (lowerName.includes("support") || lowerName.includes("service") || lowerName.includes("jordan")) {
            existing.template_key = "support";
          } else if (lowerName.includes("reception") || lowerName.includes("front") || lowerName.includes("aria")) {
            existing.template_key = "receptionist";
          }
        }

        existing.system_prompt =
          rem.model?.messages?.[0]?.content ||
          rem.prompt ||
          rem.system_prompt ||
          rem.description ||
          existing.system_prompt ||
          "You are an AI assistant.";
        existing.first_message =
          rem.firstMessage ||
          rem.first_message ||
          rem.welcome_message ||
          existing.first_message ||
          "Hello! How can I help you?";
        existing.voice_id =
          rem.voice?.voiceId ||
          rem.voice?.id ||
          rem.voice_id ||
          existing.voice_id ||
          (providerName === "saas_fallback" ? "en-IN-Wavenet-D" : "21m00Tcm4TlvDq8ikWAM");
        existing.voice_provider =
          rem.voice?.provider ||
          rem.voice_provider ||
          existing.voice_provider ||
          (providerName === "saas_fallback" ? "google" : "elevenlabs");
        existing.llm_model =
          rem.model?.model ||
          rem.model ||
          existing.llm_model ||
          (providerName === "saas_fallback" ? "gemini-2.0-flash" : "gpt-4o-mini");
        existing.raw_provider_response = rem;
        existing.updated_on = new Date();

        await existing.save();
        this.logger.log(`✅ [SYNCED AGENT] ${existing.name} (${existing.remote_agent_id})`);
      }

      // If we have real remote assistants, hide old simulated placeholder or deleted agents
      if (remotes.length > 0) {
        const remoteIdSet = new Set(remotes.map((r: any) => String(r.id || r.agent_id || r.remote_id)));
        const existingList = await VoiceAgent.find({
          where: { tenant_id: tenantId, provider: providerName as any, status: true },
        });
        for (const ag of existingList) {
          if (
            ag.remote_agent_id &&
            (ag.remote_agent_id.startsWith("vapi_asst_") ||
              ag.remote_agent_id.startsWith("saas_") ||
              ag.remote_agent_id.startsWith("retell_agent_") ||
              ag.remote_agent_id.startsWith("bland_agent_") ||
              !remoteIdSet.has(ag.remote_agent_id))
          ) {
            ag.status = false;
            ag.is_enabled = false;
            await ag.save();
          }
        }
      }
    }

    return await VoiceAgent.find({
      where: { tenant_id: tenantId, status: true },
      order: { created_on: "DESC" },
    });
  }

  async getOne(id: string, tenantId: string = "default"): Promise<VoiceAgent> {
    const agent = await VoiceAgent.findOne({ where: { id, tenant_id: tenantId, status: true } });
    if (!agent) throw new NotFoundException(`Voice Agent ${id} not found`);
    return agent;
  }

  async create(dto: CreateVoiceAgentDto, tenantId: string = "default"): Promise<VoiceAgent> {
    const provider = this.factory.getProvider(dto.provider);
    const config = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, provider: dto.provider, is_active: true },
    });

    // Create remotely on vendor's platform
    const remote = await provider.createAgent(dto, config || undefined);

    const agent = new VoiceAgent();
    agent.tenant_id = tenantId;
    agent.name = dto.name;
    agent.provider = dto.provider;
    agent.remote_agent_id = remote.remoteAgentId;
    agent.system_prompt = dto.system_prompt;
    agent.first_message = dto.first_message || "Hello! Thank you for connecting with us.";
    agent.voice_id = dto.voice_id || "21m00Tcm4TlvDq8ikWAM";
    agent.voice_provider = dto.voice_provider || "elevenlabs";
    agent.llm_model = dto.llm_model || "gpt-4o-mini";
    agent.temperature = dto.temperature ?? 0.4;
    agent.language = dto.language || "en";
    agent.allowed_tools = dto.allowed_tools || ["book_appointment", "qualify_lead", "email_meeting_link"];
    agent.transfer_agent_id = dto.transfer_agent_id;
    agent.transfer_phone_number = dto.transfer_phone_number;
    agent.raw_provider_response = remote.raw;
    agent.created_by_id = "voice_service";
    agent.created_on = new Date();

    await agent.save();
    this.logger.log(`🎙️ Voice Agent saved: ${agent.name} [${agent.provider} | ${agent.remote_agent_id}]`);
    return agent;
  }

  async update(id: string, dto: UpdateVoiceAgentDto, tenantId: string = "default"): Promise<VoiceAgent> {
    const agent = await this.getOne(id, tenantId);
    const provider = this.factory.getProvider(agent.provider);
    const config = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, provider: agent.provider, is_active: true },
    });

    if (agent.remote_agent_id) {
      await provider.updateAgent(agent.remote_agent_id, dto, config || undefined);
    }

    if (dto.name) agent.name = dto.name;
    if (dto.system_prompt) agent.system_prompt = dto.system_prompt;
    if (dto.first_message) agent.first_message = dto.first_message;
    if (dto.voice_id) agent.voice_id = dto.voice_id;
    if (dto.voice_provider) agent.voice_provider = dto.voice_provider;
    if (dto.llm_model) agent.llm_model = dto.llm_model;
    if (dto.temperature !== undefined) agent.temperature = dto.temperature;
    if (dto.language) agent.language = dto.language;
    if (dto.allowed_tools) agent.allowed_tools = dto.allowed_tools;
    if (dto.transfer_agent_id !== undefined) agent.transfer_agent_id = dto.transfer_agent_id;
    if (dto.transfer_phone_number !== undefined) agent.transfer_phone_number = dto.transfer_phone_number;
    agent.updated_on = new Date();

    await agent.save();
    return agent;
  }

  async remove(id: string, tenantId: string = "default"): Promise<boolean> {
    const agent = await this.getOne(id, tenantId);
    const provider = this.factory.getProvider(agent.provider);
    const config = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, provider: agent.provider, is_active: true },
    });

    if (agent.remote_agent_id) {
      await provider.deleteAgent(agent.remote_agent_id, config || undefined);
    }

    agent.status = false;
    await agent.save();
    return true;
  }

  /**
   * 5 Default Workforce Voice Agents Blueprint
   */
  public static readonly WORKFORCE_5_VOICE_TEMPLATES = [
    {
      key: "receptionist",
      name: "AI Receptionist (Aria)",
      role: "Front-Desk & Inquiry Intake",
      system_prompt: `You are Aria, the professional front-desk AI Receptionist for Sharyx AI Workforce. Your job is to warmly greet every caller, understand their inquiry, explain our AI Workforce solutions (Voice Telephony Calling, WhatsApp AI Copilots, and Email Automation), qualify their basic details (name, company, and email), and offer to connect them with a specialist or book a demo. Keep responses concise, conversational, and natural for real-time voice.`,
      first_message: "Hello! Thank you for calling Sharyx. My name is Aria, your AI receptionist. May I know who I have the pleasure of speaking with today?",
      voice_id_vapi: "21m00Tcm4TlvDq8ikWAM", // Rachel (ElevenLabs)
      voice_id_saas: "Priya",
      llm_model: "gpt-4o-mini",
      temperature: 0.4,
      allowed_tools: ["capture_contact", "send_brochure", "email_meeting_link"],
    },
    {
      key: "sales",
      name: "Sales Specialist (Alex)",
      role: "Pricing, Qualification & Closing",
      system_prompt: `You are Alex, Senior Sales Specialist for Sharyx AI Workforce. Your goal is to understand the caller's business size, qualify their requirements for automated customer engagement (Voice Calling, WhatsApp, and Email), explain our Starter (₹4,999/mo) and Growth (₹14,999/mo) plans, uncover their budget and decision timeline, and schedule a 15-minute live Google Meet demo. Ask one question at a time and keep responses punchy and consultative.`,
      first_message: "Hi there! This is Alex from the Sharyx Sales team. Thanks for your interest in our autonomous AI Workforce. How many customer inquiries or team members are you looking to equip?",
      voice_id_vapi: "pNInz6obpgDQGcFmaJgB", // Adam (ElevenLabs)
      voice_id_saas: "Adrian",
      llm_model: "gpt-4o-mini",
      temperature: 0.3,
      allowed_tools: ["qualify_lead", "notify_sales_team", "send_brochure", "book_appointment"],
    },
    {
      key: "appointment",
      name: "Appointment Desk (Rachel)",
      role: "Calendar & Google Meet Scheduler",
      system_prompt: `You are Rachel, the Appointment & Meeting Coordinator for Sharyx. Your goal is to help the caller book or reschedule their personalized 15-minute live product walkthrough. Propose available meeting slots (such as tomorrow at 10:00 AM or 3:00 PM IST), confirm their email address so we can send the Google Meet calendar invite, and confirm the booking immediately.`,
      first_message: "Hello! I am calling from Sharyx to help you schedule your live product walkthrough. Would tomorrow morning or afternoon work best for you?",
      voice_id_vapi: "21m00Tcm4TlvDq8ikWAM", // Rachel (ElevenLabs)
      voice_id_saas: "Rachel",
      llm_model: "gpt-4o-mini",
      temperature: 0.2,
      allowed_tools: ["book_appointment", "email_meeting_link", "cancel_appointment"],
    },
    {
      key: "support",
      name: "Customer Support (Jordan)",
      role: "Troubleshooting & Ticket Desk",
      system_prompt: `You are Jordan, the Customer Support Specialist for Sharyx. Your goal is to warmly listen to existing customers, troubleshoot technical issues with their Voice, WhatsApp, or Email agents, create support ticket summaries, and provide step-by-step guidance. Maintain an empathetic, calm, and solution-oriented voice tone at all times.`,
      first_message: "Hello! You've reached Sharyx Customer Support. My name is Jordan. I'm here to help you resolve any issues right away. What can I assist you with today?",
      voice_id_vapi: "ErXwobaYiN019PkySvjV", // Antoni (ElevenLabs)
      voice_id_saas: "Charlie",
      llm_model: "gpt-4o-mini",
      temperature: 0.3,
      allowed_tools: ["create_ticket", "transfer_to_human"],
    },
    {
      key: "recruitment",
      name: "Talent Acquisition (Maya)",
      role: "Candidate Screening & HR",
      system_prompt: `You are Maya, the Talent Acquisition & Screening specialist for Sharyx. You conduct initial friendly phone screenings for open positions, inquire about candidates' years of experience, primary technical skills, notice period, and salary expectations, answer questions about our company culture, and schedule interviews with our hiring managers.`,
      first_message: "Hello! This is Maya from the Sharyx Talent Acquisition team. Thank you for your application. Do you have a few minutes for a quick introductory screening?",
      voice_id_vapi: "EXAVITQu4vr4xnSDxMaL", // Bella (ElevenLabs)
      voice_id_saas: "Sarah",
      llm_model: "gpt-4o-mini",
      temperature: 0.3,
      allowed_tools: ["book_appointment", "capture_contact"],
    },
  ];

  /**
   * Returns the catalog of 5 default templates along with their enable/disable status for a provider
   */
  async getCatalog(providerType: string = "vapi", tenantId: string = "default") {
    const existingAgents = await VoiceAgent.find({
      where: {
        tenant_id: tenantId,
        provider: providerType as any,
        status: true,
      },
    });

    return VoiceAgentService.WORKFORCE_5_VOICE_TEMPLATES.map((tpl) => {
      const existing = existingAgents.find(
        (a) =>
          a.template_key === tpl.key ||
          a.name.toLowerCase() === tpl.name.toLowerCase() ||
          a.name.toLowerCase().includes(tpl.key)
      );

      const isEnabled = existing ? existing.is_enabled !== false : false;
      const voiceId = providerType === "saas_fallback" ? tpl.voice_id_saas : tpl.voice_id_vapi;

      return {
        key: tpl.key,
        name: tpl.name,
        role: tpl.role,
        system_prompt: tpl.system_prompt,
        first_message: tpl.first_message,
        voice_id: voiceId,
        voice_provider: "elevenlabs",
        llm_model: tpl.llm_model,
        temperature: tpl.temperature,
        allowed_tools: tpl.allowed_tools,
        provider: providerType,
        is_enabled: isEnabled,
        agent_id: existing?.id || null,
        remote_agent_id: existing?.remote_agent_id || null,
        last_sync_error: existing?.last_sync_error || null,
        status: existing ? (isEnabled ? "enabled" : "disabled") : "not_created",
      };
    });
  }

  /**
   * Enable a specific catalog agent for a provider.
   * If remote agent already exists, updates & sets is_enabled = true.
   * If not created yet, creates it remotely and saves to DB.
   */
  async enableCatalogAgent(key: string, providerType: string = "vapi", tenantId: string = "default") {
    const tpl = VoiceAgentService.WORKFORCE_5_VOICE_TEMPLATES.find((t) => t.key === key);
    if (!tpl) {
      throw new NotFoundException(`Catalog template '${key}' not found`);
    }

    const config = await VoiceProviderConfig.findOne({
      where: { tenant_id: tenantId, provider: providerType as any, is_active: true },
    });

    const provider = this.factory.getProvider(providerType);
    const voiceId = providerType === "saas_fallback" ? tpl.voice_id_saas : tpl.voice_id_vapi;

    const dto: CreateVoiceAgentDto = {
      name: tpl.name,
      provider: providerType as any,
      system_prompt: tpl.system_prompt,
      first_message: tpl.first_message,
      voice_id: voiceId,
      voice_provider: "elevenlabs",
      llm_model: tpl.llm_model,
      temperature: tpl.temperature,
      language: "en",
      allowed_tools: tpl.allowed_tools,
      tenantId,
    };

    let existing = await VoiceAgent.findOne({
      where: { tenant_id: tenantId, provider: providerType as any, template_key: key },
    });
    if (!existing) {
      existing = await VoiceAgent.findOne({
        where: { tenant_id: tenantId, provider: providerType as any, name: tpl.name },
      });
    }

    try {
      let remoteId = existing?.remote_agent_id;
      let rawResponse: any = null;

      if (remoteId && !remoteId.startsWith("vapi_asst_") && !remoteId.startsWith("saas_agent_")) {
        try {
          rawResponse = await provider.updateAgent(remoteId, dto, config || undefined);
          this.logger.log(`🔄 [CATALOG ENABLE] Updated remote agent ${remoteId} (${tpl.name}) on ${providerType}`);
        } catch (updateErr: any) {
          this.logger.warn(`Could not update remote ${remoteId}, creating fresh: ${updateErr.message}`);
          const remote = await provider.createAgent(dto, config || undefined);
          remoteId = remote.remoteAgentId;
          rawResponse = remote.raw;
        }
      } else {
        const remote = await provider.createAgent(dto, config || undefined);
        remoteId = remote.remoteAgentId;
        rawResponse = remote.raw;
        this.logger.log(`✨ [CATALOG ENABLE] Created remote agent ${remoteId} (${tpl.name}) on ${providerType}`);
      }

      if (!existing) {
        existing = new VoiceAgent();
        existing.tenant_id = tenantId;
        existing.created_by_id = "catalog_enable";
        existing.created_on = new Date();
      }

      existing.name = tpl.name;
      existing.provider = providerType as any;
      existing.remote_agent_id = remoteId || `deployed_${Date.now()}`;
      existing.system_prompt = tpl.system_prompt;
      existing.first_message = tpl.first_message;
      existing.voice_id = voiceId;
      existing.voice_provider = "elevenlabs";
      existing.llm_model = tpl.llm_model;
      existing.temperature = tpl.temperature;
      existing.language = "en";
      existing.allowed_tools = tpl.allowed_tools;
      existing.template_key = key;
      existing.is_enabled = true;
      existing.status = true;
      existing.last_sync_error = null;
      if (rawResponse) existing.raw_provider_response = rawResponse;
      existing.updated_on = new Date();

      await existing.save();
      return { ok: true, agent: existing };
    } catch (err: any) {
      this.logger.error(`❌ [CATALOG ENABLE] Failed for ${tpl.name} on ${providerType}: ${err.message}`);
      if (existing) {
        existing.last_sync_error = err.message;
        await existing.save();
      }
      throw err;
    }
  }

  /**
   * Disable a specific catalog agent for a provider.
   * Soft disable: keeps the remote agent and DB row, but marks is_enabled = false
   * so it is hidden from the dispatch dropdown.
   */
  async disableCatalogAgent(key: string, providerType: string = "vapi", tenantId: string = "default") {
    const tpl = VoiceAgentService.WORKFORCE_5_VOICE_TEMPLATES.find((t) => t.key === key);
    let existing = await VoiceAgent.findOne({
      where: { tenant_id: tenantId, provider: providerType as any, template_key: key },
    });
    if (!existing && tpl) {
      existing = await VoiceAgent.findOne({
        where: { tenant_id: tenantId, provider: providerType as any, name: tpl.name },
      });
    }

    if (existing) {
      existing.is_enabled = false;
      existing.template_key = key;
      existing.updated_on = new Date();
      await existing.save();
      this.logger.log(`⏸️ [CATALOG DISABLE] Disabled ${existing.name} (${existing.remote_agent_id})`);
      return { ok: true, agent: existing };
    }

    return { ok: true, message: `Agent '${key}' was not enabled` };
  }

  /**
   * Enable all 5 default catalog agents for a provider
   */
  async enableAllCatalogAgents(providerType: string = "vapi", tenantId: string = "default") {
    const results = [];
    for (const tpl of VoiceAgentService.WORKFORCE_5_VOICE_TEMPLATES) {
      try {
        const res = await this.enableCatalogAgent(tpl.key, providerType, tenantId);
        results.push({ key: tpl.key, ok: true, agent: res.agent });
      } catch (err: any) {
        results.push({ key: tpl.key, ok: false, error: err.message });
      }
    }
    return { ok: true, provider: providerType, results };
  }

  /**
   * Disable all 5 default catalog agents for a provider
   */
  async disableAllCatalogAgents(providerType: string = "vapi", tenantId: string = "default") {
    const results = [];
    for (const tpl of VoiceAgentService.WORKFORCE_5_VOICE_TEMPLATES) {
      const res = await this.disableCatalogAgent(tpl.key, providerType, tenantId);
      results.push({ key: tpl.key, ...res });
    }
    return { ok: true, provider: providerType, results };
  }

  /**
   * 1-Click Deploy 5 Workforce Agents to requested provider or active provider (Vapi or SaaS)
   */
  async deployWorkforceTeam(tenantId: string = "default", requestedProvider?: string) {
    // 1. Identify active provider
    let activeConfig: VoiceProviderConfig | null = null;
    if (requestedProvider) {
      activeConfig = await VoiceProviderConfig.findOne({
        where: { tenant_id: tenantId, provider: requestedProvider as any },
      });
    }

    if (!activeConfig) {
      activeConfig = await VoiceProviderConfig.findOne({
        where: { tenant_id: tenantId, is_active: true },
      });
    }

    // Fallback: If not explicitly marked active, find one with a configured API key
    if (!activeConfig) {
      activeConfig = await VoiceProviderConfig.findOne({
        where: { tenant_id: tenantId, provider: "vapi" as any },
      });
      if (!activeConfig || !activeConfig.api_key) {
        activeConfig = await VoiceProviderConfig.findOne({
          where: { tenant_id: tenantId, provider: "saas_fallback" as any },
        });
      }
    }

    const providerType = activeConfig?.provider || requestedProvider || "vapi";
    const rawApiKey = (activeConfig?.api_key || "").trim();

    // Mask key for safety in UI display
    let maskedKey = "Not configured";
    if (rawApiKey.length > 8) {
      maskedKey = `${rawApiKey.substring(0, 8)}••••••••${rawApiKey.substring(rawApiKey.length - 4)}`;
    } else if (rawApiKey.length > 0) {
      maskedKey = "••••••••";
    }

    const isSaas = providerType === "saas_fallback";
    const providerLabel = isSaas ? "Sharyx Voice AI (SaaS)" : "Vapi Voice AI";
    const baseUrl = activeConfig?.base_url || (isSaas ? process.env.VOICE_BACKEND_URL || "https://fallback-voice.sharyx.ai" : "https://api.vapi.ai");
    const callerId = activeConfig?.caller_id || process.env.VOICE_CALLER_ID || "+918035454141";

    const sttEngine = isSaas ? "Soniox Realtime v4 (stt-rt-v4)" : "Deepgram Nova-2 (realtime)";
    const ttsEngine = isSaas ? "ElevenLabs Flash v2 (Priya / Adrian)" : "ElevenLabs (11labs)";
    const llmEngine = "OpenAI gpt-4o-mini";

    this.logger.log(`⚡ [1-CLICK DEPLOY] Deploying 5 agents to ${providerLabel} [${providerType}]...`);

    const deployedAgents: VoiceAgent[] = [];
    const provider = this.factory.getProvider(providerType);

    for (const tpl of VoiceAgentService.WORKFORCE_5_VOICE_TEMPLATES) {
      const voiceId = isSaas ? tpl.voice_id_saas : tpl.voice_id_vapi;

      const dto: CreateVoiceAgentDto = {
        name: tpl.name,
        provider: providerType as any,
        system_prompt: tpl.system_prompt,
        first_message: tpl.first_message,
        voice_id: voiceId,
        voice_provider: "elevenlabs",
        llm_model: tpl.llm_model,
        temperature: tpl.temperature,
        language: "en",
        allowed_tools: tpl.allowed_tools,
        tenantId,
      };

      try {
        // Check if agent already exists locally
        let existing = await VoiceAgent.findOne({
          where: { tenant_id: tenantId, name: tpl.name, provider: providerType as any },
        });

        let remoteId = existing?.remote_agent_id;
        let rawResponse: any = null;

        if (remoteId && !remoteId.startsWith("vapi_asst_") && !remoteId.startsWith("saas_agent_")) {
          // Update existing remote agent
          try {
            rawResponse = await provider.updateAgent(remoteId, dto, activeConfig || undefined);
            this.logger.log(`🔄 [1-CLICK DEPLOY] Updated existing remote agent ${remoteId} (${tpl.name})`);
          } catch (updateErr: any) {
            this.logger.warn(`Could not update remote agent ${remoteId}, creating fresh: ${updateErr.message}`);
            const remote = await provider.createAgent(dto, activeConfig || undefined);
            remoteId = remote.remoteAgentId;
            rawResponse = remote.raw;
          }
        } else {
          // Create fresh remote assistant
          const remote = await provider.createAgent(dto, activeConfig || undefined);
          remoteId = remote.remoteAgentId;
          rawResponse = remote.raw;
        }

        if (!existing) {
          existing = new VoiceAgent();
          existing.tenant_id = tenantId;
          existing.created_by_id = "1click_deploy";
          existing.created_on = new Date();
        }

        existing.name = tpl.name;
        existing.provider = providerType as any;
        existing.remote_agent_id = remoteId || `deployed_${Date.now()}`;
        existing.system_prompt = tpl.system_prompt;
        existing.first_message = tpl.first_message;
        existing.voice_id = voiceId;
        existing.voice_provider = "elevenlabs";
        existing.llm_model = tpl.llm_model;
        existing.temperature = tpl.temperature;
        existing.language = "en";
        existing.allowed_tools = tpl.allowed_tools;
        existing.template_key = tpl.key;
        existing.is_enabled = true;
        existing.last_sync_error = null;
        existing.status = true;
        existing.raw_provider_response = rawResponse;
        existing.updated_on = new Date();

        await existing.save();
        deployedAgents.push(existing);
        this.logger.log(`✅ [1-CLICK DEPLOY] Deployed: ${existing.name} [ID: ${existing.remote_agent_id}]`);
      } catch (err: any) {
        this.logger.error(`❌ [1-CLICK DEPLOY] Failed for ${tpl.name}: ${err.message}`);
      }
    }

    return {
      ok: true,
      provider: providerType,
      providerLabel,
      configuredApi: {
        provider: providerType,
        providerLabel,
        apiKeyMasked: maskedKey,
        baseUrl,
        callerId,
        sttEngine,
        ttsEngine,
        llmEngine,
      },
      deployedCount: deployedAgents.length,
      data: deployedAgents,
    };
  }

  private async seedDefaults(tenantId: string) {
    const count = await VoiceAgent.count({ where: { tenant_id: tenantId } });
    if (count > 0) return;
    try {
      await this.deployWorkforceTeam(tenantId);
    } catch (err: any) {
      this.logger.warn(`Could not seed default voice workforce team: ${err.message}`);
    }
  }
}
