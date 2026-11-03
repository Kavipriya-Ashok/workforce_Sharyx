const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { WhatsAppService } = require('./dist/WhatsApp/Services/WhatsApp.service');

async function testWaService() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const wa = app.get(WhatsAppService);

  try {
    const res = await wa.sendMessage({
      to: '8015779116',
      text: 'Hello Kavipriya! 👋 Your interview has been confirmed with Sharyx AI.\n\n🎥 Google Meet Link: https://meet.google.com/test-meet-link\n\nLooking forward to speaking with you! 🚀',
      message_type: 'text',
    }, 'system', true);

    console.log('✅ WhatsApp Message Dispatched via WhatsAppService:');
    console.log('   Message ID:', res.messageId);
    console.log('   Delivery Status:', res.deliveryStatus);
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }

  await app.close();
}

testWaService().catch(console.error);

