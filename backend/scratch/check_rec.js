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
  const recId = 'e7d4fdfe-4259-404f-8f8e-117b227b2521';
  const llm = await c.query('SELECT * FROM agent_llm WHERE agent_id = $1', [recId]);
  console.log('REC LLM:', JSON.stringify(llm.rows, null, 2));
  const tts = await c.query('SELECT * FROM agent_tts WHERE agent_id = $1', [recId]);
  console.log('REC TTS:', JSON.stringify(tts.rows, null, 2));
  const stt = await c.query('SELECT * FROM agent_stt WHERE agent_id = $1', [recId]);
  console.log('REC STT:', JSON.stringify(stt.rows, null, 2));
  await c.end();
}

main().catch(console.error);
