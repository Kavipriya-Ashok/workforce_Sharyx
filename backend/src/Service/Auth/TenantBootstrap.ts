import { EntityManager } from 'typeorm';
import { company } from '@Database/Table/Admin/company';
import { country } from '@Database/Table/Admin/country';
import { currency } from '@Database/Table/Admin/currency';
import { user_role } from '@Database/Table/Admin/user_role';

/**
 * Every helper takes an optional EntityManager. Pass the one from `dataSource.transaction(...)` and the
 * work joins that transaction (all-or-nothing); omit it for the old stand-alone behaviour.
 */
const repo = (em: EntityManager | undefined, entity: any) => (em ? em.getRepository(entity) : entity.getRepository());

/**
 * Reference rows every new tenant needs (company.country_id / currency_id are NOT NULL FKs).
 * On an unseeded database (DB_SEED not set) signup used to fail with "no country/currency
 * reference data is seeded". Create the same defaults the seeder uses, only when none exist.
 */
export async function ensureCountryAndCurrency(em?: EntityManager): Promise<{ countryId: string; currencyId: string }> {
  let cur: any = await repo(em, currency).findOne({ where: {} });
  if (!cur) {
    cur = new currency();
    cur.name = 'Pound sterling';
    cur.code = 'GBP';
    cur.symbol = '£';
    cur.created_by_id = '0';
    cur.created_on = new Date();
    cur = await repo(em, currency).save(cur);
  }
  let c: any = await repo(em, country).findOne({ where: {} });
  if (!c) {
    c = new country();
    c.name = 'United Kingdom';
    c.code = 'UK';
    c.currency_id = cur.id;
    c.created_by_id = '0';
    c.created_on = new Date();
    c = await repo(em, country).save(c);
  }
  return { countryId: c.id, currencyId: cur.id };
}

/** Role given to every self-service signup. Created on first use if missing. */
export async function ensureAdminRole(em?: EntityManager): Promise<user_role> {
  let role: any = await repo(em, user_role).findOne({ where: { code: 'ADMIN' } });
  if (!role) {
    role = new user_role();
    role.name = 'Admin';
    role.code = 'ADMIN';
    role.status = true;
    role = await repo(em, user_role).save(role);
  }
  return role;
}

/** Creates a brand-new tenant row (never shared between signups). */
export async function createTenant(name: string, ownerEmail: string, em?: EntityManager): Promise<company> {
  const { countryId, currencyId } = await ensureCountryAndCurrency(em);
  const t = new company();
  t.name = name;
  t.address = '';
  t.postal_code = '';
  t.email = ownerEmail;
  t.country_id = countryId;
  t.currency_id = currencyId;
  t.onboarding_completed = false;
  t.onboarding_step = 1;
  t.status = true;
  t.created_on = new Date();
  return (await repo(em, company).save(t)) as company;
}
