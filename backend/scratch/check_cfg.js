const { Client } = require("pg");
const c = new Client({
  host: "158.220.99.156",
  port: 5432,
  user: "myuser",
  password: "Login@123!",
  database: "assistant_sharyx",
  ssl: false
});

async function run() {
  await c.connect();
  const res = await c.query("SELECT * FROM voice_provider_config WHERE provider = $1", ["saas_fallback"]);
  console.log("SAAS CONFIG:", JSON.stringify(res.rows, null, 2));
  await c.end();
}

run().catch(console.error);
