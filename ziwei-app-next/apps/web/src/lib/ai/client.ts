import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { env } from '@/lib/env';
import { loadPrompt, renderPrompt, type PromptDefinition } from './prompts/loader';
import { recordCost } from './cost-tracker';

// Lazy clients to avoid build-time env errors.
let _anthropic: Anthropic | null = null;
let _gemini: GoogleGenerativeAI | null = null;
let _openai: OpenAI | null = null;

function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
  _anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _anthropic;
}
function getGemini(): GoogleGenerativeAI {
  if (_gemini) return _gemini;
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  _gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return _gemini;
}
function getOpenAI(): OpenAI {
  if (_openai) return _openai;
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _openai;
}

export interface GenerateParams {
  promptId: string;
  vars: Record<string, unknown>;
  userId?: string | null;
  /** Override the prompt's default model. */
  modelOverride?: string;
  /** When set, halts if estimated cost exceeds this. */
  budgetCapUsd?: number;
}

export interface GenerateResult {
  text: string;
  promptId: string;
  promptVersion: string;
  model: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  usdCost: number;
  latencyMs: number;
}

type Provider = 'gemini' | 'openai' | 'claude';

function providerOf(model: string): Provider {
  if (model.startsWith('claude')) return 'claude';
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
  return 'gemini';
}

async function callByModel(
  model: string,
  system: string,
  userMsg: string,
  prompt: PromptDefinition,
): Promise<{ text: string; inputTokens: number; cachedTokens: number; outputTokens: number }> {
  switch (providerOf(model)) {
    case 'claude': return callClaude(model, system, userMsg, prompt);
    case 'openai': return callOpenAI(model, system, userMsg, prompt);
    case 'gemini': return callGemini(model, system, userMsg, prompt);
  }
}

/**
 * Unified text generation. Routes to the provider matching the prompt's
 * defaultModel, then cascades through a fallback chain on 429/auth/quota
 * failures. Cascade is: gemini → openai → claude (skipping whoever just failed).
 * Writes a cost ledger entry on every call (success or failure).
 */
export async function generate(params: GenerateParams): Promise<GenerateResult> {
  const prompt = loadPrompt(params.promptId);
  const model = params.modelOverride ?? prompt.defaultModel;
  const system = renderPrompt(prompt.system, params.vars);
  const user = renderPrompt(prompt.user, params.vars);

  // Build cascade: primary, then the other providers we have configured.
  const primaryProv = providerOf(model);
  const FALLBACK_MODELS: Record<Provider, string> = {
    gemini: env.GEMINI_MODEL_DEFAULT || 'gemini-2.5-flash',
    openai: env.OPENAI_MODEL_DEFAULT || 'gpt-4o-mini',
    claude: 'claude-haiku-4-5',
  };
  // Default fallback order tuned for this app: prefer OpenAI when Gemini
  // rate-limits (Claude account often has no credit during dev), and prefer
  // Gemini when OpenAI is the primary. Claude is last-ditch.
  const ORDER: Record<Provider, Provider[]> = {
    gemini: ['openai', 'claude'],
    openai: ['gemini', 'claude'],
    claude: ['gemini', 'openai'],
  };

  const attempts: Array<{ model: string; provider: Provider }> = [
    { model, provider: primaryProv },
    ...ORDER[primaryProv].map((p) => ({ model: FALLBACK_MODELS[p], provider: p })),
  ];

  const errors: string[] = [];
  const t0 = Date.now();
  for (const attempt of attempts) {
    try {
      const result = await callByModel(attempt.model, system, user, prompt);
      const latencyMs = Date.now() - t0;
      const usdCost = await recordCost({
        userId: params.userId,
        promptId: prompt.id,
        promptVersion: prompt.version,
        model: attempt.model,
        inputTokens: result.inputTokens,
        cachedTokens: result.cachedTokens,
        outputTokens: result.outputTokens,
        latencyMs,
        success: true,
      });
      return { ...result, promptId: prompt.id, promptVersion: prompt.version, model: attempt.model, usdCost, latencyMs };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${attempt.model}: ${msg}`);
      console.warn(`[ai/generate] ${attempt.model} failed:`, msg);
      // Continue to next provider.
    }
  }

  // Every provider failed.
  await recordCost({
    userId: params.userId,
    promptId: prompt.id,
    promptVersion: prompt.version,
    model,
    inputTokens: 0,
    cachedTokens: 0,
    outputTokens: 0,
    latencyMs: Date.now() - t0,
    success: false,
    error: errors.join(' | '),
  });
  throw new Error(`All providers failed — ${errors.join(' | ')}`);
}

async function callClaude(
  model: string,
  system: string,
  userMsg: string,
  prompt: PromptDefinition,
): Promise<{ text: string; inputTokens: number; cachedTokens: number; outputTokens: number }> {
  const anthropic = getAnthropic();
  const cacheable = prompt.cacheBreakpoints.length > 0;

  const systemBlocks = cacheable
    ? [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }]
    : system;

  const resp = await anthropic.messages.create({
    model,
    max_tokens: prompt.maxOutputTokens,
    temperature: prompt.temperature,
    system: systemBlocks as any,
    messages: [{ role: 'user', content: userMsg }],
  });

  const text = resp.content
    .map((c) => (c.type === 'text' ? c.text : ''))
    .join('');

  return {
    text,
    inputTokens: resp.usage.input_tokens,
    cachedTokens: (resp.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0,
    outputTokens: resp.usage.output_tokens,
  };
}

async function callOpenAI(
  model: string,
  system: string,
  userMsg: string,
  prompt: PromptDefinition,
): Promise<{ text: string; inputTokens: number; cachedTokens: number; outputTokens: number }> {
  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model,
    max_tokens: prompt.maxOutputTokens,
    temperature: prompt.temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMsg },
    ],
  });
  const text = resp.choices[0]?.message?.content ?? '';
  const usage = resp.usage;
  return {
    text,
    inputTokens: usage?.prompt_tokens ?? 0,
    cachedTokens: (usage as { prompt_tokens_details?: { cached_tokens?: number } } | undefined)?.prompt_tokens_details?.cached_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
  };
}

async function callGemini(
  model: string,
  system: string,
  userMsg: string,
  prompt: PromptDefinition,
): Promise<{ text: string; inputTokens: number; cachedTokens: number; outputTokens: number }> {
  const gemini = getGemini();
  // gemini-2.5-flash enables "thinking" mode by default. Thinking tokens count
  // against maxOutputTokens, so the model can consume the entire budget on
  // internal reasoning and produce a half-sentence response. Disable thinking
  // for our long-form fortune-telling outputs — we want every token visible.
  // thinkingConfig isn't in the @google/generative-ai 0.24 typedefs yet; the
  // REST API accepts it as part of generationConfig, so cast through.
  const generationConfig = {
    maxOutputTokens: prompt.maxOutputTokens,
    temperature: prompt.temperature,
    thinkingConfig: { thinkingBudget: 0 },
  } as unknown as { maxOutputTokens: number; temperature: number };

  const m = gemini.getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig,
  });
  const resp = await m.generateContent(userMsg);
  const text = resp.response.text();
  const usage = resp.response.usageMetadata;
  return {
    text,
    inputTokens: usage?.promptTokenCount ?? 0,
    cachedTokens: usage?.cachedContentTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
  };
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateChatParams {
  promptId: string;
  /** Vars used to render the system prompt (chart context, persona, etc). */
  systemVars: Record<string, unknown>;
  /** Full prior conversation, oldest first. The newest turn must be role:'user'. */
  messages: ChatTurn[];
  userId?: string | null;
  modelOverride?: string;
}

export interface GenerateChatResult {
  text: string;
  promptId: string;
  promptVersion: string;
  model: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  usdCost: number;
  latencyMs: number;
}

/**
 * Multi-turn chat with a cacheable system prompt. The system prompt carries
 * the chart context (palaces, 四化, 大運) and persona — Claude's prompt cache
 * makes repeat turns on the same chart cheap. Cascades through providers
 * exactly like `generate()`.
 */
export async function generateChat(params: GenerateChatParams): Promise<GenerateChatResult> {
  const prompt = loadPrompt(params.promptId);
  const model = params.modelOverride ?? prompt.defaultModel;
  const system = renderPrompt(prompt.system, params.systemVars);

  const primaryProv = providerOf(model);
  const FALLBACK_MODELS: Record<Provider, string> = {
    gemini: env.GEMINI_MODEL_DEFAULT || 'gemini-2.5-flash',
    openai: env.OPENAI_MODEL_DEFAULT || 'gpt-4o-mini',
    claude: 'claude-haiku-4-5',
  };
  const ORDER: Record<Provider, Provider[]> = {
    gemini: ['openai', 'claude'],
    openai: ['gemini', 'claude'],
    claude: ['gemini', 'openai'],
  };
  const attempts: Array<{ model: string; provider: Provider }> = [
    { model, provider: primaryProv },
    ...ORDER[primaryProv].map((p) => ({ model: FALLBACK_MODELS[p], provider: p })),
  ];

  const errors: string[] = [];
  const t0 = Date.now();
  for (const attempt of attempts) {
    try {
      const result = await callChatByModel(attempt.model, system, params.messages, prompt);
      const latencyMs = Date.now() - t0;
      const usdCost = await recordCost({
        userId: params.userId,
        promptId: prompt.id,
        promptVersion: prompt.version,
        model: attempt.model,
        inputTokens: result.inputTokens,
        cachedTokens: result.cachedTokens,
        outputTokens: result.outputTokens,
        latencyMs,
        success: true,
      });
      return { ...result, promptId: prompt.id, promptVersion: prompt.version, model: attempt.model, usdCost, latencyMs };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${attempt.model}: ${msg}`);
      console.warn(`[ai/generateChat] ${attempt.model} failed:`, msg);
    }
  }

  await recordCost({
    userId: params.userId,
    promptId: prompt.id,
    promptVersion: prompt.version,
    model,
    inputTokens: 0,
    cachedTokens: 0,
    outputTokens: 0,
    latencyMs: Date.now() - t0,
    success: false,
    error: errors.join(' | '),
  });
  throw new Error(`All providers failed — ${errors.join(' | ')}`);
}

async function callChatByModel(
  model: string,
  system: string,
  messages: ChatTurn[],
  prompt: PromptDefinition,
): Promise<{ text: string; inputTokens: number; cachedTokens: number; outputTokens: number }> {
  switch (providerOf(model)) {
    case 'claude': return callClaudeChat(model, system, messages, prompt);
    case 'openai': return callOpenAIChat(model, system, messages, prompt);
    case 'gemini': return callGeminiChat(model, system, messages, prompt);
  }
}

async function callClaudeChat(
  model: string,
  system: string,
  messages: ChatTurn[],
  prompt: PromptDefinition,
): Promise<{ text: string; inputTokens: number; cachedTokens: number; outputTokens: number }> {
  const anthropic = getAnthropic();
  const cacheable = prompt.cacheBreakpoints.length > 0;
  const systemBlocks = cacheable
    ? [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }]
    : system;

  const resp = await anthropic.messages.create({
    model,
    max_tokens: prompt.maxOutputTokens,
    temperature: prompt.temperature,
    system: systemBlocks as any,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = resp.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
  return {
    text,
    inputTokens: resp.usage.input_tokens,
    cachedTokens: (resp.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0,
    outputTokens: resp.usage.output_tokens,
  };
}

async function callOpenAIChat(
  model: string,
  system: string,
  messages: ChatTurn[],
  prompt: PromptDefinition,
): Promise<{ text: string; inputTokens: number; cachedTokens: number; outputTokens: number }> {
  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model,
    max_tokens: prompt.maxOutputTokens,
    temperature: prompt.temperature,
    messages: [
      { role: 'system', content: system },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });
  const text = resp.choices[0]?.message?.content ?? '';
  const usage = resp.usage;
  return {
    text,
    inputTokens: usage?.prompt_tokens ?? 0,
    cachedTokens: (usage as { prompt_tokens_details?: { cached_tokens?: number } } | undefined)?.prompt_tokens_details?.cached_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
  };
}

async function callGeminiChat(
  model: string,
  system: string,
  messages: ChatTurn[],
  prompt: PromptDefinition,
): Promise<{ text: string; inputTokens: number; cachedTokens: number; outputTokens: number }> {
  const gemini = getGemini();
  const generationConfig = {
    maxOutputTokens: prompt.maxOutputTokens,
    temperature: prompt.temperature,
    thinkingConfig: { thinkingBudget: 0 },
  } as unknown as { maxOutputTokens: number; temperature: number };

  const m = gemini.getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig,
  });

  // Gemini wants history (all but the latest user message) separate from the
  // current message. Map our flat turn list to its shape.
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user') {
    throw new Error('generateChat: last message must be from user');
  }
  const history = messages.slice(0, -1).map((t) => ({
    role: t.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: t.content }],
  }));
  const session = m.startChat({ history });
  const resp = await session.sendMessage(last.content);
  const text = resp.response.text();
  const usage = resp.response.usageMetadata;
  return {
    text,
    inputTokens: usage?.promptTokenCount ?? 0,
    cachedTokens: usage?.cachedContentTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
  };
}

/**
 * Stream a Claude response. Used for the premium narrative pass where
 * the user sees text appearing live via React Suspense + ReadableStream.
 */
export async function generateStream(params: GenerateParams): Promise<ReadableStream<string>> {
  const prompt = loadPrompt(params.promptId);
  const model = params.modelOverride ?? prompt.defaultModel;
  const system = renderPrompt(prompt.system, params.vars);
  const userMsg = renderPrompt(prompt.user, params.vars);

  if (!model.startsWith('claude')) {
    // Gemini streaming has different shape; for v0.1 we only stream Claude.
    throw new Error(`generateStream: model ${model} not supported (Claude only for now)`);
  }

  const anthropic = getAnthropic();
  const cacheable = prompt.cacheBreakpoints.length > 0;
  const systemBlocks = cacheable
    ? [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }]
    : system;

  const t0 = Date.now();
  let inputTokens = 0;
  let cachedTokens = 0;
  let outputTokens = 0;

  const stream = anthropic.messages.stream({
    model,
    max_tokens: prompt.maxOutputTokens,
    temperature: prompt.temperature,
    system: systemBlocks as any,
    messages: [{ role: 'user', content: userMsg }],
  });

  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(event.delta.text);
          }
          if (event.type === 'message_delta' && event.usage) {
            outputTokens = event.usage.output_tokens;
          }
          if (event.type === 'message_start' && event.message.usage) {
            inputTokens = event.message.usage.input_tokens;
            cachedTokens = (event.message.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0;
          }
        }
        controller.close();
        const latencyMs = Date.now() - t0;
        await recordCost({
          userId: params.userId,
          promptId: prompt.id,
          promptVersion: prompt.version,
          model,
          inputTokens,
          cachedTokens,
          outputTokens,
          latencyMs,
          success: true,
        });
      } catch (err) {
        controller.error(err);
        await recordCost({
          userId: params.userId,
          promptId: prompt.id,
          promptVersion: prompt.version,
          model,
          inputTokens,
          cachedTokens,
          outputTokens,
          latencyMs: Date.now() - t0,
          success: false,
          error: (err as Error).message,
        });
      }
    },
  });
}
