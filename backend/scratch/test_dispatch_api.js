const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:8000/api/Voice/Calls/dispatch', {
      agent_id: '542517a3-b42d-44ef-908f-2d7ffc8e74c6',
      phone_number: '+19205042591',
      customer_name: 'Priya Test',
      tenantId: 'default'
    });
    console.log('DISPATCH SAAS SUCCESS:', res.data);
  } catch (err) {
    console.error('STATUS:', err.response?.status, 'DATA:', err.response?.data, 'MSG:', err.message);
  }
}
test();
