const axios = require('axios');

async function testMakeCallNoFromNumber() {
  const baseUrl = 'https://fallback-voice.sharyx.ai';
  const loginRes = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'parthibanbaskaran777@gmail.com',
    password: 'Login123!!'
  });
  
  const cookies = loginRes.headers['set-cookie'] || [];
  let token = '';
  for (const c of cookies) {
    const match = c.match(/token=([^;]+)/);
    if (match) token = match[1];
  }

  // Without from_number
  const testPayload = {
    agent_id: 'e7d4fdfe-4259-404f-8f8e-117b227b2521',
    phone_number: '+19205042591',
  };

  try {
    const res = await axios.post(`${baseUrl}/api/agent/makecall`, testPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `token=${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('CALL SUCCESS WITHOUT FROM_NUMBER:', res.data);
  } catch (e) {
    console.log('CALL FAILED STATUS:', e.response?.status);
    console.log('CALL FAILED DATA:', JSON.stringify(e.response?.data, null, 2));
  }
}

testMakeCallNoFromNumber();
