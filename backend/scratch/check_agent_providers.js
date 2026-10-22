const { Client } = require('pg');

const c = new Client({
  host: '158.220.99.156',
  port: 5432,
  user: 'myuser',
  password: 'Login@123!',
  database: 'new_sharyx_saas',
  ssl: false
});

async function main() {
  await c.connect();
  const agentId = '542517a3-b42d-44ef-908f-2d7ffc8e74c6';
  const ag = await c.query("SELECT id, name, first_message, system_prompt FROM agent WHERE id = $1", [agentId]);
  console.log('AGENT:', ag.rows);
  const llm = await c.query("SELECT * FROM agent_llm WHERE agent_id = $1", [agentId]);
  console.log('LLM:', llm.rows);
  const tts = await c.query("SELECT * FROM agent_tts WHERE agent_id = $1", [agentId]);
  console.log('TTS:', tts.rows);
  const stt = await c.query("SELECT * FROM agent_stt WHERE agent_id = $1", [agentId]);
  console.log('STT:', stt.rows);
  await c.end();
}

main().catch(console.error);
