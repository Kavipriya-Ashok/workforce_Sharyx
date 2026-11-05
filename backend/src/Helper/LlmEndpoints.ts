/**
 * The ONE place LLM endpoints are built. Production leaves the env vars unset and talks to OpenAI / Google exactly as
 * before; tests set LLM_OPENAI_BASE_URL / LLM_GEMINI_BASE_URL to a local fake that records every request, which is how
 * "what did the LLM actually see for this tenant?" is proven.
 */
const trimSlash = (u: string) => u.replace(/\/+$/, '');

export const openAiChatUrl = (): string =>
  `${trimSlash(process.env.LLM_OPENAI_BASE_URL || 'https://api.openai.com/v1')}/chat/completions`;

export const geminiGenerateUrl = (model: string, key: string): string =>
  `${trimSlash(process.env.LLM_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta')}/models/${model}:generateContent?key=${key}`;
