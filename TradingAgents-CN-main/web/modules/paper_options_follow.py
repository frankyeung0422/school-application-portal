"""
Options-follow paper account engine.

A third 每日模擬交易 account type (alongside manual / ai_picks): instead of
running TA signals on shares, the account *follows the daily AI options
recommendations*. Each day it opens the top-N recommended US option setups
(CSP / covered call / vertical spreads / iron condor) as paper positions,
marks them to market in between, and settles them at expiry using the real
close — exactly the "if I had followed every rec, what's my P&L" question,
but per-user and capital-constrained.

Two recommendation engines (the "AI") are selectable per account:
  - 'daily'         → pro_options_recommender.daily_recommendations
  - 'small_capital' → pro_options_recommender.small_capital_recommendations

Storage:
  - paper_accounts          (reused; plan_json.ai_mode == 'options_follow')
  - paper_option_positions  (new; one row per opened option setup)
  - paper_transactions      (reused; buy on open, sell on settle)
  - paper_equity_history    (reused; daily equity = cash + open collateral+MTM)

Cash/collateral model (credit strategies):
  open  → cash -= (cap_at_risk + fee)            # collateral locked
  life  → position value = cap_at_risk + MTM      # MTM ~0 at open → max_profit at expiry
  settle→ cash += cap_at_risk + realized_pnl - fee
So net cash change over a position's life == realized P&L, and the equity
curve is continuous as MTM converges to the realized payoff at expiry.

The settlement and mark-to-market math is reused verbatim from
options_rec_tracker so the per-user track record can never drift from the
global one.
"""
from __future__ import annotations

import json
import logging
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger('paper_trading')  # share paper_trading's rotating log

_DB = Path(__file__).resolve().parents[1] / 'trading_agents.db'

# Per-leg per-contract commission (paper). Matches a typical retail options
# fee (~$0.65/contract); applied on both open and close, per option leg.
_FEE_PER_CONTRACT_LEG = 0.65

_ENGINES = {'daily', 'small_capital', 'playbook'}


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(_DB), timeout=10.0)
    c.row_factory = sqlite3.Row
    return c


def ensure_options_follow_table(c: Optional[sqlite3.Connection] = None) -> None:
    """Create the per-account option-positions table. Mirrors the column
    names options_rec_tracker uses so its settlement/MTM helpers accept our
    rows directly (legs_json, credit_per_share, spot_at_open, expiry_date)."""
    own = c is None
    if own:
        c = _conn()
    try:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS paper_option_positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            opened_date TEXT NOT NULL,           -- YYYY-MM-DD we opened it
            source TEXT NOT NULL,                -- 'daily' | 'small_capital'
            symbol TEXT NOT NULL,
            strategy TEXT NOT NULL,
            strategy_label TEXT,
            bias TEXT,
            legs_json TEXT NOT NULL,
            contracts INTEGER NOT NULL DEFAULT 1,
            spot_at_open REAL,
            credit_per_share REAL,
            max_profit_usd REAL,                 -- per contract
            max_loss_usd REAL,                   -- per contract
            cap_at_risk_usd REAL,                -- per contract (collateral)
            collateral_usd REAL,                 -- cap_at_risk × contracts (locked)
            pop_pct REAL,
            expiry_date TEXT,                    -- YYYY-MM-DD
            iv_rank_pct REAL,
            status TEXT DEFAULT 'open',          -- 'open' | 'settled'
            opened_fee REAL DEFAULT 0,
            closed_at TEXT,
            spot_at_close REAL,
            realized_pnl_usd REAL,               -- total (× contracts, net close fee not incl)
            realized_outcome TEXT,
            mtm_pnl_usd REAL,                    -- total (× contracts)
            mtm_at TEXT,
            FOREIGN KEY(account_id) REFERENCES paper_accounts(id)
        );
        CREATE INDEX IF NOT EXISTS idx_paper_opt_account
            ON paper_option_positions(account_id, status);
        CREATE INDEX IF NOT EXISTS idx_paper_opt_expiry
            ON paper_option_positions(expiry_date, status);
        ''')
        # P3 migration — playbook lifecycle columns. play_name tags which
        # play opened the position; rule_* are its management thresholds
        # (frozen at open so later config edits don't rewrite history);
        # close_rule records WHICH rule actually fired; roll_of_id links a
        # re-opened position to the dte-managed one it replaces.
        cols = {row[1] for row in c.execute(
            'PRAGMA table_info(paper_option_positions)').fetchall()}
        for col, ddl in (
                ('play_name', 'TEXT'),
                ('close_rule', 'TEXT'),
                ('roll_of_id', 'INTEGER'),
                ('event_close_date', 'TEXT'),
                ('rule_profit_frac', 'REAL'),
                ('rule_dte', 'INTEGER'),
                ('rule_stop_mult', 'REAL')):
            if col not in cols:
                c.execute(f'ALTER TABLE paper_option_positions ADD COLUMN {col} {ddl}')
        c.commit()
    finally:
        if own:
            c.close()


# ---------------------------------------------------------------------------
# Recommendation source helpers
# ---------------------------------------------------------------------------
def _legs_count(legs: List[Dict[str, Any]]) -> int:
    """Number of *option* legs (puts/calls) — used for commission."""
    return max(1, sum(1 for l in (legs or []) if (l.get('type') or '').lower() in ('put', 'call')))


def _size_contracts(cap_at_risk: float, legs: int, cash: float,
                    initial_capital: float, alloc_pct: float,
                    max_contracts: int) -> int:
    """How many contracts to open for one setup.

    target  = floor((initial_capital × alloc_pct%) / cap_at_risk), at least 1
    capped  at max_contracts, and at the most cash can afford
    (cap_at_risk + commission per contract). Returns 0 → skip (cash can't even
    cover a single contract)."""
    if cap_at_risk <= 0:
        return 0
    target = int((initial_capital * (alloc_pct / 100.0)) / cap_at_risk)
    target = max(1, min(target, max_contracts))
    per_contract_cost = cap_at_risk + _FEE_PER_CONTRACT_LEG * legs
    affordable = int(cash / per_contract_cost) if per_contract_cost > 0 else 0
    return max(0, min(target, affordable))


def _expiry_for(rec: Dict[str, Any], opened_date: str) -> Optional[str]:
    """Prefer the recommender's annotated real expiry; else compute from DTE."""
    exp = rec.get('expiry')
    if exp:
        return str(exp)
    legs = rec.get('legs', []) or []
    dtes = [int(l.get('dte') or 0) for l in legs if l.get('dte')]
    dte = max(dtes) if dtes else int(rec.get('dte') or 0)
    if not dte:
        return None
    try:
        d = datetime.fromisoformat(opened_date).date()
    except ValueError:
        return None
    return (d + timedelta(days=dte)).isoformat()


def _record_play_reward(account_id: int, play_name: str, pnl_usd: float) -> None:
    """P3 — feed the per-play bandit arm (strategy key 'play:<name>') so the
    learning loop can down-weight losing plays. Best-effort, never raises."""
    try:
        try:
            from .paper_learning import record_bandit_reward
        except ImportError:
            from web.modules.paper_learning import record_bandit_reward  # type: ignore
        record_bandit_reward(account_id, f'play:{play_name}',
                             won=(pnl_usd > 0), conn_factory=_conn)
    except Exception:
        pass


def fetch_recommendations(engine: str, top_n: int,
                          dte: int = 35, budget: float = 2000.0) -> List[Dict[str, Any]]:
    """Pull today's recs from the chosen engine. Returns a (possibly empty)
    list ranked best-first. Fetches more than top_n so capital-skipped recs
    can be backfilled by the next-best setup."""
    try:
        from .pro_options_recommender import (
            daily_recommendations, small_capital_recommendations,
        )
    except ImportError:
        from web.modules.pro_options_recommender import (  # type: ignore
            daily_recommendations, small_capital_recommendations,
        )
    fetch_count = max(top_n * 3, top_n + 5)
    if engine == 'small_capital':
        res = small_capital_recommendations(budget=budget, count=fetch_count)
    else:
        res = daily_recommendations(count=fetch_count, dte=dte)
    return list(res.get('recommendations') or [])


# ---------------------------------------------------------------------------
# Account creation
# ---------------------------------------------------------------------------
def create_options_follow_account(user_id: int, plan: Dict[str, Any],
                                  capital: float, base_ccy: str,
                                  email_on_run: int, auto_run: int) -> Dict[str, Any]:
    """Insert a new options-follow paper account. Called from
    paper_trading.create_account when ai_mode == 'options_follow'."""
    try:
        from .paper_trading import init_paper_tables
    except ImportError:
        from web.modules.paper_trading import init_paper_tables  # type: ignore
    init_paper_tables()
    ensure_options_follow_table()

    name = (plan.get('name') or f'期權跟單 {datetime.now().strftime("%Y%m%d_%H%M")}').strip()
    engine = (plan.get('options_engine') or 'daily').lower()
    if engine not in _ENGINES:
        engine = 'daily'
    try:
        top_n = max(1, min(20, int(plan.get('options_top_n') or 5)))
    except (TypeError, ValueError):
        top_n = 5
    try:
        dte = max(7, min(90, int(plan.get('options_dte') or 35)))
    except (TypeError, ValueError):
        dte = 35
    try:
        budget = max(100.0, float(plan.get('options_budget') or min(capital, 2000.0)))
    except (TypeError, ValueError):
        budget = min(capital, 2000.0)
    # Multi-contract sizing: allocate up to alloc_pct of INITIAL capital per
    # setup, capped at max_contracts contracts, and never beyond available cash.
    try:
        alloc_pct = max(1.0, min(100.0, float(plan.get('options_alloc_pct') or 20)))
    except (TypeError, ValueError):
        alloc_pct = 20.0
    try:
        max_contracts = max(1, min(100, int(plan.get('options_max_contracts') or 10)))
    except (TypeError, ValueError):
        max_contracts = 10

    # P3 — playbook engine: which evidence-backed plays this account runs.
    default_plays = ['index_csp', 'holdings_cc', 'index_put_credit_spread',
                     'preearnings_straddle']
    plays = plan.get('options_plays') or default_plays
    plays = [p for p in plays if isinstance(p, str)]

    plan_clean = {
        'ai_mode': 'options_follow',
        'options_engine': engine,
        'options_top_n': top_n,
        'options_dte': dte,
        'options_budget': budget,
        'options_alloc_pct': alloc_pct,
        'options_max_contracts': max_contracts,
        'options_plays': plays,
        # E1 — dual-source earnings gating for the straddle play. ON for new
        # accounts; the frozen straddle trial (created pre-E1) lacks the key
        # and keeps its yfinance behavior.
        'earnings_v2': bool(plan.get('earnings_v2', True)),
        # Keep these so the existing list/detail UI (which reads plan.symbols /
        # plan.strategies) never trips on undefined.
        'symbols': [],
        'strategies': [f'options:{engine}'],
        'combine_mode': 'any',
    }
    today = date.today().isoformat()
    with _conn() as c:
        cur = c.execute(
            '''INSERT INTO paper_accounts
               (user_id, name, plan_json, initial_capital, cash, status, start_date,
                email_on_run, auto_run, max_drawdown_stop_pct, peak_equity,
                symbol_drawdown_stop_pct, disabled_symbols_json, base_currency,
                evolve_frequency_days)
               VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, 0, ?, 0, '[]', ?, 0)''',
            (user_id, name, json.dumps(plan_clean), capital, capital, today,
             email_on_run, auto_run, capital, base_ccy),
        )
        account_id = cur.lastrowid
        c.execute(
            'INSERT OR REPLACE INTO paper_equity_history '
            '(account_id, date, cash, positions_value, equity) VALUES (?, ?, ?, ?, ?)',
            (account_id, today, capital, 0.0, capital),
        )
        c.commit()
    return {'success': True, 'account_id': account_id, 'name': name, 'plan': plan_clean}


# ---------------------------------------------------------------------------
# Daily tick — settle expiries, MTM, open today's recommended setups
# ---------------------------------------------------------------------------
def run_follow_tick_impl(user_id: int, account_id: int, target_iso: str,
                         tick_warnings: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Process one logical day for an options-follow account:

      1. settle every open position whose expiry ≤ target date (realized P&L)
      2. mark remaining open positions to market
      3. open today's top-N recommended setups (once per day, within cash)
      4. record the equity point and advance last_run_date

    Unlike the share engine this does NOT replay history day-by-day — the
    recommender only exposes *today's* list, so a follow account accumulates
    positions forward from its creation date. Catch-up therefore == one tick.
    """
    ensure_options_follow_table()
    tick_warnings = tick_warnings if tick_warnings is not None else []
    # Settlement + MTM math reused from the global rec tracker so the two
    # track records can never diverge.
    try:
        from .options_rec_tracker import (
            _compute_realized_pnl, _mtm_per_contract, _fetch_spot_at,
        )
    except ImportError:
        from web.modules.options_rec_tracker import (  # type: ignore
            _compute_realized_pnl, _mtm_per_contract, _fetch_spot_at,
        )

    with _conn() as c:
        a = c.execute('SELECT * FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        if a['status'] != 'active':
            return {'success': False, 'error': 'Account is not active'}
        plan = json.loads(a['plan_json'])
        engine = (plan.get('options_engine') or 'daily').lower()
        top_n = int(plan.get('options_top_n') or 5)
        dte = int(plan.get('options_dte') or 35)
        budget = float(plan.get('options_budget') or 2000.0)
        alloc_pct = float(plan.get('options_alloc_pct') or 20)
        max_contracts = int(plan.get('options_max_contracts') or 10)
        cash = float(a['cash'])
        initial_capital = float(a['initial_capital'])
        email_on_run = bool(a['email_on_run'])
        last_run = a['last_run_date']

    new_tx = 0
    settled_count = 0
    opened_count = 0

    # --- 1. settle expired positions -------------------------------------
    with _conn() as c:
        open_rows = c.execute(
            '''SELECT * FROM paper_option_positions
               WHERE account_id=? AND status='open'
                 AND expiry_date IS NOT NULL AND expiry_date <= ?''',
            (account_id, target_iso)).fetchall()
    for r in open_rows:
        spot_exp = _fetch_spot_at(r['symbol'], r['expiry_date'])
        if spot_exp is None:
            continue
        pnl_per, outcome = _compute_realized_pnl(r, spot_exp)
        contracts = int(r['contracts'] or 1)
        pnl_total = pnl_per * contracts
        legs = json.loads(r['legs_json'] or '[]')
        close_fee = _FEE_PER_CONTRACT_LEG * _legs_count(legs) * contracts
        collateral = float(r['collateral_usd'] or 0)
        cash += collateral + pnl_total - close_fee
        with _conn() as c:
            c.execute(
                '''UPDATE paper_option_positions
                   SET status='settled', closed_at=?, spot_at_close=?,
                       realized_pnl_usd=?, realized_outcome=?,
                       mtm_pnl_usd=NULL, mtm_at=NULL WHERE id=?''',
                (target_iso, round(spot_exp, 2), round(pnl_total, 2), outcome, r['id']))
            c.execute(
                '''INSERT INTO paper_transactions
                   (account_id, position_id, type, symbol, shares, price, value,
                    fee, cash_after, reason, ts_date)
                   VALUES (?, ?, 'sell', ?, ?, ?, ?, ?, ?, ?, ?)''',
                (account_id, r['id'], f"{r['symbol']} {r['strategy']}", contracts,
                 round(spot_exp, 2), round(pnl_total, 2), round(close_fee, 2),
                 round(cash, 2), f'到期結算 {outcome}', target_iso))
            c.commit()
        new_tx += 1
        settled_count += 1
        # P3 — playbook positions feed the per-play bandit on every close.
        try:
            if 'play_name' in r.keys() and r['play_name']:
                _record_play_reward(account_id, r['play_name'], pnl_total)
        except Exception:
            pass

    # --- 1.5 P3: manage open playbook positions ---------------------------
    # Mechanical close rules, frozen on the position row at open:
    #   event   → straddles exit AT the announcement date, never through it
    #   stop2x  → MTM loss ≥ stop_mult × collected credit (defined-risk plays)
    #   credit50→ MTM profit ≥ profit_frac × max profit
    #   dteN    → calendar management at N days-to-expiry (tail-risk trim)
    managed_count = 0
    with _conn() as c:
        manageable = c.execute(
            '''SELECT * FROM paper_option_positions
               WHERE account_id=? AND status='open' AND play_name IS NOT NULL''',
            (account_id,)).fetchall()
    for r in manageable:
        contracts = int(r['contracts'] or 1)
        mtm_per = _mtm_per_contract(r, target_iso)
        if mtm_per is None:
            continue
        mtm_total = mtm_per * contracts
        credit_total = float(r['credit_per_share'] or 0) * 100 * contracts
        max_profit_total = (float(r['max_profit_usd']) * contracts
                            if r['max_profit_usd'] is not None else None)
        try:
            dte_left = (datetime.fromisoformat(r['expiry_date']).date()
                        - datetime.fromisoformat(target_iso).date()).days
        except (TypeError, ValueError):
            dte_left = None

        rule_frac = float(r['rule_profit_frac'] or 0)
        rule_dte = int(r['rule_dte'] or 0)
        rule_stop = float(r['rule_stop_mult'] or 0)
        event_d = r['event_close_date']

        close_rule = None
        if event_d and target_iso >= event_d:
            close_rule = 'event'
        elif (rule_stop > 0 and credit_total > 0
                and mtm_total <= -rule_stop * credit_total):
            close_rule = 'stop2x'
        elif (rule_frac > 0 and max_profit_total
                and mtm_total >= rule_frac * max_profit_total):
            close_rule = 'credit50'
        elif rule_dte > 0 and dte_left is not None and dte_left <= rule_dte:
            close_rule = f'dte{rule_dte}'
        if not close_rule:
            continue

        legs = json.loads(r['legs_json'] or '[]')
        close_fee = _FEE_PER_CONTRACT_LEG * _legs_count(legs) * contracts
        collateral = float(r['collateral_usd'] or 0)
        cash += collateral + mtm_total - close_fee
        spot_now = _fetch_spot_at(r['symbol'], target_iso)
        with _conn() as c:
            c.execute(
                '''UPDATE paper_option_positions
                   SET status='settled', closed_at=?, spot_at_close=?,
                       realized_pnl_usd=?, realized_outcome=?, close_rule=?,
                       mtm_pnl_usd=NULL, mtm_at=NULL WHERE id=?''',
                (target_iso,
                 round(spot_now, 2) if spot_now is not None else None,
                 round(mtm_total, 2),
                 'win' if mtm_total > 0 else 'loss', close_rule, r['id']))
            c.execute(
                '''INSERT INTO paper_transactions
                   (account_id, position_id, type, symbol, shares, price, value,
                    fee, cash_after, reason, ts_date)
                   VALUES (?, ?, 'sell', ?, ?, ?, ?, ?, ?, ?, ?)''',
                (account_id, r['id'], f"{r['symbol']} {r['strategy']}", contracts,
                 round(spot_now, 2) if spot_now is not None else 0,
                 round(mtm_total, 2), round(close_fee, 2),
                 round(cash, 2), f'規則平倉 {close_rule}', target_iso))
            c.commit()
        new_tx += 1
        managed_count += 1
        _record_play_reward(account_id, r['play_name'], mtm_total)

    # --- 2. open today's recommended setups (once per day) ----------------
    opened_today = (last_run == target_iso)
    if not opened_today:
        try:
            if engine == 'playbook':
                # P3 — evidence-backed plays with frozen management rules.
                try:
                    from .options_playbook import generate_recommendations
                except ImportError:
                    from web.modules.options_playbook import generate_recommendations  # type: ignore
                recs = generate_recommendations(
                    user_id, account_id, top_n=top_n,
                    plays=plan.get('options_plays'), target_iso=target_iso,
                    require_confirmed_earnings=bool(plan.get('earnings_v2')))
            else:
                recs = fetch_recommendations(engine, top_n, dte=dte, budget=budget)
        except Exception as e:  # noqa: BLE001
            logger.warning(f'[opt-follow {account_id}] rec fetch failed: {e}')
            tick_warnings.append({'kind': 'options_rec_failed',
                                  'detail': f'{type(e).__name__}: {e}'})
            recs = []
        # Skip setups already open (same symbol+strategy+expiry).
        with _conn() as c:
            held = {
                (row['symbol'], row['strategy'], row['expiry_date'])
                for row in c.execute(
                    "SELECT symbol, strategy, expiry_date FROM paper_option_positions "
                    "WHERE account_id=? AND status='open'", (account_id,)).fetchall()
            }
        placed = 0
        for rec in recs:
            if placed >= top_n:
                break
            symbol = rec.get('symbol')
            strategy = rec.get('strategy')
            legs = rec.get('legs', []) or []
            expiry = _expiry_for(rec, target_iso)
            if not symbol or not strategy or not legs or not expiry:
                continue
            if (symbol, strategy, expiry) in held:
                continue
            cap_at_risk = float(rec.get('cap_at_risk_usd')
                                or rec.get('max_loss_usd')
                                or (float(rec.get('spot') or 0) * 100))
            if cap_at_risk <= 0:
                continue
            n_legs = _legs_count(legs)
            contracts = _size_contracts(cap_at_risk, n_legs, cash,
                                        initial_capital, alloc_pct, max_contracts)
            if contracts < 1:
                continue  # not enough capital for even one contract; try next-best
            # P3 — IV rank scales SIZE only (low IVR → half size on premium
            # plays), floored at 1 so it can never act as an entry gate.
            alloc_scale = float(rec.get('alloc_scale') or 1.0)
            if alloc_scale < 1.0:
                contracts = max(1, int(contracts * alloc_scale))
            collateral = cap_at_risk * contracts
            open_fee = _FEE_PER_CONTRACT_LEG * n_legs * contracts
            cash -= (collateral + open_fee)
            # P3 — roll linkage: if this play+symbol was dte-managed off
            # within the last week, the new position is its roll.
            play_name = rec.get('play_name')
            roll_of_id = None
            if play_name:
                try:
                    week_ago = (datetime.fromisoformat(target_iso).date()
                                - timedelta(days=7)).isoformat()
                    with _conn() as c:
                        prev = c.execute(
                            '''SELECT id FROM paper_option_positions
                               WHERE account_id=? AND symbol=? AND play_name=?
                                 AND status='settled' AND close_rule LIKE 'dte%'
                                 AND closed_at >= ?
                               ORDER BY id DESC LIMIT 1''',
                            (account_id, symbol, play_name, week_ago)).fetchone()
                    if prev:
                        roll_of_id = int(prev['id'])
                except Exception:
                    roll_of_id = None
            with _conn() as c:
                cur = c.execute(
                    '''INSERT INTO paper_option_positions
                       (account_id, opened_date, source, symbol, strategy,
                        strategy_label, bias, legs_json, contracts, spot_at_open,
                        credit_per_share, max_profit_usd, max_loss_usd,
                        cap_at_risk_usd, collateral_usd, pop_pct, expiry_date,
                        iv_rank_pct, status, opened_fee, mtm_pnl_usd, mtm_at,
                        play_name, roll_of_id, event_close_date,
                        rule_profit_frac, rule_dte, rule_stop_mult)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                               'open', ?, 0, ?, ?, ?, ?, ?, ?, ?)''',
                    (account_id, target_iso, engine, symbol, strategy,
                     rec.get('strategy_label', ''), rec.get('bias', ''),
                     json.dumps(legs), contracts, float(rec.get('spot') or 0),
                     float(rec.get('credit_per_share') or 0),
                     float(rec.get('max_profit_usd') or 0),
                     float(rec.get('max_loss_usd') or 0),
                     round(cap_at_risk, 2), round(collateral, 2),
                     float(rec.get('pop_pct') or 0), expiry,
                     float(rec.get('iv_rank_pct') or 0) if rec.get('iv_rank_pct') is not None else None,
                     round(open_fee, 2), target_iso,
                     play_name, roll_of_id, rec.get('event_close_date'),
                     float(rec.get('close_rule_profit_frac') or 0) or None,
                     int(rec.get('close_rule_dte') or 0) or None,
                     float(rec.get('close_rule_stop_credit_mult') or 0) or None))
                pos_id = cur.lastrowid
                c.execute(
                    '''INSERT INTO paper_transactions
                       (account_id, position_id, type, symbol, shares, price, value,
                        fee, cash_after, reason, ts_date)
                       VALUES (?, ?, 'buy', ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (account_id, pos_id, f"{symbol} {strategy}", contracts,
                     float(rec.get('credit_per_share') or 0), round(collateral, 2),
                     round(open_fee, 2), round(cash, 2),
                     f"跟單建議 ({rec.get('strategy_label') or strategy})", target_iso))
                c.commit()
            held.add((symbol, strategy, expiry))
            new_tx += 1
            opened_count += 1
            placed += 1
        if not recs:
            tick_warnings.append({'kind': 'options_rec_empty',
                                  'detail': '今日推薦引擎回傳 0 筆建議'})

    # --- 3. mark remaining open positions to market -----------------------
    with _conn() as c:
        still_open = c.execute(
            "SELECT * FROM paper_option_positions WHERE account_id=? AND status='open'",
            (account_id,)).fetchall()
    positions_value = 0.0
    for r in still_open:
        contracts = int(r['contracts'] or 1)
        collateral = float(r['collateral_usd'] or 0)
        mtm_per = _mtm_per_contract(r, target_iso)
        mtm_total = (mtm_per * contracts) if mtm_per is not None else float(r['mtm_pnl_usd'] or 0)
        if mtm_per is not None:
            with _conn() as c:
                c.execute('UPDATE paper_option_positions SET mtm_pnl_usd=?, mtm_at=? WHERE id=?',
                          (round(mtm_total, 2), target_iso, r['id']))
                c.commit()
        positions_value += collateral + mtm_total

    # --- 4. record equity + advance last_run_date -------------------------
    equity = cash + positions_value
    with _conn() as c:
        c.execute(
            'INSERT OR REPLACE INTO paper_equity_history '
            '(account_id, date, cash, positions_value, equity) VALUES (?, ?, ?, ?, ?)',
            (account_id, target_iso, round(cash, 2), round(positions_value, 2), round(equity, 2)))
        peak = c.execute('SELECT peak_equity FROM paper_accounts WHERE id=?',
                         (account_id,)).fetchone()
        new_peak = max(float(peak['peak_equity'] or 0), equity) if peak else equity
        c.execute(
            'UPDATE paper_accounts SET cash=?, last_run_date=?, peak_equity=? WHERE id=?',
            (round(cash, 2), target_iso, round(new_peak, 2), account_id))
        c.commit()

    logger.info(f'[opt-follow {account_id}] tick {target_iso}: '
                f'opened={opened_count} settled={settled_count} '
                f'managed={managed_count} cash={cash:.2f} equity={equity:.2f}')

    # P3 — refresh the per-play scorecard (and its kill switch) whenever a
    # playbook position closed this tick. Best-effort.
    if managed_count or settled_count:
        try:
            try:
                from .options_playbook import update_strategy_stats
            except ImportError:
                from web.modules.options_playbook import update_strategy_stats  # type: ignore
            update_strategy_stats(asof=target_iso)
        except Exception as e:  # noqa: BLE001
            logger.warning(f'[opt-follow {account_id}] play stats update failed: {e}')

    # Per-tick summary email / Slack / Telegram (best-effort, never fail the
    # tick). Reuses the share engine's notifier — it reads transactions +
    # equity (symbol-agnostic), so the options tx rows render fine.
    notify_results: Dict[str, bool] = {}
    if new_tx > 0 and email_on_run:
        try:
            from .paper_trading import _notify_tick_summary
        except ImportError:
            from web.modules.paper_trading import _notify_tick_summary  # type: ignore
        try:
            notify_results = _notify_tick_summary(
                user_id, account_id, new_tx, target_iso, round(cash, 2))
        except Exception as e:  # noqa: BLE001
            logger.warning(f'[opt-follow {account_id}] tick notification failed: {e}')

    return {
        'success': True,
        'account_id': account_id,
        'mode': 'options_follow',
        'days_processed': 1,
        'new_transactions': new_tx,
        'opened': opened_count,
        'settled': settled_count,
        'managed': managed_count,
        'last_run_date': target_iso,
        'cash': round(cash, 2),
        'equity': round(equity, 2),
        'notifications': notify_results,
        'warnings': tick_warnings,
    }


# ---------------------------------------------------------------------------
# Detail / listing helpers (called from paper_trading)
# ---------------------------------------------------------------------------
def option_positions_for(account_id: int) -> List[Dict[str, Any]]:
    """Return all option positions for an account, newest first, with legs
    parsed and a live unrealized/realized P&L field for the UI."""
    ensure_options_follow_table()
    with _conn() as c:
        rows = c.execute(
            'SELECT * FROM paper_option_positions WHERE account_id=? '
            'ORDER BY status DESC, opened_date DESC, id DESC',
            (account_id,)).fetchall()
    out: List[Dict[str, Any]] = []
    for r in rows:
        d = dict(r)
        try:
            d['legs'] = json.loads(d.get('legs_json') or '[]')
        except Exception:
            d['legs'] = []
        if d['status'] == 'settled':
            d['pnl_usd'] = d.get('realized_pnl_usd')
        else:
            d['pnl_usd'] = d.get('mtm_pnl_usd')
        out.append(d)
    return out


def option_counts(account_id: int) -> Dict[str, int]:
    ensure_options_follow_table()
    with _conn() as c:
        row = c.execute(
            "SELECT "
            "SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) AS open_n, "
            "SUM(CASE WHEN status='settled' THEN 1 ELSE 0 END) AS closed_n "
            "FROM paper_option_positions WHERE account_id=?",
            (account_id,)).fetchone()
    return {'open': int(row['open_n'] or 0), 'closed': int(row['closed_n'] or 0)}


def close_all_open(user_id: int, account_id: int,
                   today: Optional[str] = None) -> Dict[str, Any]:
    """Liquidate every open option position at its current mark-to-market and
    mark the account closed. Called from paper_trading.close_account for
    options-follow accounts so closing returns the locked collateral + MTM to
    cash (instead of silently dropping it from the equity curve)."""
    ensure_options_follow_table()
    today = today or date.today().isoformat()
    try:
        from .options_rec_tracker import _mtm_per_contract
    except ImportError:
        from web.modules.options_rec_tracker import _mtm_per_contract  # type: ignore
    with _conn() as c:
        a = c.execute('SELECT * FROM paper_accounts WHERE id=? AND user_id=?',
                      (account_id, user_id)).fetchone()
        if not a:
            return {'success': False, 'error': 'Account not found'}
        cash = float(a['cash'])
        open_rows = c.execute(
            "SELECT * FROM paper_option_positions WHERE account_id=? AND status='open'",
            (account_id,)).fetchall()
    liquidated = 0
    for r in open_rows:
        contracts = int(r['contracts'] or 1)
        collateral = float(r['collateral_usd'] or 0)
        mtm_per = _mtm_per_contract(r, today)
        mtm_total = (mtm_per * contracts) if mtm_per is not None else float(r['mtm_pnl_usd'] or 0)
        legs = json.loads(r['legs_json'] or '[]')
        close_fee = _FEE_PER_CONTRACT_LEG * _legs_count(legs) * contracts
        cash += collateral + mtm_total - close_fee
        with _conn() as c:
            c.execute(
                '''UPDATE paper_option_positions
                   SET status='settled', closed_at=?, realized_pnl_usd=?,
                       realized_outcome='account_closed', mtm_pnl_usd=NULL, mtm_at=NULL
                   WHERE id=?''',
                (today, round(mtm_total, 2), r['id']))
            c.execute(
                '''INSERT INTO paper_transactions
                   (account_id, position_id, type, symbol, shares, price, value,
                    fee, cash_after, reason, ts_date)
                   VALUES (?, ?, 'sell', ?, ?, ?, ?, ?, ?, '帳戶結束平倉', ?)''',
                (account_id, r['id'], f"{r['symbol']} {r['strategy']}", contracts,
                 0.0, round(mtm_total, 2), round(close_fee, 2), round(cash, 2), today))
            c.commit()
        liquidated += 1
    with _conn() as c:
        c.execute("UPDATE paper_accounts SET status='closed', cash=? WHERE id=?",
                  (round(cash, 2), account_id))
        c.execute(
            'INSERT OR REPLACE INTO paper_equity_history '
            '(account_id, date, cash, positions_value, equity) VALUES (?, ?, ?, ?, ?)',
            (account_id, today, round(cash, 2), 0.0, round(cash, 2)))
        c.commit()
    return {'success': True, 'account_id': account_id, 'final_cash': round(cash, 2),
            'positions_liquidated': liquidated}


def delete_option_positions(account_id: int, c: Optional[sqlite3.Connection] = None) -> int:
    """Used by reset_account to wipe an options-follow account's positions.

    When a connection is passed in (reset_account holds an open write txn) we
    reuse it and do NOT open a second connection for ensure_* — the table is
    already created by init_paper_tables, and a nested writer would contend on
    the WAL write lock."""
    own = c is None
    if own:
        ensure_options_follow_table()
        c = _conn()
    try:
        try:
            cur = c.execute('DELETE FROM paper_option_positions WHERE account_id=?', (account_id,))
        except sqlite3.OperationalError:
            # Table not created yet (no options account ever existed) — nothing to delete.
            return 0
        if own:
            c.commit()
        return cur.rowcount
    finally:
        if own:
            c.close()
