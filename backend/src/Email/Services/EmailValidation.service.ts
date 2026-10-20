import { Injectable, Logger } from "@nestjs/common";
import * as dns from "dns";
import * as net from "net";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0 to 100
  reason?: string;
  isDisposable: boolean;
  isRoleBased: boolean;
  hasMxRecords: boolean;
  mxHost?: string;
}

// Known disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "trashmail.com",
  "yopmail.com",
  "sharklasers.com",
  "dispostable.com",
  "getairmail.com",
  "throwawaymail.com",
  "temp-mail.org",
  "fakeinbox.com",
  "mytemp.email",
]);

// Role-based organizational prefixes
const ROLE_BASED_PREFIXES = new Set([
  "admin",
  "support",
  "info",
  "sales",
  "billing",
  "contact",
  "help",
  "office",
  "no-reply",
  "noreply",
  "marketing",
  "hr",
  "jobs",
]);

@Injectable()
export class EmailValidationService {
  private readonly logger = new Logger(EmailValidationService.name);

  async validateEmail(email: string): Promise<ValidationResult> {
    const cleanEmail = (email || "").trim().toLowerCase();

    // ── Layer 1: RFC 5322 Syntax Validation ──
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return {
        isValid: false,
        score: 0,
        reason: "Invalid email syntax format",
        isDisposable: false,
        isRoleBased: false,
        hasMxRecords: false,
      };
    }

    const [localPart, domain] = cleanEmail.split("@");

    // ── Layer 2: Disposable Domain Detection ──
    const isDisposable = DISPOSABLE_DOMAINS.has(domain);
    if (isDisposable) {
      return {
        isValid: false,
        score: 10,
        reason: "Disposable / temporary email domain detected (High risk of bounce/spam report)",
        isDisposable: true,
        isRoleBased: false,
        hasMxRecords: false,
      };
    }

    // ── Layer 3: Role-based Prefix Check ──
    const isRoleBased = ROLE_BASED_PREFIXES.has(localPart);

    // ── Layer 4: DNS MX Records Lookup ──
    let mxHost = "";
    let hasMxRecords = false;
    try {
      const addresses = await resolveMx(domain);
      if (addresses && addresses.length > 0) {
        // Sort by priority (lowest number = highest priority)
        addresses.sort((a, b) => a.priority - b.priority);
        mxHost = addresses[0].exchange;
        hasMxRecords = true;
      }
    } catch (dnsErr: any) {
      this.logger.warn(`MX DNS check failed for ${domain}: ${dnsErr.message}`);
      return {
        isValid: false,
        score: 20,
        reason: "Domain has no valid MX records (cannot receive emails)",
        isDisposable: false,
        isRoleBased,
        hasMxRecords: false,
      };
    }

    if (!hasMxRecords) {
      return {
        isValid: false,
        score: 20,
        reason: "Domain has no active mail exchange servers",
        isDisposable: false,
        isRoleBased,
        hasMxRecords: false,
      };
    }

    // ── Layer 5: Calculate Deliverability Score ──
    let score = 100;
    if (isRoleBased) {
      score -= 15; // Role accounts have lower open rates and shared mailboxes
    }

    return {
      isValid: score >= 60,
      score,
      reason: score >= 60 ? "Email is valid and deliverable" : "Low quality email address",
      isDisposable: false,
      isRoleBased,
      hasMxRecords: true,
      mxHost,
    };
  }

  /**
   * Direct SMTP Handshake (Mailbox Ping)
   * Connects via port 25 without sending actual email content
   */
  async verifyMailboxSmtp(email: string, mxHost: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.createConnection(25, mxHost);
      let step = 0;
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(true); // Don't block outbound queue on network timeouts
      }, 5000);

      socket.setEncoding("ascii");

      socket.on("data", (data) => {
        const response = data.toString();

        if (step === 0 && response.startsWith("220")) {
          socket.write("HELO sharyx.com\r\n");
          step++;
        } else if (step === 1 && response.startsWith("250")) {
          socket.write("MAIL FROM:<verify@sharyx.com>\r\n");
          step++;
        } else if (step === 2 && response.startsWith("250")) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          step++;
        } else if (step === 3) {
          clearTimeout(timeout);
          socket.write("QUIT\r\n");
          socket.end();
          // 250 = recipient OK; 550 = mailbox does not exist
          resolve(response.startsWith("250"));
        }
      });

      socket.on("error", () => {
        clearTimeout(timeout);
        resolve(true); // Fallback on port 25 ISP blocks
      });
    });
  }
}
