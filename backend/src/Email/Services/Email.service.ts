import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { google } from "googleapis";
import { EmailAccountConfig } from "@Database/Table/Email/EmailAccountConfig.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailValidationService } from "./EmailValidation.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly validationService: EmailValidationService
  ) {}

  async validateEmail(email: string) {
    return await this.validationService.validateEmail(email);
  }

  private getOAuthClient(redirectUri?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const rUri = redirectUri || process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/oauth/callback";
    return new google.auth.OAuth2(clientId, clientSecret, rUri);
  }

  async getConfig(tenantId: string = "default"): Promise<EmailAccountConfig | null> {
    return await EmailAccountConfig.findOne({ where: { tenant_id: tenantId, is_active: true } });
  }

  // Generate Google OAuth consent URL
  getGoogleAuthUrl(customRedirectUri?: string) {
    const oauth2Client = this.getOAuthClient(customRedirectUri);
    const scopes = [
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline", // Essential to get refresh_token
      prompt: "consent",       // Forces consent prompt so Google always returns refresh_token
      scope: scopes,
    });

    return { url };
  }

  // Connect Google account from callback code
  async connectGoogleAccount(code: string, redirectUri?: string, userId?: string, tenantId: string = "default") {
    const oauth2Client = this.getOAuthClient(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user details from Google UserInfo
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email;
    const displayName = userInfo.data.name || userInfo.data.given_name || "Gmail User";

    if (!userEmail) {
      throw new Error("Unable to retrieve email address from Google profile.");
    }

    let config = await EmailAccountConfig.findOne({ where: { tenant_id: tenantId } });
    if (!config) {
      config = new EmailAccountConfig();
      config.tenant_id = tenantId;
      config.created_by_id = userId || "system";
      config.created_on = new Date();
    }

    config.provider = "google-email";
    config.email_address = userEmail;
    config.display_name = displayName;
    config.client_id = process.env.GOOGLE_CLIENT_ID || null;
    config.client_secret = process.env.GOOGLE_CLIENT_SECRET || null;
    if (tokens.refresh_token) {
      config.refresh_token = this.encryptionService.Encrypt(tokens.refresh_token);
    }
    if (tokens.access_token) {
      config.access_token = tokens.access_token;
    }
    if (tokens.expiry_date) {
      config.token_expires_at = new Date(tokens.expiry_date);
    }
    config.is_active = true;
    config.updated_by_id = userId || "system";
    config.updated_on = new Date();

    await config.save();
    return {
      success: true,
      email: userEmail,
      displayName,
      provider: "google-email",
      message: "Gmail connected successfully",
    };
  }

  // Disconnect Google Account
  async disconnectGoogleAccount(tenantId: string = "default", userId?: string) {
    const config = await EmailAccountConfig.findOne({ where: { tenant_id: tenantId } });
    if (!config) {
      return { success: true, message: "No active configuration found." };
    }

    config.provider = "smtp";
    config.refresh_token = null;
    config.access_token = null;
    config.token_expires_at = null;
    config.updated_by_id = userId || "system";
    config.updated_on = new Date();
    await config.save();

    return { success: true, message: "Google account disconnected successfully." };
  }

  // Get OAuth status
  async getOAuthStatus(tenantId: string = "default") {
    const config = await this.getConfig(tenantId);
    if (!config) {
      return { isConnected: false, provider: "none" };
    }

    const isGoogle = config.provider === "google-email";
    return {
      isConnected: isGoogle ? !!config.refresh_token : config.is_active,
      provider: config.provider || "smtp",
      email_address: config.email_address,
      display_name: config.display_name,
      token_expires_at: config.token_expires_at,
    };
  }

  // Save standard SMTP config
  async saveConfig(data: EmailAccountConfigModel, userId?: string): Promise<EmailAccountConfig> {
    let config = await EmailAccountConfig.findOne({ where: { tenant_id: data.tenant_id || "default" } });
    if (!config) {
      config = new EmailAccountConfig();
      config.tenant_id = data.tenant_id || "default";
      config.created_by_id = userId || "system";
      config.created_on = new Date();
    }
    config.provider = data.provider || "smtp";
    config.display_name = data.display_name || null;
    config.email_address = data.email_address;
    config.smtp_host = data.smtp_host || null;
    config.smtp_port = data.smtp_port || 587;
    config.smtp_user = data.smtp_user || null;
    if (data.smtp_password) {
      config.smtp_password = this.encryptionService.Encrypt(data.smtp_password);
    }
    config.imap_host = data.imap_host || null;
    config.imap_port = data.imap_port || 993;
    config.use_ssl = data.use_ssl ?? true;
    config.is_active = data.is_active ?? true;
    config.updated_by_id = userId || "system";
    config.updated_on = new Date();
    return await config.save();
  }

  // Dispatch Email via Google OAuth2 or SMTP
  async sendEmail(dto: SendEmailModel, userId?: string, isAiDrafted: boolean = false, tenantId: string = "default") {
    // Step 0: 5-Layer Email Validation Gatekeeper
    if (!dto.bypassValidation) {
      const val = await this.validationService.validateEmail(dto.to);
      if (!val.isValid) {
        throw new Error(
          `Email validation failed: ${val.reason} (Deliverability Score: ${val.score}%). Sending halted to protect your domain reputation. Route via WhatsApp instead.`
        );
      }
    }

    const config = await this.getConfig(tenantId);
    if (!config) {
      throw new Error("No active email configuration found. Please connect your Gmail or configure SMTP.");
    }

    let messageId = `msg_${Date.now()}`;
    let deliveryStatus = "sent";
    const senderDisplayName = config.display_name || config.email_address;

    try {
      if (config.provider === "google-email") {
        let decryptedRefreshToken = config.refresh_token;
        if (config.refresh_token) {
          try {
            decryptedRefreshToken = this.encryptionService.Decrypt(config.refresh_token);
          } catch {
            decryptedRefreshToken = config.refresh_token;
          }
        }

        if (!decryptedRefreshToken) {
          throw new Error("Google refresh token is missing. Please reconnect your Google account.");
        }

        const clientId = config.client_id || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = config.client_secret || process.env.GOOGLE_CLIENT_SECRET;

        try {
          // Method 1: Gmail REST API over HTTPS (port 443, immune to SMTP socket drops)
          const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
          oauth2Client.setCredentials({
            refresh_token: decryptedRefreshToken,
            access_token: config.access_token || undefined,
          });

          const gmail = google.gmail({ version: "v1", auth: oauth2Client });
          const utf8Subject = `=?utf-8?B?${Buffer.from(dto.subject).toString("base64")}?=`;
          const emailLines = [
            `From: "${senderDisplayName}" <${config.email_address}>`,
            `To: ${dto.to}`,
            "Content-Type: text/html; charset=utf-8",
            "MIME-Version: 1.0",
            `Subject: ${utf8Subject}`,
            "",
            dto.html,
          ];
          const rawEmail = Buffer.from(emailLines.join("\r\n"))
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          const res = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
              raw: rawEmail,
            },
          });

          messageId = res.data.id || messageId;
        } catch (gmailApiErr: any) {
          this.logger.warn(`Gmail API dispatch attempt: ${gmailApiErr.message}. Trying Nodemailer service fallback...`);

          // Method 2: Nodemailer fallback with service: 'gmail'
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              type: "OAuth2",
              user: config.email_address,
              clientId: clientId,
              clientSecret: clientSecret,
              refreshToken: decryptedRefreshToken,
            },
          });

          const info = await transporter.sendMail({
            from: `"${senderDisplayName}" <${config.email_address}>`,
            to: dto.to,
            subject: dto.subject,
            html: dto.html,
          });
          messageId = info.messageId || messageId;
        }
      } else {
        // SMTP transport
        let decryptedPassword = config.smtp_password;
        if (config.smtp_password) {
          try {
            decryptedPassword = this.encryptionService.Decrypt(config.smtp_password);
          } catch {
            decryptedPassword = config.smtp_password;
          }
        }

        const transporter = nodemailer.createTransport({
          host: config.smtp_host || "smtp.gmail.com",
          port: config.smtp_port || 587,
          secure: config.smtp_port === 465,
          auth: {
            user: config.smtp_user || config.email_address,
            pass: decryptedPassword,
          },
        });

        const info = await transporter.sendMail({
          from: `"${senderDisplayName}" <${config.email_address}>`,
          to: dto.to,
          subject: dto.subject,
          html: dto.html,
        });
        messageId = info.messageId || messageId;
      }
    } catch (err: any) {
      this.logger.error("Failed to dispatch email:", err.message);
      deliveryStatus = "failed";

      // Log failure in EmailLog
      const failedLog = new EmailLog();
      failedLog.tenant_id = config.tenant_id;
      failedLog.lead_id = dto.lead_id || null;
      failedLog.from_email = config.email_address;
      failedLog.to_email = dto.to;
      failedLog.subject = dto.subject;
      failedLog.body_html = dto.html;
      failedLog.direction = "outbound";
      failedLog.delivery_status = "failed";
      failedLog.is_ai_drafted = isAiDrafted;
      failedLog.message_id = messageId;
      failedLog.created_by_id = userId || "system";
      failedLog.created_on = new Date();
      await failedLog.save();

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

    // Auto-record in lead_activity if lead_id is present
    if (dto.lead_id) {
      try {
        const activity = new lead_activity();
        activity.lead_id = dto.lead_id;
        activity.activity_type = "EMAIL";
        activity.title = `Email Sent: ${dto.subject}`;
        activity.description = `Delivered to ${dto.to}`;
        activity.metadata = {
          to: dto.to,
          subject: dto.subject,
          message_id: messageId,
          is_ai_drafted: isAiDrafted,
          provider: config.provider,
        };
        activity.performer_name = senderDisplayName;
        activity.tenant_id = config.tenant_id;
        activity.created_by_id = userId || "system";
        activity.created_on = new Date();
        await activity.save();
      } catch (err: any) {
        this.logger.warn(`Could not log activity for lead ${dto.lead_id}: ${err.message}`);
      }
    }

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
        { lead_id: leadIdOrEmail },
      ],
      order: { created_on: "ASC" },
    });
  }
}
