import { Type } from 'class-transformer';
import { IsInt, IsObject, Max, Min, registerDecorator, ValidationOptions } from 'class-validator';

/** Hard limits for what the wizard may store in company.onboarding_data. */
export const ONBOARDING_MAX_BYTES = 32 * 1024;
const STRING_MAX: Record<string, number> = {
  company_name: 255, business_email: 255, website: 255, logo_url: 500, address: 255, city: 100, state: 100,
  pincode: 20, industry: 100, industry_sub_type: 100, technical_level: 50, company_size: 50, discovery_source: 200,
};
const ARRAY_KEYS = ['selected_services', 'goals', 'apps'];
const ARRAY_MAX_ITEMS = 30;
const ARRAY_ITEM_MAX = 120;
const ENUMS: Record<string, string[]> = {
  wa_provider: ['meta_cloud', 'qr_gateway', 'custom_gateway', 'twilio'],
  email_auth_mode: ['app_pass', 'google_oauth'],
};
const BOOLEANS = ['whatsapp_skipped', 'email_skipped'];

/** Returns an error message, or null when the wizard answers are acceptable. */
export function validateOnboardingData(d: any): string | null {
  if (d === null || typeof d !== 'object' || Array.isArray(d)) return 'Wizard data must be an object.';
  let size = 0;
  try {
    size = Buffer.byteLength(JSON.stringify(d), 'utf8');
  } catch {
    return 'Wizard data is not valid.';
  }
  if (size > ONBOARDING_MAX_BYTES) return `Wizard data is too large (max ${ONBOARDING_MAX_BYTES / 1024} KB).`;
  for (const [k, max] of Object.entries(STRING_MAX)) {
    if (!(k in d) || d[k] === undefined || d[k] === null) continue;
    if (typeof d[k] !== 'string') return `${k} must be text.`;
    if (d[k].length > max) return `${k} must be at most ${max} characters.`;
  }
  for (const k of ARRAY_KEYS) {
    if (!(k in d) || d[k] === undefined || d[k] === null) continue;
    if (!Array.isArray(d[k])) return `${k} must be a list.`;
    if (d[k].length > ARRAY_MAX_ITEMS) return `${k} can have at most ${ARRAY_MAX_ITEMS} items.`;
    if (d[k].some((x: any) => typeof x !== 'string' || x.length > ARRAY_ITEM_MAX)) return `${k} must contain short text items only.`;
  }
  for (const [k, allowed] of Object.entries(ENUMS)) {
    if (k in d && d[k] !== '' && d[k] != null && !allowed.includes(d[k])) return `${k} must be one of: ${allowed.join(', ')}.`;
  }
  for (const k of BOOLEANS) {
    if (k in d && d[k] != null && typeof d[k] !== 'boolean') return `${k} must be true or false.`;
  }
  return null;
}

function IsOnboardingData(options?: ValidationOptions): PropertyDecorator {
  return (target, key) => {
    registerDecorator({
      name: 'isOnboardingData',
      target: target.constructor,
      propertyName: key as string,
      options,
      validator: {
        validate: (v: unknown) => validateOnboardingData(v) === null,
        defaultMessage: (args) => validateOnboardingData(args?.value) || 'Wizard data is not valid.',
      },
    });
  };
}

/** Body of PUT /Onboarding/Step */
export class SaveStepDto {
  @Type(() => Number)
  @IsInt({ message: 'Step must be a number between 1 and 10.' })
  @Min(1, { message: 'Step must be a number between 1 and 10.' })
  @Max(10, { message: 'Step must be a number between 1 and 10.' })
  step: number;

  @IsObject({ message: 'Wizard data must be an object.' })
  @IsOnboardingData()
  data: Record<string, any>;
}
