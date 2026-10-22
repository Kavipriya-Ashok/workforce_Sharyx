const axios = require('axios');

async function testMakeCall() {
  const baseUrl = 'https://fallback-voice.sharyx.ai';
  // Let's get the token
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

  // Let's test makecall payload
  // In the screenshot caller_id was set to 'priyashok@gmail.com' or phone
  const testPayload = {
    agent_id: 'e7d4fdfe-4259-404f-8f8e-117b227b2521', // AI Receptionist
    phone_number: '+19205042591',
    from_number: 'priyashok@gmail.com', // as seen in screenshot
    customer_name: 'Test Customer',
  };

  try {
    const res = await axios.post(`${baseUrl}/api/agent/makecall`, testPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `token=${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('CALL SUCCESS:', res.data);
  } catch (e) {
    console.log('CALL FAILED STATUS:', e.response?.status);
    console.log('CALL FAILED DATA:', JSON.stringify(e.response?.data, null, 2));
  }
}

testMakeCall();
