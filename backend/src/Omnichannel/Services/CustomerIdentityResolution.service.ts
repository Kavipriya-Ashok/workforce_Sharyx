import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer, CustomerStatus, CustomerTier } from "../../Database/Table/Customer/customer";
import { lead } from "../../Database/Table/Lead/lead";
import { CustomerIdentityMapping, IdentityType } from "../../Database/Table/Omnichannel/CustomerIdentityMapping.entity";

export interface NormalizedIdentity {
  type: IdentityType;
  normalizedValue: string;
  rawValue: string;
  countryCode: string;
}

export interface CustomerResolutionResult {
  customer: Customer;
  isNew: boolean;
  matchedByIdentity?: CustomerIdentityMapping;
  matchType: "phone_exact" | "email_exact" | "lead_linked" | "new_created";
}

@Injectable()
export class CustomerIdentityResolutionService {
  private readonly logger = new Logger(CustomerIdentityResolutionService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(lead)
    private readonly leadRepo: Repository<lead>,
    @InjectRepository(CustomerIdentityMapping)
    private readonly identityRepo: Repository<CustomerIdentityMapping>
  ) {}

  /**
   * Country-aware E.164 phone normalization
   * NEVER match solely on the last 10 digits without validating country context
   */
  normalizePhoneNumber(rawPhone: string, defaultCountryCode: string = "IN"): { normalized: string; country: string } | null {
    if (!rawPhone) return null;
    let clean = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");

    // Handle leading 00 international prefix
    if (clean.startsWith("00")) {
      clean = "+" + clean.slice(2);
    }

    let country = defaultCountryCode.toUpperCase();

    // Already E.164 with +
    if (clean.startsWith("+")) {
      const digits = clean.slice(1);
      if (digits.startsWith("91") && digits.length === 12) {
        country = "IN";
      } else if (digits.startsWith("1") && digits.length === 11) {
        country = "US";
      } else if (digits.startsWith("44")) {
        country = "GB";
      } else if (digits.startsWith("60")) {
        country = "MY";
      }
      return { normalized: clean, country };
    }

    // India standard: 10 digits or 91 prefix
    if (clean.length === 10 && /^[6-9]\d{9}$/.test(clean)) {
      return { normalized: `+91${clean}`, country: "IN" };
    }

    if (clean.length === 12 && clean.startsWith("91")) {
      return { normalized: `+${clean}`, country: "IN" };
    }

    // Default fallback prepending + if numeric
    if (/^\d{8,15}$/.test(clean)) {
      return { normalized: `+${clean}`, country };
    }

    return null;
  }

  /**
   * RFC-compliant email normalization
   */
  normalizeEmail(rawEmail: string): string | null {
    if (!rawEmail) return null;
    let trimmed = rawEmail.trim().toLowerCase();

    // Extract inside <email@domain.com> if passed
    const angleMatch = trimmed.match(/<([^>]+)>/);
    if (angleMatch) {
      trimmed = angleMatch[1].trim();
    }

    // Basic RFC email validation check
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(trimmed)) {
      return null;
    }

    return trimmed;
  }

  /**
   * Resolve an incoming communication to a single unified Customer profile.
   * If not found, auto-creates Customer and registers verified identity mappings.
   */
  async resolveCustomer(params: {
    phone?: string;
    email?: string;
    name?: string;
    tenantId?: string;
    source?: string;
    companyName?: string;
  }): Promise<CustomerResolutionResult> {
    const tenantId = params.tenantId || "default";

    // 1. Normalize identifiers
    const phoneNorm = params.phone ? this.normalizePhoneNumber(params.phone) : null;
    const emailNorm = params.email ? this.normalizeEmail(params.email) : null;

    let matchedCustomer: Customer | null = null;
    let matchedIdentity: CustomerIdentityMapping | undefined;
    let matchType: CustomerResolutionResult["matchType"] = "new_created";

    // 2. Query Identity Registry by Phone
    if (phoneNorm) {
      const mapping = await this.identityRepo.findOne({
        where: {
          tenant_id: tenantId,
          identity_type: "phone",
          identity_value: phoneNorm.normalized,
        },
        relations: ["customer"],
      });

      if (mapping?.customer) {
        matchedCustomer = mapping.customer;
        matchedIdentity = mapping;
        matchType = "phone_exact";
      }
    }

    // 3. Query Identity Registry by Email if not matched yet
    if (!matchedCustomer && emailNorm) {
      const mapping = await this.identityRepo.findOne({
        where: {
          tenant_id: tenantId,
          identity_type: "email",
          identity_value: emailNorm,
        },
        relations: ["customer"],
      });

      if (mapping?.customer) {
        matchedCustomer = mapping.customer;
        matchedIdentity = mapping;
        matchType = "email_exact";
      }
    }

    // 4. Query Customer table directly (legacy / existing customer records)
    if (!matchedCustomer) {
      if (phoneNorm) {
        matchedCustomer = await this.customerRepo.findOne({
          where: [
            { tenant_id: tenantId, phone: phoneNorm.normalized },
            { tenant_id: tenantId, phone: params.phone },
          ],
        });
        if (matchedCustomer) matchType = "phone_exact";
      }

      if (!matchedCustomer && emailNorm) {
        matchedCustomer = await this.customerRepo.findOne({
          where: { tenant_id: tenantId, email: emailNorm },
        });
        if (matchedCustomer) matchType = "email_exact";
      }
    }

    // 5. Query Lead table and promote / link to Customer
    if (!matchedCustomer) {
      let leadMatch: lead | null = null;

      if (phoneNorm) {
        leadMatch = await this.leadRepo.findOne({
          where: [
            { tenant_id: tenantId, phone: phoneNorm.normalized },
            { tenant_id: tenantId, phone: params.phone },
          ],
        });
      }

      if (!leadMatch && emailNorm) {
        leadMatch = await this.leadRepo.findOne({
          where: { tenant_id: tenantId, email: emailNorm },
        });
      }

      if (leadMatch) {
        // Create Customer mapped to this Lead
        matchedCustomer = this.customerRepo.create({
          tenant_id: tenantId,
          name: leadMatch.name || `${leadMatch.first_name || ""} ${leadMatch.last_name || ""}`.trim() || params.name || "Customer",
          phone: phoneNorm ? phoneNorm.normalized : leadMatch.phone || "",
          email: emailNorm || leadMatch.email || "",
          company_name: leadMatch.company_name || params.companyName || "",
          customer_status: CustomerStatus.ACTIVE,
          tier: CustomerTier.PROFESSIONAL,
          converted_from_lead_id: leadMatch.id,
          total_spend: leadMatch.deal_value || 0,
          currency: leadMatch.currency || "INR",
        });
        matchedCustomer = await this.customerRepo.save(matchedCustomer);
        matchType = "lead_linked";
      }
    }

    // 6. If completely new, auto-create unified Customer profile
    let isNew = false;
    if (!matchedCustomer) {
      const displayName = params.name || (phoneNorm ? phoneNorm.normalized : emailNorm) || "New Customer";
      matchedCustomer = this.customerRepo.create({
        tenant_id: tenantId,
        name: displayName,
        phone: phoneNorm ? phoneNorm.normalized : "",
        email: emailNorm || "",
        company_name: params.companyName || "",
        customer_status: CustomerStatus.ACTIVE,
        tier: CustomerTier.STARTER,
        total_spend: 0,
        currency: "INR",
      });
      matchedCustomer = await this.customerRepo.save(matchedCustomer);
      isNew = true;
      matchType = "new_created";
      this.logger.log(`[CUSTOMER CREATED] ID: ${matchedCustomer.id}, Name: ${matchedCustomer.name}`);
    }

    // 7. Register / Update Identity Mappings for this Customer
    if (phoneNorm) {
      await this.ensureIdentityMapping({
        customerId: matchedCustomer.id,
        tenantId,
        type: "phone",
        value: phoneNorm.normalized,
        rawValue: params.phone,
        countryCode: phoneNorm.country,
        isPrimary: !matchedCustomer.phone || matchedCustomer.phone === phoneNorm.normalized,
        source: params.source || "inbound",
      });
    }

    if (emailNorm) {
      await this.ensureIdentityMapping({
        customerId: matchedCustomer.id,
        tenantId,
        type: "email",
        value: emailNorm,
        rawValue: params.email,
        countryCode: "IN",
        isPrimary: !matchedCustomer.email || matchedCustomer.email === emailNorm,
        source: params.source || "inbound",
      });
    }

    // 8. Update missing contact fields on Customer if new ones provided
    let needsUpdate = false;
    if (!matchedCustomer.phone && phoneNorm) {
      matchedCustomer.phone = phoneNorm.normalized;
      needsUpdate = true;
    }
    if (!matchedCustomer.email && emailNorm) {
      matchedCustomer.email = emailNorm;
      needsUpdate = true;
    }
    if (params.name && (matchedCustomer.name === "New Customer" || matchedCustomer.name.startsWith("+"))) {
      matchedCustomer.name = params.name;
      needsUpdate = true;
    }
    if (params.companyName && !matchedCustomer.company_name) {
      matchedCustomer.company_name = params.companyName;
      needsUpdate = true;
    }
    if (needsUpdate) {
      await this.customerRepo.save(matchedCustomer);
    }

    return {
      customer: matchedCustomer,
      isNew,
      matchedByIdentity: matchedIdentity,
      matchType,
    };
  }

  /**
   * Ensure identity mapping exists in customer_identity_mapping table
   */
  async ensureIdentityMapping(params: {
    customerId: string;
    tenantId: string;
    type: IdentityType;
    value: string;
    rawValue?: string;
    countryCode?: string;
    isPrimary?: boolean;
    source?: string;
  }): Promise<CustomerIdentityMapping> {
    const existing = await this.identityRepo.findOne({
      where: {
        tenant_id: params.tenantId,
        identity_type: params.type,
        identity_value: params.value,
      },
    });

    if (existing) {
      if (existing.customer_id !== params.customerId) {
        this.logger.warn(
          `[IDENTITY CONFLICT] ${params.type} ${params.value} is mapped to customer ${existing.customer_id}, attempted reassignment to ${params.customerId}`
        );
      }
      return existing;
    }

    const mapping = this.identityRepo.create({
      tenant_id: params.tenantId,
      customer_id: params.customerId,
      identity_type: params.type,
      identity_value: params.value,
      raw_value: params.rawValue || params.value,
      country_code: params.countryCode || "IN",
      is_primary: params.isPrimary ?? false,
      is_verified: true,
      source: params.source || "manual",
    });

    return await this.identityRepo.save(mapping);
  }

  /**
   * Manual identity linking to associate an ambiguous or secondary email/phone to an existing customer
   */
  async manualLinkIdentity(
    customerId: string,
    identityType: IdentityType,
    rawValue: string,
    tenantId: string = "default"
  ): Promise<CustomerIdentityMapping> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId, tenant_id: tenantId },
    });
    if (!customer) {
      throw new Error(`Customer ${customerId} not found in tenant ${tenantId}`);
    }

    let normalizedValue = rawValue;
    let countryCode = "IN";

    if (identityType === "phone") {
      const parsed = this.normalizePhoneNumber(rawValue);
      if (!parsed) throw new Error(`Invalid phone number: ${rawValue}`);
      normalizedValue = parsed.normalized;
      countryCode = parsed.country;
    } else {
      const parsed = this.normalizeEmail(rawValue);
      if (!parsed) throw new Error(`Invalid email address: ${rawValue}`);
      normalizedValue = parsed;
    }

    return await this.ensureIdentityMapping({
      customerId,
      tenantId,
      type: identityType,
      value: normalizedValue,
      rawValue,
      countryCode,
      isPrimary: false,
      source: "manual_link",
    });
  }
}

