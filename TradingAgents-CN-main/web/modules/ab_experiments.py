"""
P5 — Forward-validation experiments: the machinery that actually runs the
pre-registered gates.

P1–P4 ended in promises: "twin-account A/B ≥4 weeks + trailing IC > 0.03
before the ranker becomes the default", "one options-follow account per play
for ≥60 days". This module turns those promises into rows that conclude
themselves:

  create_ranker_ab()        twin paper accounts, identical plans except
                            pick_source (heuristic vs ml_ranker), gate frozen
                            at creation. Refuses to start while the ranker
                            has no fresh scores — a fallen-back ml arm would
                            trade identically to the heuristic arm and the
                            4-week clock would run on garbage.
  create_playbook_trials()  one options-follow account per playbook play, so
                            each play's 60-day record is uncontaminated by
                            the others' capital usage.
  evaluate_experiments()    nightly: recompute arm metrics, apply the FROZEN
                            gate, conclude passed/failed. Pre-registered
                            means the gate cannot drift: it is stored on the
                            row at creation and never re-read from code.

A 'passed' verdict is ADVISORY — it does not auto-flip any default. Scale-up
(defaulting new accounts to ml_ranker, real capital) additionally requires
the strategy_registry 'approved' status; this module only renders the
verdict a human acts on. Exposed via GET /api/experiments.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any, Dict, List, Optional

_RANKER_GATE = {'min_days': 28, 'max_days': 56, 'min_ic': 0.03,
                'min_arm_trades': 10}
_PLAY_GATE = {'min_days': 60, 'max_days': 120, 'min_trades': 10}

_DEFAULT_PLAYS = ('index_csp', 'holdings_cc', 'index_put_credit_spread',
                  'preearnings_straddle')


def _conn():
    try:
        from . import paper_trading as _pt
    except Exception:
        from web.modules import paper_trading as _pt  # type: ignore
    return _pt._conn()


def init_experiments_table() -> None:
    with _conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS ab_experiments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,              -- ranker_ab | options_play
            name TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            arm_a_account_id INTEGER NOT NULL,
            arm_b_account_id INTEGER,        -- NULL for single-arm trials
            play_name TEXT,
            gate_json TEXT NOT NULL,         -- frozen at creation
            status TEXT DEFAULT 'running',   -- running | passed | failed | stopped
            verdict_json TEXT,
            concluded_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_ab_exp_status ON ab_experiments(status);
        ''')
        c.commit()


def _create_account(user_id: int, plan: Dict[str, Any]) -> Dict[str, Any]:
    try:
        from .paper_trading import create_account
    except ImportError:
        from web.modules.paper_trading import create_account  # type: ignore
    return create_account(user_id, plan)


def _ranker_scores_fresh(max_age_days: int = 7) -> bool:
    try:
        with _conn() as c:
            row = c.execute('SELECT MAX(score_date) AS d FROM ml_rank_scores').fetchone()
        if not row or not row['d']:
            return False
        return (date.today() - date.fromisoformat(row['d'])).days <= max_age_days
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Experiment creation
# ---------------------------------------------------------------------------

def create_ranker_ab(user_id: int, capital: float = 10000.0,
                     universe: str = 'sp500_top50', ai_pick_count: int = 5,
                     name: Optional[str] = None,
                     require_scores: bool = True) -> Dict[str, Any]:
    """Twin accounts, identical in every plan field except pick_source."""
    init_experiments_table()
    if require_scores and not _ranker_scores_fresh():
        return {'success': False,
                'error': 'ml_ranker has no fresh scores — train + score first, '
                         'or the ml arm would silently fall back to the '
                         'heuristic and the A/B would compare nothing'}

    today = date.today().isoformat()
    label = name or f'RankerAB {today}'
    shared = {
        'ai_mode': 'ai_picks', 'universe': universe,
        'ai_pick_count': ai_pick_count, 'capital': capital,
        'auto_run': True, 'email_on_run': False,
    }
    a = _create_account(user_id, dict(shared, name=f'{label} · A heuristic',
                                      pick_source='heuristic'))
    if not a.get('success'):
        return {'success': False, 'error': f'arm A creation failed: {a.get("error")}'}
    b = _create_account(user_id, dict(shared, name=f'{label} · B ml_ranker',
                                      pick_source='ml_ranker'))
    if not b.get('success'):
        return {'success': False, 'error': f'arm B creation failed: {b.get("error")}'}

    with _conn() as c:
        cur = c.execute(
            '''INSERT INTO ab_experiments
               (kind, name, user_id, created_at, arm_a_account_id,
                arm_b_account_id, gate_json)
               VALUES ('ranker_ab', ?, ?, ?, ?, ?, ?)''',
            (label, user_id, today, a['account_id'], b['account_id'],
             json.dumps(_RANKER_GATE)))
        c.commit()
        exp_id = cur.lastrowid
    return {'success': True, 'experiment_id': exp_id,
            'arm_a_account_id': a['account_id'],
            'arm_b_account_id': b['account_id'], 'gate': dict(_RANKER_GATE)}


def create_playbook_trials(user_id: int, capital: float = 10000.0,
                           plays: Optional[List[str]] = None) -> Dict[str, Any]:
    """One options-follow playbook account per play — isolated capital so
    each play's record is its own."""
    init_experiments_table()
    today = date.today().isoformat()
    created = []
    errors = []
    for play in (plays or list(_DEFAULT_PLAYS)):
        res = _create_account(user_id, {
            'ai_mode': 'options_follow', 'options_engine': 'playbook',
            'options_plays': [play], 'capital': capital,
            'auto_run': True, 'email_on_run': False,
            'name': f'PlayTrial · {play} · {today}',
        })
        if not res.get('success'):
            errors.append({'play': play, 'error': res.get('error')})
            continue
        with _conn() as c:
            cur = c.execute(
                '''INSERT INTO ab_experiments
                   (kind, name, user_id, created_at, arm_a_account_id,
                    play_name, gate_json)
                   VALUES ('options_play', ?, ?, ?, ?, ?, ?)''',
                (f'PlayTrial {play}', user_id, today, res['account_id'],
                 play, json.dumps(_PLAY_GATE)))
            c.commit()
            created.append({'play': play, 'experiment_id': cur.lastrowid,
                            'account_id': res['account_id']})
    return {'success': len(created) > 0 or not errors,
            'created': created, 'errors': errors}


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def _arm_metrics(account_id: int) -> Dict[str, Any]:
    """Realized metrics from the equity history + closed positions."""
    out = {'account_id': account_id, 'return_pct': None, 'max_dd_pct': None,
           'n_trades': 0, 'equity': None}
    with _conn() as c:
        eq = c.execute(
            'SELECT date, equity FROM paper_equity_history WHERE account_id=? '
            'ORDER BY date', (account_id,)).fetchall()
        n_share = c.execute(
            "SELECT COUNT(*) AS n FROM paper_positions "
            "WHERE account_id=? AND status='closed'", (account_id,)).fetchone()
        try:
            n_opt = c.execute(
                "SELECT COUNT(*) AS n, COALESCE(SUM(realized_pnl_usd),0) AS pnl "
                "FROM paper_option_positions "
                "WHERE account_id=? AND status='settled'", (account_id,)).fetchone()
        except Exception:
            n_opt = None
    out['n_trades'] = int(n_share['n'] or 0) + int(n_opt['n'] or 0 if n_opt else 0)
    if n_opt is not None:
        out['options_realized_pnl_usd'] = round(float(n_opt['pnl'] or 0), 2)
    if eq:
        first, last = float(eq[0]['equity']), float(eq[-1]['equity'])
        out['equity'] = round(last, 2)
        out['return_pct'] = round((last / first - 1) * 100, 3) if first else None
        peak, max_dd = -1e18, 0.0
        for r in eq:
            v = float(r['equity'])
            peak = max(peak, v)
            if peak > 0:
                max_dd = max(max_dd, (peak - v) / peak * 100)
        out['max_dd_pct'] = round(max_dd, 3)
    return out


def evaluate_experiments(today: Optional[str] = None) -> Dict[str, Any]:
    """Nightly: apply each running experiment's FROZEN gate. Concludes rows;
    never flips any default (that's a human + registry decision)."""
    init_experiments_table()
    today = today or date.today().isoformat()
    results = []
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM ab_experiments WHERE status='running'").fetchall()
    for r in rows:
        try:
            gate = json.loads(r['gate_json'] or '{}')
        except Exception:
            gate = {}
        try:
            elapsed = (date.fromisoformat(today)
                       - date.fromisoformat(r['created_at'])).days
        except Exception:
            continue

        verdict: Dict[str, Any] = {'as_of': today, 'elapsed_days': elapsed,
                                   'gate': gate}
        new_status = 'running'

        if r['kind'] == 'ranker_ab':
            arm_a = _arm_metrics(int(r['arm_a_account_id']))
            arm_b = _arm_metrics(int(r['arm_b_account_id']))
            verdict['arm_a_heuristic'] = arm_a
            verdict['arm_b_ml_ranker'] = arm_b
            trailing_ic = None
            try:
                try:
                    from .ml_ranker import confidence_state
                except ImportError:
                    from web.modules.ml_ranker import confidence_state  # type: ignore
                trailing_ic = confidence_state().get('trailing_ic')
            except Exception:
                pass
            verdict['trailing_ic'] = trailing_ic
            checks = {
                'min_days_reached': elapsed >= int(gate.get('min_days', 28)),
                'b_beats_a': (arm_b['return_pct'] is not None
                              and arm_a['return_pct'] is not None
                              and arm_b['return_pct'] > arm_a['return_pct']),
                'ic_above_gate': (trailing_ic is not None
                                  and trailing_ic > float(gate.get('min_ic', 0.03))),
                'b_has_min_trades': arm_b['n_trades'] >= int(gate.get('min_arm_trades', 10)),
            }
            verdict['checks'] = checks
            if all(checks.values()):
                new_status = 'passed'
            elif elapsed >= int(gate.get('max_days', 56)):
                new_status = 'failed'

        elif r['kind'] == 'options_play':
            arm = _arm_metrics(int(r['arm_a_account_id']))
            verdict['arm'] = arm
            pnl = arm.get('options_realized_pnl_usd') or 0.0
            checks = {
                'min_days_reached': elapsed >= int(gate.get('min_days', 60)),
                'min_trades': arm['n_trades'] >= int(gate.get('min_trades', 10)),
                'positive_realized_pnl': pnl > 0,
            }
            verdict['checks'] = checks
            if all(checks.values()):
                new_status = 'passed'
            elif elapsed >= int(gate.get('max_days', 120)):
                new_status = 'failed'

        with _conn() as c:
            if new_status != 'running':
                c.execute(
                    'UPDATE ab_experiments SET status=?, verdict_json=?, '
                    'concluded_at=? WHERE id=?',
                    (new_status, json.dumps(verdict), today, r['id']))
            else:
                c.execute('UPDATE ab_experiments SET verdict_json=? WHERE id=?',
                          (json.dumps(verdict), r['id']))
            c.commit()
        results.append({'id': r['id'], 'kind': r['kind'], 'name': r['name'],
                        'status': new_status, 'elapsed_days': elapsed})
    return {'success': True, 'evaluated': len(results), 'experiments': results}


def list_experiments(limit: int = 50) -> List[Dict[str, Any]]:
    init_experiments_table()
    with _conn() as c:
        rows = c.execute(
            'SELECT * FROM ab_experiments ORDER BY id DESC LIMIT ?',
            (limit,)).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        for k in ('gate_json', 'verdict_json'):
            try:
                d[k.replace('_json', '')] = json.loads(d.pop(k) or 'null')
            except Exception:
                d[k.replace('_json', '')] = None
        out.append(d)
    return out
