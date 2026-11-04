const assert = require('assert');

// Load compiled classes from dist
const { OmnichannelSummarizerService } = require('./dist/Omnichannel/Services/OmnichannelSummarizer.service');
const { OmnichannelRealtimeService } = require('./dist/Omnichannel/Services/OmnichannelRealtime.service');
const { OmnichannelIngestionService } = require('./dist/Omnichannel/Services/OmnichannelIngestion.service');
const { OmnichannelService } = require('./dist/Omnichannel/Services/Omnichannel.service');
const { OmnichannelStatusEnum } = require('./dist/Omnichannel/Dto/Omnichannel.dto');

async function runOmnichannelTestSuite() {
  console.log('🧪 ========================================================');
  console.log('   STARTING COMPREHENSIVE OMNICHANNEL FLOW TEST SUITE');
  console.log('========================================================\n');

  // In-memory repositories
  let customers = [];
  let conversations = [];
  let messages = [];
  let calls = [];
  let activities = [];

  const customerRepo = {
    create: (dto) => ({ id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...dto }),
    save: async (item) => {
      const idx = customers.findIndex((c) => c.id === item.id);
      if (idx >= 0) {
        customers[idx] = { ...customers[idx], ...item };
        return customers[idx];
      }
      customers.push(item);
      return item;
    },
    findOne: async (options) => {
      if (Array.isArray(options.where)) {
        for (const cond of options.where) {
          const found = customers.find((c) => cond.phone && c.phone === cond.phone);
          if (found) return found;
        }
      }
      if (options.where?.phone) return customers.find((c) => c.phone === options.where.phone) || null;
      if (options.where?.email) return customers.find((c) => c.email === options.where.email) || null;
      if (options.where?.id) return customers.find((c) => c.id === options.where.id) || null;
      return null;
    },
  };

  const convRepo = {
    create: (dto) => ({ id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...dto }),
    save: async (item) => {
      const idx = conversations.findIndex((c) => c.id === item.id);
      if (idx >= 0) {
        conversations[idx] = { ...conversations[idx], ...item };
        return conversations[idx];
      }
      conversations.push(item);
      return item;
    },
    findOne: async (options) => {
      if (options.where?.id) {
        const conv = conversations.find((c) => c.id === options.where.id);
        if (conv) {
          const cust = customers.find((u) => u.id === conv.customer_id);
          return { ...conv, customer: cust };
        }
        return null;
      }
      if (options.where?.customer_id && options.where?.channel) {
        return conversations.find(
          (c) => c.customer_id === options.where.customer_id && c.channel === options.where.channel
        ) || null;
      }
      return null;
    },
    find: async (options) => {
      if (options.where?.customer_id) {
        return conversations.filter((c) => c.customer_id === options.where.customer_id);
      }
      return conversations;
    },
    createQueryBuilder: () => ({
      leftJoinAndSelect: function () { return this; },
      where: function () { return this; },
      andWhere: function () { return this; },
      orderBy: function () { return this; },
      skip: function () { return this; },
      take: function () { return this; },
      getManyAndCount: async () => [
        conversations.map((c) => ({
          ...c,
          customer: customers.find((u) => u.id === c.customer_id),
        })),
        conversations.length,
      ],
    }),
  };

  const msgRepo = {
    create: (dto) => ({ id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...dto }),
    save: async (item) => {
      if (Array.isArray(item)) {
        messages.push(...item);
        return item;
      }
      messages.push(item);
      return item;
    },
    findOne: async (options) => {
      if (options.where?.provider_message_id) {
        return messages.find((m) => m.provider_message_id === options.where.provider_message_id) || null;
      }
      return null;
    },
    find: async (options) => {
      if (options.where?.conversation_id) {
        return messages.filter((m) => m.conversation_id === options.where.conversation_id);
      }
      return messages;
    },
    createQueryBuilder: () => ({
      where: function () { return this; },
      orderBy: function () { return this; },
      getMany: async () => messages,
    }),
  };

  const callRepo = {
    create: (dto) => ({ id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...dto }),
    save: async (item) => {
      if (Array.isArray(item)) {
        calls.push(...item);
        return item;
      }
      calls.push(item);
      return item;
    },
    findOne: async (options) => {
      if (options.where?.provider_call_id) {
        return calls.find((c) => c.provider_call_id === options.where.provider_call_id) || null;
      }
      return null;
    },
    find: async (options) => {
      if (options.where?.conversation_id) {
        return calls.filter((c) => c.conversation_id === options.where.conversation_id);
      }
      return calls;
    },
    createQueryBuilder: () => ({
      where: function () { return this; },
      orderBy: function () { return this; },
      getMany: async () => calls,
    }),
  };

  const activityRepo = {
    create: (dto) => ({ id: `act_${Date.now()}`, ...dto }),
    save: async (item) => {
      activities.push(item);
      return item;
    },
    find: async () => activities,
    createQueryBuilder: () => ({
      where: function () { return this; },
      orderBy: function () { return this; },
      getMany: async () => activities,
    }),
  };

  const summarizer = new OmnichannelSummarizerService();
  const realtime = new OmnichannelRealtimeService();
  const ingestion = new OmnichannelIngestionService(
    customerRepo,
    convRepo,
    msgRepo,
    callRepo,
    activityRepo,
    summarizer,
    realtime
  );
  const omnichannelService = new OmnichannelService(
    customerRepo,
    convRepo,
    msgRepo,
    callRepo,
    activityRepo,
    realtime
  );

  let passedTests = 0;

  // TEST 1: WhatsApp Inbound & Customer Auto-Creation
  console.log('▶ Test 1: Ingest incoming WhatsApp webhook & auto-create customer');
  const wa1 = await ingestion.ingestWhatsAppMessage({
    provider_message_id: 'wa_msg_901',
    from_phone: '+919876543210',
    customer_name: 'Aarav Sharma',
    body: 'Hello, I want to know about your enterprise plan and pricing.',
  });
  assert(wa1.success === true, 'WhatsApp ingestion must succeed');
  assert(wa1.customerId, 'Customer must be auto-created with an ID');
  assert(wa1.summary.length > 5, 'One-line summary must be generated');
  const createdCustomer = customers.find((c) => c.id === wa1.customerId);
  assert(createdCustomer.name === 'Aarav Sharma', 'Customer name must match');
  console.log(`  ✅ WhatsApp ingested! Customer: "${createdCustomer.name}", Summary: "${wa1.summary}"`);
  passedTests++;

  // TEST 2: Idempotency Dedup
  console.log('\n▶ Test 2: Idempotency duplicate check');
  const waDuplicate = await ingestion.ingestWhatsAppMessage({
    provider_message_id: 'wa_msg_901',
    from_phone: '+919876543210',
    body: 'Duplicate message text',
  });
  assert(waDuplicate.duplicate === true, 'Duplicate provider message ID must be detected and rejected');
  assert(messages.length === 1, 'Messages list must not have duplicated items');
  console.log('  ✅ Idempotency verified! Duplicate message was cleanly deduplicated.');
  passedTests++;

  // TEST 3: Inbound Email Webhook & Linking by Phone / Email
  console.log('\n▶ Test 3: Ingest incoming Email webhook & link customer');
  const email1 = await ingestion.ingestEmailMessage({
    provider_message_id: 'email_msg_301',
    from_email: 'sarah.connor@cyberdyne.org',
    customer_name: 'Sarah Connor',
    subject: 'API Rate Limits & SLAs',
    body: 'Hi, what are your throughput rate limits for the voice agent pipeline?',
  });
  assert(email1.success === true, 'Email ingestion must succeed');
  assert(email1.summary.includes('API Rate Limits'), 'Summary should capture subject');
  const emailMsg = messages.find((m) => m.provider_message_id === 'email_msg_301');
  assert(emailMsg.subject === 'API Rate Limits & SLAs', 'Subject line must be preserved');
  console.log(`  ✅ Email ingested! Subject: "${emailMsg.subject}", Summary: "${email1.summary}"`);
  passedTests++;

  // TEST 4: Inbound Call Webhook (Telephony / Vapi)
  console.log('\n▶ Test 4: Ingest telephony / Vapi call event');
  const call1 = await ingestion.ingestCallEvent({
    provider_call_id: 'call_vapi_7701',
    phone_number: '+919876543210', // Same phone as Aarav Sharma!
    customer_name: 'Aarav Sharma',
    direction: 'inbound',
    duration: 185,
    recording_url: 'https://cdn.example.com/recording_7701.mp3',
    transcript: 'Customer Aarav called to schedule a 30-minute technical architecture review.',
    ai_summary: 'Caller Aarav scheduled a 30m technical review with solutions engineer.',
    outcome: 'completed',
  });
  assert(call1.success === true, 'Call ingestion must succeed');
  assert(call1.customerId === wa1.customerId, 'Call should link to existing customer with same phone number');
  const savedCall = calls.find((c) => c.provider_call_id === 'call_vapi_7701');
  assert(savedCall.duration === 185, 'Duration must be preserved');
  assert(savedCall.recording_url, 'Recording URL must be preserved');
  console.log(`  ✅ Call event ingested! Linked to Customer ID: ${call1.customerId}, Duration: ${savedCall.duration}s`);
  passedTests++;

  // TEST 5: Outgoing WhatsApp Reply
  console.log('\n▶ Test 5: Outgoing WhatsApp reply on the same channel');
  const replyWa = await omnichannelService.sendReply(wa1.conversationId, {
    body: 'Hi Aarav, our enterprise pricing starts at ₹15,000/mo. Sending the PDF catalog.',
  }, 'default', 'Agent Maya');
  assert(replyWa.success === true, 'Reply must succeed');
  assert(replyWa.channel === 'whatsapp', 'Reply channel must match conversation channel');
  const outWaMsg = messages.find((m) => m.direction === 'out' && m.conversation_id === wa1.conversationId);
  assert(outWaMsg && outWaMsg.body.includes('₹15,000'), 'Outbound message body preserved');
  console.log(`  ✅ Outbound WhatsApp reply dispatched: "${outWaMsg.body}"`);
  passedTests++;

  // TEST 6: Outgoing Email Reply
  console.log('\n▶ Test 6: Outgoing Email reply with custom subject');
  const replyEmail = await omnichannelService.sendReply(email1.conversationId, {
    body: 'Hi Sarah, our voice pipeline guarantees sub-500ms TTFT and handles up to 500 concurrent channels.',
    subject: 'Re: API Rate Limits & SLAs - Confirmed',
  }, 'default', 'Agent Maya');
  assert(replyEmail.success === true, 'Email reply must succeed');
  const outEmailMsg = messages.find((m) => m.direction === 'out' && m.conversation_id === email1.conversationId);
  assert(outEmailMsg.subject === 'Re: API Rate Limits & SLAs - Confirmed', 'Email subject preserved');
  console.log(`  ✅ Outbound Email reply dispatched: "${outEmailMsg.subject}"`);
  passedTests++;

  // TEST 7: Outgoing Call Action / Notes
  console.log('\n▶ Test 7: Outgoing Call follow-up logged');
  const replyCall = await omnichannelService.sendReply(call1.conversationId, {
    body: 'Triggered automated SMS confirmation and scheduled calendar invite for technical review.',
  }, 'default', 'Agent Maya');
  assert(replyCall.success === true, 'Call follow-up action must succeed');
  console.log('  ✅ Outbound Call action recorded on the call thread');
  passedTests++;

  // TEST 8: Conversation Status Lifecycle
  console.log('\n▶ Test 8: Conversation status update (lifecycle)');
  const updatedStatus = await omnichannelService.updateStatus(wa1.conversationId, OmnichannelStatusEnum.RESOLVED);
  assert(updatedStatus.status === 'resolved', 'Status must be updated to resolved');
  console.log(`  ✅ Conversation status transitioned to: ${updatedStatus.status}`);
  passedTests++;

  // TEST 9: Conversation List & Filters
  console.log('\n▶ Test 9: List conversations with channel and search filter');
  const listAll = await omnichannelService.listConversations({ channel: 'all', page: 1, limit: 10 });
  assert(listAll.items.length >= 3, 'Must return all conversations');
  assert(listAll.items[0].status, 'Must map status field properly');
  console.log(`  ✅ Conversations query returned ${listAll.items.length} items`);
  passedTests++;

  // TEST 10: Customer 360 Unified Chronological Journey
  console.log('\n▶ Test 10: Customer 360 journey connecting WhatsApp and Call for Aarav');
  const c360 = await omnichannelService.getCustomer360Timeline(wa1.customerId);
  assert(c360.customer.name === 'Aarav Sharma', 'Customer details returned');
  assert(c360.summary.totalConversations >= 2, 'Customer has WhatsApp & Call conversations');
  assert(c360.summary.whatsappCount >= 2, 'Customer has WhatsApp messages');
  assert(c360.summary.callCount >= 1, 'Customer has Call logged');
  assert(c360.timeline.length >= 3, 'Timeline aggregates both WhatsApp and Calls');
  console.log(`  ✅ Customer 360 validated! ${c360.summary.whatsappCount} WhatsApp messages, ${c360.summary.callCount} Calls linked.`);
  passedTests++;

  console.log('\n========================================================');
  console.log(`🎉 ALL ${passedTests} / 10 TESTS PASSED SUCCESSFULLY!`);
  console.log('========================================================\n');
}

runOmnichannelTestSuite().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
