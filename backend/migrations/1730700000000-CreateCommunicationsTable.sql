-- Migration: 1730700000000-CreateCommunicationsTable.sql
-- Description: Creates communications table linking leads across WhatsApp, Email and Calls

CREATE TABLE IF NOT EXISTS "communications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "status" character varying(50) NOT NULL DEFAULT 'delivered',
    "created_by_id" uuid,
    "created_on" TIMESTAMP DEFAULT now(),
    "updated_by_id" uuid,
    "updated_on" TIMESTAMP DEFAULT now(),
    "tenant_id" character varying(100) NOT NULL DEFAULT 'default',
    "lead_id" uuid NOT NULL,
    "channel" character varying(50) NOT NULL,
    "direction" character varying(20) NOT NULL DEFAULT 'inbound',
    "description" text NOT NULL,
    "content" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "duration" integer,
    "recording_url" text,
    "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "provider_id" character varying(255),
    CONSTRAINT "PK_communications_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_communications_lead" FOREIGN KEY ("lead_id") 
        REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_comm_tenant" ON "communications" ("tenant_id");
CREATE INDEX IF NOT EXISTS "IDX_comm_lead" ON "communications" ("lead_id");
CREATE INDEX IF NOT EXISTS "IDX_comm_channel" ON "communications" ("channel");
CREATE INDEX IF NOT EXISTS "IDX_comm_direction" ON "communications" ("direction");
CREATE INDEX IF NOT EXISTS "IDX_comm_occurred" ON "communications" ("occurred_at");
CREATE INDEX IF NOT EXISTS "IDX_comm_provider" ON "communications" ("provider_id");

