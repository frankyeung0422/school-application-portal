# Corpus

50 reference charts for engine validation, per plan §F.

## Sources

- **Textbook examples** (20): worked examples from 紫雲《紫微斗數導讀》— citation pinned per file
- **Celebrity** (20): public birth records — Wikipedia / official biography sources only
- **Team** (10): consenting team members + family

Each file is a JSON document of the form:

```jsonc
{
  "id": "zy-ch5-ex1",
  "source": "紫雲《紫微斗數導讀》ch.5 ex.1 page 65",
  "birth": { "year": 1980, "month": 3, "day": 15, "hour": 14, "minute": 0, "gender": "M", "calendar": "solar" },
  "expected": {
    "mingongBranch": "申",
    "palaces": [ /* 12 palaces with expected stars + transformations */ ]
  }
}
```

Tests use `vitest` snapshot diff. Failed cases produce an HTML diff report under `__tests__/coverage/diff/<id>.html`.

Land in P3 (week 6-7) per `~/.claude/plans/tingly-tickling-papert.md`.
