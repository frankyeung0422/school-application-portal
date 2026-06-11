// One-off: generate the AI 師傅 portrait via OpenAI gpt-image-1.
// Output committed to apps/web/public/master/master.png — served statically,
// no runtime image-gen cost. Re-run only to regenerate the persona.
//
//   node scripts/gen-master-portrait.mjs
//
// Reads OPENAI_API_KEY from apps/web/.env.local.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, 'apps', 'web', '.env.local');
const outDir = path.join(root, 'apps', 'web', 'public', 'master');
const outFile = path.join(outDir, 'master.png');

function readKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const t = fs.readFileSync(envPath, 'utf8');
  const m = t.match(/^OPENAI_API_KEY=(.*)$/m);
  if (!m) throw new Error('OPENAI_API_KEY not found in env or ' + envPath);
  return m[1].trim().replace(/^["']|["']$/g, '');
}

const PROMPT = `A dignified elderly Chinese fortune-telling master (命理師傅), head-and-shoulders portrait, facing forward, warm wise gaze, long flowing grey beard, traditional dark indigo Tang-style robe with subtle gold trim. Calm benevolent expression, mouth gently closed. Deep ink-black studio background with faint gold constellation and 紫微 star-chart motifs glowing softly behind him. Cinematic warm rim lighting, painterly semi-realistic style, ornate and auspicious, centered composition, no text, no watermark.`;

async function main() {
  const key = readKey();
  process.stdout.write('Generating master portrait via gpt-image-1 ...\n');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt: PROMPT, size: '1024x1024', quality: 'high', n: 1 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI images ${res.status}: ${err.slice(0, 400)}`);
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data returned: ' + JSON.stringify(json).slice(0, 300));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, Buffer.from(b64, 'base64'));
  process.stdout.write(`Saved ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)\n`);
}

main().catch((e) => { process.stderr.write('FAILED: ' + e.message + '\n'); process.exit(1); });
