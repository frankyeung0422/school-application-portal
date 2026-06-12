# MingLi-Bench harness

Evaluates LLM accuracy on the 160 Global Fortune Teller Competition questions
(2022–2025, multiple-choice) with and without charts computed by `@ziwei/engine`.

- Benchmark data: [DestinyLinker/MingLi-Bench](https://github.com/DestinyLinker/MingLi-Bench) (MIT).
  `data.json` is vendored here; the upstream `fortune_api_results.json` (iztro
  charts) is kept for reference but unused — the point of this harness is to
  inject **our** engine's serialization instead.
- The A/B that matters: `--mode engine` (ziwei + bazi blocks: 12 palaces with
  minor stars/四化, 大限, 格局, 自化, four pillars, 大運, 日主強弱, 空亡) vs
  `--mode none` (birth string only). Same model, same questions.

## Usage (from repo root)

```bash
# inspect prompts without API calls
npx tsx bench/mingli/run.mts --dry --limit 3

# engine-context vs baseline (same 80 questions for a valid A/B)
npx tsx bench/mingli/run.mts --mode engine --model gemini-2.5-flash --limit 80
npx tsx bench/mingli/run.mts --mode none   --model gemini-2.5-flash --limit 80
```

Flags: `--mode none|engine|engine+|engine-t` (engine-t adds per-question-year 大限/流年/小限/十神 blocks + a timing methodology), `--model <id>` (claude*/gemini*/gpt* route to the
matching provider key), `--limit N`, `--category 婚姻`, `--concurrency N`, `--dry`.

Keys are read from the environment (`ANTHROPIC_API_KEY` / `GEMINI_API_KEY` /
`OPENAI_API_KEY`) — source them from `apps/web/.env.local`. Results are written
to `results/<stamp>-<model>-<mode>.json` with per-category accuracy.

Notes:
- gemini-2.5-flash needs `thinkingBudget: 0` (already set) or it burns the
  output budget on thoughts and returns no answer.
- Free-tier Gemini rate limits are the bottleneck; the harness backs off up to
  6 times × 12s+. Keep `--concurrency 2` on free tier.
- Scoring is exact letter match on the final `答案：X` line (regex fallback to
  the last standalone A–D).
