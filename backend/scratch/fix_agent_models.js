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
  const sourceAgentId = 'e7d4fdfe-4259-404f-8f8e-117b227b2521'; // AI Receptionist
  const targetAgentId = '542517a3-b42d-44ef-908f-2d7ffc8e74c6'; // Aria - Priya AI Receptionist

  // Copy LLM if target doesn't have one
  const existingLlm = await c.query('SELECT id FROM agent_llm WHERE agent_id = $1', [targetAgentId]);
  if (existingLlm.rows.length === 0) {
    const srcLlm = await c.query('SELECT * FROM agent_llm WHERE agent_id = $1 LIMIT 1', [sourceAgentId]);
    if (srcLlm.rows.length > 0) {
      const row = srcLlm.rows[0];
      await c.query(`
        INSERT INTO agent_llm (tenant_id, organization_id, workspace_id, agent_id, model, provider_id, config, created_by_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [row.tenant_id, row.organization_id, row.workspace_id, targetAgentId, row.model, row.provider_id, row.config, row.created_by_id]);
      console.log('✅ Attached LLM to Aria');
    }
  }

  // Copy TTS if target doesn't have one
  const existingTts = await c.query('SELECT id FROM agent_tts WHERE agent_id = $1', [targetAgentId]);
  if (existingTts.rows.length === 0) {
    const srcTts = await c.query('SELECT * FROM agent_tts WHERE agent_id = $1 LIMIT 1', [sourceAgentId]);
    if (srcTts.rows.length > 0) {
      const row = srcTts.rows[0];
      await c.query(`
        INSERT INTO agent_tts (tenant_id, organization_id, workspace_id, agent_id, model, voice_id, provider_id, config, created_by_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [row.tenant_id, row.organization_id, row.workspace_id, targetAgentId, row.model, row.voice_id, row.provider_id, row.config, row.created_by_id]);
      console.log('✅ Attached TTS (Voice) to Aria');
    }
  }

  // Copy STT if target doesn't have one
  const existingStt = await c.query('SELECT id FROM agent_stt WHERE agent_id = $1', [targetAgentId]);
  if (existingStt.rows.length === 0) {
    const srcStt = await c.query('SELECT * FROM agent_stt WHERE agent_id = $1 LIMIT 1', [sourceAgentId]);
    if (srcStt.rows.length > 0) {
      const row = srcStt.rows[0];
      await c.query(`
        INSERT INTO agent_stt (tenant_id, organization_id, workspace_id, agent_id, model, provider_id, config, created_by_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [row.tenant_id, row.organization_id, row.workspace_id, targetAgentId, row.model, row.provider_id, row.config, row.created_by_id]);
      console.log('✅ Attached STT to Aria');
    }
  }

  // Also do the same for AI Recruitment Agent
  const recruitAgentId = '86d84465-8db0-442b-9078-c287165e10ac';
  const exRecLlm = await c.query('SELECT id FROM agent_llm WHERE agent_id = $1', [recruitAgentId]);
  if (exRecLlm.rows.length === 0) {
    const srcLlm = await c.query('SELECT * FROM agent_llm WHERE agent_id = $1 LIMIT 1', [sourceAgentId]);
    if (srcLlm.rows.length > 0) {
      const row = srcLlm.rows[0];
      await c.query(`
        INSERT INTO agent_llm (tenant_id, organization_id, workspace_id, agent_id, model, provider_id, config, created_by_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [row.tenant_id, row.organization_id, row.workspace_id, recruitAgentId, row.model, row.provider_id, row.config, row.created_by_id]);
      console.log('✅ Attached LLM to Recruitment Agent');
    }
  }
  const exRecTts = await c.query('SELECT id FROM agent_tts WHERE agent_id = $1', [recruitAgentId]);
  if (exRecTts.rows.length === 0) {
    const srcTts = await c.query('SELECT * FROM agent_tts WHERE agent_id = $1 LIMIT 1', [sourceAgentId]);
    if (srcTts.rows.length > 0) {
      const row = srcTts.rows[0];
      await c.query(`
        INSERT INTO agent_tts (tenant_id, organization_id, workspace_id, agent_id, model, voice_id, provider_id, config, created_by_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [row.tenant_id, row.organization_id, row.workspace_id, recruitAgentId, row.model, row.voice_id, row.provider_id, row.config, row.created_by_id]);
      console.log('✅ Attached TTS to Recruitment Agent');
    }
  }
  const exRecStt = await c.query('SELECT id FROM agent_stt WHERE agent_id = $1', [recruitAgentId]);
  if (exRecStt.rows.length === 0) {
    const srcStt = await c.query('SELECT * FROM agent_stt WHERE agent_id = $1 LIMIT 1', [sourceAgentId]);
    if (srcStt.rows.length > 0) {
      const row = srcStt.rows[0];
      await c.query(`
        INSERT INTO agent_stt (tenant_id, organization_id, workspace_id, agent_id, model, provider_id, config, created_by_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [row.tenant_id, row.organization_id, row.workspace_id, recruitAgentId, row.model, row.provider_id, row.config, row.created_by_id]);
      console.log('✅ Attached STT to Recruitment Agent');
    }
  }

  await c.end();
  console.log('🎉 ALL AGENTS NOW HAVE FULL LLM, TTS, STT CONFIGURATION!');
}

main().catch(console.error);
