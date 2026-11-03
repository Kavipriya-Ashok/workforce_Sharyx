const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function checkSchema() {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '12345',
    database: process.env.DB_NAME || 'ai_workforce'
  });
  await c.connect();
  const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'processed_messages';");
  console.log('processed_messages columns:', cols.rows);

  const errors = await c.query("SELECT * FROM error_log ORDER BY created_on DESC LIMIT 5;").catch(e => e.message);
  console.log('Recent error logs:', errors.rows || errors);

  await c.end();
}
checkSchema();
