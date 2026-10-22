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
  const res = await c.query(`
    SELECT a.id, a.name, a.tenant_id,
           (SELECT count(*) FROM agent_llm WHERE agent_id = a.id) as llm_count,
           (SELECT count(*) FROM agent_tts WHERE agent_id = a.id) as tts_count,
           (SELECT count(*) FROM agent_stt WHERE agent_id = a.id) as stt_count
    FROM agent a
    WHERE a.tenant_id = '009f2e19-d9c5-4e26-8fa4-4110c75a347f'
       OR a.id = '8d4fcfa2-8709-425c-bc2e-a42bd14142d6'
  `);
  console.log('AGENT CONFIG COUNTS:', res.rows);
  
  // Show working agent's LLM, TTS, STT
  const workingId = '8d4fcfa2-8709-425c-bc2e-a42bd14142d6';
  const llm = await c.query("SELECT * FROM agent_llm WHERE agent_id = $1", [workingId]);
  console.log('WORKING LLM:', llm.rows);
  const tts = await c.query("SELECT * FROM agent_tts WHERE agent_id = $1", [workingId]);
  console.log('WORKING TTS:', tts.rows);
  const stt = await c.query("SELECT * FROM agent_stt WHERE agent_id = $1", [workingId]);
  console.log('WORKING STT:', stt.rows);

  await c.end();
}

main().catch(console.error);
