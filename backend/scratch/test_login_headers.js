const axios = require('axios');

async function testLoginHeaders() {
  const baseUrl = 'https://fallback-voice.sharyx.ai';
  try {
    const res = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'parthibanbaskaran777@gmail.com',
      password: 'Login123!!'
    }, { timeout: 8000 });
    console.log('HEADERS:', res.headers);
    console.log('COOKIES:', res.headers['set-cookie']);
    console.log('KEYS IN DATA:', Object.keys(res.data));
  } catch (e) {
    console.log('LOGIN FAILED:', e.message);
  }
}

testLoginHeaders();
