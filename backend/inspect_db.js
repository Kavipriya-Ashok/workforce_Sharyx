const { Client } = require('pg');
const fs = require('fs');

const c = new Client({
  host: '158.220.99.156',
  port: 5432,
  user: 'myuser',
  password: 'Login@123!',
  database: 'assistant_sharyx'
});

async function run() {
  await c.connect();
  let out = '';
  const log = (str) => { out += str + '\n'; console.log(str); };

  // 1. All tables
  const tables = await c.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  log(`=== ALL TABLES (${tables.rows.length}) ===`);
  tables.rows.forEach(r => log(`  ${r.table_name}`));

  // 2. Table schemas
  for (const tbl of tables.rows) {
    const cols = await c.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
      [tbl.table_name]
    );
    log(`\n=== TABLE: ${tbl.table_name} (${cols.rows.length} columns) ===`);
    cols.rows.forEach(col => {
      log(`  ${col.column_name} | ${col.data_type} | nullable=${col.is_nullable}${col.column_default ? ' | default=' + col.column_default : ''}`);
    });
  }

  // 3. Foreign Keys
  const fks = await c.query(`
    SELECT
      tc.table_name AS source_table,
      kcu.column_name AS source_column,
      ccu.table_name AS target_table,
      ccu.column_name AS target_column,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `);
  log(`\n=== FOREIGN KEYS (${fks.rows.length}) ===`);
  fks.rows.forEach(fk => {
    log(`  ${fk.source_table}.${fk.source_column} -> ${fk.target_table}.${fk.target_column} (${fk.constraint_name})`);
  });

  // 4. Indexes
  const idxs = await c.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);
  log(`\n=== INDEXES (${idxs.rows.length}) ===`);
  idxs.rows.forEach(idx => {
    log(`  [${idx.tablename}] ${idx.indexname}: ${idx.indexdef}`);
  });

  // 5. Row counts for all tables
  log('\n=== TABLE ROW COUNTS ===');
  for (const tbl of tables.rows) {
    try {
      const cnt = await c.query(`SELECT COUNT(*) as cnt FROM "${tbl.table_name}"`);
      log(`  ${tbl.table_name}: ${cnt.rows[0].cnt} rows`);
    } catch (e) {
      log(`  ${tbl.table_name}: ERROR ${e.message}`);
    }
  }

  await c.end();
  fs.writeFileSync('inspect_db_results.txt', out, 'utf8');
  console.log('Saved to inspect_db_results.txt');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });

