import { BaseTable } from "../BaseTable";
import { WhatsAppMessage } from "./WhatsAppMessage.entity";
export declare class WhatsAppConversation extends BaseTable {
    tenant_id: string;
    customer_phone: string;
    customer_name: string;
    lead_id: string;
    conversation_status: string;
    last_message_text: string;
    last_message_at: Date;
    unread_count: number;
    meeting_info?: {
        slot?: string;
        meet_url?: string;
        scheduled_at?: string;
    };
    messages: WhatsAppMessage[];
}
