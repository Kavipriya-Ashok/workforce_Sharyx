# 📬 Omnichannel Unified Inbox Module

Unified customer inbox and multi-channel communication engine for **WhatsApp**, **Email**, and **Voice Phone Calls**. All enquiries consolidate into a single inbox, automatically linked to customers by phone number or email, providing an interactive timeline and a complete **Customer 360° Journey**.

---

## 🚀 Features

- **Unified Inbox:** Consolidated real-time stream of incoming WhatsApp chats, Emails, and Voice Call recordings.
- **Channel Badges:** Dedicated visual chips for each channel:
  - 🟢 **WhatsApp** (Emerald badge)
  - 🔵 **Email** (Blue badge)
  - 🟠 **Call** (Amber badge)
- **Automatic 1-Line Activity Summary:** LLM-powered summarizer synthesizes incoming message intents and call transcripts into concise, 1-line action descriptions.
- **Interactive Channel Timelines:**
  - **WhatsApp:** Chat bubbles, delivery/read checkmarks (✓ / ✓✓), and attachment downloads.
  - **Email:** Subject headers, from/to routing, thread history, and attachment previews.
  - **Call:** Inbound/outbound direction, call duration, inline audio recording player, AI summary, and speech transcripts.
- **Customer 360° Journey:** Dedicated modal/view with tabs `All | WhatsApp | Email | Call` aggregating every touchpoint across the entire customer lifecycle chronologically.
- **In-Drawer Channel Reply:** Agents can reply directly from the expanded timeline; replies are dispatched over the active conversation channel.
- **Idempotency Safeguard:** Prevents duplicate messages/events using provider message/call IDs.
- **Real-Time Updates:** Built-in Server-Sent Events (SSE) stream (`/api/v1/omnichannel/stream`) pushes live updates to the inbox without requiring manual page refreshes.
- **Sidebar Integration:** Featured on the admin sidebar with an on-label `Unified` badge.

---

## 🗄️ Data Model & Migration

The module introduces four tables with foreign keys and tenant isolation:

1. **`omnichannel_conversation`**: Master conversation record per customer per channel (`whatsapp`, `email`, `call`), tracking `conversation_status` (`new`, `open`, `pending`, `resolved`), `summary`, and `last_activity_at`.
2. **`omnichannel_message`**: Unified store for WhatsApp and Email interactions, tracking direction (`in` / `out`), delivery status (`sent`, `delivered`, `read`, `failed`), `body`, `subject`, and `attachments`.
3. **`omnichannel_call`**: Telephony records tracking direction (`inbound` / `outbound`), `duration` (seconds), `recording_url`, `transcript`, `ai_summary`, and `outcome`.
4. **`omnichannel_activity_log`**: Audit trail of intake events, auto-creations, and agent replies.

The complete SQL migration script is located at:
`backend/migrations/1730640000000-CreateOmnichannelTables.sql`

---

## 📡 API Endpoints

### 1. Ingestion Webhooks
- `POST /api/v1/omnichannel/webhook/whatsapp`: Meta / WhatsApp inbound message webhook.
- `POST /api/v1/omnichannel/webhook/email`: Inbound email parser webhook.
- `POST /api/v1/omnichannel/webhook/call`: Telephony / Vapi / Twilio voice call webhook.

### 2. Inbox & Conversation Management
- `GET /api/v1/omnichannel/conversations`: List conversations with filters (`channel`, `status`, `search`, `date_from`, `date_to`, `page`, `limit`).
- `GET /api/v1/omnichannel/conversations/:id`: Get full conversation details with messages, calls, and activities.
- `PATCH /api/v1/omnichannel/conversations/:id/status`: Update status (`new`, `open`, `pending`, `resolved`).
- `POST /api/v1/omnichannel/conversations/:id/reply`: Dispatch outbound reply over the current channel.
- `GET /api/v1/omnichannel/customers/:id/timeline`: Customer 360° unified chronological timeline.
- `GET /api/v1/omnichannel/stream`: Server-Sent Events (SSE) real-time event feed.
- `POST /api/v1/omnichannel/seed-demo`: Quick demo data seeder.

---

## 💻 Frontend Implementation

- **Sidebar (`AdminLayout.tsx`):** Omnichannel navigation item with `Unified` pill badge.
- **Inbox Page (`OmnichannelInboxPage.tsx`):** Filter bar, search box, channel tabs, master conversation list, and drawer toggle.
- **Drawer (`ConversationTimelineDrawer.tsx`):** Split-view channel timeline with embedded audio player, transcripts, and in-place reply box.
- **Customer 360 (`Customer360Modal.tsx`):** Multi-tab historical journey view.

---

## 🧪 Testing Verification

Run the end-to-end integration test suite:
```bash
cd backend
node test/test-omnichannel-flows.cjs
```
Result: **10 / 10 Flows Verified and Passed.**

