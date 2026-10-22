import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { VoiceAgent } from "../src/Database/Table/Voice/VoiceAgent.entity";
import { VoiceProviderConfig } from "../src/Database/Table/Voice/VoiceProviderConfig.entity";
import { VoiceCallLog } from "../src/Database/Table/Voice/VoiceCallLog.entity";

import { VapiProvider } from "../src/Voice/Providers/Vapi.provider";
import { RetellProvider } from "../src/Voice/Providers/Retell.provider";
import { BlandProvider } from "../src/Voice/Providers/Bland.provider";
import { SaasFallbackProvider } from "../src/Voice/Providers/SaasFallback.provider";
import { VoiceFactoryService } from "../src/Voice/Services/VoiceFactory.service";
import { VoiceAgentService } from "../src/Voice/Services/VoiceAgent.service";

async function run() {
  const ds = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "12345",
    database: process.env.DB_NAME || "ai_workforce",
    entities: [VoiceAgent, VoiceProviderConfig, VoiceCallLog],
    synchronize: false,
    logging: false,
  });

  await ds.initialize();
  console.log("Connected to DB!");

  const vapi = new VapiProvider();
  const retell = new RetellProvider();
  const bland = new BlandProvider();
  const saasFallback = new SaasFallbackProvider();
  const factory = new VoiceFactoryService(vapi, retell, bland, saasFallback);
  const agentService = new VoiceAgentService(factory);

  console.log("Calling agentService.list()...");
  const agents = await agentService.list("default");
  console.log(`\n🎉 SYNC COMPLETED! TOTAL ACTIVE AGENTS: ${agents.length}`);
  agents.forEach((a, i) => {
    console.log(`${i + 1}. [${a.provider.toUpperCase()}] ${a.name} (Remote ID: ${a.remote_agent_id})`);
  });

  await ds.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
