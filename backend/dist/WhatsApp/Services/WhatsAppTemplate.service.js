"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WhatsAppTemplateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppTemplateService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const WhatsAppTemplate_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppTemplate.entity");
const WhatsAppConfig_entity_1 = require("../../Database/Table/WhatsApp/WhatsAppConfig.entity");
let WhatsAppTemplateService = WhatsAppTemplateService_1 = class WhatsAppTemplateService {
    constructor() {
        this.logger = new common_1.Logger(WhatsAppTemplateService_1.name);
        this.graphApiVersion = "v18.0";
    }
    async getTemplates(tenantId = "default") {
        return await WhatsAppTemplate_entity_1.WhatsAppTemplate.find({
            where: { tenant_id: tenantId, status: true },
            order: { created_on: "DESC" },
        });
    }
    async createTemplate(data, tenantId = "default") {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const sanitizedName = (data.name || "template")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
        let sanitizedBody = (data.body_text || "Hello {{1}}").trim();
        sanitizedBody = sanitizedBody.replace(/\{\{company\}\}/gi, "Sharyx AI");
        let varIndex = 1;
        sanitizedBody = sanitizedBody.replace(/\{\{[^}]+\}\}/g, () => `{{${varIndex++}}}`);
        if (/\{\{\d+\}\}[.!?\s]*$/.test(sanitizedBody)) {
            sanitizedBody = sanitizedBody.replace(/[.!?\s]*$/, "") + ". Thank you.";
        }
        let tpl = await WhatsAppTemplate_entity_1.WhatsAppTemplate.findOne({
            where: { name: sanitizedName, tenant_id: tenantId, status: true },
        });
        if (!tpl) {
            tpl = new WhatsAppTemplate_entity_1.WhatsAppTemplate();
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
        const config = await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({
            where: { tenant_id: tenantId, status: true },
        });
        if ((config === null || config === void 0 ? void 0 : config.access_token) && (config === null || config === void 0 ? void 0 : config.waba_id)) {
            try {
                const bodyComp = { type: "BODY", text: sanitizedBody };
                const matches = sanitizedBody.match(/\{\{\d+\}\}/g);
                if (matches && matches.length > 0) {
                    bodyComp.example = {
                        body_text: [matches.map((_, i) => `Sample${i + 1}`)],
                    };
                }
                const components = [bodyComp];
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
                const metaRes = await axios_1.default.post(`https://graph.facebook.com/${this.graphApiVersion}/${config.waba_id}/message_templates`, {
                    name: sanitizedName,
                    category: data.category || "UTILITY",
                    language: data.language || "en_US",
                    components,
                }, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${config.access_token}`,
                    },
                    timeout: 10000,
                });
                if ((_a = metaRes.data) === null || _a === void 0 ? void 0 : _a.status) {
                    saved.approval_status = metaRes.data.status;
                    await saved.save();
                    this.logger.log(`Template "${sanitizedName}" registered on Meta: ${metaRes.data.status}`);
                }
                else if ((_b = metaRes.data) === null || _b === void 0 ? void 0 : _b.id) {
                    saved.approval_status = "APPROVED";
                    await saved.save();
                }
            }
            catch (err) {
                const errorDetail = ((_e = (_d = (_c = err === null || err === void 0 ? void 0 : err.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) === null || _e === void 0 ? void 0 : _e.error_user_msg) ||
                    ((_h = (_g = (_f = err === null || err === void 0 ? void 0 : err.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.error) === null || _h === void 0 ? void 0 : _h.error_user_title) ||
                    ((_l = (_k = (_j = err === null || err === void 0 ? void 0 : err.response) === null || _j === void 0 ? void 0 : _j.data) === null || _k === void 0 ? void 0 : _k.error) === null || _l === void 0 ? void 0 : _l.message) ||
                    err.message;
                this.logger.error(`Failed to register template on Meta: ${errorDetail}`);
            }
        }
        return saved;
    }
    async syncMetaTemplates(tenantId = "default") {
        var _a, _b, _c, _d, _e, _f, _g;
        const config = await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({
            where: { tenant_id: tenantId, status: true },
        });
        if (!(config === null || config === void 0 ? void 0 : config.access_token) || !(config === null || config === void 0 ? void 0 : config.waba_id)) {
            return await this.getTemplates(tenantId);
        }
        try {
            const res = await axios_1.default.get(`https://graph.facebook.com/${this.graphApiVersion}/${config.waba_id}/message_templates?limit=100`, {
                headers: { Authorization: `Bearer ${config.access_token}` },
                timeout: 15000,
            });
            const metaTemplates = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.data) || [];
            for (const metaTpl of metaTemplates) {
                let existing = await WhatsAppTemplate_entity_1.WhatsAppTemplate.findOne({
                    where: { tenant_id: tenantId, name: metaTpl.name },
                });
                const bodyComp = (_b = metaTpl.components) === null || _b === void 0 ? void 0 : _b.find((c) => c.type === "BODY");
                const headerComp = (_c = metaTpl.components) === null || _c === void 0 ? void 0 : _c.find((c) => c.type === "HEADER");
                const footerComp = (_d = metaTpl.components) === null || _d === void 0 ? void 0 : _d.find((c) => c.type === "FOOTER");
                if (!existing) {
                    existing = new WhatsAppTemplate_entity_1.WhatsAppTemplate();
                    existing.tenant_id = tenantId;
                    existing.name = metaTpl.name;
                    existing.created_by_id = "meta_sync";
                    existing.created_on = new Date();
                }
                existing.category = metaTpl.category || "UTILITY";
                existing.language = metaTpl.language || "en_US";
                existing.body_text = (bodyComp === null || bodyComp === void 0 ? void 0 : bodyComp.text) || metaTpl.name;
                existing.header_text = (headerComp === null || headerComp === void 0 ? void 0 : headerComp.text) || null;
                existing.footer_text = (footerComp === null || footerComp === void 0 ? void 0 : footerComp.text) || null;
                existing.approval_status = metaTpl.status || "APPROVED";
                existing.is_active = metaTpl.status === "APPROVED";
                existing.updated_on = new Date();
                await existing.save();
            }
            this.logger.log(`Synced ${metaTemplates.length} templates from Meta WABA account.`);
        }
        catch (err) {
            this.logger.error(`Error syncing templates from Meta: ${((_g = (_f = (_e = err === null || err === void 0 ? void 0 : err.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.error) === null || _g === void 0 ? void 0 : _g.message) || err.message}`);
        }
        return await this.getTemplates(tenantId);
    }
    async updateTemplate(id, data) {
        const tpl = await WhatsAppTemplate_entity_1.WhatsAppTemplate.findOne({ where: { id, status: true } });
        if (!tpl)
            throw new common_1.NotFoundException("Template not found");
        if (data.name) {
            tpl.name = data.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        }
        if (data.category)
            tpl.category = data.category;
        if (data.language)
            tpl.language = data.language;
        if (data.header_text !== undefined)
            tpl.header_text = data.header_text;
        if (data.body_text !== undefined)
            tpl.body_text = data.body_text;
        if (data.footer_text !== undefined)
            tpl.footer_text = data.footer_text;
        if (data.buttons !== undefined)
            tpl.buttons = data.buttons;
        if (data.is_active !== undefined)
            tpl.is_active = data.is_active;
        tpl.updated_on = new Date();
        return await tpl.save();
    }
    async deleteTemplate(id, tenantId = "default") {
        var _a, _b, _c;
        const tpl = await WhatsAppTemplate_entity_1.WhatsAppTemplate.findOne({ where: { id } });
        if (!tpl)
            throw new common_1.NotFoundException("Template not found");
        const templateName = tpl.name;
        tpl.status = false;
        await tpl.save();
        const config = await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({
            where: { tenant_id: tenantId, status: true },
        });
        if ((config === null || config === void 0 ? void 0 : config.access_token) && (config === null || config === void 0 ? void 0 : config.waba_id)) {
            try {
                await axios_1.default.delete(`https://graph.facebook.com/${this.graphApiVersion}/${config.waba_id}/message_templates?name=${templateName}`, {
                    headers: { Authorization: `Bearer ${config.access_token}` },
                    timeout: 10000,
                });
                this.logger.log(`Template "${templateName}" deleted from Meta.`);
            }
            catch (err) {
                this.logger.warn(`Could not delete "${templateName}" from Meta: ${((_c = (_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) || err.message}`);
            }
        }
        return true;
    }
    async sendTemplateMessage(phone, templateName, parameters = [], tenantId = "default") {
        const config = await WhatsAppConfig_entity_1.WhatsAppConfig.findOne({
            where: { tenant_id: tenantId, status: true },
        });
        if (!(config === null || config === void 0 ? void 0 : config.access_token) || !(config === null || config === void 0 ? void 0 : config.phone_number_id)) {
            throw new Error("Meta credentials not configured");
        }
        const cleanPhone = phone.replace(/\D/g, "");
        const payload = {
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
        const res = await axios_1.default.post(`https://graph.facebook.com/${this.graphApiVersion}/${config.phone_number_id}/messages`, payload, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.access_token}`,
            },
            timeout: 10000,
        });
        return res.data;
    }
};
exports.WhatsAppTemplateService = WhatsAppTemplateService;
exports.WhatsAppTemplateService = WhatsAppTemplateService = WhatsAppTemplateService_1 = __decorate([
    (0, common_1.Injectable)()
], WhatsAppTemplateService);
//# sourceMappingURL=WhatsAppTemplate.service.js.map