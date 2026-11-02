const axios = require('c:/Users/hp/workforce_Sharyx/backend/node_modules/axios');
const http = axios.default || axios;

async function testVapi() {
  const apiKey = '7afc05cf-0c9d-4825-bbfb-28beae484690';

  console.log('--- TEST VAPI PHONE NUMBERS ---');
  try {
    const res = await http.get('https://api.vapi.ai/phone-number', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    console.log('Phone numbers:', res.data);
  } catch (e) {
    console.error('Phone numbers error:', e.response?.data || e.message);
  }

  console.log('\n--- TEST VAPI ASSISTANTS ---');
  try {
    const res = await http.get('https://api.vapi.ai/assistant', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    console.log('Assistants count:', res.data.length);
    console.log(res.data.map(a => ({ id: a.id, name: a.name })));
  } catch (e) {
    console.error('Assistants error:', e.response?.data || e.message);
  }
}

testVapi();
