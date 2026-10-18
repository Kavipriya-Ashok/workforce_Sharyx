import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import axios from "axios";
import { WhatsAppTemplate } from "@Database/Table/WhatsApp/WhatsAppTemplate.entity";
import { WhatsAppConfig } from "@Database/Table/WhatsApp/WhatsAppConfig.entity";

@Injectable()
export class WhatsAppTemplateService {
  private readonly logger = new Logger(WhatsAppTemplateService.name);
  private readonly graphApiVersion = "v18.0";

  async getTemplates(tenantId: string = "default"): Promise<WhatsAppTemplate[]> {
    return await WhatsAppTemplate.find({
      where: { tenant_id: tenantId, status: true },
      order: { created_on: "DESC" },
    });
  }

  async createTemplate(data: Partial<WhatsAppTemplate>, tenantId: string = "default"): Promise<WhatsAppTemplate> {
    const sanitizedName = (data.name || "template")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    let sanitizedBody = (data.body_text || "Hello {{1}}").trim();

    // Replace known named placeholders or re-index into sequential {{1}}, {{2}}, etc.
    sanitizedBody = sanitizedBody.replace(/\{\{company\}\}/gi, "Sharyx AI");
    let varIndex = 1;
    sanitizedBody = sanitizedBody.replace(/\{\{[^}]+\}\}/g, () => `{{${varIndex++}}}`);

    // Meta Rule: Trailing variable fix (cannot end with a variable)
    if (/\{\{\d+\}\}[.!?\s]*$/.test(sanitizedBody)) {
      sanitizedBody = sanitizedBody.replace(/[.!?\s]*$/, "") + ". Thank you.";
    }

    // 1. Save in local database
    let tpl = await WhatsAppTemplate.findOne({
      where: { name: sanitizedName, tenant_id: tenantId, status: true },
    });

    if (!tpl) {
      tpl = new WhatsAppTemplate();
      tpl.tenant_id = tenantId;
      tpl.name = sanitizedName;
      tpl.created_by_id = "system";
      tpl.created_on = new Date();
    }

    tpl.category = data.category || "UTILITY";
    tpl.language = data.language || "en_US";
    tpl.header_text = data.header_text || null;
    tpl.body_text = sanitizedBody;
    tpl.footer_text = data.footer_text || null;
    tpl.buttons = data.buttons || null;
    tpl.approval_status = data.approval_status || "APPROVED";
    tpl.is_active = true;
    tpl.updated_on = new Date();

    const saved = await tpl.save();

    // 2. Dispatch registration to Meta Graph API
    const config = await WhatsAppConfig.findOne({
      where: { tenant_id: tenantId, status: true },
    });

    if (config?.access_token && config?.waba_id) {
      try {
        const bodyComp: any = { type: "BODY", text: sanitizedBody };
        const matches = sanitizedBody.match(/\{\{\d+\}\}/g);
        if (matches && matches.length > 0) {
          bodyComp.example = {
            body_text: [matches.map((_, i) => `Sample${i + 1}`)],
          };
        }

        const components: any[] = [bodyComp];
        if (data.header_text) {
          components.unshift({
            type: "HEADER",
            format: "TEXT",
            text: data.header_text,
          });
        }
        if (data.footer_text) {
          components.push({
            type: "FOOTER",
            text: data.footer_text,
          });
        }

        const metaRes = await axios.post(
          `https://graph.facebook.com/${this.graphApiVersion}/${config.waba_id}/message_templates`,
          {
            name: sanitizedName,
            category: data.category || "UTILITY",
            language: data.language || "en_US",
            components,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.access_token}`,
            },
            timeout: 10000,
          }
        );

        if (metaRes.data?.status) {
          saved.approval_status = metaRes.data.status;
          await saved.save();
          this.logger.log(`Template "${sanitizedName}" registered on Meta: ${metaRes.data.status}`);
        } else if (metaRes.data?.id) {
          saved.approval_status = "APPROVED";
          await saved.save();
        }
      } catch (err: any) {
        const errorDetail =
          err?.response?.data?.error?.error_user_msg ||
          err?.response?.data?.error?.error_user_title ||
          err?.response?.data?.error?.message ||
          err.message;
        this.logger.error(
          `Failed to register template on Meta: ${errorDetail}`
        );
      }
    }

    return saved;
  }

  async syncMetaTemplates(tenantId: string = "default"): Promise<WhatsAppTemplate[]> {
    const config = await WhatsAppConfig.findOne({
      where: { tenant_id: tenantId, status: true },
    });

    if (!config?.access_token || !config?.waba_id) {
      return await this.getTemplates(tenantId);
    }

    try {
      const res = await axios.get(
        `https://graph.facebook.com/${this.graphApiVersion}/${config.waba_id}/message_templates?limit=100`,
        {
          headers: { Authorization: `Bearer ${config.access_token}` },
          timeout: 15000,
        }
      );

      const metaTemplates: any[] = res.data?.data || [];
      for (const metaTpl of metaTemplates) {
        let existing = await WhatsAppTemplate.findOne({
          where: { tenant_id: tenantId, name: metaTpl.name },
        });

        const bodyComp = metaTpl.components?.find((c: any) => c.type === "BODY");
        const headerComp = metaTpl.components?.find((c: any) => c.type === "HEADER");
        const footerComp = metaTpl.components?.find((c: any) => c.type === "FOOTER");

        if (!existing) {
          existing = new WhatsAppTemplate();
          existing.tenant_id = tenantId;
          existing.name = metaTpl.name;
          existing.created_by_id = "meta_sync";
          existing.created_on = new Date();
        }

        existing.category = metaTpl.category || "UTILITY";
        existing.language = metaTpl.language || "en_US";
        existing.body_text = bodyComp?.text || metaTpl.name;
        existing.header_text = headerComp?.text || null;
        existing.footer_text = footerComp?.text || null;
        existing.approval_status = metaTpl.status || "APPROVED";
        existing.is_active = metaTpl.status === "APPROVED";
        existing.updated_on = new Date();
        await existing.save();
      }

      this.logger.log(`Synced ${metaTemplates.length} templates from Meta WABA account.`);
    } catch (err: any) {
      this.logger.error(
        `Error syncing templates from Meta: ${
          err?.response?.data?.error?.message || err.message
        }`
      );
    }

    return await this.getTemplates(tenantId);
  }

  async updateTemplate(id: string, data: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate> {
    const tpl = await WhatsAppTemplate.findOne({ where: { id, status: true } });
    if (!tpl) throw new NotFoundException("Template not found");

    if (data.name) {
      tpl.name = data.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    }
    if (data.category) tpl.category = data.category;
    if (data.language) tpl.language = data.language;
    if (data.header_text !== undefined) tpl.header_text = data.header_text;
    if (data.body_text !== undefined) tpl.body_text = data.body_text;
    if (data.footer_text !== undefined) tpl.footer_text = data.footer_text;
    if (data.buttons !== undefined) tpl.buttons = data.buttons;
    if (data.is_active !== undefined) tpl.is_active = data.is_active;
    tpl.updated_on = new Date();

    return await tpl.save();
  }

  async deleteTemplate(id: string, tenantId: string = "default"): Promise<boolean> {
    const tpl = await WhatsAppTemplate.findOne({ where: { id } });
    if (!tpl) throw new NotFoundException("Template not found");

    const templateName = tpl.name;
    tpl.status = false;
    await tpl.save();

    const config = await WhatsAppConfig.findOne({
      where: { tenant_id: tenantId, status: true },
    });
    if (config?.access_token && config?.waba_id) {
      try {
        await axios.delete(
          `https://graph.facebook.com/${this.graphApiVersion}/${config.waba_id}/message_templates?name=${templateName}`,
          {
            headers: { Authorization: `Bearer ${config.access_token}` },
            timeout: 10000,
          }
        );
        this.logger.log(`Template "${templateName}" deleted from Meta.`);
      } catch (err: any) {
        this.logger.warn(
          `Could not delete "${templateName}" from Meta: ${
            err?.response?.data?.error?.message || err.message
          }`
        );
      }
    }

    return true;
  }

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    parameters: string[] = [],
    tenantId: string = "default"
  ) {
    const config = await WhatsAppConfig.findOne({
      where: { tenant_id: tenantId, status: true },
    });

    if (!config?.access_token || !config?.phone_number_id) {
      throw new Error("Meta credentials not configured");
    }

    const cleanPhone = phone.replace(/\D/g, "");

    const payload: any = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: parameters.map((p) => ({ type: "text", text: p })),
          },
        ],
      },
    };

    const res = await axios.post(
      `https://graph.facebook.com/${this.graphApiVersion}/${config.phone_number_id}/messages`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.access_token}`,
        },
        timeout: 10000,
      }
    );

    return res.data;
  }
}
