import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { EmailAccountConfig } from "@Database/Table/Email/EmailAccountConfig.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly encryptionService: EncryptionService) {}

  async getConfig(tenantId: string = "default"): Promise<EmailAccountConfig | null> {
    return await EmailAccountConfig.findOne({ where: { tenant_id: tenantId, is_active: true } });
  }

  async saveConfig(data: EmailAccountConfigModel, userId?: string): Promise<EmailAccountConfig> {
    let config = await EmailAccountConfig.findOne({ where: { tenant_id: data.tenant_id || "default" } });
    if (!config) {
      config = new EmailAccountConfig();
      config.tenant_id = data.tenant_id || "default";
      config.created_by_id = userId || "system";
      config.created_on = new Date();
    }
    config.email_address = data.email_address;
    config.smtp_host = data.smtp_host;
    config.smtp_port = data.smtp_port || 587;
    config.smtp_user = data.smtp_user;
    config.smtp_password = this.encryptionService.Encrypt(data.smtp_password);
    config.imap_host = data.imap_host || null;
    config.imap_port = data.imap_port || 993;
    config.use_ssl = data.use_ssl ?? true;
    config.is_active = data.is_active ?? true;
    config.updated_by_id = userId || "system";
    config.updated_on = new Date();
    return await config.save();
  }

  async sendEmail(dto: SendEmailModel, userId?: string, isAiDrafted: boolean = false) {
    const config = await this.getConfig();
    if (!config) {
      throw new Error("No active email configuration found. Please setup SMTP settings.");
    }

    let decryptedPassword = config.smtp_password;
    try {
      decryptedPassword = this.encryptionService.Decrypt(config.smtp_password);
    } catch {
      // Fallback if password was stored in plain text
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465,
      auth: {
        user: config.smtp_user,
        pass: decryptedPassword,
      },
    });

    let messageId = `msg_${Date.now()}`;
    let deliveryStatus = "sent";

    try {
      const info = await transporter.sendMail({
        from: `"${config.email_address}" <${config.smtp_user}>`,
        to: dto.to,
        subject: dto.subject,
        html: dto.html,
      });
      messageId = info.messageId || messageId;
    } catch (err: any) {
      this.logger.error("Failed to send email via SMTP:", err.message);
      deliveryStatus = "failed";
      throw new Error(`Email sending failed: ${err.message}`);
    }

    // Save outbound email log
    const log = new EmailLog();
    log.tenant_id = config.tenant_id;
    log.lead_id = dto.lead_id || null;
    log.from_email = config.email_address;
    log.to_email = dto.to;
    log.subject = dto.subject;
    log.body_html = dto.html;
    log.direction = "outbound";
    log.delivery_status = deliveryStatus;
    log.is_ai_drafted = isAiDrafted;
    log.message_id = messageId;
    log.created_by_id = userId || "system";
    log.created_on = new Date();
    await log.save();

    return log;
  }

  async getInboxLogs(tenantId: string = "default") {
    return await EmailLog.find({
      where: { tenant_id: tenantId, status: true },
      order: { created_on: "DESC" },
      take: 100,
    });
  }

  async getThread(leadIdOrEmail: string) {
    return await EmailLog.find({
      where: [
        { to_email: leadIdOrEmail },
        { from_email: leadIdOrEmail },
      ],
      order: { created_on: "ASC" },
    });
  }
}
