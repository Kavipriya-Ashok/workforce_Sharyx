import { OmnichannelIngestionService } from './Services/OmnichannelIngestion.service';
import { OmnichannelSummarizerService } from './Services/OmnichannelSummarizer.service';
import { OmnichannelRealtimeService } from './Services/OmnichannelRealtime.service';
import { OmnichannelService } from './Services/Omnichannel.service';
import { OmnichannelStatusEnum } from './Dto/Omnichannel.dto';

describe('Omnichannel Unified Engine & Ingestion Flows', () => {
  let customerRepo: any;
  let convRepo: any;
  let msgRepo: any;
  let callRepo: any;
  let activityRepo: any;
  let summarizer: OmnichannelSummarizerService;
  let realtime: OmnichannelRealtimeService;
  let ingestion: OmnichannelIngestionService;
  let omnichannelService: OmnichannelService;

  // In-memory mock storage
  let customers: any[] = [];
  let conversations: any[] = [];
  let messages: any[] = [];
  let calls: any[] = [];
  let activities: any[] = [];

  beforeEach(() => {
    customers = [];
    conversations = [];
    messages = [];
    calls = [];
    activities = [];

    customerRepo = {
      create: (dto: any) => ({ id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...dto }),
      save: async (item: any) => {
        const idx = customers.findIndex((c) => c.id === item.id);
        if (idx >= 0) {
          customers[idx] = { ...customers[idx], ...item };
          return customers[idx];
        }
        customers.push(item);
        return item;
      },
      findOne: async (options: any) => {
        if (Array.isArray(options.where)) {
          for (const cond of options.where) {
            const found = customers.find((c) => {
              if (cond.phone && c.phone === cond.phone) return true;
              return false;
            });
            if (found) return found;
          }
        }
        if (options.where?.phone) {
          return customers.find((c) => c.phone === options.where.phone) || null;
        }
        if (options.where?.email) {
          return customers.find((c) => c.email === options.where.email) || null;
        }
        if (options.where?.id) {
          return customers.find((c) => c.id === options.where.id) || null;
        }
        return null;
      },
    };

    convRepo = {
      create: (dto: any) => ({ id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...dto }),
      save: async (item: any) => {
        const idx = conversations.findIndex((c) => c.id === item.id);
        if (idx >= 0) {
          conversations[idx] = { ...conversations[idx], ...item };
          return conversations[idx];
        }
        conversations.push(item);
        return item;
      },
      findOne: async (options: any) => {
        if (options.where?.id) {
          const conv = conversations.find((c) => c.id === options.where.id);
          if (conv) {
            const cust = customers.find((u) => u.id === conv.customer_id);
            return { ...conv, customer: cust };
          }
          return null;
        }
        if (options.where?.customer_id && options.where?.channel) {
          return (
            conversations.find(
              (c) => c.customer_id === options.where.customer_id && c.channel === options.where.channel
            ) || null
          );
        }
        return null;
      },
      find: async (options: any) => {
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

    msgRepo = {
      create: (dto: any) => ({ id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...dto }),
      save: async (item: any) => {
        if (Array.isArray(item)) {
          messages.push(...item);
          return item;
        }
        messages.push(item);
        return item;
      },
      findOne: async (options: any) => {
        if (options.where?.provider_message_id) {
          return messages.find((m) => m.provider_message_id === options.where.provider_message_id) || null;
        }
        return null;
      },
      find: async (options: any) => {
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

    callRepo = {
      create: (dto: any) => ({ id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...dto }),
      save: async (item: any) => {
        if (Array.isArray(item)) {
          calls.push(...item);
          return item;
        }
        calls.push(item);
        return item;
      },
      findOne: async (options: any) => {
        if (options.where?.provider_call_id) {
          return calls.find((c) => c.provider_call_id === options.where.provider_call_id) || null;
        }
        return null;
      },
      find: async (options: any) => {
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

    activityRepo = {
      create: (dto: any) => ({ id: `act_${Date.now()}`, ...dto }),
      save: async (item: any) => {
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

    summarizer = new OmnichannelSummarizerService();
    realtime = new OmnichannelRealtimeService();
    ingestion = new OmnichannelIngestionService(
      customerRepo,
      convRepo,
      msgRepo,
      callRepo,
      activityRepo,
      summarizer,
      realtime
    );
    omnichannelService = new OmnichannelService(
      customerRepo,
      convRepo,
      msgRepo,
      callRepo,
      activityRepo,
      realtime
    );
  });

  describe('1. Auto-Customer Creation & WhatsApp Ingestion', () => {
    it('should auto-create customer and create conversation for incoming WhatsApp message', async () => {
      const res = await ingestion.ingestWhatsAppMessage({
        provider_message_id: 'wa_msg_001',
        from_phone: '+919988776655',
        customer_name: 'Ananya Roy',
        body: 'Hello team, what are your pricing options for recruitment automation?',
      });

      expect(res.success).toBe(true);
      expect(res.customerId).toBeDefined();
      expect(res.conversationId).toBeDefined();
      expect(res.summary).toBeDefined();

      const savedCustomer = customers.find((c) => c.id === res.customerId);
      expect(savedCustomer).toBeDefined();
      expect(savedCustomer.name).toBe('Ananya Roy');
      expect(savedCustomer.phone).toBe('+919988776655');

      const savedMessage = messages.find((m) => m.provider_message_id === 'wa_msg_001');
      expect(savedMessage).toBeDefined();
      expect(savedMessage.direction).toBe('in');
      expect(savedMessage.body).toContain('pricing options');
    });

    it('should prevent duplicate incoming messages via idempotency check', async () => {
      // First ingest
      await ingestion.ingestWhatsAppMessage({
        provider_message_id: 'wa_msg_dup',
        from_phone: '+919988776655',
        body: 'First delivery',
      });

      // Second duplicate ingest
      const res2 = await ingestion.ingestWhatsAppMessage({
        provider_message_id: 'wa_msg_dup',
        from_phone: '+919988776655',
        body: 'Second duplicate delivery',
      });

      expect(res2.duplicate).toBe(true);
      expect(messages.filter((m) => m.provider_message_id === 'wa_msg_dup').length).toBe(1);
    });
  });

  describe('2. Email Ingestion & Customer Linking', () => {
    it('should link incoming email to existing customer by email address', async () => {
      // First create customer
      const cust = await customerRepo.save({
        id: 'cust_acme',
        name: 'David Miller',
        email: 'david@acme.com',
        phone: '+14155551234',
      });

      const res = await ingestion.ingestEmailMessage({
        provider_message_id: 'email_msg_101',
        from_email: 'david@acme.com',
        subject: 'Enterprise Security Compliance Inquiry',
        body: 'Please provide SOC2 Type II audit report for our compliance committee.',
      });

      expect(res.success).toBe(true);
      expect(res.customerId).toBe('cust_acme');
      expect(conversations.find((c) => c.id === res.conversationId)?.channel).toBe('email');

      const msg = messages.find((m) => m.provider_message_id === 'email_msg_101');
      expect(msg.subject).toBe('Enterprise Security Compliance Inquiry');
    });
  });

  describe('3. Telephony / Call Event Ingestion', () => {
    it('should ingest phone call, recording URL, transcript, and AI summary', async () => {
      const res = await ingestion.ingestCallEvent({
        provider_call_id: 'call_evt_501',
        phone_number: '+919876543210',
        customer_name: 'Priya Mehta',
        direction: 'inbound',
        duration: 125,
        recording_url: 'https://cdn.example.com/calls/rec_501.mp3',
        transcript: 'Customer asked about CRM webhook sync latency. Agent verified under 50ms.',
        ai_summary: 'Inbound call: confirmed real-time webhook sync SLA under 50ms.',
        outcome: 'completed',
      });

      expect(res.success).toBe(true);
      expect(calls.length).toBe(1);
      const call = calls[0];
      expect(call.duration).toBe(125);
      expect(call.recording_url).toBe('https://cdn.example.com/calls/rec_501.mp3');
      expect(call.outcome).toBe('completed');
    });
  });

  describe('4. Outgoing Replies across Channels', () => {
    it('should send outgoing WhatsApp reply and update conversation status and summary', async () => {
      const res = await ingestion.ingestWhatsAppMessage({
        from_phone: '+919876543210',
        body: 'Do you offer a free trial?',
      });

      const replyRes = await omnichannelService.sendReply(res.conversationId, {
        body: 'Yes, we offer a 14-day full access trial. Let me activate your account.',
      });

      expect(replyRes.success).toBe(true);
      expect(replyRes.channel).toBe('whatsapp');

      const outMsg = messages.find((m) => m.direction === 'out' && m.conversation_id === res.conversationId);
      expect(outMsg).toBeDefined();
      expect(outMsg.body).toContain('14-day full access trial');

      const conv = conversations.find((c) => c.id === res.conversationId);
      expect(conv.summary).toContain('Outbound WhatsApp reply');
    });

    it('should send outgoing Email reply with subject line', async () => {
      const res = await ingestion.ingestEmailMessage({
        from_email: 'finance@corp.com',
        subject: 'Invoice query',
        body: 'Where can I download invoice #4092?',
      });

      const replyRes = await omnichannelService.sendReply(res.conversationId, {
        body: 'Here is your direct invoice download link: https://portal.example.com/invoice/4092',
        subject: 'Re: Invoice query - Invoice #4092 Attached',
      });

      expect(replyRes.success).toBe(true);
      expect(replyRes.channel).toBe('email');

      const outEmail = messages.find((m) => m.direction === 'out' && m.conversation_id === res.conversationId);
      expect(outEmail.subject).toBe('Re: Invoice query - Invoice #4092 Attached');
    });
  });

  describe('5. Status Updating & Customer 360 Full Journey', () => {
    it('should update conversation status through lifecycle', async () => {
      const res = await ingestion.ingestWhatsAppMessage({
        from_phone: '+919876543210',
        body: 'Test status change',
      });

      const updated = await omnichannelService.updateStatus(res.conversationId, OmnichannelStatusEnum.RESOLVED);
      expect(updated.status).toBe('resolved');

      const conv = conversations.find((c) => c.id === res.conversationId);
      expect(conv.conversation_status).toBe('resolved');
    });

    it('should generate unified Customer 360 timeline connecting WhatsApp, Email, and Calls', async () => {
      // 1. Customer contacts via WhatsApp
      const wa = await ingestion.ingestWhatsAppMessage({
        from_phone: '+919999900000',
        customer_name: 'Rajiv Malhotra',
        body: 'Interested in voice agents',
      });

      // 2. Same customer follows up via Email
      const em = await ingestion.ingestEmailMessage({
        from_email: 'rajiv@malhotra.org',
        customer_name: 'Rajiv Malhotra',
        subject: 'Voice Agent Proposal',
        body: 'Can we schedule a call to review the proposal?',
      });

      // Link email customer to same phone customer ID
      const custWa = customers.find((c) => c.id === wa.customerId);
      const convEmail = conversations.find((c) => c.id === em.conversationId);
      convEmail.customer_id = custWa.id;

      // 3. Same customer completes phone call
      const cl = await ingestion.ingestCallEvent({
        phone_number: '+919999900000',
        direction: 'inbound',
        duration: 300,
        transcript: 'Call transcript between Rajiv and agent',
        ai_summary: 'Call completed successfully',
      });
      const convCall = conversations.find((c) => c.id === cl.conversationId);
      convCall.customer_id = custWa.id;

      // Query Customer 360
      const c360 = await omnichannelService.getCustomer360Timeline(custWa.id);

      expect(c360.customer).toBeDefined();
      expect(c360.summary.whatsappCount).toBeGreaterThanOrEqual(1);
      expect(c360.summary.emailCount).toBeGreaterThanOrEqual(1);
      expect(c360.summary.callCount).toBeGreaterThanOrEqual(1);
      expect(c360.timeline.length).toBeGreaterThanOrEqual(3);

      const channelsInTimeline = new Set(c360.timeline.map((t) => t.channel));
      expect(channelsInTimeline.has('whatsapp')).toBe(true);
      expect(channelsInTimeline.has('email')).toBe(true);
      expect(channelsInTimeline.has('call')).toBe(true);
    });
  });
});

