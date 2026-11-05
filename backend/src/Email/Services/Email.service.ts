import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as nodemailer from "nodemailer";
import * as imaps from "imap-simple";
import { redactSecrets } from "@Helper/Redact";
import {
  classifyError,
  markConnected,
  markDegraded,
  markFailed,
  markNotConfigured,
  noteFailure,
  noteSuccess,
} from "@Service/Integrations/IntegrationStatus";
import { google } from "googleapis";
import { EmailAccountConfig } from "@Database/Table/Email/EmailAccountConfig.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { lead } from "@Database/Table/Lead/lead";
import { lead_activity } from "@Database/Table/Lead/lead_activity";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailValidationService } from "./EmailValidation.service";
import { EmailAccountConfigModel } from "../Models/EmailAccountConfig.model";
import { SendEmailModel } from "../Models/SendEmail.model";
import { EmailDeliveryLog } from "@Database/Table/Email/EmailDeliveryLog.entity";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly validationService: EmailValidationService,
    private readonly events: EventEmitter2
  ) {}

  async validateEmail(email: string) {
    return await this.validationService.validateEmail(email);
  }

  private getOAuthClient(redirectUri?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const rUri = redirectUri || process.env.GOOGLE_REDIRECT_URI || "http://localhost:8070/oauth/callback";
    return new google.auth.OAuth2(clientId, clientSecret, rUri);
  }

  /** A tenant is mandatory for every config operation. `null`/"all" (super-admin global view) is ambiguous here. */
  private requireTenant(tenantId: string | null | undefined): string {
    if (!tenantId || tenantId === "all" || tenantId === "default") {
      throw new BadRequestException("Select a specific tenant to manage its email connection.");
    }
    return tenantId;
  }

  async getConfig(tenantId: string): Promise<EmailAccountConfig | null> {
    // Exactly this tenant's own mailbox. No tenant (or Super Admin "all") => no mailbox.
    if (!tenantId || tenantId === "all" || tenantId === "default") return null;
    return await EmailAccountConfig.findOne({ where: { tenant_id: tenantId, is_active: true } });
  }

  /** The tenant's mailbox row whether or not it is active (full row incl. secrets: server-side use only). */
  async getConfigAny(tenantId: string): Promise<EmailAccountConfig | null> {
    if (!tenantId || tenantId === "all" || tenantId === "default") return null;
    return await EmailAccountConfig.findOne({ where: { tenant_id: tenantId } });
  }

  /** Plain text of a stored password (handles both the legacy AES-hex layer and plain text). */
  private plainSecret(stored: string | null | undefined): string {
    if (!stored) return "";
    try {
      const d = this.encryptionService.Decrypt(stored);
      if (d) return d;
    } catch {
      /* not in the legacy format */
    }
    return stored;
  }

  /**
   * The ONLY shape of a mailbox config that may leave the server. Never contains client_secret, smtp_password,
   * access_token or refresh_token - only flags and a short hint so the UI can say "saved".
   */
  toSafeConfig(config: EmailAccountConfig | null) {
    if (!config) return null;
    const pw = this.plainSecret(config.smtp_password);
    return {
      id: config.id,
      tenant_id: config.tenant_id,
      provider: config.provider,
      display_name: config.display_name,
      email_address: config.email_address,
      client_id: config.client_id,
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      smtp_user: config.smtp_user,
      imap_host: config.imap_host,
      imap_port: config.imap_port,
      use_ssl: config.use_ssl,
      is_active: config.is_active,
      token_expires_at: config.token_expires_at,
      has_client_secret: !!config.client_secret,
      has_password: !!config.smtp_password,
      has_refresh_token: !!config.refresh_token,
      has_access_token: !!config.access_token,
      password_hint: pw ? (pw.length >= 12 ? `••••${pw.slice(-2)}` : "••••") : null,
    };
  }

  async getSafeConfig(tenantId: string) {
    return this.toSafeConfig(await this.getConfig(tenantId));
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
    // The platform's shared Google app secret is read from the environment at use time; copying it into every
    // tenant row (as plain text, and back out through the API) was the root of the secret exposure.
    config.client_secret = null;
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
    // The token exchange just succeeded; confirm both directions properly in the background.
    this.events.emit("integration.recheck", { tenantId, types: ["email_smtp", "email_imap"], force: true });
    return {
      success: true,
      email: userEmail,
      displayName,
      provider: "google-email",
      message: "Gmail connected successfully",
    };
  }

  /**
   * Disconnects the tenant's mailbox: every credential is erased, the mailbox is switched off (no sending, no polling)
   * and both statuses go to not_configured. Connecting again works with fresh credentials.
   */
  async disconnect(tenantId: string, userId?: string) {
    const tenant = this.requireTenant(tenantId);
    const config = await this.getConfigAny(tenant);
    if (config) {
      config.client_secret = null;
      config.refresh_token = null;
      config.access_token = null;
      config.smtp_password = null;
      config.token_expires_at = null;
      config.is_active = false;
      config.updated_by_id = userId || "system";
      config.updated_on = new Date();
      await config.save();
    }
    await markNotConfigured(tenant, "email_smtp");
    await markNotConfigured(tenant, "email_imap");
    return { success: true, message: config ? "Mailbox disconnected. Credentials were erased." : "No mailbox was connected." };
  }

  // Disconnect Google Account (kept for the existing /Email/OAuth/Disconnect route)
  async disconnectGoogleAccount(tenantId: string = "default", userId?: string) {
    return this.disconnect(tenantId, userId);
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
    const tenant = this.requireTenant(data.tenant_id);
    let config = await EmailAccountConfig.findOne({ where: { tenant_id: tenant } });
    if (!config) {
      config = new EmailAccountConfig();
      config.tenant_id = tenant;
      config.created_by_id = userId || "system";
      config.created_on = new Date();
    }
    const credsChanged =
      !!data.smtp_password ||
      config.email_address !== data.email_address ||
      config.smtp_host !== (data.smtp_host || null) ||
      config.smtp_user !== (data.smtp_user || null) ||
      config.imap_host !== (data.imap_host || null) ||
      !config.is_active;
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
    const saved = await config.save();
    // New/changed credentials make any old status a lie: re-verify in the background right away.
    if (credsChanged) this.events.emit("integration.recheck", { tenantId: tenant, types: ["email_smtp", "email_imap"], force: true });
    return saved;
  }

  /** "smtp.gmail.com" -> "imap.gmail.com" for the common providers when no IMAP host was given. */
  guessImapHost(smtpHost?: string | null): string | null {
    const h = (smtpHost || "").toLowerCase();
    if (/^smtp\.(gmail\.com|googlemail\.com)$/.test(h)) return "imap.gmail.com";
    if (/^smtp\.(office365\.com|outlook\.com)$/.test(h) || h === "smtp-mail.outlook.com") return "outlook.office365.com";
    if (/^smtp\.mail\.yahoo\.com$/.test(h)) return "imap.mail.yahoo.com";
    return null;
  }

  private googleClient(cfg: EmailAccountConfig) {
    let refresh = cfg.refresh_token || "";
    if (refresh) {
      try {
        refresh = this.encryptionService.Decrypt(cfg.refresh_token) || refresh;
      } catch {
        /* stored in the plain form */
      }
    }
    const oauth2 = new google.auth.OAuth2(cfg.client_id || process.env.GOOGLE_CLIENT_ID, cfg.client_secret || process.env.GOOGLE_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: refresh });
    return { oauth2, hasRefresh: !!refresh };
  }

  /** Real SMTP (or Google token) handshake. Never throws; returns the outcome in plain words. */
  async checkSmtp(cfg: EmailAccountConfig): Promise<{ ok: boolean; status: "connected" | "failed" | "degraded"; code?: string; message: string }> {
    try {
      if (cfg.provider === "google-email") {
        const { oauth2, hasRefresh } = this.googleClient(cfg);
        if (!hasRefresh) {
          return { ok: false, status: "failed", code: "GOOGLE_TOKEN_MISSING", message: "Google is not connected for this mailbox. Connect your Google account." };
        }
        await oauth2.getAccessToken(); // real exchange with Google: fails with invalid_grant if revoked
        return { ok: true, status: "connected", message: `Google sign-in works for ${cfg.email_address}.` };
      }
      const pass = this.plainSecret(cfg.smtp_password);
      if (!cfg.smtp_host) return { ok: false, status: "failed", code: "SMTP_HOST_MISSING", message: "Enter the SMTP host (for Gmail: smtp.gmail.com)." };
      if (!pass) return { ok: false, status: "failed", code: "SMTP_PASSWORD_MISSING", message: "Enter the mailbox password or App Password." };
      const port = Number(cfg.smtp_port) || 587;
      const transporter = nodemailer.createTransport({
        host: cfg.smtp_host,
        port,
        secure: port === 465,
        auth: { user: cfg.smtp_user || cfg.email_address, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      await transporter.verify();
      return { ok: true, status: "connected", message: `Outgoing mail works (${cfg.smtp_host}:${port}).` };
    } catch (err: any) {
      const c = classifyError("email_smtp", err);
      this.logger.warn(`SMTP check failed for tenant ${cfg.tenant_id}: ${redactSecrets(err)}`);
      return c
        ? { ok: false, status: c.status, code: c.code, message: c.message }
        : { ok: false, status: "degraded", code: "SMTP_UNKNOWN", message: "The mail server answered with an unexpected error. Please try again, or check the settings." };
    }
  }

  /** Real IMAP login (or Gmail API read) to prove incoming mail works. Never throws. */
  async checkImap(cfg: EmailAccountConfig): Promise<{ ok: boolean; status: "connected" | "failed" | "degraded" | "not_configured"; code?: string; message: string }> {
    try {
      if (cfg.provider === "google-email") {
        const { oauth2, hasRefresh } = this.googleClient(cfg);
        if (!hasRefresh) return { ok: false, status: "failed", code: "GOOGLE_TOKEN_MISSING", message: "Google is not connected for this mailbox. Connect your Google account." };
        const gmail = google.gmail({ version: "v1", auth: oauth2 });
        await gmail.users.getProfile({ userId: "me" });
        return { ok: true, status: "connected", message: `Inbox access works for ${cfg.email_address}.` };
      }
      const host = cfg.imap_host || this.guessImapHost(cfg.smtp_host);
      if (!host) return { ok: false, status: "not_configured", message: "No inbox (IMAP) server is set, so incoming mail is not being read." };
      const pass = this.plainSecret(cfg.smtp_password);
      if (!pass) return { ok: false, status: "failed", code: "IMAP_PASSWORD_MISSING", message: "Enter the mailbox password or App Password." };
      const connection = await imaps.connect({
        imap: {
          user: cfg.smtp_user || cfg.email_address,
          password: pass,
          host,
          port: cfg.imap_port || 993,
          tls: cfg.use_ssl ?? true,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 8000,
          connTimeout: 10000,
        },
      });
      try {
        await connection.end();
      } catch {
        /* closing quietly */
      }
      return { ok: true, status: "connected", message: `Inbox login works (${host}).` };
    } catch (err: any) {
      const c = classifyError("email_imap", err);
      this.logger.warn(`IMAP check failed for tenant ${cfg.tenant_id}: ${redactSecrets(err)}`);
      return c
        ? { ok: false, status: c.status, code: c.code, message: c.message }
        : { ok: false, status: "degraded", code: "IMAP_UNKNOWN", message: "The inbox server answered with an unexpected error. Please try again, or check the settings." };
    }
  }

  /**
   * Tenant-scoped live check of BOTH directions, saved to tenant_integration_status whether it passes or fails:
   *   email_smtp = can we send,  email_imap = can we read the inbox.
   * If the caller sends new SMTP settings they are saved first (same as the WhatsApp test), so the Failed state
   * can be seen and edited later. Blank password = keep the stored one.
   */
  async testConnection(tenantId: string, userId: string | undefined, data: Partial<EmailAccountConfigModel> = {}) {
    const tenant = this.requireTenant(tenantId);
    if (data?.email_address && data.provider !== "google-email") {
      const existing = await this.getConfigAny(tenant);
      await this.saveConfig(
        {
          ...(data as EmailAccountConfigModel),
          tenant_id: tenant,
          provider: "smtp",
          imap_host: data.imap_host || existing?.imap_host || this.guessImapHost(data.smtp_host) || undefined,
          imap_port: data.imap_port || existing?.imap_port || 993,
          smtp_password: data.smtp_password || undefined,
          is_active: true,
        } as EmailAccountConfigModel,
        userId
      );
    }
    const cfg = await this.getConfigAny(tenant);
    if (!cfg || (!cfg.is_active && !data?.email_address)) {
      throw new BadRequestException("No mailbox is connected yet. Enter your email settings or connect Google first.");
    }

    const [smtp, imap] = [await this.checkSmtp(cfg), await this.checkImap(cfg)];
    const name = cfg.email_address;
    await (smtp.ok ? markConnected(tenant, "email_smtp", name) : smtp.status === "degraded" ? markDegraded(tenant, "email_smtp", smtp.code || "SMTP_ERROR", smtp.message, name) : markFailed(tenant, "email_smtp", smtp.code || "SMTP_ERROR", smtp.message, name));
    await (imap.ok
      ? markConnected(tenant, "email_imap", name)
      : imap.status === "not_configured"
        ? markNotConfigured(tenant, "email_imap")
        : imap.status === "degraded"
          ? markDegraded(tenant, "email_imap", imap.code || "IMAP_ERROR", imap.message, name)
          : markFailed(tenant, "email_imap", imap.code || "IMAP_ERROR", imap.message, name));

    if (!smtp.ok) {
      throw new HttpException({ message: smtp.message, status: smtp.status, code: smtp.code }, HttpStatus.BAD_REQUEST);
    }
    return {
      connected: true,
      provider: cfg.provider,
      email: name,
      smtp,
      imap,
      message: imap.ok ? "Email connected: sending and inbox both work." : `Sending works. Inbox check: ${imap.message}`,
    };
  }

  // Dispatch Email via Google OAuth2 or SMTP
  /** Records why an email was NOT delivered (skipped or failed) so it is visible per tenant. Never throws. */
  async recordEmailNotSent(
    tenantId: string,
    to: string | null,
    reason: string,
    opts: { leadId?: string | null; subject?: string; status?: "skipped" | "failed"; attempts?: number } = {}
  ) {
    const status = opts.status || "skipped";
    this.logger.warn(`[EMAIL ${status.toUpperCase()}] tenant=${tenantId} to=${to || "-"} reason=${reason}`);
    try {
      const row = new EmailDeliveryLog();
      row.tenant_id = tenantId;
      row.to_email = to;
      row.subject = opts.subject || null;
      row.status = status;
      row.reason = String(reason).slice(0, 500);
      row.attempts = opts.attempts ?? 0;
      row.lead_id = opts.leadId || null;
      await row.save();
    } catch (e: any) {
      this.logger.debug(`could not write email_delivery_log: ${e.message}`);
    }
    if (opts.leadId) {
      try {
        const act = new lead_activity();
        act.lead_id = opts.leadId;
        act.activity_type = "EMAIL";
        act.title = `Email ${status}`;
        act.description = `email ${status}: ${reason}`;
        act.performer_name = "system";
        act.tenant_id = tenantId;
        act.created_by_id = "system";
        act.created_on = new Date();
        await act.save();
      } catch {}
    }
  }

  /**
   * Safe sender for automated flows: skips (and logs) when the tenant has no mailbox or the contact has no
   * email, retries transient failures 3 times with backoff, logs the final failure. Never throws, so it can
   * never block the WhatsApp reply that triggered it.
   */
  async sendEmailReliable(
    dto: SendEmailModel,
    userId: string | undefined,
    isAiDrafted: boolean,
    tenantId: string,
    opts: { leadId?: string | null } = {}
  ): Promise<{ status: "sent" | "skipped" | "failed"; reason?: string; attempts: number }> {
    const meta = { leadId: opts.leadId, subject: dto?.subject };
    if (!tenantId || tenantId === "default" || tenantId === "all") {
      await this.recordEmailNotSent(tenantId || "unknown", dto?.to || null, "no tenant context", meta);
      return { status: "skipped", reason: "no tenant context", attempts: 0 };
    }
    if (!dto?.to) {
      await this.recordEmailNotSent(tenantId, null, "contact has no email address", meta);
      return { status: "skipped", reason: "contact has no email address", attempts: 0 };
    }
    const cfg = await this.getConfig(tenantId);
    if (!cfg) {
      await this.recordEmailNotSent(tenantId, dto.to, "tenant has no active mailbox configured", meta);
      return { status: "skipped", reason: "tenant has no active mailbox configured", attempts: 0 };
    }
    const base = Number(process.env.EMAIL_RETRY_BASE_MS || 1000);
    let lastErr: any = null;
    let attempts = 0;
    for (let attempt = 1; attempt <= 3; attempt++) {
      attempts = attempt;
      try {
        await this.sendEmail(dto, userId, isAiDrafted, tenantId);
        return { status: "sent", attempts };
      } catch (e: any) {
        lastErr = e;
        if (/Email validation failed/i.test(e?.message || "")) break; // permanent: retrying will not help
        if (attempt < 3) await new Promise((r) => setTimeout(r, base * 3 ** (attempt - 1)));
      }
    }
    await this.recordEmailNotSent(tenantId, dto.to, lastErr?.message || "unknown error", { ...meta, status: "failed", attempts });
    return { status: "failed", reason: lastErr?.message || "unknown error", attempts };
  }

  async sendEmail(dto: SendEmailModel, userId?: string, isAiDrafted: boolean = false, tenantId: string = "") {
    // No shared "default" mailbox: every send uses the calling tenant's own mailbox.
    if (!tenantId || tenantId === "default" || tenantId === "all") {
      throw new Error("Tenant context is required to send email.");
    }
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
            "Auto-Submitted: auto-replied",
            "X-Sharyx-Auto-Reply: true",
            ...(dto.inReplyTo ? [`In-Reply-To: ${dto.inReplyTo}`, `References: ${dto.inReplyTo}`] : []),
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
              ...(dto.threadId ? { threadId: dto.threadId } : {}),
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
            inReplyTo: dto.inReplyTo,
            references: dto.inReplyTo,
            headers: {
              "Auto-Submitted": "auto-replied",
              "X-Sharyx-Auto-Reply": "true",
            },
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
      this.logger.error(`Failed to dispatch email: ${redactSecrets(err.message)}`);
      deliveryStatus = "failed";
      // A real send failing with an auth error flips the mailbox to Failed; a timeout flips it to Degraded.
      await noteFailure(config.tenant_id, "email_smtp", err, config.email_address);

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

      // upstream (mail server / Google) refused or was unreachable: a gateway problem, not a server bug
      throw new HttpException(`Email sending failed: ${redactSecrets(err.message)}`, HttpStatus.BAD_GATEWAY);
    }

    // A real send worked: (re)confirm the mailbox is Connected (cheap: only writes if it was not already).
    void noteSuccess(config.tenant_id, "email_smtp", config.email_address);

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

  async getInboxLogs(tenantId: string) {
    const isAll = tenantId === "all" || !tenantId;

    const qb = EmailLog.createQueryBuilder("log")
      .addSelect("log.created_on")
      .where("log.status = true");

    if (!isAll) {
      qb.andWhere("log.tenant_id = :tenantId", { tenantId });
    }

    return await qb.orderBy("log.created_on", "DESC").take(100).getMany();
  }

  async getThread(leadIdOrEmail: string, tenantId?: string) {
    const qb = EmailLog.createQueryBuilder("log")
      .addSelect("log.created_on")
      .where(
        "(log.to_email = :val OR log.from_email = :val OR log.lead_id = :val)",
        { val: leadIdOrEmail }
      );
    if (tenantId && tenantId !== "all") {
      qb.andWhere("log.tenant_id = :tenantId", { tenantId });
    }
    return await qb.orderBy("log.created_on", "ASC").getMany();
  }
}
