-- Migration: 1730640000000-CreateOmnichannelTables.sql
-- Description: Creates omnichannel conversations, messages, calls, and activity logs

CREATE TABLE IF NOT EXISTS "omnichannel_conversation" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "status" boolean NOT NULL DEFAULT true,
    "created_by_id" uuid,
    "created_on" TIMESTAMP DEFAULT now(),
    "updated_by_id" uuid,
    "updated_on" TIMESTAMP DEFAULT now(),
    "tenant_id" character varying(100) NOT NULL DEFAULT 'default',
    "customer_id" uuid,
    "channel" character varying(50) NOT NULL DEFAULT 'whatsapp',
    "conversation_status" character varying(50) NOT NULL DEFAULT 'new',
    "summary" text,
    "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "assigned_to" character varying(255),
    "provider_thread_id" character varying(255),
    "metadata" jsonb,
    CONSTRAINT "PK_omnichannel_conversation_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_omnichannel_conversation_customer" FOREIGN KEY ("customer_id") 
        REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_omnichannel_conv_tenant" ON "omnichannel_conversation" ("tenant_id");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_conv_customer" ON "omnichannel_conversation" ("customer_id");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_conv_channel" ON "omnichannel_conversation" ("channel");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_conv_status" ON "omnichannel_conversation" ("conversation_status");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_conv_activity" ON "omnichannel_conversation" ("last_activity_at");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_conv_thread" ON "omnichannel_conversation" ("provider_thread_id");

CREATE TABLE IF NOT EXISTS "omnichannel_message" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "status" boolean NOT NULL DEFAULT true,
    "created_by_id" uuid,
    "created_on" TIMESTAMP DEFAULT now(),
    "updated_by_id" uuid,
    "updated_on" TIMESTAMP DEFAULT now(),
    "tenant_id" character varying(100) NOT NULL DEFAULT 'default',
    "conversation_id" uuid NOT NULL,
    "direction" character varying(10) NOT NULL DEFAULT 'in',
    "body" text NOT NULL,
    "attachments" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "subject" character varying(500),
    "delivery_status" character varying(20) NOT NULL DEFAULT 'sent',
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "provider_message_id" character varying(255),
    "sender_info" character varying(255),
    "metadata" jsonb,
    CONSTRAINT "PK_omnichannel_message_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_omnichannel_message_conv" FOREIGN KEY ("conversation_id") 
        REFERENCES "omnichannel_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_omnichannel_msg_tenant" ON "omnichannel_message" ("tenant_id");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_msg_conv" ON "omnichannel_message" ("conversation_id");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_msg_direction" ON "omnichannel_message" ("direction");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_msg_status" ON "omnichannel_message" ("delivery_status");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_msg_time" ON "omnichannel_message" ("timestamp");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_msg_provider_id" ON "omnichannel_message" ("provider_message_id");

CREATE TABLE IF NOT EXISTS "omnichannel_call" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "status" boolean NOT NULL DEFAULT true,
    "created_by_id" uuid,
    "created_on" TIMESTAMP DEFAULT now(),
    "updated_by_id" uuid,
    "updated_on" TIMESTAMP DEFAULT now(),
    "tenant_id" character varying(100) NOT NULL DEFAULT 'default',
    "conversation_id" uuid NOT NULL,
    "direction" character varying(20) NOT NULL DEFAULT 'inbound',
    "duration" integer NOT NULL DEFAULT 0,
    "recording_url" text,
    "transcript" text,
    "ai_summary" text,
    "outcome" character varying(50) DEFAULT 'completed',
    "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "ended_at" TIMESTAMP WITH TIME ZONE,
    "provider_call_id" character varying(255),
    "telephony_provider" character varying(100) DEFAULT 'telephony',
    "metadata" jsonb,
    CONSTRAINT "PK_omnichannel_call_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_omnichannel_call_conv" FOREIGN KEY ("conversation_id") 
        REFERENCES "omnichannel_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_omnichannel_call_tenant" ON "omnichannel_call" ("tenant_id");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_call_conv" ON "omnichannel_call" ("conversation_id");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_call_direction" ON "omnichannel_call" ("direction");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_call_outcome" ON "omnichannel_call" ("outcome");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_call_started" ON "omnichannel_call" ("started_at");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_call_provider_id" ON "omnichannel_call" ("provider_call_id");

CREATE TABLE IF NOT EXISTS "omnichannel_activity_log" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "status" boolean NOT NULL DEFAULT true,
    "created_by_id" uuid,
    "created_on" TIMESTAMP DEFAULT now(),
    "updated_by_id" uuid,
    "updated_on" TIMESTAMP DEFAULT now(),
    "tenant_id" character varying(100) NOT NULL DEFAULT 'default',
    "customer_id" uuid,
    "conversation_id" uuid,
    "type" character varying(100) NOT NULL,
    "detail" text NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "metadata" jsonb,
    CONSTRAINT "PK_omnichannel_activity_log_id" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_omnichannel_act_tenant" ON "omnichannel_activity_log" ("tenant_id");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_act_customer" ON "omnichannel_activity_log" ("customer_id");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_act_conv" ON "omnichannel_activity_log" ("conversation_id");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_act_type" ON "omnichannel_activity_log" ("type");
CREATE INDEX IF NOT EXISTS "IDX_omnichannel_act_time" ON "omnichannel_activity_log" ("timestamp");

