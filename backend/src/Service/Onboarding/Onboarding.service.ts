import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { company } from '@Database/Table/Admin/company';
import { WhatsAppConfig } from '@Database/Table/WhatsApp/WhatsAppConfig.entity';
import { EmailAccountConfig } from '@Database/Table/Email/EmailAccountConfig.entity';
import { ONBOARDING_MAX_BYTES, validateOnboardingData } from '@Model/Onboarding/Onboarding.model';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Non-secret wizard fields that may be persisted in company.onboarding_data.
 * Secrets (WhatsApp tokens, mailbox passwords, API keys) are deliberately NOT here:
 * they are saved through the dedicated, tenant-scoped WhatsApp / Email config endpoints.
 * `whatsapp_skipped` / `email_skipped` record that the user chose "Skip for now" so the dashboard can show Pending.
 */
const ALLOWED_KEYS = [
  'company_name', 'business_email', 'website', 'logo_url',
  'address', 'city', 'state', 'pincode',
  'industry', 'industry_sub_type', 'selected_services',
  'goals', 'technical_level', 'apps', 'company_size', 'discovery_source',
  'wa_provider', 'email_auth_mode',
  'whatsapp_skipped', 'email_skipped',
] as const;

const str = (v: any) => (typeof v === 'string' ? v.trim() : '');
const nonEmptyArray = (v: any) => Array.isArray(v) && v.length > 0;

/** Server-side mirror of the wizard's per-step validation. Returns field -> message. */
function validateStep(step: number, d: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};
  switch (step) {
    case 1:
      if (str(d.company_name).length < 2) errors.company_name = 'Company name must be at least 2 characters.';
      if (!EMAIL_RE.test(str(d.business_email))) errors.business_email = 'Please provide a valid business email.';
      if (str(d.website) && (!str(d.website).includes('.') || str(d.website).length < 4)) {
        errors.website = 'Please enter a valid website domain or URL.';
      }
      break;
    case 2:
      if (str(d.address).length < 3) errors.address = 'Street address is required.';
      if (str(d.city).length < 2) errors.city = 'City is required.';
      if (str(d.state).length < 2) errors.state = 'State / Province is required.';
      if (str(d.pincode).length < 3) errors.pincode = 'Postal code / ZIP is required.';
      break;
    case 3:
      if (!nonEmptyArray(d.selected_services)) errors.selected_services = 'Select at least one workflow.';
      break;
    case 4:
      if (!nonEmptyArray(d.goals)) errors.goals = 'Select at least one automation objective.';
      break;
    case 6:
      if (!nonEmptyArray(d.apps)) errors.apps = 'Select at least one software platform.';
      break;
    default:
      break;
  }
  return errors;
}

@Injectable()
export class OnboardingService {
  private requireTenant(tenantId: string | null): string {
    if (!tenantId || tenantId === 'all' || tenantId === 'default') {
      throw new BadRequestException('Select a specific tenant before using onboarding.');
    }
    return tenantId;
  }

  private toResponse(c: company) {
    return {
      onboarding_completed: !!c.onboarding_completed,
      onboarding_step: c.onboarding_step || 1,
      data: c.onboarding_data || {},
      company: {
        id: c.id,
        name: c.name,
        email: c.email,
        website: c.website,
        address: c.address,
        postal_code: c.postal_code,
        industry: c.industry,
        company_size: c.company_size,
      },
    };
  }

  /**
   * Runs `fn` with the tenant's company row LOCKED (SELECT ... FOR UPDATE) inside one transaction. Two browser tabs
   * saving at once, a double-clicked Next, or a doubled Complete are therefore serialised: nobody overwrites the
   * other's answers (the old read-modify-write lost updates).
   */
  private async withLockedCompany<T>(tenantId: string | null, fn: (c: company, save: () => Promise<company>) => Promise<T>): Promise<T> {
    const tenant = this.requireTenant(tenantId);
    return company.getRepository().manager.transaction(async (em) => {
      const c = await em.findOne(company, { where: { id: tenant }, lock: { mode: 'pessimistic_write' } });
      if (!c) throw new NotFoundException('Tenant not found');
      return fn(c, () => em.save(c));
    });
  }

  async getState(tenantId: string | null) {
    const tenant = this.requireTenant(tenantId);
    const c = await company.findOne({ where: { id: tenant } });
    if (!c) throw new NotFoundException('Tenant not found');
    return this.toResponse(c);
  }

  async saveStep(tenantId: string | null, userId: string, step: number, incoming: Record<string, any>) {
    if (!Number.isInteger(step) || step < 1 || step > 10) {
      throw new BadRequestException('Step must be a number between 1 and 10.');
    }
    const tooBig = validateOnboardingData(incoming || {});
    if (tooBig) throw new BadRequestException(tooBig);

    return this.withLockedCompany(tenantId, async (c, save) => {
      // Keep only whitelisted, non-secret keys.
      const clean: Record<string, any> = {};
      for (const k of ALLOWED_KEYS) {
        if (incoming && Object.prototype.hasOwnProperty.call(incoming, k)) clean[k] = incoming[k];
      }
      const merged = { ...(c.onboarding_data || {}), ...clean };
      if (Buffer.byteLength(JSON.stringify(merged), 'utf8') > ONBOARDING_MAX_BYTES * 2) {
        throw new BadRequestException('Onboarding data is too large.');
      }

      const errors = validateStep(step, merged);
      if (Object.keys(errors).length) {
        throw new BadRequestException(Object.values(errors).join(' '));
      }

      // Reflect the tenant profile into real company columns.
      if (step === 1) {
        c.name = str(merged.company_name);
        c.email = str(merged.business_email);
        c.website = str(merged.website) || (null as any);
      }
      if (step === 2) {
        c.address = [str(merged.address), str(merged.city), str(merged.state)].filter(Boolean).join(', ');
        c.postal_code = str(merged.pincode);
      }
      if (step === 3) c.industry = str(merged.industry) || (null as any);
      if (step === 7) c.company_size = str(merged.company_size) || (null as any);

      c.onboarding_data = merged;
      // progress only ever moves forward (a second tab saving an earlier step must not rewind it)
      c.onboarding_step = Math.min(10, Math.max(c.onboarding_step || 1, step + 1));
      c.updated_by_id = userId && userId !== '0' ? userId : (undefined as any);
      c.updated_on = new Date();
      await save();
      return this.toResponse(c);
    });
  }

  async complete(tenantId: string | null, userId: string) {
    const tenant = this.requireTenant(tenantId);
    // Which optional integrations actually exist right now (the truth, not what the browser claims).
    const [wa, mail] = await Promise.all([
      WhatsAppConfig.findOne({ where: { tenant_id: tenant, status: true } }),
      EmailAccountConfig.findOne({ where: { tenant_id: tenant, is_active: true } }),
    ]);
    const waDone = !!(wa && wa.access_token && wa.phone_number_id);
    const mailDone = !!(mail && (mail.refresh_token || mail.smtp_password));

    return this.withLockedCompany(tenantId, async (c, save) => {
      if (c.onboarding_completed) return this.toResponse(c); // second click / second tab: already done, nothing to redo
      const data = c.onboarding_data || {};
      const errors: Record<string, string> = {};
      for (const s of [1, 2, 3, 4, 6]) Object.assign(errors, validateStep(s, data));
      if (Object.keys(errors).length) {
        throw new BadRequestException(`Onboarding is incomplete: ${Object.values(errors).join(' ')}`);
      }
      // Record, on the server, what was skipped so the dashboard checklist can show it as Pending.
      c.onboarding_data = { ...data, whatsapp_skipped: !waDone, email_skipped: !mailDone };
      c.onboarding_completed = true;
      c.onboarding_step = 10;
      c.updated_by_id = userId && userId !== '0' ? userId : (undefined as any);
      c.updated_on = new Date();
      await save();
      return this.toResponse(c);
    });
  }
}
