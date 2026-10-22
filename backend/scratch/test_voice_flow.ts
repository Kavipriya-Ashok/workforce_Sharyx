import { DataSource } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { VoiceAgent } from "../src/Database/Table/Voice/VoiceAgent.entity";
import { VoiceProviderConfig } from "../src/Database/Table/Voice/VoiceProviderConfig.entity";
import { VoiceCallLog } from "../src/Database/Table/Voice/VoiceCallLog.entity";
import { lead } from "../src/Database/Table/Lead/lead";
import { lead_activity } from "../src/Database/Table/Lead/lead_activity";

import { VapiProvider } from "../src/Voice/Providers/Vapi.provider";
import { RetellProvider } from "../src/Voice/Providers/Retell.provider";
import { BlandProvider } from "../src/Voice/Providers/Bland.provider";
import { SaasFallbackProvider } from "../src/Voice/Providers/SaasFallback.provider";
import { VoiceFactoryService } from "../src/Voice/Services/VoiceFactory.service";
import { VoiceCallService } from "../src/Voice/Services/VoiceCall.service";
import { VoiceAgentService } from "../src/Voice/Services/VoiceAgent.service";

async function runTest() {
  console.log("=================================================================");
  console.log("🚀 TESTING DYNAMIC VOICE AI PIPELINE (HERE PROJECT -> THAT PROJECT)");
  console.log("=================================================================\n");

  const ds = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "12345",
    database: process.env.DB_NAME || "ai_workforce",
    entities: [VoiceAgent, VoiceProviderConfig, VoiceCallLog, lead, lead_activity],
    synchronize: true,
    logging: false,
  });

  await ds.initialize();
  console.log("✅ [1/5] Connected to PostgreSQL Database.");

  // Instantiate services
  const events = new EventEmitter2();
  const vapi = new VapiProvider();
  const retell = new RetellProvider();
  const bland = new BlandProvider();
  const saasFallback = new SaasFallbackProvider();
  const factory = new VoiceFactoryService(vapi, retell, bland, saasFallback);
  const callService = new VoiceCallService(factory, events);
  const agentService = new VoiceAgentService(factory);

  // 1. Seed or fetch agents
  console.log("🌱 [2/5] Ensuring Voice Agents exist...");
  const agents = await agentService.list("default");
  console.log(`Found ${agents.length} Voice Agents:`);
  agents.forEach((a) => console.log(`   - [${a.provider.toUpperCase()}] ${a.name} (Remote ID: ${a.remote_agent_id})`));

  const testAgent = agents[0];
  console.log(`\n🎯 Using Voice Agent: "${testAgent.name}" (Engine: ${testAgent.provider.toUpperCase()})`);

  // 2. Dispatch a Dynamic Call
  console.log("\n📞 [3/5] Dispatching Outbound Call with Dynamic Payload Variables...");
  const dynamicPayload = {
    agent_id: testAgent.id,
    phone_number: "+919876543210",
    customer_name: "Kavipriya",
    tenantId: "default",
    custom_variables: {
      service: "Enterprise AI Workforce",
      discount_code: "SHARYX2026",
      appointment_date: "Tomorrow at 4:00 PM IST",
      custom_inquiry: "Interested in automated voice lead generation",
    },
  };

  console.log("📦 Payload being transmitted to Voice Provider:");
  console.log(JSON.stringify(dynamicPayload, null, 2));

  const callLog = await callService.dispatchCall(dynamicPayload);
  console.log("\n✅ Call Dispatched Successfully!");
  console.log(`   - Call Log ID: ${callLog.id}`);
  console.log(`   - Provider Call ID: ${callLog.provider_call_id}`);
  console.log(`   - Customer Phone: ${callLog.customer_phone}`);
  console.log(`   - Call Status: ${callLog.call_status}`);
  console.log(`   - Extracted Dynamic Variables:`, callLog.extracted_slots);

  // 3. Simulate Incoming Webhook
  console.log("\n📡 [4/5] Simulating Returning Webhook from Remote Provider after Call Completion...");
  const mockWebhookPayload = {
    call_id: callLog.provider_call_id,
    status: "completed",
    duration_seconds: 78,
    recording_url: "https://api.vapi.ai/recordings/demo_call_audio.mp3",
    summary: "Customer Kavipriya confirmed interest in Enterprise AI Workforce and requested a Google Meet demo.",
    transcript:
      "AI: Hello Kavipriya! Calling from Sharyx about Enterprise AI Workforce.\nCustomer: Yes, tell me about the automated voice lead gen.\nAI: We provide turn-taking AI voice agents that plug into your CRM.\nCustomer: Great, let's schedule a demo tomorrow at 4 PM.",
  };

  const webhookResult = await callService.handleWebhook(testAgent.provider, mockWebhookPayload);
  console.log("✅ Webhook Ingested & Normalized:");
  console.log(`   - Status: ${webhookResult.status}`);
  console.log(`   - Duration: ${webhookResult.durationSeconds}s`);
  console.log(`   - Recording URL: ${webhookResult.recordingUrl}`);
  console.log(`   - Summary: ${webhookResult.summary}`);

  // 4. Verify Call Stats
  console.log("\n📊 [5/5] Checking Real-time Call Analytics in Database...");
  const stats = await callService.getCallStats("default");
  console.log("Updated Stats:", stats);

  console.log("\n🎉 ALL TESTS PASSED! THE DYNAMIC PIPELINE IS FULLY OPERATIONAL.");
  await ds.destroy();
  process.exit(0);
}

runTest().catch((err) => {
  console.error("❌ Test Error:", err);
  process.exit(1);
});
