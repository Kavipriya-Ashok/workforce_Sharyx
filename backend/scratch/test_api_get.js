const axios = require('axios');

async function check() {
  try {
    const res = await axios.get('http://localhost:8000/api/v1/Voice/Agents');
    console.log('GET /Voice/Agents SUCCESS, COUNT:', res.data.data.length);
    res.data.data.forEach(a => console.log(`- [${a.provider}] ${a.name} (${a.remote_agent_id})`));
  } catch (e) {
    console.log('GET FAILED:', e.response ? `${e.response.status} - ${JSON.stringify(e.response.data)}` : e.message);
  }
}

check();
