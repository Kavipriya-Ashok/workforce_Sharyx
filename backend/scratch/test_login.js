const axios = require('axios');

async function testLogin() {
  const baseUrl = 'https://fallback-voice.sharyx.ai';
  try {
    const res = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'parthibanbaskaran777@gmail.com',
      password: 'Login123!!'
    }, { timeout: 8000 });
    console.log('LOGIN SUCCESS:', res.data);
  } catch (e) {
    console.log('LOGIN FAILED:', e.response ? `${e.response.status} - ${JSON.stringify(e.response.data)}` : e.message);
  }
}

testLogin();
