import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const promptSchema = z.object({
  id: z.string(),
  version: z.string(),
  description: z.string(),
  defaultModel: z.string(),
  cacheBreakpoints: z.array(z.string()).default([]),
  maxOutputTokens: z.number().int().positive(),
  temperature: z.number().min(0).max(2),
  supportsImage: z.boolean().optional(),
  system: z.string(),
  user: z.string(),
});

export type PromptDefinition = z.infer<typeof promptSchema>;

const PROMPT_DIR = path.join(process.cwd(), 'src', 'lib', 'ai', 'prompts');
const cache = new Map<string, PromptDefinition>();

export function loadPrompt(id: string): PromptDefinition {
  if (cache.has(id)) return cache.get(id)!;
  const file = path.join(PROMPT_DIR, `${id}.yaml`);
  if (!fs.existsSync(file)) throw new Error(`Prompt not found: ${id} (${file})`);
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = promptSchema.parse(parse(raw));
  cache.set(id, parsed);
  return parsed;
}

/** Render `{{var}}` placeholders. Missing vars throw. */
export function renderPrompt(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    if (!(key in vars)) throw new Error(`Missing prompt var: ${key}`);
    const v = vars[key];
    return typeof v === 'string' ? v : JSON.stringify(v);
  });
}
