const axios = require('./backend/node_modules/axios');
const { Client } = require('./backend/node_modules/pg');

async function testVapi() {
  const client = new Client({
    connectionString: 'postgresql://myuser:Login%40123%21@158.220.99.156:5432/assistant_sharyx'
  });
  await client.connect();
  const res = await client.query("SELECT * FROM voice_provider_config WHERE provider = 'vapi'");
  const cfg = res.rows[0];
  const apiKey = cfg.api_key;
  console.log('Vapi API Key:', apiKey.slice(0, 8) + '...');

  // Get active voice agents
  const agents = await client.query("SELECT id, name, remote_agent_id, provider, template_key FROM voice_agent");
  console.log('Voice Agents in DB:', agents.rows);

  // Fetch the assistant directly from Vapi API
  const ax = axios.default || axios;
  const vapiAgents = await ax.get('https://api.vapi.ai/assistant', {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  console.log('\nAssistants in Vapi:');
  vapiAgents.data.forEach(a => {
    console.log(`- ID: ${a.id} | Name: ${a.name} | FirstMessage: "${a.firstMessage}"`);
    console.log(`  Model:`, a.model);
  });

  await client.end();
}

testVapi().catch(console.error);
