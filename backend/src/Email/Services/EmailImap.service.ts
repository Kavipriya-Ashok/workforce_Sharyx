import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { simpleParser } from "mailparser";
import * as imaps from "imap-simple";
import { EmailAccountConfig } from "@Database/Table/Email/EmailAccountConfig.entity";
import { EmailLog } from "@Database/Table/Email/EmailLog.entity";
import { EncryptionService } from "@Service/Encryption.service";
import { EmailAIService } from "./EmailAI.service";
import { EmailService } from "./Email.service";

@Injectable()
export class EmailImapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailImapService.name);
  private timer: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly emailService: EmailService,
    private readonly aiService: EmailAIService
  ) {}

  onModuleInit() {
    // Start background poller every 60 seconds
    this.timer = setInterval(() => {
      this.pollInbox().catch((err) => this.logger.debug(`IMAP poll pass: ${err.message}`));
    }, 60000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async pollInbox() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const config = await EmailAccountConfig.findOne({ where: { is_active: true } });
      if (!config || !config.imap_host || !config.smtp_user) {
        this.isPolling = false;
        return;
      }

      let password = config.smtp_password;
      try {
        password = this.encryptionService.Decrypt(config.smtp_password);
      } catch {
        // Plain text fallback
      }

      const imapConfig: imaps.ImapSimpleOptions = {
        imap: {
          user: config.smtp_user,
          password: password,
          host: config.imap_host,
          port: config.imap_port || 993,
          tls: config.use_ssl ?? true,
          authTimeout: 5000,
        },
      };

      const connection = await imaps.connect(imapConfig);
      await connection.openBox("INBOX");

      const searchCriteria = ["UNSEEN"];
      const fetchOptions = {
        bodies: ["HEADER", "TEXT", ""],
        markSeen: true,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);

      for (const item of messages) {
        const all = item.parts.find((part) => part.which === "");
        const id = item.attributes.uid;
        const idHeader = `Imap-UID: ${id}`;

        if (all) {
          const parsed = await simpleParser(all.body);
          const from = parsed.from?.value?.[0]?.address || "unknown@client.com";
          const subject = parsed.subject || "No Subject";
          const bodyText = parsed.text || "";
          const bodyHtml = (parsed.html as string) || `<p>${bodyText}</p>`;
          const messageId = parsed.messageId || `${idHeader}`;

          // Check if already processed
          const exists = await EmailLog.findOne({ where: { message_id: messageId } });
          if (!exists) {
            const log = new EmailLog();
            log.tenant_id = config.tenant_id;
            log.from_email = from;
            log.to_email = config.email_address;
            log.subject = subject;
            log.body_text = bodyText;
            log.body_html = bodyHtml;
            log.direction = "inbound";
            log.delivery_status = "received";
            log.message_id = messageId;
            log.created_by_id = "imap_poller";
            log.created_on = new Date();
            await log.save();

            // Auto reply check
            const aiConfig = await this.aiService.getConfig(config.tenant_id);
            if (aiConfig && aiConfig.auto_reply_enabled) {
              const draft = await this.aiService.generateDraft(
                { from_email: from, subject, incoming_body: bodyText },
                config.tenant_id
              );
              if (draft?.draft) {
                await this.emailService.sendEmail(
                  {
                    to: from,
                    subject: draft.subject,
                    html: `<p>${draft.draft.replace(/\n/g, "<br/>")}</p>`,
                  },
                  "ai_auto_responder",
                  true
                );
              }
            }
          }
        }
      }

      await connection.end();
    } catch (err: any) {
      this.logger.debug(`IMAP polling skipped/failed: ${err.message}`);
    } finally {
      this.isPolling = false;
    }
  }
}
