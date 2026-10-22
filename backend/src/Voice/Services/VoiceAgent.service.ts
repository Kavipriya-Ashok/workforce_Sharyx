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
      .filter((c) => c.api_key && c.api_key.trim().length > 0)
      .map((c) => c.provider);

    // If no provider is active/connected, all agents vanish
    if (activeProviders.length === 0) {
      return [];
    }

    // Auto-sync only active providers
    for (const cfg of activeConfigs) {
      if (cfg.api_key && cfg.is_active) {
        try {
          await this.syncFromProvider(cfg.provider, tenantId);
        } catch (err: any) {
          this.logger.warn(`Auto-sync on list failed for ${cfg.provider}: ${err.message}`);
        }
      }
    }

    // Return ONLY agents belonging to active, connected provider(s)
    const agents = await VoiceAgent.find({
      where: {
        tenant_id: tenantId,
        status: true,
        provider: In(activeProviders as any),
      },
      order: { created_on: "DESC" },
    });

    return agents;
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
        let existing = await VoiceAgent.findOne({
          where: { tenant_id: tenantId, remote_agent_id: remoteId },
        });

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
        existing.status = true;
        existing.raw_provider_response = rem;
        existing.updated_on = new Date();

        await existing.save();
        this.logger.log(`✅ [SYNCED AGENT] ${existing.name} (${existing.remote_agent_id})`);
      }

      // If we have real remote assistants, hide old simulated placeholder agents
      if (remotes.length > 0) {
        const existingList = await VoiceAgent.find({
          where: { tenant_id: tenantId, provider: providerName as any, status: true },
        });
        for (const ag of existingList) {
          if (
            ag.remote_agent_id &&
            (ag.remote_agent_id.startsWith("vapi_asst_") ||
             ag.remote_agent_id.startsWith("saas_agent_") ||
             ag.remote_agent_id.startsWith("retell_agent_") ||
             ag.remote_agent_id.startsWith("bland_agent_"))
          ) {
            ag.status = false;
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

  private async seedDefaults(tenantId: string) {
    const count = await VoiceAgent.count({ where: { tenant_id: tenantId } });
    if (count > 0) return;

    this.logger.log(`🌱 Seeding default multi-provider voice agents for tenant ${tenantId}...`);

    const defaults: Partial<CreateVoiceAgentDto>[] = [
      {
        name: "Voice Receptionist (Vapi)",
        provider: "vapi",
        system_prompt: `You are the AI Front-Desk Receptionist for Sharyx. Warmly greet the customer, ask for their name and inquiry, explain our AI Workforce solutions (Voice Calling, WhatsApp Copilots, and Email Automation), and offer to connect them with a specialist or book a demo. Keep responses concise and conversational for voice.`,
        first_message: "Hello! Welcome to Sharyx AI Workforce. My name is Maya, your AI assistant. May I know who I have the pleasure of speaking with?",
        voice_id: "21m00Tcm4TlvDq8ikWAM",
        voice_provider: "elevenlabs",
        llm_model: "gpt-4o-mini",
        temperature: 0.4,
      },
      {
        name: "Sales Closer (Retell AI)",
        provider: "retell",
        system_prompt: `You are the Senior Sales Specialist for Sharyx. Your goal is to understand the customer's business size, qualify their requirements for automated customer engagement, explain our Starter (₹4,999/mo) and Growth (₹14,999/mo) plans, and schedule a 15-minute live Google Meet demo.`,
        first_message: "Hi there! This is Alex from Sharyx. Thanks for reaching out about our AI sales solutions. How many team members or agents are you looking to equip?",
        voice_id: "11labs-Adrian",
        voice_provider: "elevenlabs",
        llm_model: "gpt-4o-mini",
        temperature: 0.3,
      },
      {
        name: "Appointment Scheduler (SaaS Fallback)",
        provider: "saas_fallback",
        system_prompt: `You are the Appointment Desk Voice Agent for Sharyx. Propose available meeting slots (Tomorrow at 10 AM or 3 PM IST) and confirm the customer's email address to send the Google Meet calendar invite.`,
        first_message: "Hello! I am calling from Sharyx to help you schedule your personalized product walkthrough. Would tomorrow morning work for you?",
        voice_id: "en-IN-Wavenet-D",
        voice_provider: "google",
        llm_model: "gemini-2.0-flash",
        temperature: 0.3,
      },
    ];

    for (const d of defaults) {
      try {
        await this.create(d as CreateVoiceAgentDto, tenantId);
      } catch (err: any) {
        this.logger.warn(`Could not seed default voice agent ${d.name}: ${err.message}`);
      }
    }
  }
}
