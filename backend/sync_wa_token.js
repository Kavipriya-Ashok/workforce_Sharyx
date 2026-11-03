const { Client } = require('pg');

async function syncTokens() {
  const client = new Client({
    host: '158.220.99.156',
    port: 5432,
    user: 'myuser',
    password: 'Login@123!',
    database: 'assistant_sharyx',
  });
  await client.connect();

  const validToken = 'EAAW0UQZABblgBS1yyeMG7bH6G8niZCZCUjx81D6psmO928j9r1GPndeGiBs4qI97Ivyn9ZC1NCZA7U3sWVT79A1Mw2AIFY01We4rhgZCwrQzWrJYVj04LR9EOPUbHBUIabfWbbD2UpTZAOneQfj8ZCnTKzZANVPhUKrZBb4JcqjZCFvQ9B5UXMU4OrkPsWpPPDbmQZDZD';

  const res = await client.query(
    "UPDATE whatsapp_config SET access_token = $1, is_connected = true WHERE tenant_id = 'default'",
    [validToken]
  );
  console.log('✅ Updated default tenant with valid Meta token:', res.rowCount);

  await client.end();
}

syncTokens().catch(console.error);

