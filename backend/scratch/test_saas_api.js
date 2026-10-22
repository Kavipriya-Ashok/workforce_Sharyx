const axios = require('axios');

async function test() {
  const token = 'shx_priv_0b2cd106e4bf888f81adb18599d5cd8fbbb155dd2a1731a6';
  const baseUrl = 'https://fallback-voice.sharyx.ai';
  const endpoints = [
    '/api/agent/list',
    '/api/agent',
    '/api/agent/all',
    '/api/agents',
    '/api/PublicAgent/list'
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Trying ${baseUrl}${ep}...`);
      const res = await axios.get(`${baseUrl}${ep}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-key': token,
          'X-API-Key': token,
        },
        timeout: 5000,
      });
      console.log(`SUCCESS ${ep}:`, res.status, res.data);
    } catch (e) {
      console.log(`FAIL ${ep}:`, e.response ? `${e.response.status} - ${JSON.stringify(e.response.data)}` : e.message);
    }
  }
}

test();
