import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import axios from "axios";
import { randomBytes } from "crypto";
import { WhatsAppConfig } from "@Database/Table/WhatsApp/WhatsAppConfig.entity";
import { WhatsAppConversation } from "@Database/Table/WhatsApp/WhatsAppConversation.entity";
import { WhatsAppMessage } from "@Database/Table/WhatsApp/WhatsAppMessage.entity";
import { SendWhatsAppMessageModel } from "../Models/SendWhatsAppMessage.model";
import { WhatsAppConfigModel } from "../Models/WhatsAppConfig.model";
import { redactSecrets } from "@Helper/Redact";
import { classifyError, markConnected, markDegraded, markFailed, markNotConfigured, noteFailure, noteSuccess } from "@Service/Integrations/IntegrationStatus";

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  // WHATSAPP_GRAPH_URL lets tests point at a local fake of Meta; production leaves it unset.
  private readonly apiUrl = process.env.WHATSAPP_GRAPH_URL || "https://graph.facebook.com/v21.0";

  /** A tenant is mandatory for every operation. `null` (super-admin "all tenants") is ambiguous here. */
  private requireTenant(tenantId: string | null | undefined): string {
    if (!tenantId || tenantId === "all" || tenantId === "default") {
      throw new BadRequestException("Select a specific tenant to manage its WhatsApp connection.");
    }
    return tenantId;
  }

  /** The connection that belongs to exactly this tenant (full row incl. secrets: server-side use only). */
  async getConfig(tenantId: string): Promise<WhatsAppConfig | null> {
    return await WhatsAppConfig.findOne({ where: { tenant_id: this.requireTenant(tenantId), status: true } });
  }

  /** Inbound routing: which tenant owns this Meta phone_number_id? */
  async getConfigByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppConfig | null> {
    if (!phoneNumberId) return null;
    return await WhatsAppConfig.findOne({ where: { phone_number_id: phoneNumberId, status: true } });
  }

  /** Meta webhook handshake: the verify token identifies the tenant's own connection. */
  async getConfigByVerifyToken(token: string): Promise<WhatsAppConfig | null> {
    if (!token) return null;
    return await WhatsAppConfig.findOne({ where: { verify_token: token, status: true } });
  }

  /** Version of the config that is safe to send to the browser: secrets are never included. */
  toSafeConfig(config: WhatsAppConfig | null) {
    if (!config) return null;
    const token = config.access_token || "";
    return {
      id: config.id,
      tenant_id: config.tenant_id,
      phone_number: config.phone_number,
      phone_number_id: config.phone_number_id,
      waba_id: config.waba_id,
      verify_token: config.verify_token,
      provider: config.provider,
      api_url: config.api_url,
      is_connected: config.is_connected,
      has_access_token: !!token,
      access_token_hint: token ? `••••${token.slice(-4)}` : null,
      has_api_key: !!config.api_key,
      has_app_secret: !!config.app_secret,
    };
  }

  async getSafeConfig(tenantId: string) {
    return this.toSafeConfig(await this.getConfig(tenantId));
  }

  async saveConfig(data: WhatsAppConfigModel, userId: string | undefined, tenantId: string): Promise<WhatsAppConfig> {
    const tenant = this.requireTenant(tenantId); // from the JWT, NEVER from data.tenant_id

    let config = await WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
    const isNew = !config;
    if (!config) {
      config = new WhatsAppConfig();
      config.tenant_id = tenant;
      config.created_by_id = userId || undefined;
      config.created_on = new Date();
    }

    // A phone number can only be connected to one tenant (inbound routing must be unambiguous).
    if (data.phone_number_id) {
      const owner = await WhatsAppConfig.findOne({ where: { phone_number_id: data.phone_number_id } });
      if (owner && owner.tenant_id !== tenant) {
        throw new ConflictException("This WhatsApp phone number is already connected to another account.");
      }
    }

    const incomingToken = (data.access_token || "").trim();
    if (!incomingToken && (isNew || !config.access_token) && (data.provider || "meta_cloud") === "meta_cloud") {
      throw new BadRequestException("Meta Access Token is required.");
    }

    config.phone_number = data.phone_number;
    config.phone_number_id = data.phone_number_id;
    config.waba_id = data.waba_id || null;
    if (incomingToken) config.access_token = incomingToken; // blank => keep the stored token
    config.verify_token = data.verify_token || config.verify_token || randomBytes(16).toString("hex");
    config.provider = data.provider || config.provider || "meta_cloud";
    config.api_url = data.api_url || null;
    if (data.api_key) config.api_key = data.api_key;
    if (data.app_secret) config.app_secret = data.app_secret.trim();
    config.is_connected = data.is_connected ?? true;
    config.updated_by_id = userId || undefined;
    config.updated_on = new Date();
    return await config.save();
  }

  async testConnection(data: WhatsAppConfigModel, userId: string | undefined, tenantId: string) {
    const tenant = this.requireTenant(tenantId);
    const provider = data.provider || "meta_cloud";

    if (provider === "meta_cloud") {
      const existing = await WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
      const token = (data.access_token || "").trim() || existing?.access_token || "";
      if (!data.phone_number_id || !token) {
        throw new BadRequestException("Phone Number ID and Access Token are required to test Meta connection.");
      }

      // Keep what the user typed (blank token = keep the stored one) so a Failed result can be seen and fixed later.
      // Ownership conflicts (number already used by another account) are raised here, before anything is recorded.
      await this.saveConfig({ ...data, access_token: token, is_connected: false }, userId, tenant);

      try {
        const res = await axios.get(
          `${this.apiUrl}/${encodeURIComponent(data.phone_number_id)}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
          { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
        );
        const saved = await WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
        if (saved) {
          saved.is_connected = true; // legacy flag mirrors the verified result
          await saved.save();
        }
        const shown = res.data?.display_phone_number || data.phone_number;
        await markConnected(tenant, "whatsapp", shown);

        return {
          connected: true,
          provider: "meta_cloud",
          display_phone_number: res.data?.display_phone_number,
          verified_name: res.data?.verified_name,
          quality_rating: res.data?.quality_rating,
          code_verification_status: res.data?.code_verification_status,
          message: `Live Meta WhatsApp Cloud connected! Display: ${shown}`,
        };
      } catch (err: any) {
        this.logger.error(`Meta test handshake failed: ${redactSecrets(err?.response?.data || err.message)}`);
        const c = classifyError("whatsapp", err);
        const text = c?.message || `WhatsApp could not verify this connection: ${redactSecrets(err?.response?.data?.error?.message || err.message)}`;
        const saved = await WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
        if (saved && saved.is_connected) {
          saved.is_connected = false;
          await saved.save().catch(() => undefined);
        }
        if (c?.status === "degraded") await markDegraded(tenant, "whatsapp", c.code, text, data.phone_number);
        else await markFailed(tenant, "whatsapp", c?.code || "META_ERROR", text, data.phone_number);
        throw new BadRequestException(text);
      }
    } else if (provider === "qr_gateway") {
      await this.saveConfig({ ...data, is_connected: true }, userId, tenant);
      await markConnected(tenant, "whatsapp", data.phone_number);
      return {
        connected: true,
        provider: "qr_gateway",
        session_id: `sess_${Date.now()}`,
        status: "authenticated",
        message: "QR Web Gateway session saved!",
      };
    } else {
      if (data.api_url) {
        try {
          await axios.get(data.api_url, {
            headers: data.api_key ? { Authorization: `Bearer ${data.api_key}` } : {},
            timeout: 10000,
          });
        } catch {
          // If ping is not GET-able, still accept if URL formatted
        }
      }
      await this.saveConfig({ ...data, is_connected: true }, userId, tenant);
      await markConnected(tenant, "whatsapp", data.phone_number);
      return {
        connected: true,
        provider: provider,
        message: "Custom WhatsApp Gateway configured and saved successfully!",
      };
    }
  }

  /**
   * Disconnects the tenant's WhatsApp: the access token, app secret and API key are ERASED (so nothing can be
   * sent, by a user or by an automation), both statuses become not_configured. The phone number and webhook verify
   * token are kept so reconnecting only needs a new token.
   */
  async disconnect(tenantId: string, userId?: string) {
    const tenant = this.requireTenant(tenantId);
    const config = await WhatsAppConfig.findOne({ where: { tenant_id: tenant } });
    if (!config) throw new NotFoundException("No WhatsApp connection found.");
    config.access_token = "";
    config.app_secret = null as any;
    config.api_key = null as any;
    config.is_connected = false;
    config.updated_by_id = userId || undefined;
    config.updated_on = new Date();
    await config.save();
    await markNotConfigured(tenant, "whatsapp");
    await markNotConfigured(tenant, "whatsapp_webhook");
    return this.toSafeConfig(config);
  }

  /** Sends using ONLY the given tenant's own credentials. */
  async sendMessage(dto: SendWhatsAppMessageModel, userId: string | undefined, isAiGenerated: boolean = false, tenantId?: string) {
    const config = await this.getConfig(this.requireTenant(tenantId));
    if (!config || !config.access_token || !config.phone_number_id) {
      throw new BadRequestException("WhatsApp configuration missing. Please configure credentials first.");
    }

    const cleanPhone = dto.to.replace(/\D/g, "");
    const url = `${this.apiUrl}/${config.phone_number_id}/messages`;

    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
    };

    if (dto.message_type === "template" && dto.template_name) {
      payload.type = "template";
      payload.template = {
        name: dto.template_name,
        language: { code: "en_US" },
      };
    } else {
      payload.type = "text";
      payload.text = { preview_url: false, body: dto.text };
    }

    let metaResponse: any = null;
    let metaMessageId: string | undefined;
    let deliveryStatus = "sent";

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });
      metaResponse = response.data;
      metaMessageId = metaResponse?.messages?.[0]?.id;
    } catch (error: any) {
      this.logger.error(`Meta Graph API error: ${redactSecrets(error?.response?.data || error.message)}`);
      deliveryStatus = "failed";
      const metaErr = error?.response?.data?.error;
      // Real send result -> status: Meta 190 / auth => Failed (with the reason), timeout / 5xx / rate limit => Degraded.
      const noted = await noteFailure(config.tenant_id, "whatsapp", error, config.phone_number);
      if (metaErr?.code === 190) {
        throw new BadRequestException("Meta Access Token has expired or is invalid (Error 190). Please reconnect WhatsApp with a new token.");
      }
      throw new BadRequestException(noted?.error_message || redactSecrets(metaErr?.message || error?.message || "Unknown Meta Graph error"));
    }
    // Meta must hand back a message id. Without one we cannot know the message was accepted, so it is a FAILURE
    // (a made-up "mock_" id is allowed only when NODE_ENV=test).
    if (!metaMessageId) {
      if (process.env.NODE_ENV === "test") {
        metaMessageId = `mock_${Date.now()}`;
      } else {
        this.logger.error(`Meta returned no message id for tenant ${config.tenant_id}; treating the send as failed`);
        throw new BadRequestException("WhatsApp did not confirm the message (no message id returned by Meta). It was not recorded as sent.");
      }
    }
    // A real send worked: (re)confirm Connected (cheap: only writes when it was Failed/Degraded/unknown).
    void noteSuccess(config.tenant_id, "whatsapp", config.phone_number);

    // 1. Get or create conversation thread (scoped to this tenant)
    let conversation = await WhatsAppConversation.findOne({
      where: { customer_phone: cleanPhone, tenant_id: config.tenant_id },
    });
    if (!conversation) {
      conversation = new WhatsAppConversation();
      conversation.tenant_id = config.tenant_id;
      conversation.customer_phone = cleanPhone;
      conversation.customer_name = cleanPhone;
      conversation.conversation_status = "open";
      conversation.created_by_id = userId || undefined;
      conversation.created_on = new Date();
    }
    conversation.last_message_text = dto.text;
    conversation.last_message_at = new Date();
    conversation.updated_on = new Date();
    await conversation.save();

    // 2. Save outbound message
    const msg = new WhatsAppMessage();
    msg.conversation_id = conversation.id;
    msg.tenant_id = config.tenant_id;
    msg.sender_phone = config.phone_number;
    msg.recipient_phone = cleanPhone;
    msg.direction = "outbound";
    msg.message_type = dto.message_type || "text";
    msg.message_text = dto.text;
    msg.template_name = dto.template_name || null;
    msg.meta_message_id = metaMessageId;
    msg.delivery_status = deliveryStatus;
    msg.is_ai_generated = isAiGenerated;
    msg.created_by_id = userId || undefined;
    msg.created_on = new Date();
    await msg.save();

    return {
      message: msg,
      metaResponse,
    };
  }

  /** `tenantId === null` is a Super Admin "all tenants" view; everyone else is pinned to their tenant. */
  async getConversations(tenantId: string | null) {
    const qb = WhatsAppConversation.createQueryBuilder("c").where("c.status = true");
    if (tenantId) qb.andWhere("c.tenant_id = :tenantId", { tenantId });
    return await qb.orderBy("c.last_message_at", "DESC", "NULLS LAST").getMany();
  }

  async setConversationStatus(id: string, conversationStatus: string, tenantId: string | null) {
    const conv = await WhatsAppConversation.findOne({
      where: tenantId ? { id, tenant_id: tenantId } : { id },
    });
    if (!conv) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    conv.conversation_status = conversationStatus;
    conv.updated_on = new Date();
    return await conv.save();
  }

  async getMessagesByConversation(conversationId: string, tenantId: string | null) {
    return await WhatsAppMessage.find({
      where: tenantId ? { conversation_id: conversationId, tenant_id: tenantId } : { conversation_id: conversationId },
      order: { created_on: "ASC" },
    });
  }
}
