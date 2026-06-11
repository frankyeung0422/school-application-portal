"""
T6.2+ — Champion / Challenger framework for paper-trading plans.

Each paper-trading account has one CHAMPION plan (the live ``plan_json``
in the paper_accounts row) plus up to ``MAX_CHALLENGERS`` candidate plans
held in the ``paper_challengers`` table. On every evolution cycle:

  1. Score the champion using blended backtest + live fitness (T6.1).
  2. Re-score each active challenger on the same window.
  3. If a challenger beats the champion's blended score for
     ``WIN_STREAK_TO_PROMOTE`` consecutive cycles, promote it: the
     challenger becomes the live plan, the old champion is dropped.
  4. Garbage-collect challengers that have lost ``LOSS_STREAK_TO_DROP``
     cycles in a row, freeing slots for new candidates.

This is the no-regret learning layer on top of the optimizer: a plan
only goes live after sustained out-of-sample wins, never on a one-off
lucky generation.

The actual candidate-generation logic (random mutation, GA, LLM) lives
in T6.4 in this same module.
"""
from __future__ import annotations

import json
import logging
import random
import sqlite3
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


logger = logging.getLogger('paper_trading')

# ---------------------------------------------------------------------------
# Tunables. Kept small so test runs converge quickly; production can bump
# WIN_STREAK_TO_PROMOTE to 5+ once the strategy library is rich enough.
# ---------------------------------------------------------------------------
MAX_CHALLENGERS = 3
WIN_STREAK_TO_PROMOTE = 3
LOSS_STREAK_TO_DROP = 5
# Margin (in score points) by which a challenger must beat champion to
# count as a "win" — same threshold the optimizer uses for direct apply
# in T6.1, kept consistent so promotions feel familiar.
PROMOTION_MARGIN = 5.0


def ensure_challengers_table(conn: sqlite3.Connection) -> None:
    """Create the ``paper_challengers`` table if missing. Caller-managed
    connection so this composes with the parent ``init_paper_tables``."""
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS paper_challengers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            plan_json TEXT NOT NULL,
            source TEXT,                    -- mutation | ga | llm | manual
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_evaluated_at TEXT,
            last_score REAL,
            last_annual_pct REAL,
            win_streak INTEGER DEFAULT 0,
            loss_streak INTEGER DEFAULT 0,
            cycles INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',   -- active | promoted | dropped
            note TEXT,
            FOREIGN KEY(account_id) REFERENCES paper_accounts(id)
        );
        CREATE INDEX IF NOT EXISTS idx_paper_challengers_account
            ON paper_challengers(account_id, status, last_score DESC);
    ''')
    conn.commit()


def list_challengers(account_id: int, conn_factory) -> List[Dict[str, Any]]:
    """Return the active challengers for one account, freshest first."""
    with conn_factory() as c:
        rows = c.execute(
            'SELECT * FROM paper_challengers WHERE account_id=? AND status=? '
            'ORDER BY last_score DESC, id DESC',
            (account_id, 'active')).fetchall()
    return [dict(r) for r in rows]


def add_challenger(account_id: int, plan: Dict[str, Any], source: str,
                   conn_factory, note: Optional[str] = None) -> Optional[int]:
    """Add a candidate plan to the account's challenger pool.

    Returns the new row id, or None if the account already has
    ``MAX_CHALLENGERS`` active candidates (the caller should drop a
    loser first, or this becomes a no-op).
    """
    with conn_factory() as c:
        n_active = c.execute(
            'SELECT COUNT(*) FROM paper_challengers WHERE account_id=? AND status=?',
            (account_id, 'active')).fetchone()[0]
        if n_active >= MAX_CHALLENGERS:
            return None
        cur = c.execute(
            'INSERT INTO paper_challengers (account_id, plan_json, source, note) '
            'VALUES (?, ?, ?, ?)',
            (account_id, json.dumps(plan), source, note))
        c.commit()
        return cur.lastrowid


def drop_challenger(challenger_id: int, conn_factory,
                    reason: str = 'dropped') -> bool:
    with conn_factory() as c:
        cur = c.execute(
            "UPDATE paper_challengers SET status='dropped', note=? WHERE id=?",
            (reason, challenger_id))
        c.commit()
    return cur.rowcount > 0


def record_evaluation(challenger_id: int, score: float, annual_pct: float,
                      won: bool, conn_factory) -> Dict[str, Any]:
    """Apply one cycle's win/loss to a challenger's streak counters."""
    now = datetime.now().isoformat()
    with conn_factory() as c:
        if won:
            c.execute(
                'UPDATE paper_challengers SET '
                'last_evaluated_at=?, last_score=?, last_annual_pct=?, '
                'win_streak=win_streak+1, loss_streak=0, cycles=cycles+1 '
                'WHERE id=?',
                (now, score, annual_pct, challenger_id))
        else:
            c.execute(
                'UPDATE paper_challengers SET '
                'last_evaluated_at=?, last_score=?, last_annual_pct=?, '
                'win_streak=0, loss_streak=loss_streak+1, cycles=cycles+1 '
                'WHERE id=?',
                (now, score, annual_pct, challenger_id))
        c.commit()
        c.row_factory = sqlite3.Row
        row = c.execute(
            'SELECT win_streak, loss_streak, cycles FROM paper_challengers WHERE id=?',
            (challenger_id,)).fetchone()
    return dict(row) if row else {}


def promote_challenger(challenger_id: int, account_id: int, conn_factory) -> Optional[Dict[str, Any]]:
    """Swap a challenger into the live ``plan_json`` slot. Marks the
    challenger as ``promoted`` and clears any peer challengers — when a
    new plan goes live, the others are stale relative to it.

    Returns the promoted plan dict, or None if the challenger row vanished.
    """
    with conn_factory() as c:
        c.row_factory = sqlite3.Row
        row = c.execute(
            'SELECT plan_json, source FROM paper_challengers WHERE id=? AND account_id=?',
            (challenger_id, account_id)).fetchone()
        if not row:
            return None
        plan = json.loads(row['plan_json'])
        source = row['source'] or 'unknown'
        now = datetime.now().isoformat()
        # Write the new live plan AND mark this challenger as promoted.
        c.execute(
            'UPDATE paper_accounts SET plan_json=?, last_evolved_at=? WHERE id=?',
            (json.dumps(plan), now, account_id))
        c.execute(
            "UPDATE paper_challengers SET status='promoted' WHERE id=?",
            (challenger_id,))
        # Clear other active challengers — they were challenging the old
        # champion and aren't comparable any more.
        c.execute(
            "UPDATE paper_challengers SET status='dropped', "
            "note='superseded by promotion' WHERE account_id=? AND status='active'",
            (account_id,))
        c.commit()
    return {'plan': plan, 'source': source}


def evaluate_challengers(account_id: int, champion_score: float,
                         scorer, conn_factory) -> Dict[str, Any]:
    """Run one champion/challenger evaluation cycle.

    ``scorer`` is a callable ``(plan_dict) -> {score, annual_return_pct}``
    supplied by the caller (in practice, a closure over the optimizer's
    blended-fitness function). This module stays decoupled from
    optimize_plan so it's unit-testable without yfinance.

    Returns a summary dict including any promotion that happened. The
    caller is responsible for actually swapping the live plan via
    ``promote_challenger`` — we don't do it here so the evolve flow can
    add a guardrail check (T6.6) between evaluation and apply.
    """
    summary: Dict[str, Any] = {
        'account_id': account_id, 'champion_score': champion_score,
        'evaluated': [], 'promoted': None, 'dropped': [],
    }
    challengers = list_challengers(account_id, conn_factory)
    for ch in challengers:
        try:
            plan = json.loads(ch['plan_json'])
        except Exception as e:
            drop_challenger(ch['id'], conn_factory, reason=f'corrupt plan_json: {e}')
            summary['dropped'].append({'id': ch['id'], 'reason': 'corrupt_plan_json'})
            continue
        try:
            scored = scorer(plan)
            score = float(scored.get('score') or 0)
            annual = float(scored.get('annual_return_pct') or 0)
        except Exception as e:
            logger.warning('challenger %s scorer crashed: %s', ch['id'], e,
                           extra={'account': account_id})
            continue
        won = score >= (champion_score + PROMOTION_MARGIN)
        new_state = record_evaluation(ch['id'], score, annual, won, conn_factory)
        summary['evaluated'].append({
            'id': ch['id'], 'source': ch['source'], 'score': score,
            'annual_pct': annual, 'won': won,
            'win_streak': new_state.get('win_streak', 0),
            'loss_streak': new_state.get('loss_streak', 0),
        })
        # Drop if losing streak too long
        if new_state.get('loss_streak', 0) >= LOSS_STREAK_TO_DROP:
            drop_challenger(ch['id'], conn_factory,
                            reason=f'loss_streak={new_state["loss_streak"]} >= {LOSS_STREAK_TO_DROP}')
            summary['dropped'].append({'id': ch['id'], 'reason': 'loss_streak'})
            continue
        # Promote first challenger to hit the streak threshold (one per cycle).
        if (summary['promoted'] is None
                and new_state.get('win_streak', 0) >= WIN_STREAK_TO_PROMOTE):
            summary['promoted'] = {
                'id': ch['id'], 'source': ch['source'],
                'win_streak': new_state['win_streak'],
                'score': score, 'annual_pct': annual,
            }
    return summary


# ---------------------------------------------------------------------------
# Candidate generation — simple mutation source. T6.4 will add GA + LLM
# sources via the same add_challenger() interface.
# ---------------------------------------------------------------------------
_STRATEGY_LIBRARY = ('ma_cross', 'rsi_meanreversion', 'macd_cross',
                     'breakout', 'momentum')
_COMBINE_MODES = ('any', 'majority', 'all')


# ---------------------------------------------------------------------------
# T6.3 — Regime detection. Classifies the current market into one of a
# small set of regimes so the optimizer can pick the plan that wins in
# the regime we're actually in, not globally averaged across all of
# history. Returns {regime, vix, spy_ret_20d, classified_at}.
# ---------------------------------------------------------------------------
REGIME_TREND_UP = 'trend_up'
REGIME_TREND_DOWN = 'trend_down'
REGIME_CHOP = 'chop'
REGIME_HIGH_VOL = 'high_vol'
REGIME_LOW_VOL = 'low_vol'
REGIME_UNKNOWN = 'unknown'


def classify_regime(spy_closes: Optional[List[float]] = None,
                    vix_level: Optional[float] = None) -> Dict[str, Any]:
    """Classify the market regime from SPY 20/60 returns + VIX level.

    Args:
        spy_closes: most recent SPY daily closes (at least 61 bars). If
            None or insufficient, returns regime=unknown.
        vix_level: latest VIX value. None = treated as missing.

    Heuristic (kept deliberately simple — tunable later from data):
        high_vol     vix >= 28
        trend_up     20d return >= +5% AND vix < 22
        trend_down   20d return <= -5%
        low_vol      vix < 14
        chop         everything else (default)

    The 5%-over-20d threshold matches a 60%+ annualized clip, so it
    won't trigger on noise.
    """
    out: Dict[str, Any] = {
        'regime': REGIME_UNKNOWN,
        'vix': vix_level,
        'spy_ret_20d_pct': None,
        'classified_at': datetime.now().isoformat(),
        'reason': '',
    }
    if not spy_closes or len(spy_closes) < 21:
        out['reason'] = f'need >=21 SPY bars, got {len(spy_closes) if spy_closes else 0}'
        return out
    ret_20d = ((float(spy_closes[-1]) / float(spy_closes[-21])) - 1.0) * 100.0
    out['spy_ret_20d_pct'] = round(ret_20d, 2)

    if vix_level is not None and vix_level >= 28:
        out['regime'] = REGIME_HIGH_VOL
        out['reason'] = f'vix {vix_level:.1f} >= 28'
    elif ret_20d >= 5 and (vix_level is None or vix_level < 22):
        out['regime'] = REGIME_TREND_UP
        out['reason'] = f'spy 20d ret {ret_20d:.2f}% >= 5'
    elif ret_20d <= -5:
        out['regime'] = REGIME_TREND_DOWN
        out['reason'] = f'spy 20d ret {ret_20d:.2f}% <= -5'
    elif vix_level is not None and vix_level < 14:
        out['regime'] = REGIME_LOW_VOL
        out['reason'] = f'vix {vix_level:.1f} < 14'
    else:
        out['regime'] = REGIME_CHOP
        out['reason'] = (f'spy 20d ret {ret_20d:.2f}% within ±5%' +
                         (f', vix {vix_level:.1f}' if vix_level is not None else ''))
    return out


def ensure_regime_table(conn: sqlite3.Connection) -> None:
    """Daily regime classification persisted so we can compare across time."""
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS market_regime_daily (
            date TEXT PRIMARY KEY,
            regime TEXT NOT NULL,
            vix REAL,
            spy_ret_20d_pct REAL,
            reason TEXT,
            classified_at TEXT
        );
    ''')
    conn.commit()


def upsert_regime(date_iso: str, classification: Dict[str, Any],
                  conn_factory) -> None:
    """Write the daily classification — idempotent on (date)."""
    with conn_factory() as c:
        c.execute(
            'INSERT INTO market_regime_daily '
            '(date, regime, vix, spy_ret_20d_pct, reason, classified_at) '
            'VALUES (?, ?, ?, ?, ?, ?) '
            'ON CONFLICT(date) DO UPDATE SET '
            'regime=excluded.regime, vix=excluded.vix, '
            'spy_ret_20d_pct=excluded.spy_ret_20d_pct, '
            'reason=excluded.reason, classified_at=excluded.classified_at',
            (date_iso, classification.get('regime', REGIME_UNKNOWN),
             classification.get('vix'),
             classification.get('spy_ret_20d_pct'),
             classification.get('reason', ''),
             classification.get('classified_at', datetime.now().isoformat())))
        c.commit()


def regime_just_flipped(conn_factory, window_days: int = 3) -> bool:
    """True if the most recent N daily regime rows aren't all the same.

    Used by T6.6 guardrails to refuse evolution apply when the regime
    is in transition — promoting a plan tuned to the OLD regime
    immediately after a flip is a classic over-fit trap.
    """
    with conn_factory() as c:
        rows = [r[0] for r in c.execute(
            'SELECT regime FROM market_regime_daily '
            'ORDER BY date DESC LIMIT ?', (window_days,)).fetchall()]
    return len(rows) >= 2 and len(set(rows)) > 1


# ---------------------------------------------------------------------------
# T6.4 — Challenger sources. Each function returns a candidate plan dict
# that paper_trading.evolve_account_plan will hand to add_challenger().
# They share the same signature so the calling code stays uniform:
#
#     candidate = source(champion, base_plan, scorer, rng) -> dict or None
#
# `champion`  : the current live plan_json dict (read-only)
# `base_plan` : the full simulate_plan input (symbols, capital, period, …)
# `scorer`    : callable(plan_dict) -> {score, annual_return_pct} for the
#               source to optionally evaluate proposals before returning
#               the strongest one
# `rng`       : seeded Random so tests are deterministic
#
# When a source returns None, the caller silently moves on — never raises.
# ---------------------------------------------------------------------------

def source_random_mutation(champion: Dict[str, Any],
                            base_plan: Dict[str, Any],
                            scorer,
                            rng: Optional[random.Random] = None) -> Optional[Dict[str, Any]]:
    """One mutated copy of the champion. Cheapest source — always returns
    something unless the champion is empty."""
    if not champion:
        return None
    return mutate_plan(champion, rng=rng)


# Mapping from paper-trading strategy names ↔ GA StrategyGenome strategy_id
# Kept here so the GA module's namespace (momentum / mean_reversion / …)
# can be translated into our 5-strategy library without touching either side.
_GA_STRAT_TO_PT = {
    'momentum': 'momentum',
    'mean_reversion': 'rsi_meanreversion',
    'multi_factor': 'macd_cross',
    'pairs_trading': 'breakout',
    'volatility_arb': 'momentum',
    'stat_arb': 'rsi_meanreversion',
}


def _genome_params_to_plan(genome_params: Dict[str, Any],
                           strategy_id: str,
                           champion: Dict[str, Any]) -> Dict[str, Any]:
    """Translate StrategyGenome.params into a paper-trading plan dict.

    Most genome fields are sub-strategy weights we don't use directly.
    The fields that DO map: position_pct → pos_size_pct, stop_loss →
    stop_loss_pct, take_profit → take_profit_pct. Symbols / ai_mode
    are user-owned and stay on the champion side.
    """
    pt_strat = _GA_STRAT_TO_PT.get(strategy_id)
    out = dict(champion)
    if pt_strat:
        out['strategies'] = [pt_strat]
    if 'position_pct' in genome_params:
        out['pos_size_pct'] = max(5.0, min(80.0,
                                            float(genome_params['position_pct']) * 100))
    if 'stop_loss' in genome_params:
        # GA stores stop_loss as negative fraction; flip sign + clamp
        out['stop_loss_pct'] = max(1.0, min(15.0,
                                             abs(float(genome_params['stop_loss'])) * 100))
    if 'take_profit' in genome_params:
        out['take_profit_pct'] = max(2.0, min(30.0,
                                                float(genome_params['take_profit']) * 100))
    return out


def source_ga_mutation(champion: Dict[str, Any],
                        base_plan: Dict[str, Any],
                        scorer,
                        rng: Optional[random.Random] = None) -> Optional[Dict[str, Any]]:
    """Genetic-algorithm-mutated proposal via tradingagents.quant.auto_optimizer.

    We don't run the full ``run_optimization`` here (it needs a quant_engine
    + backtests of its own) — just borrow the ``StrategyGenome.mutate`` /
    ``crossover`` machinery to produce a new candidate, then translate
    its params into a paper-trading plan via _genome_params_to_plan.
    Returns None if the GA module is unavailable.
    """
    try:
        from tradingagents.quant.auto_optimizer import StrategyGenome
    except Exception:
        return None
    # Pick a GA strategy that maps to one of the champion's current strats
    champ_strats = set(champion.get('strategies') or [])
    candidate_ga_strats = [g for g, p in _GA_STRAT_TO_PT.items() if p in champ_strats]
    if not candidate_ga_strats:
        candidate_ga_strats = ['multi_factor']  # generic fallback
    pick = (rng or random).choice(candidate_ga_strats)
    try:
        seed_genome = StrategyGenome(pick)
        # Two rounds of mutation produce more variation than the default 0.15 rate
        mutated = seed_genome.mutate(mutation_rate=0.4, mutation_strength=0.3)
        return _genome_params_to_plan(mutated.params, pick, champion)
    except Exception:
        return None


def source_llm_proposal(champion: Dict[str, Any],
                         base_plan: Dict[str, Any],
                         scorer,
                         rng: Optional[random.Random] = None) -> Optional[Dict[str, Any]]:
    """LLM-proposed strategy candidate.

    Uses the existing ``pro_ai._try_llm`` infrastructure (already wired to
    Anthropic Claude with OpenAI fallback). Returns None if no API key
    is configured — the system gracefully degrades to the
    mutation + GA sources.
    """
    try:
        try:
            from .pro_ai import _try_llm
        except Exception:
            from web.modules.pro_ai import _try_llm  # type: ignore
    except Exception:
        return None

    strategies_available = list(_STRATEGY_LIBRARY)
    facts = (
        f"Current plan: strategies={champion.get('strategies')}, "
        f"combine_mode={champion.get('combine_mode')}, "
        f"tp={champion.get('take_profit_pct')}%, "
        f"sl={champion.get('stop_loss_pct')}%, "
        f"pos_size={champion.get('pos_size_pct')}%.\n"
        f"Symbols: {base_plan.get('symbols')}\n"
        f"Available strategies: {strategies_available}\n"
        f"Combine modes: {list(_COMBINE_MODES)}"
    )
    prompt = (
        "Propose ONE alternative paper-trading plan to challenge the "
        "current champion. Reply ONLY with valid JSON, no commentary, "
        "no markdown fences. Schema: "
        '{"strategies":["...",...],"combine_mode":"any|majority|all",'
        '"take_profit_pct":<num 2-30>,"stop_loss_pct":<num 1-15>,'
        '"pos_size_pct":<num 5-80>}.\n\n' + facts
    )
    system = "You are a quantitative trading strategy generator. Output strict JSON only."
    try:
        reply = _try_llm(prompt, system=system)
    except Exception as e:
        logger.warning(f'LLM proposal failed: {e}', extra={'account': '-'})
        return None
    if not reply:
        return None
    # Strip code fences if the model added them despite the instruction
    text = reply.strip()
    if text.startswith('```'):
        # remove the first fence line and the trailing one
        lines = [ln for ln in text.split('\n') if not ln.strip().startswith('```')]
        text = '\n'.join(lines).strip()
    try:
        parsed = json.loads(text)
    except Exception:
        logger.warning(f'LLM proposal: non-JSON reply ({reply[:80]!r})',
                       extra={'account': '-'})
        return None
    # Validate + clamp the response so a hallucinated value can't smuggle
    # past our own bounds.
    out = dict(champion)
    strats = parsed.get('strategies') or []
    strats = [s for s in strats if s in _STRATEGY_LIBRARY]
    if strats:
        out['strategies'] = strats
    if parsed.get('combine_mode') in _COMBINE_MODES:
        out['combine_mode'] = parsed['combine_mode']
    for fld, lo, hi in [('take_profit_pct', 2, 30),
                          ('stop_loss_pct', 1, 15),
                          ('pos_size_pct', 5, 80)]:
        try:
            v = float(parsed.get(fld, out.get(fld, 0)))
            out[fld] = max(lo, min(hi, v))
        except (TypeError, ValueError):
            pass
    return out


# ---------------------------------------------------------------------------
# T6.5 — Thompson-sampling bandit allocator over sub-strategies.
#
# When a plan uses combine_mode='any' or 'majority' with multiple
# strategies, the entry signal currently treats every strategy equally.
# But some strategies' signals will end up paying off more than others
# on this specific symbol universe. A Beta(α, β) bandit per (account,
# strategy) tracks realized win counts (α) vs loss counts (β) and lets
# us draw a posterior weight at decision time. Underperformers naturally
# get less capital without anyone having to re-tune the plan.
#
# Storage: bandit_state(account_id, strategy, alpha, beta, last_updated).
# α and β start at 1.0 (uniform prior) — equivalent to 1 win + 1 loss of
# pretend history.
#
# Convention: only winning trades increment α; losing trades increment
# β. Break-even trades do nothing. We keep the update simple so the
# behaviour is auditable — fancier reward shaping comes later if
# warranted.
# ---------------------------------------------------------------------------

def ensure_bandit_table(conn: sqlite3.Connection) -> None:
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS bandit_state (
            account_id INTEGER NOT NULL,
            strategy TEXT NOT NULL,
            alpha REAL NOT NULL DEFAULT 1.0,
            beta REAL NOT NULL DEFAULT 1.0,
            wins INTEGER NOT NULL DEFAULT 0,
            losses INTEGER NOT NULL DEFAULT 0,
            last_updated TEXT,
            PRIMARY KEY (account_id, strategy)
        );
    ''')
    # T11 Kelly extension: track running average win / loss magnitude so the
    # sizing layer can compute the Kelly fraction f = (p*b − (1−p)) / b.
    # Backwards compat — ALTER IF NOT EXISTS pattern.
    cols = {row[1] for row in conn.execute('PRAGMA table_info(bandit_state)').fetchall()}
    if 'avg_win_pct' not in cols:
        conn.execute('ALTER TABLE bandit_state ADD COLUMN avg_win_pct REAL DEFAULT 0')
    if 'avg_loss_pct' not in cols:
        conn.execute('ALTER TABLE bandit_state ADD COLUMN avg_loss_pct REAL DEFAULT 0')
    conn.commit()


def _ensure_bandit_rows(account_id: int, strategies: List[str], conn_factory) -> None:
    """Idempotently create a row for each (account, strategy) pair."""
    if not strategies:
        return
    now = datetime.now().isoformat()
    with conn_factory() as c:
        for s in strategies:
            c.execute(
                'INSERT OR IGNORE INTO bandit_state '
                '(account_id, strategy, alpha, beta, wins, losses, last_updated) '
                'VALUES (?, ?, 1.0, 1.0, 0, 0, ?)',
                (account_id, s, now))
        c.commit()


def record_bandit_reward(account_id: int, strategy: str, won: bool,
                          conn_factory,
                          pnl_pct: Optional[float] = None) -> Dict[str, Any]:
    """Called when a position closes. Bumps α (won) or β (lost).

    T11 extension — when ``pnl_pct`` is supplied, also update the running
    average win / loss magnitude on the bandit row so Kelly-sizing has the
    payoff ratio (b = avg_win_pct / avg_loss_pct).

    Returns the new (alpha, beta, wins, losses, avg_win_pct, avg_loss_pct).
    """
    if not strategy:
        return {}
    _ensure_bandit_rows(account_id, [strategy], conn_factory)
    now = datetime.now().isoformat()
    with conn_factory() as c:
        c.row_factory = sqlite3.Row
        existing = c.execute(
            '''SELECT wins, losses,
                      COALESCE(avg_win_pct, 0)  AS avg_win_pct,
                      COALESCE(avg_loss_pct, 0) AS avg_loss_pct
               FROM bandit_state WHERE account_id=? AND strategy=?''',
            (account_id, strategy)).fetchone()
        prev_wins = int(existing['wins']) if existing else 0
        prev_losses = int(existing['losses']) if existing else 0
        prev_avg_win = float(existing['avg_win_pct'] or 0) if existing else 0.0
        prev_avg_loss = float(existing['avg_loss_pct'] or 0) if existing else 0.0
        # Running mean: new_avg = (n*old + x) / (n+1)
        if won:
            new_avg_win = prev_avg_win
            if pnl_pct is not None:
                new_avg_win = (prev_avg_win * prev_wins + abs(float(pnl_pct))) / (prev_wins + 1)
            c.execute(
                '''UPDATE bandit_state
                   SET alpha = alpha + 1, wins = wins + 1, last_updated=?,
                       avg_win_pct=?
                   WHERE account_id=? AND strategy=?''',
                (now, new_avg_win, account_id, strategy))
        else:
            new_avg_loss = prev_avg_loss
            if pnl_pct is not None:
                new_avg_loss = (prev_avg_loss * prev_losses + abs(float(pnl_pct))) / (prev_losses + 1)
            c.execute(
                '''UPDATE bandit_state
                   SET beta = beta + 1, losses = losses + 1, last_updated=?,
                       avg_loss_pct=?
                   WHERE account_id=? AND strategy=?''',
                (now, new_avg_loss, account_id, strategy))
        c.commit()
        row = c.execute(
            '''SELECT alpha, beta, wins, losses, avg_win_pct, avg_loss_pct
               FROM bandit_state WHERE account_id=? AND strategy=?''',
            (account_id, strategy)).fetchone()
    return dict(row) if row else {}


def bandit_weights(account_id: int, strategies: List[str],
                   conn_factory,
                   rng: Optional[random.Random] = None) -> Dict[str, float]:
    """Draw a Thompson-sampled weight per strategy, normalised to sum=1.

    For each strategy:
       sample = Beta(α, β).rvs()
    then normalise across the active strategies. Strategies the account
    has never tried get the prior weight (Beta(1,1) = uniform).

    The caller (paper_trading entry loop) uses these to weight how much
    each strategy's BUY vote counts during combine_mode='any'/'majority'
    voting. A strategy with α=5, β=20 (poor win rate) will average
    around weight 5/(5+20)=0.2 — its vote rarely flips a 'majority' tally.
    """
    if not strategies:
        return {}
    rng = rng or random
    _ensure_bandit_rows(account_id, strategies, conn_factory)
    with conn_factory() as c:
        c.row_factory = sqlite3.Row
        rows = {r['strategy']: (float(r['alpha']), float(r['beta']))
                for r in c.execute(
                    'SELECT strategy, alpha, beta FROM bandit_state '
                    'WHERE account_id=?', (account_id,)).fetchall()}
    samples: Dict[str, float] = {}
    total = 0.0
    for s in strategies:
        a, b = rows.get(s, (1.0, 1.0))
        # Beta sample via gamma trick — stdlib random doesn't ship Beta.
        x = rng.gammavariate(a, 1.0)
        y = rng.gammavariate(b, 1.0)
        v = x / (x + y) if (x + y) > 0 else 0.5
        samples[s] = v
        total += v
    if total <= 0:
        # All zero — uniform fallback so we don't divide by zero
        return {s: 1.0 / len(strategies) for s in strategies}
    return {s: v / total for s, v in samples.items()}


def get_bandit_state(account_id: int, conn_factory) -> List[Dict[str, Any]]:
    """Snapshot of an account's bandit state — for dashboards / debugging."""
    with conn_factory() as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(
            'SELECT * FROM bandit_state WHERE account_id=? '
            'ORDER BY (CAST(wins AS REAL)/(wins+losses+0.0001)) DESC',
            (account_id,)).fetchall()
    return [dict(r) for r in rows]


def pooled_strategy_stats(strategy: str, conn_factory,
                          exclude_account_id: Optional[int] = None) -> Dict[str, Any]:
    """Aggregate a strategy's bandit record across ALL accounts.

    Per-account Kelly sizing needs ~20 closed trades for ONE strategy on ONE
    account — at a couple of trades a month that's years away, so Kelly never
    engages and sizing falls back to fixed forever. Pooling the same strategy's
    outcomes across every account gives the sizing layer a usable sample far
    sooner (a strategy behaves similarly across names — the per-account row is
    a refinement, not a prerequisite).

    Returns {wins, losses, avg_win_pct, avg_loss_pct} with the averages
    re-weighted by each account's win/loss counts. ``exclude_account_id`` omits
    one account (e.g. to blend its own row separately).
    """
    where = 'WHERE strategy=?'
    params: List[Any] = [strategy]
    if exclude_account_id is not None:
        where += ' AND account_id<>?'
        params.append(exclude_account_id)
    with conn_factory() as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(
            f'''SELECT wins, losses,
                       COALESCE(avg_win_pct, 0)  AS avg_win_pct,
                       COALESCE(avg_loss_pct, 0) AS avg_loss_pct
                FROM bandit_state {where}''', params).fetchall()
    tot_wins = sum(int(r['wins']) for r in rows)
    tot_losses = sum(int(r['losses']) for r in rows)
    # Count-weighted average magnitude across accounts.
    win_num = sum(float(r['avg_win_pct']) * int(r['wins']) for r in rows)
    loss_num = sum(float(r['avg_loss_pct']) * int(r['losses']) for r in rows)
    return {
        'wins': tot_wins,
        'losses': tot_losses,
        'avg_win_pct': (win_num / tot_wins) if tot_wins else 0.0,
        'avg_loss_pct': (loss_num / tot_losses) if tot_losses else 0.0,
    }


# ---------------------------------------------------------------------------
# T6.6 — Evolution guardrails.
#
# Refuses to apply an evolution result when conditions suggest the swap
# would likely make things worse:
#
#   GR1 (drawdown)   — realized 30-day drawdown is > 2× the backtested
#                      max-drawdown the candidate plan was tuned to.
#   GR2 (regime)     — market regime flipped within the last N days.
#                      A plan tuned to last week's chop should NOT go
#                      live mid-spike.
#   GR3 (param dist) — candidate changes >50% of the plan's tunable
#                      fields at once. Big jumps are more likely to be
#                      overfit lucky breaks than genuine improvements.
#
# All three checks are conservative — a True/False decision plus a
# textual reason that goes into paper_admin_actions on block. Caller
# (paper_trading.evolve_account_plan) writes the row and triggers
# notify_admins so an operator can investigate.
# ---------------------------------------------------------------------------
_GR_DD_MULTIPLIER = 2.0
_GR_REGIME_WINDOW_DAYS = 3
_GR_PARAM_CHANGE_THRESHOLD = 0.5
_GR_TUNABLE_FIELDS = ('strategies', 'combine_mode', 'take_profit_pct',
                      'stop_loss_pct', 'pos_size_pct')


def _param_change_ratio(before: Dict[str, Any], after: Dict[str, Any]) -> float:
    """Fraction of tunable fields that materially changed.

    For numeric fields, "materially" = >10% relative change (so 10→11 doesn't
    count). For list/str fields it's a straight inequality.
    """
    changed = 0
    counted = 0
    for f in _GR_TUNABLE_FIELDS:
        b = before.get(f)
        a = after.get(f)
        if b is None and a is None:
            continue
        counted += 1
        if isinstance(b, (int, float)) and isinstance(a, (int, float)):
            if b == 0:
                if a != 0:
                    changed += 1
            elif abs(a - b) / abs(b) > 0.10:
                changed += 1
        else:
            if b != a:
                changed += 1
    if counted == 0:
        return 0.0
    return changed / counted


def evolution_guardrails(
    account_id: int,
    before_plan: Dict[str, Any],
    after_plan: Dict[str, Any],
    backtest_max_dd_pct: float,
    live_max_dd_pct: Optional[float],
    regime_recent_flip: bool,
) -> Dict[str, Any]:
    """Returns ``{passed: bool, blocks: [reason, ...]}``.

    The caller decides what to do — typically: don't apply, write a
    paper_admin_actions row with action='evolution_blocked', notify
    admins. We split the decision from the side-effect so the function
    stays pure-testable.
    """
    blocks: List[str] = []

    # GR1: realized vs backtested drawdown
    if (live_max_dd_pct is not None and backtest_max_dd_pct is not None
            and backtest_max_dd_pct > 0
            and live_max_dd_pct > _GR_DD_MULTIPLIER * backtest_max_dd_pct):
        blocks.append(
            f'live_dd_{live_max_dd_pct:.1f}%_exceeds_'
            f'{_GR_DD_MULTIPLIER}x_backtest_{backtest_max_dd_pct:.1f}%'
        )

    # GR2: regime just flipped
    if regime_recent_flip:
        blocks.append(f'regime_flip_within_{_GR_REGIME_WINDOW_DAYS}d')

    # GR3: too many params changed at once
    pcr = _param_change_ratio(before_plan, after_plan)
    if pcr > _GR_PARAM_CHANGE_THRESHOLD:
        blocks.append(
            f'param_change_{int(pcr*100)}%_exceeds_{int(_GR_PARAM_CHANGE_THRESHOLD*100)}%'
        )

    # GR4 (P4): forward-validation registry. Every proposed plan is
    # registered (idempotent — known configs return their existing row), and
    # a config whose registry status is 'killed' (it already died forward
    # under its pre-registered criterion) can never be re-promoted. Without
    # this, the mutation/GA sources can resurrect dead configs indefinitely.
    try:
        try:
            from . import strategy_registry as _sr
        except ImportError:
            from web.modules import strategy_registry as _sr  # type: ignore
        reg_row = _sr.register(after_plan, kind='equity_plan')
        if (reg_row or {}).get('status') == 'killed':
            blocks.append('registry_killed_config')
    except Exception:
        pass  # registry is additive — its failure must not block evolution

    return {'passed': len(blocks) == 0, 'blocks': blocks,
            'param_change_ratio': pcr}


def mutate_plan(champion: Dict[str, Any],
                rng: Optional[random.Random] = None) -> Dict[str, Any]:
    """Return a single mutated copy of ``champion``. Tweaks 1-2 fields
    with bounded perturbations. Preserves symbols / ai_mode / universe —
    those are user-owned, not strategy-owned.
    """
    rng = rng or random.Random()
    out = dict(champion)
    # Mutate strategies set: 50% chance to add or drop one
    if rng.random() < 0.5:
        cur = list(out.get('strategies') or ['ma_cross'])
        if rng.random() < 0.5 and len(cur) > 1:
            cur.pop(rng.randrange(len(cur)))
        else:
            choices = [s for s in _STRATEGY_LIBRARY if s not in cur]
            if choices:
                cur.append(rng.choice(choices))
        out['strategies'] = cur
    # Combine mode flips occasionally
    if rng.random() < 0.3:
        out['combine_mode'] = rng.choice(_COMBINE_MODES)
    # TP / SL perturbation, bounded
    def _bump(val, lo, hi, step):
        return max(lo, min(hi, round(val + rng.uniform(-step, step), 1)))
    out['take_profit_pct'] = _bump(float(out.get('take_profit_pct') or 10), 2, 30, 3)
    out['stop_loss_pct'] = _bump(float(out.get('stop_loss_pct') or 5), 1, 15, 2)
    # Position-size perturbation
    out['pos_size_pct'] = _bump(float(out.get('pos_size_pct') or 20), 5, 80, 5)
    return out
