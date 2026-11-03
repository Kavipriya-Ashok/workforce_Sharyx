const axios = require('axios');

async function testSend() {
  const token = 'EAAW0UQZABblgBS1yyeMG7bH6G8niZCZCUjx81D6psmO928j9r1GPndeGiBs4qI97Ivyn9ZC1NCZA7U3sWVT79A1Mw2AIFY01We4rhgZCwrQzWrJYVj04LR9EOPUbHBUIabfWbbD2UpTZAOneQfj8ZCnTKzZANVPhUKrZBb4JcqjZCFvQ9B5UXMU4OrkPsWpPPDbmQZDZD';
  const phoneId = '1154030421127355';
  const targetPhone = '918015779116';

  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: targetPhone,
    type: 'text',
    text: { preview_url: false, body: 'Hello from Sharyx test!' }
  };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('✅ Message Send Success:', res.data);
  } catch (err) {
    console.log('❌ Message Send Error:');
    console.log(JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

testSend();

