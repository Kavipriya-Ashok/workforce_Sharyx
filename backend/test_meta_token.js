const axios = require('axios');

async function testToken() {
  const token = 'EAAW0UQZABblgBS1yyeMG7bH6G8niZCZCUjx81D6psmO928j9r1GPndeGiBs4qI97Ivyn9ZC1NCZA7U3sWVT79A1Mw2AIFY01We4rhgZCwrQzWrJYVj04LR9EOPUbHBUIabfWbbD2UpTZAOneQfj8ZCnTKzZANVPhUKrZBb4JcqjZCFvQ9B5UXMU4OrkPsWpPPDbmQZDZD';
  const phoneId = '1154030421127355';

  try {
    const res = await axios.get(`https://graph.facebook.com/v21.0/${phoneId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Meta Access Token is VALID!');
    console.log('Phone details:', res.data);
  } catch (e) {
    console.log('❌ Meta Access Token Error:');
    console.log(JSON.stringify(e.response?.data || e.message, null, 2));
  }
}

testToken();

