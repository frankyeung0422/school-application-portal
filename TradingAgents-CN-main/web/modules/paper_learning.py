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
