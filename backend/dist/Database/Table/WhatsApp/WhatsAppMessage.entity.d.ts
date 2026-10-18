import { BaseTable } from "../BaseTable";
import { WhatsAppConversation } from "./WhatsAppConversation.entity";
export declare class WhatsAppMessage extends BaseTable {
    conversation_id: string;
    conversation: WhatsAppConversation;
    tenant_id: string;
    sender_phone: string;
    recipient_phone: string;
    direction: string;
    message_type: string;
    message_text: string;
    template_name: string;
    meta_message_id: string;
    delivery_status: string;
    is_ai_generated: boolean;
}
