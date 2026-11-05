/* eslint-disable */
/**
 * BEFORE-evidence for "two tabs saving at once": a faithful re-implementation of the OLD Onboarding.saveStep algorithm
 * (read company row -> merge in memory -> write the whole row back, no lock), run twice concurrently against the scratch DB.
 * The NEW behaviour is proven by test N2-30 (30 parallel saves through the real API, nothing lost).
 */
const { Client } = require('pg');
const PG = { host: '127.0.0.1', port: 5433, user: 'scratch', password: 'scratch', database: process.env.DB_NAME || 'sharyx_m2' };
if (!/^sharyx_m2/.test(PG.database)) process.exit(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function oldSaveStep(tenant, patch) {
  const c = new Client(PG); await c.connect();
  const row = (await c.query(`select onboarding_data from company where id=$1`, [tenant])).rows[0]; // READ (no lock)
  const merged = { ...(row.onboarding_data || {}), ...patch };                                      // MERGE in memory
  await sleep(30);                                                                                  // validation / mapping work
  await c.query(`update company set onboarding_data=$2 where id=$1`, [tenant, JSON.stringify(merged)]); // WRITE whole object back
  await c.end();
}
(async () => {
  const db = new Client(PG); await db.connect();
  const t = (await db.query(`select id from company limit 1`)).rows[0].id;
  const orig = (await db.query(`select onboarding_data from company where id=$1`, [t])).rows[0].onboarding_data;
  await db.query(`update company set onboarding_data='{}' where id=$1`, [t]);
  let lost = 0; const trials = 20;
  for (let i = 0; i < trials; i++) {
    await db.query(`update company set onboarding_data='{}' where id=$1`, [t]);
    await Promise.all([oldSaveStep(t, { company_name: 'from tab 1' }), oldSaveStep(t, { address: 'from tab 2' })]);
    const d = (await db.query(`select onboarding_data from company where id=$1`, [t])).rows[0].onboarding_data;
    if (!(d.company_name && d.address)) lost++;
  }
  console.log(`OLD algorithm, 2 tabs saving different steps at the same moment, ${trials} trials: an answer was LOST in ${lost}/${trials} trials`);
  await db.query(`update company set onboarding_data=$2 where id=$1`, [t, orig ? JSON.stringify(orig) : null]); await db.end();
})();
