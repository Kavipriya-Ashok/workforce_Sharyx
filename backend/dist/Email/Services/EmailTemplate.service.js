"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EmailTemplateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateService = void 0;
const common_1 = require("@nestjs/common");
const EmailTemplate_entity_1 = require("../../Database/Table/Email/EmailTemplate.entity");
const DEFAULT_TEMPLATES = [
    {
        name: "Demo Invite",
        category: "Sales",
        subject: "{{lead_name}}, Let's schedule your personalised Sharyx demo 🚀",
        body_html: `<p>Hi <strong>{{lead_name}}</strong>,</p>
<p>Thank you for your interest in <strong>Sharyx AI CRM</strong>!</p>
<p>I'd love to give you a personalised walkthrough of how Sharyx can transform your sales pipeline with AI-powered automations.</p>
<p>👉 <a href="{{meeting_url}}">Book your 20-min live demo here</a></p>
<p>During the demo, we'll cover:</p>
<ul>
  <li>✅ WhatsApp + Email AI auto-reply</li>
  <li>✅ Lead qualification & pipeline automation</li>
  <li>✅ Campaign management at scale</li>
</ul>
<p>Looking forward to connecting!<br/>Best regards,<br/><strong>{{sender_name}}</strong><br/>Sharyx AI</p>`,
        preview_text: "Book your personalised Sharyx demo in 2 minutes",
        variables: ["lead_name", "meeting_url", "sender_name"],
    },
    {
        name: "Pricing Response",
        category: "Sales",
        subject: "Re: Pricing for {{company}} — Sharyx Enterprise Plans",
        body_html: `<p>Hi <strong>{{lead_name}}</strong>,</p>
<p>Great to hear from you! Here's a quick breakdown of Sharyx pricing tailored for <strong>{{company}}</strong>:</p>
<table style="border-collapse:collapse;width:100%">
  <tr style="background:#f0f4ff"><th style="padding:8px;border:1px solid #ddd">Plan</th><th style="padding:8px;border:1px solid #ddd">Users</th><th style="padding:8px;border:1px solid #ddd">Price</th></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Starter</td><td style="padding:8px;border:1px solid #ddd">Up to 5</td><td style="padding:8px;border:1px solid #ddd">₹4,999/mo</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Growth</td><td style="padding:8px;border:1px solid #ddd">Up to 25</td><td style="padding:8px;border:1px solid #ddd">₹14,999/mo</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Enterprise</td><td style="padding:8px;border:1px solid #ddd">Unlimited</td><td style="padding:8px;border:1px solid #ddd">Custom</td></tr>
</table>
<p>Custom enterprise pricing is available for teams of <strong>50+</strong>. Reply here or <a href="{{meeting_url}}">book a 15-min call</a> and we'll prepare a tailored proposal.</p>
<p>Best,<br/><strong>{{sender_name}}</strong><br/>Sharyx AI</p>`,
        preview_text: "Sharyx pricing breakdown tailored for your team",
        variables: ["lead_name", "company", "meeting_url", "sender_name"],
    },
    {
        name: "Candidate Screening",
        category: "Recruitment",
        subject: "Your Application at Sharyx — Next Steps 📋",
        body_html: `<p>Hi <strong>{{lead_name}}</strong>,</p>
<p>Thank you for applying for the <strong>{{job_title}}</strong> role at Sharyx!</p>
<p>We've reviewed your profile and would love to learn more about you. Could you please share the following details?</p>
<ol>
  <li>Total years of experience & relevant experience in {{job_title}}</li>
  <li>Current employment status (working / serving notice / relieved)</li>
  <li>Notice period / expected joining date</li>
  <li>Expected CTC (Cost to Company)</li>
</ol>
<p>Once we receive these details, our hiring team will schedule the next round.</p>
<p>Looking forward to hearing from you!<br/>Best,<br/><strong>{{sender_name}}</strong><br/>Sharyx Talent Team</p>`,
        preview_text: "Quick questions to move your application forward",
        variables: ["lead_name", "job_title", "sender_name"],
    },
    {
        name: "Interview Invite",
        category: "Recruitment",
        subject: "Interview Invitation — {{job_title}} at Sharyx 🗓️",
        body_html: `<p>Dear <strong>{{lead_name}}</strong>,</p>
<p>Congratulations! We'd like to invite you for an interview for the <strong>{{job_title}}</strong> position.</p>
<p><strong>📅 Interview Details:</strong></p>
<ul>
  <li><strong>Date & Time:</strong> {{interview_date}}</li>
  <li><strong>Format:</strong> Google Meet (Video Call)</li>
  <li><strong>Meeting Link:</strong> <a href="{{meeting_url}}">Join Here</a></li>
  <li><strong>Duration:</strong> ~30–45 minutes</li>
</ul>
<p>Please confirm your availability by replying to this email.</p>
<p>Best of luck!<br/><strong>{{sender_name}}</strong><br/>Sharyx Talent Team</p>`,
        preview_text: "You're invited! Interview details inside.",
        variables: ["lead_name", "job_title", "interview_date", "meeting_url", "sender_name"],
    },
    {
        name: "Onboarding Welcome",
        category: "Onboarding",
        subject: "Welcome to Sharyx, {{lead_name}}! Let's get you started 🎉",
        body_html: `<p>Hi <strong>{{lead_name}}</strong>,</p>
<p>Welcome aboard! We're thrilled to have <strong>{{company}}</strong> as part of the Sharyx family.</p>
<p>Here's your quick-start guide:</p>
<ol>
  <li>🔗 <a href="{{dashboard_url}}">Log in to your dashboard</a></li>
  <li>⚙️ Connect your WhatsApp Business & Email accounts</li>
  <li>🤖 Configure your AI Auto-Reply copilot</li>
  <li>📊 Import your leads and launch your first campaign</li>
</ol>
<p>Your dedicated onboarding specialist <strong>{{sender_name}}</strong> will reach out within 24 hours to walk you through the setup.</p>
<p>Questions? Just reply to this email — we're always here!</p>
<p>Cheers,<br/><strong>The Sharyx Team</strong></p>`,
        preview_text: "Your Sharyx account is ready. Let's get started!",
        variables: ["lead_name", "company", "dashboard_url", "sender_name"],
    },
    {
        name: "Follow-Up",
        category: "Follow-up",
        subject: "Following up — Any questions about Sharyx, {{lead_name}}?",
        body_html: `<p>Hi <strong>{{lead_name}}</strong>,</p>
<p>I wanted to quickly follow up on our previous conversation about <strong>Sharyx AI CRM</strong>.</p>
<p>Have you had a chance to evaluate whether it fits {{company}}'s requirements? I'd be happy to:</p>
<ul>
  <li>✅ Address any specific questions or concerns</li>
  <li>✅ Provide a customised ROI estimate</li>
  <li>✅ Arrange a quick 15-min call at your convenience</li>
</ul>
<p>👉 <a href="{{meeting_url}}">Schedule a quick call here</a></p>
<p>Looking forward to connecting!<br/>Best,<br/><strong>{{sender_name}}</strong><br/>Sharyx AI</p>`,
        preview_text: "Still thinking it over? Let's talk — no pressure.",
        variables: ["lead_name", "company", "meeting_url", "sender_name"],
    },
    {
        name: "Support Resolution",
        category: "Support",
        subject: "Your Sharyx support ticket #{{ticket_id}} has been resolved ✅",
        body_html: `<p>Hi <strong>{{lead_name}}</strong>,</p>
<p>Great news — your support ticket <strong>#{{ticket_id}}</strong> has been resolved!</p>
<p><strong>Issue:</strong> {{issue_summary}}</p>
<p><strong>Resolution:</strong> {{resolution_summary}}</p>
<p>If you have any further questions or the issue persists, please don't hesitate to reply to this email.</p>
<p>Your satisfaction is our top priority.</p>
<p>Warm regards,<br/><strong>{{sender_name}}</strong><br/>Sharyx Support Team</p>`,
        preview_text: "Issue resolved! Here's what we did.",
        variables: ["lead_name", "ticket_id", "issue_summary", "resolution_summary", "sender_name"],
    },
];
let EmailTemplateService = EmailTemplateService_1 = class EmailTemplateService {
    constructor() {
        this.logger = new common_1.Logger(EmailTemplateService_1.name);
    }
    async getTemplates(tenantId = "default") {
        const templates = await EmailTemplate_entity_1.EmailTemplate.find({
            where: { tenant_id: tenantId, status: true },
            order: { created_on: "DESC" },
        });
        if (templates.length === 0) {
            await this.seedDefaultTemplates(tenantId);
            return await EmailTemplate_entity_1.EmailTemplate.find({
                where: { tenant_id: tenantId, status: true },
                order: { created_on: "DESC" },
            });
        }
        return templates;
    }
    async seedDefaultTemplates(tenantId = "default") {
        for (const tpl of DEFAULT_TEMPLATES) {
            const existing = await EmailTemplate_entity_1.EmailTemplate.findOne({
                where: { tenant_id: tenantId, name: tpl.name },
            });
            if (!existing) {
                const t = new EmailTemplate_entity_1.EmailTemplate();
                t.tenant_id = tenantId;
                t.name = tpl.name;
                t.category = tpl.category;
                t.subject = tpl.subject;
                t.body_html = tpl.body_html;
                t.preview_text = tpl.preview_text;
                t.variables = tpl.variables;
                t.is_active = true;
                t.created_by_id = "system";
                t.created_on = new Date();
                await t.save();
            }
        }
        this.logger.log(`Seeded ${DEFAULT_TEMPLATES.length} default email templates for tenant: ${tenantId}`);
    }
    async createTemplate(data, tenantId = "default") {
        var _a;
        const existing = await EmailTemplate_entity_1.EmailTemplate.findOne({
            where: { name: data.name, tenant_id: tenantId, status: true },
        });
        const tpl = existing || new EmailTemplate_entity_1.EmailTemplate();
        if (!existing) {
            tpl.tenant_id = tenantId;
            tpl.created_by_id = "system";
            tpl.created_on = new Date();
        }
        tpl.name = data.name;
        tpl.category = data.category || "General";
        tpl.subject = data.subject;
        tpl.body_html = data.body_html;
        tpl.body_text = data.body_text || null;
        tpl.preview_text = data.preview_text || null;
        tpl.variables = data.variables || this.extractVariables(data.body_html || "");
        tpl.is_active = true;
        tpl.attach_pdf = (_a = data.attach_pdf) !== null && _a !== void 0 ? _a : false;
        tpl.pdf_template_type = data.pdf_template_type || null;
        tpl.pdf_title = data.pdf_title || null;
        tpl.updated_on = new Date();
        return await tpl.save();
    }
    async updateTemplate(id, data) {
        const tpl = await EmailTemplate_entity_1.EmailTemplate.findOne({ where: { id, status: true } });
        if (!tpl)
            throw new common_1.NotFoundException("Email template not found");
        if (data.name)
            tpl.name = data.name;
        if (data.category)
            tpl.category = data.category;
        if (data.subject)
            tpl.subject = data.subject;
        if (data.body_html !== undefined)
            tpl.body_html = data.body_html;
        if (data.body_text !== undefined)
            tpl.body_text = data.body_text;
        if (data.preview_text !== undefined)
            tpl.preview_text = data.preview_text;
        if (data.variables !== undefined) {
            tpl.variables = data.variables;
        }
        else {
            tpl.variables = this.extractVariables(tpl.body_html || "");
        }
        if (data.is_active !== undefined)
            tpl.is_active = data.is_active;
        if (data.attach_pdf !== undefined)
            tpl.attach_pdf = data.attach_pdf;
        if (data.pdf_template_type !== undefined)
            tpl.pdf_template_type = data.pdf_template_type || null;
        if (data.pdf_title !== undefined)
            tpl.pdf_title = data.pdf_title || null;
        tpl.updated_on = new Date();
        return await tpl.save();
    }
    async deleteTemplate(id) {
        const tpl = await EmailTemplate_entity_1.EmailTemplate.findOne({ where: { id } });
        if (!tpl)
            throw new common_1.NotFoundException("Email template not found");
        tpl.status = false;
        await tpl.save();
        return true;
    }
    async previewTemplate(id, variables) {
        const tpl = await EmailTemplate_entity_1.EmailTemplate.findOne({ where: { id, status: true } });
        if (!tpl)
            throw new common_1.NotFoundException("Email template not found");
        let subject = tpl.subject;
        let bodyHtml = tpl.body_html;
        let previewText = tpl.preview_text || "";
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
            subject = subject.replace(regex, value);
            bodyHtml = bodyHtml.replace(regex, value);
            previewText = previewText.replace(regex, value);
        }
        return { subject, body_html: bodyHtml, preview_text: previewText };
    }
    extractVariables(html) {
        const matches = html.match(/\{\{([^}]+)\}\}/g) || [];
        return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "").trim()))];
    }
};
exports.EmailTemplateService = EmailTemplateService;
exports.EmailTemplateService = EmailTemplateService = EmailTemplateService_1 = __decorate([
    (0, common_1.Injectable)()
], EmailTemplateService);
//# sourceMappingURL=EmailTemplate.service.js.map