import React, { useState, useEffect, useRef } from 'react';
import {
  WhatsAppConversation,
  WhatsAppMessage,
} from '@/types/whatsapp';
import { whatsappService } from '@/service/whatsappService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Send,
  Bot,
  User,
  Search,
  CheckCheck,
  Check,
  Clock,
  Sparkles,
  RefreshCw,
  Phone,
  MessageSquare,
  Plus,
  Loader2,
  Calendar,
  Building2,
  Database,
  Copy,
  ChevronRight,
  Info,
  X,
  PhoneCall,
  Mail,
  ShieldCheck,
  ArrowDown,
  Smile,
  Paperclip,
  Video,
  FileText,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';

type ChatFilter = 'all' | 'unread' | 'open';

const formatMessageTime = (dateStr?: string | Date) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateDivider = (dateStr?: string | Date) => {
  if (!dateStr) return 'Recent';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Recent';

  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const WhatsAppLiveChat: React.FC = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  // New Chat Dialog
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newMsgText, setNewMsgText] = useState('');
  const [newChatSending, setNewChatSending] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsScrolledUp(distanceFromBottom > 150);
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await whatsappService.getConversations();
      const list = Array.isArray(data) ? data : [];
      setConversations(list);

      // Select first conversation if none selected yet or if previously selected was removed
      if (list.length > 0) {
        setSelectedConv((prev) => {
          if (!prev) return list[0];
          const matched = list.find((c) => c.id === prev.id);
          return matched || list[0];
        });
      }
    } catch {
      toast.error('Could not fetch conversations from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real messages for selected conversation
  useEffect(() => {
    if (selectedConv?.id) {
      whatsappService
        .getMessages(selectedConv.id)
        .then((res) => {
          setMessages(Array.isArray(res) ? res : []);
          setTimeout(() => scrollToBottom('auto'), 50);
        })
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
    }
  }, [selectedConv?.id]);

  // Live polling for new incoming messages every 3s
  useEffect(() => {
    if (!selectedConv?.id) return;
    const interval = setInterval(() => {
      whatsappService
        .getMessages(selectedConv.id)
        .then((res) => {
          if (Array.isArray(res) && res.length !== messages.length) {
            setMessages(res);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConv?.id, messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConv) return;

    setSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      await whatsappService.sendMessage({
        to: selectedConv.customer_phone,
        text: textToSend,
        conversation_id: selectedConv.id,
      });

      // Optimistic append
      const newMsg: WhatsAppMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: selectedConv.id,
        sender_phone: 'system',
        recipient_phone: selectedConv.customer_phone,
        direction: 'outbound',
        message_type: 'text',
        message_text: textToSend,
        delivery_status: 'sent',
        is_ai_generated: false,
        created_on: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      toast.success('WhatsApp message delivered!');
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipient.trim() || !newMsgText.trim()) return;

    setNewChatSending(true);
    try {
      await whatsappService.sendMessage({
        to: newRecipient.trim(),
        text: newMsgText.trim(),
      });

      const newConv: WhatsAppConversation = {
        id: `conv-${Date.now()}`,
        customer_phone: newRecipient.trim(),
        customer_name: newRecipient.trim(),
        conversation_status: 'open',
        last_message_text: newMsgText.trim(),
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      };

      const newMsg: WhatsAppMessage = {
        id: `msg-${Date.now()}`,
        conversation_id: newConv.id,
        sender_phone: 'system',
        recipient_phone: newRecipient.trim(),
        direction: 'outbound',
        message_type: 'text',
        message_text: newMsgText.trim(),
        delivery_status: 'sent',
        is_ai_generated: false,
        created_on: new Date().toISOString(),
      };

      setConversations((prev) => [newConv, ...prev]);
      setSelectedConv(newConv);
      setMessages([newMsg]);
      setNewChatOpen(false);
      setNewRecipient('');
      setNewMsgText('');
      toast.success(`Message sent to ${newRecipient}!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send message via Meta Cloud API');
    } finally {
      setNewChatSending(false);
    }
  };

  const copyPhoneNumber = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    toast.success('Phone number copied to clipboard');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const conversationList = Array.isArray(conversations) ? conversations : [];

  // Filter conversations
  const filteredConversations = conversationList.filter((c) => {
    const query = search.toLowerCase().trim();
    const matchSearch =
      !query ||
      c?.customer_phone?.toLowerCase().includes(query) ||
      (c?.customer_name && c.customer_name.toLowerCase().includes(query)) ||
      (c?.last_message_text && c.last_message_text.toLowerCase().includes(query));

    const matchFilter =
      filter === 'all'
        ? true
        : filter === 'unread'
        ? (c?.unread_count || 0) > 0
        : filter === 'open'
        ? (c?.conversation_status || 'open') === 'open'
        : true;

    return matchSearch && matchFilter;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-[calc(100vh-215px)] min-h-[480px] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] transition-colors">
      {/* ── AREA 1: Conversation Sidebar (4 cols) ── */}
      <div className="lg:col-span-4 border-r border-slate-300 dark:border-slate-800 flex flex-col h-full bg-slate-50/70 dark:bg-slate-950/40 overflow-hidden">
        {/* Top Header & Search */}
        <div className="p-3 sm:p-3.5 border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                WhatsApp Chats
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {conversationList.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={fetchConversations}
                disabled={loading}
                title="Sync from Database"
                className="h-7 w-7 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
              </Button>
              <Button
                size="sm"
                data-new-chat-trigger="true"
                onClick={() => setNewChatOpen(true)}
                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 rounded-xl shadow-xs shadow-emerald-600/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search conversations..."
              className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({conversationList.length})
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filter === 'open'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Open ({conversationList.filter((c) => c.conversation_status === 'open').length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Unread ({conversationList.filter((c) => (c.unread_count || 0) > 0).length})
            </button>
          </div>
        </div>

        {/* Conversation List Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = selectedConv?.id === conv.id;
              const formattedDate = conv.last_message_at
                ? formatMessageTime(conv.last_message_at)
                : '';

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-3 sm:p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-600 shadow-2xs'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                    }`}
                  >
                    {conv.customer_name ? conv.customer_name.slice(0, 2).toUpperCase() : (conv.customer_phone ? conv.customer_phone.slice(-2) : 'WA')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-bold truncate ${
                        isSelected ? 'text-blue-950 dark:text-blue-200' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {conv.customer_name || `+${conv.customer_phone}`}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                        {formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                        +{conv.customer_phone}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1 leading-snug">
                      {conv.last_message_text || 'Active WhatsApp conversation'}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase ${
                          conv.conversation_status === 'open'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {conv.conversation_status || 'open'}
                      </span>

                      {conv.unread_count > 0 && (
                        <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center ml-auto shadow-2xs">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="m-4 p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-center space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {search ? 'No matching conversations' : 'No conversations found'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {search
                    ? 'Clear your search query or try a different phone number.'
                    : 'Click Sync to pull live customer threads from PostgreSQL database.'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchConversations}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Sync Database
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── AREA 2: Main Active Chat History & Messenger (Flex-1 or 5/8 cols) ── */}
      <div className={`${selectedConv && showContextPanel ? 'lg:col-span-5 xl:col-span-5' : 'lg:col-span-8'} flex flex-col h-full bg-slate-100/70 dark:bg-slate-950/40 overflow-hidden transition-all duration-200`}>
        {selectedConv ? (
          <>
            {/* Chat Topbar Header */}
            <div className="shrink-0 p-3 sm:px-4 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                  {selectedConv.customer_name ? selectedConv.customer_name.slice(0, 2).toUpperCase() : (selectedConv.customer_phone ? selectedConv.customer_phone.slice(-2) : 'WA')}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedConv.customer_name || `+${selectedConv.customer_phone}`}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      Online
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      +{selectedConv.customer_phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Header Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden md:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 mr-1">
                  <Bot className={`h-3.5 w-3.5 ${aiEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">AI</span>
                  <Switch
                    checked={aiEnabled}
                    onCheckedChange={(val) => {
                      setAiEnabled(val);
                      toast.info(val ? 'AI copilot auto-reply enabled' : 'Switched to human agent mode');
                    }}
                  />
                </div>

                <a
                  href={`tel:${selectedConv.customer_phone}`}
                  className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title="Voice Call"
                >
                  <PhoneCall className="h-4 w-4" />
                </a>

                <button
                  type="button"
                  className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Video Meeting"
                >
                  <Video className="h-4 w-4" />
                </button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowContextPanel(!showContextPanel)}
                  title={showContextPanel ? 'Hide Contact Details' : 'Show Contact Details'}
                  className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Message Bubbles Container */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0 relative"
            >
              {messages.length > 0 ? (
                <>
                  <div className="flex justify-center my-1">
                    <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-2xs">
                      {formatDateDivider(messages[0]?.created_on)}
                    </span>
                  </div>

                  {messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    const msgTime = formatMessageTime(msg.created_on);

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed ${
                            isOutbound
                              ? 'bg-[#e7f8e8] dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-slate-900 dark:text-slate-100 rounded-tr-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700/80 rounded-tl-xs'
                          }`}
                        >
                          {msg.is_ai_generated && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold mb-1">
                              <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                              AI Copilot Auto-Reply
                            </div>
                          )}
                          <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{msg.message_text}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isOutbound ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            <span>{msgTime}</span>
                            {isOutbound && (
                              <span title={msg.delivery_status || 'delivered'} className="inline-flex items-center">
                                <CheckCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No messages in this thread yet</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Type a message below to begin chatting with this customer.</p>
                </div>
              )}
              <div ref={messagesEndRef} />

              {/* Scroll to bottom floating pill */}
              {isScrolledUp && (
                <button
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-emerald-600 cursor-pointer"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Input Composer */}
            <form
              onSubmit={handleSendMessage}
              className="shrink-0 p-2.5 sm:p-3 border-t border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
            >
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Add Emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 h-9 px-4 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Attach File"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="h-9 w-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Send Message"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/40 dark:bg-slate-950/40"><div className="p-8 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center max-w-md mx-auto space-y-3.5">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <Phone className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">WhatsApp Live Inbox Ready</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Connected to Meta Cloud API. Select an active conversation from the left to read messages or start a new outbound message.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 rounded-xl shadow-xs"
                onClick={() => setNewChatOpen(true)}
              >
                <Send className="h-3.5 w-3.5" />
                Start New Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchConversations}
                className="text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Sync Database
              </Button>
            </div>
          </div></div>
        )}
      </div>

      {/* ── AREA 3: Contact Context Panel (3 cols) ── */}
      {selectedConv && showContextPanel && (
        <div className="lg:col-span-3 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col h-full overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Contact Details
            </h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowContextPanel(false)}
              className="h-6 w-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Profile Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center space-y-2">
            <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-lg flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-800/60 shadow-2xs">
              {selectedConv.customer_name ? selectedConv.customer_name.slice(0, 2).toUpperCase() : (selectedConv.customer_phone ? selectedConv.customer_phone.slice(-2) : 'KP')}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {selectedConv.customer_name || 'Customer'}
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                +{selectedConv.customer_phone}
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold">
                Lead
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
                Open
              </span>
            </div>
          </div>

          {/* Accordion / Card Sections: About, Notes, Activity */}
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>About</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>Notes (0)</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Activity</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Quick Actions
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyPhoneNumber(selectedConv.customer_phone)}
                className="h-8 text-xs gap-1 border-slate-200 dark:border-slate-800 rounded-xl"
              >
                {copiedPhone ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedPhone ? 'Copied' : 'Copy Phone'}</span>
              </Button>

              <a
                href={`tel:${selectedConv.customer_phone}`}
                className="inline-flex items-center justify-center gap-1 h-8 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <PhoneCall className="h-3 w-3 text-blue-500" />
                <span>Call Client</span>
              </a>
            </div>
          </div>

          {/* Thread Metadata */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Conversation Telemetry
            </span>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Thread ID:</span>
                <span className="font-mono text-[10px] text-slate-800 dark:text-slate-200 font-semibold">
                  {selectedConv.id?.slice(0, 12)}...
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Channel:</span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Meta Cloud API
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Status:</span>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase px-1.5 py-0 font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                >
                  {selectedConv.conversation_status || 'open'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">AI Copilot:</span>
                <span className={`text-[11px] font-semibold ${aiEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {aiEnabled ? 'Autonomous' : 'Manual Agent'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 New WhatsApp Message Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
              <Send className="h-5 w-5" />
              <DialogTitle>Send New WhatsApp Message</DialogTitle>
            </div>
            <DialogDescription>
              Dispatch a direct message via your verified Meta WhatsApp Cloud API number.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStartNewChat} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Recipient Phone (with country code)
              </label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="+91 98765 43210 or 919655509060"
                  className="pl-9"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Message Content
              </label>
              <textarea
                placeholder="Hello! Welcome to Sharyx Workforce. How can we help you today?"
                rows={4}
                className="w-full mt-1 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNewChatOpen(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={newChatSending || !newRecipient.trim() || !newMsgText.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                {newChatSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
