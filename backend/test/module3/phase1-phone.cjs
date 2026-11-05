/* eslint-disable */
// Module 3 / Phase 1 - E.164 helper. No DB.   node -r ts-node/register/transpile-only -r tsconfig-paths/register test/module3/phase1-phone.cjs <out.json>
require('reflect-metadata');
const path = require('path'); const fs = require('fs');
const { toE164, samePhone, toMetaDigits, phoneLookupVariants } = require(path.resolve(__dirname, '../../src/Helper/Phone.ts'));
const rows = []; let bad = 0;
const t = (id, title, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; rows.push({ id, title, status: ok ? 'PASS' : 'FAIL', actual: JSON.stringify(got) }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${title}\n      -> got ${JSON.stringify(got)}${ok ? '' : ' / wanted ' + JSON.stringify(want)}`); };
t('E-01', 'India, national 10 digits + tenant country IN', toE164('98765 43210', 'IN'), '+919876543210');
t('E-02', 'India, "+91 98765-43210"', toE164('+91 98765-43210'), '+919876543210');
t('E-03', 'India, digits as stored by Meta "919876543210" (no country given)', toE164('919876543210'), '+919876543210');
t('E-04', 'India, 0091 prefix', toE164('0091 98765 43210'), '+919876543210');
t('E-05', 'India, leading 0 national "09876543210" + IN', toE164('09876543210', 'IN'), '+919876543210');
t('E-06', 'USA national + tenant country US', toE164('(415) 555-2671', 'US'), '+14155552671');
t('E-07', 'USA with +1', toE164('+1 415 555 2671'), '+14155552671');
t('E-08', 'UK mobile + country GB', toE164('07911 123456', 'GB'), '+447911123456');
t('E-09', 'UAE with +971', toE164('+971 50 123 4567'), '+971501234567');
t('E-10', 'Singapore national + SG', toE164('9123 4567', 'SG'), '+6591234567');
t('E-11', 'NO built-in country: a 10-digit number with no country is NOT guessed', toE164('9876543210'), null);
t('E-12', 'NO hardcoded 91: same national number resolves per tenant country (US tenant)', toE164('4155552671', 'US'), '+14155552671');
t('E-13', 'Garbage / letters / empty / too short', [toE164('abc'), toE164(''), toE164(null), toE164('12345', 'IN'), toE164('+999')], [null, null, null, null, null]);
t('E-14', 'Same person written 3 ways', [samePhone('+91 98765 43210', '919876543210'), samePhone('98765 43210', '+919876543210', 'IN'), samePhone('+919876543210', '+14155552671')], [true, true, false]);
t('E-15', 'Digits for Meta API', toMetaDigits('+91 98765 43210'), '919876543210');
t('E-16', 'Lookup variants cover old spellings (digits, +, national)', phoneLookupVariants('+919876543210').sort(), ['+919876543210', '919876543210', '9876543210'].sort());
t('E-17', 'Invalid default country code is ignored, not crashed', toE164('98765 43210', 'ZZ'), null);
fs.writeFileSync(process.argv[2] || 'phase1-phone.json', JSON.stringify(rows, null, 2));
console.log(`\n${rows.length - bad}/${rows.length} passed`); process.exit(0);
