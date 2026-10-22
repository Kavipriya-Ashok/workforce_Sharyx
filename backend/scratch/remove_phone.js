const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'ai_workforce'
  });
  await client.connect();

  // Find all tables and their columns in public schema
  const colsRes = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND data_type IN ('character varying', 'text', 'character')
  `);

  console.log(`Searching across ${colsRes.rows.length} text columns in all tables...`);

  // Group by table
  const tableMap = {};
  for (const row of colsRes.rows) {
    if (!tableMap[row.table_name]) tableMap[row.table_name] = [];
    tableMap[row.table_name].push(row.column_name);
  }

  for (const [table, columns] of Object.entries(tableMap)) {
    for (const col of columns) {
      try {
        const check = await client.query(
          `SELECT COUNT(*) as count FROM "${table}" WHERE "${col}" LIKE '%8015779116%'`
        );
        const count = parseInt(check.rows[0].count);
        if (count > 0) {
          console.log(`Found ${count} rows in table "${table}" column "${col}"`);
          const del = await client.query(
            `DELETE FROM "${table}" WHERE "${col}" LIKE '%8015779116%'`
          );
          console.log(`  -> Deleted ${del.rowCount} rows from "${table}"`);
        }
      } catch (err) {
        // foreign key constraint or other
        // console.warn(`Error on table ${table}.${col}: ${err.message}`);
      }
    }
  }

  // Also check if any remaining records in any table
  console.log('\n--- Final Verification ---');
  let remainingTotal = 0;
  for (const [table, columns] of Object.entries(tableMap)) {
    for (const col of columns) {
      try {
        const check = await client.query(
          `SELECT COUNT(*) as count FROM "${table}" WHERE "${col}" LIKE '%8015779116%'`
        );
        const count = parseInt(check.rows[0].count);
        if (count > 0) {
          console.log(`Remaining: ${count} in "${table}"."${col}"`);
          remainingTotal += count;
        }
      } catch (err) {}
    }
  }

  if (remainingTotal === 0) {
    console.log('SUCCESS: All records matching 8015779116 have been completely removed from the database!');
  } else {
    console.log(`Found ${remainingTotal} remaining records.`);
  }

  await client.end();
}

main().catch(console.error);
