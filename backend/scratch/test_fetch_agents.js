const axios = require('axios');

async function testFetchAgents() {
  const baseUrl = 'https://fallback-voice.sharyx.ai';
  try {
    const loginRes = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'parthibanbaskaran777@gmail.com',
      password: 'Login123!!'
    });
    
    // Extract token from cookie
    const cookies = loginRes.headers['set-cookie'] || [];
    let token = '';
    for (const c of cookies) {
      const match = c.match(/^token=([^;]+)/);
      if (match) token = match[1];
    }
    console.log('Got JWT Token:', token.substring(0, 30) + '...');

    const res = await axios.get(`${baseUrl}/api/agent/list`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `token=${token}`,
      }
    });

    console.log('AGENTS ON SAAS PLATFORM:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.log('FETCH FAILED:', e.response ? `${e.response.status} - ${JSON.stringify(e.response.data)}` : e.message);
  }
}

testFetchAgents();
