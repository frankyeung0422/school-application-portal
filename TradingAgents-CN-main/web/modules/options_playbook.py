"""
P3 — Evidence-backed options playbook with lifecycle management.

Four plays, each with published out-of-sample support and mechanical
entry/exit rules (no discretion, no IV-rank entry gate):

  index_csp                Index/ETF cash-secured puts (SPY/QQQ/IWM),
                           30–45 DTE at ~25Δ. The CBOE PUT index's
                           volatility-risk-premium harvest: ~7.2%/yr over the
                           10y to mid-2025, ~1%/yr over call-writing.
                           Manage: 50% of credit or 21 DTE.
  holdings_cc              Monthly ~30Δ covered calls ONLY on names the user
                           already holds ≥100 shares of in paper accounts
                           (BXMD-style: OTM preserves more upside than ATM).
  index_put_credit_spread  Defined-risk variant: 45 DTE, sell ~27Δ put, buy
                           ~15Δ wing. Manage: 50% credit / 21 DTE / stop at
                           2× credit.
  preearnings_straddle     Long ATM straddle entered ~3 days before a US
                           earnings print, force-closed AT the announcement
                           date — never held through. Gao/Xing/Zhang (JFQA
                           2018): +2.3–3.3% per event; the IV run-up is
                           systematically underpriced. Liquid mega-caps only.

Explicit AVOID-list (documented as disabled stubs so nobody "helpfully"
re-adds them): systematic 0DTE selling (retail 0DTE buyers lose on average
and sellers carry extreme gamma tail risk) and short premium held through
earnings (IV-crush "wins" until one gap).

IV rank is a SIZING input only — high IVR doubles nothing and low IVR halves
contract count, but never blocks an entry (the IVR entry-gate folklore lacks
out-of-sample evidence).

Recommendation dicts are shaped exactly like pro_options_recommender's so
paper_options_follow's open/settle/MTM path consumes them unchanged, plus:
  play_name, close_rule_profit_frac, close_rule_dte,
  close_rule_stop_credit_mult, event_close_date, alloc_scale.

Kill discipline: update_strategy_stats() maintains a per-play scorecard
(options_strategy_stats); a play auto-disables when its 100+-trade record is
cumulatively negative (pre-registered criterion, enforced in
disabled_plays()).
"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

try:
    from modules.pro_backtest import _fetch
except Exception:
    from web.modules.pro_backtest import _fetch  # type: ignore

# Reuse the recommender's pricing internals — B-S proxy, delta→strike,
# probability-of-profit, real-chain lookup, IV rank, synthetic expiry.
try:
    from modules.pro_options_recommender import (
        _strike_for_delta, _bs_price, _pop_short, _real_chain_price,
        _realized_vol_annual, _vol_rank, _synth_friday,
    )
except Exception:
    from web.modules.pro_options_recommender import (  # type: ignore
        _strike_for_delta, _bs_price, _pop_short, _real_chain_price,
        _realized_vol_annual, _vol_rank, _synth_friday,
    )

_INDEX_ETFS = ('SPY', 'QQQ', 'IWM')

# Liquid mega-caps for the pre-earnings straddle (the JFQA edge concentrates
# in noisy names, but paper-fill realism demands penny-pilot liquidity; this
# is the deliberate compromise).
_STRADDLE_UNIVERSE = (
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'NFLX',
    'AVGO', 'CRM', 'ORCL', 'ADBE', 'QCOM', 'MU', 'JPM', 'BAC', 'XOM', 'DIS',
    'UBER',
)

# Pre-registered kill criterion: disable a play once it has a meaningful
# sample AND a cumulatively negative record.
_KILL_MIN_TRADES = 100

PLAYS: Dict[str, Dict[str, Any]] = {
    'index_csp': {
        'enabled': True, 'dte': 40, 'delta': 0.25,
        'close_rule_profit_frac': 0.5, 'close_rule_dte': 21,
        'close_rule_stop_credit_mult': 0.0,  # cash-secured: no stop, full collateral
    },
    'holdings_cc': {
        'enabled': True, 'dte': 30, 'delta': 0.30,
        'close_rule_profit_frac': 0.5, 'close_rule_dte': 0,
        'close_rule_stop_credit_mult': 0.0,
    },
    'index_put_credit_spread': {
        'enabled': True, 'dte': 45, 'short_delta': 0.27, 'long_delta': 0.15,
        'close_rule_profit_frac': 0.5, 'close_rule_dte': 21,
        'close_rule_stop_credit_mult': 2.0,
    },
    'preearnings_straddle': {
        'enabled': True, 'entry_days_before': (2, 4), 'extra_dte': 7,
        'close_rule_profit_frac': 0.0, 'close_rule_dte': 0,
        'close_rule_stop_credit_mult': 0.0,  # exits on event date, full stop = debit
    },
    # ----- AVOID-LIST (never enable; see module docstring) -----
    'zero_dte_premium': {'enabled': False,
                         'why_disabled': '0DTE selling: gamma tail risk; '
                                         'retail 0DTE flows lose on average'},
    'earnings_short_premium': {'enabled': False,
                               'why_disabled': 'short premium through earnings: '
                                               'IV-crush wins until one gap'},
}


def _conn():
    try:
        from . import paper_trading as _pt
    except Exception:
        from web.modules import paper_trading as _pt  # type: ignore
    return _pt._conn()


def init_playbook_tables() -> None:
    with _conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS options_strategy_stats (
            play_name TEXT NOT NULL,
            asof_date TEXT NOT NULL,
            trades INTEGER NOT NULL DEFAULT 0,
            wins INTEGER NOT NULL DEFAULT 0,
            total_pnl_usd REAL NOT NULL DEFAULT 0,
            avg_pnl_usd REAL,
            worst_pnl_usd REAL,
            status TEXT DEFAULT 'active',     -- active | killed
            PRIMARY KEY (play_name, asof_date)
        );
        ''')
        c.commit()


# ---------------------------------------------------------------------------
# Play builders — each returns a list of recommender-shaped dicts
# ---------------------------------------------------------------------------

def _spot_vol_ivr(symbol: str):
    data = _fetch(symbol, '1y')
    if not data:
        return None
    _dates, closes, _h, _l = data
    if len(closes) < 60:
        return None
    spot = float(closes[-1])
    vol = _realized_vol_annual(closes)
    try:
        ivr = _vol_rank(closes)
    except Exception:
        ivr = None
    return spot, vol, ivr


def _alloc_scale(ivr: Optional[float]) -> float:
    """IV rank scales SIZE only (never gates): rich vol → full size,
    cheap vol → half size on premium-selling plays."""
    if ivr is None:
        return 1.0
    return 1.0 if float(ivr) >= 50 else 0.5


def _price_legs_from_chain(symbol: str, dte: int,
                           legs: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """P6 — price the option legs off the REAL chain instead of B-S on
    realized vol: snap each strike to the nearest listed strike with a
    two-sided market and take its mid. Returns
    {'expiry', 'legs' (strikes snapped), 'net_credit'} or None (caller falls
    back to B-S). This matters most for the pre-earnings straddle, whose
    documented edge IS the implied-vol run-up — B-S-on-realized-vol pricing
    can't see it, so a B-S-marked trial would be biased against the play."""
    try:
        try:
            from .option_chain import fetch_chain, nearest_expiry
        except ImportError:
            from web.modules.option_chain import fetch_chain, nearest_expiry  # type: ignore
        expiry = nearest_expiry(symbol, dte)
        if not expiry:
            return None
        chain = fetch_chain(symbol, expiry)
        if not chain:
            return None
    except Exception:
        return None

    rows_by_side = {'call': chain.get('calls') or [], 'put': chain.get('puts') or []}
    new_legs: List[Dict[str, Any]] = []
    net_credit = 0.0
    snapped: Dict[str, float] = {}
    for leg in legs:
        typ = (leg.get('type') or '').lower()
        if typ not in ('put', 'call'):
            new_legs.append(dict(leg))
            continue
        rows = [r for r in rows_by_side[typ]
                if r.get('bid', 0) > 0 and r.get('ask', 0) > 0]
        if not rows:
            return None
        want = float(leg.get('strike') or 0)
        row = min(rows, key=lambda r: abs(float(r['strike']) - want))
        mid = float(row.get('mid') or 0)
        if mid <= 0:
            return None
        nl = dict(leg)
        nl['strike'] = float(row['strike'])
        nl['chain_mid'] = mid
        new_legs.append(nl)
        action = (leg.get('action') or '').lower()
        net_credit += mid if action == 'sell' else -mid
        key = f"{action}_{typ}"
        # Two legs snapping onto the SAME strike (e.g. a narrow spread on a
        # coarse chain) would degenerate — reject and let B-S handle it.
        for k, v in snapped.items():
            if k != key and v == nl['strike'] and k.endswith(typ):
                return None
        snapped[key] = nl['strike']
    return {'expiry': chain.get('expiry') or expiry, 'legs': new_legs,
            'net_credit': round(net_credit, 4)}


def _decorate(rec: Dict[str, Any], play_name: str,
              event_close_date: Optional[str] = None,
              alloc_scale: float = 1.0) -> Dict[str, Any]:
    cfg = PLAYS[play_name]
    rec['play_name'] = play_name
    rec['close_rule_profit_frac'] = float(cfg.get('close_rule_profit_frac') or 0)
    rec['close_rule_dte'] = int(cfg.get('close_rule_dte') or 0)
    rec['close_rule_stop_credit_mult'] = float(cfg.get('close_rule_stop_credit_mult') or 0)
    rec['event_close_date'] = event_close_date
    rec['alloc_scale'] = alloc_scale
    return rec


def _play_index_csp() -> List[Dict[str, Any]]:
    cfg = PLAYS['index_csp']
    out = []
    for sym in _INDEX_ETFS:
        sv = _spot_vol_ivr(sym)
        if not sv:
            continue
        spot, vol, ivr = sv
        dte = int(cfg['dte'])
        real = None
        try:
            real = _real_chain_price(sym, 'put', cfg['delta'], dte)
        except Exception:
            real = None
        if real:
            strike, credit = real['strike'], real['mid']
            expiry = real.get('expiry') or _synth_friday(dte)
            price_source = 'chain_mid'
        else:
            strike = _strike_for_delta(spot, vol, dte, cfg['delta'], 'put')
            if strike >= spot:
                strike = round(spot * 0.97, 2)
            credit = _bs_price(spot, strike, vol, dte, 'put')
            expiry = _synth_friday(dte)
            price_source = 'bs_proxy'
        if credit <= 0:
            continue
        pop = _pop_short(spot, strike, vol, dte, above_strike=True)
        out.append(_decorate({
            'symbol': sym,
            'strategy': 'cash_secured_put',
            'strategy_label': f'指數 CSP ({sym} {cfg["delta"]:.0%}Δ {dte}DTE)',
            'bias': 'bullish_neutral',
            'price_source': price_source,
            'legs': [{'action': 'sell', 'type': 'put', 'strike': strike, 'dte': dte}],
            'spot': round(spot, 2),
            'credit_per_share': round(credit, 2),
            'max_profit_usd': round(credit * 100, 2),
            'max_loss_usd': round((strike - credit) * 100, 2),
            'cap_at_risk_usd': round(strike * 100, 2),
            'pop_pct': round(pop * 100, 1),
            'expiry': expiry,
            'dte': dte,
            'iv_rank_pct': ivr,
            'thesis': 'PUT 指數式波動風險溢酬收割：50% 權利金或 21 DTE 管理',
        }, 'index_csp', alloc_scale=_alloc_scale(ivr)))
    return out


def _play_holdings_cc(user_id: int) -> List[Dict[str, Any]]:
    """Covered calls only on symbols the user actually holds ≥100 shares of
    (across their active share paper accounts)."""
    cfg = PLAYS['holdings_cc']
    try:
        with _conn() as c:
            rows = c.execute(
                '''SELECT p.symbol, SUM(p.shares) AS sh
                   FROM paper_positions p
                   JOIN paper_accounts a ON a.id = p.account_id
                   WHERE a.user_id=? AND a.status='active' AND p.status='open'
                   GROUP BY p.symbol HAVING SUM(p.shares) >= 100''',
                (user_id,)).fetchall()
    except Exception:
        rows = []
    out = []
    for r in rows:
        sym = r['symbol']
        if sym.endswith('.HK') or '-' in sym:
            continue  # US options venue only
        sv = _spot_vol_ivr(sym)
        if not sv:
            continue
        spot, vol, ivr = sv
        dte = int(cfg['dte'])
        strike = _strike_for_delta(spot, vol, dte, cfg['delta'], 'call')
        if strike <= spot:
            strike = round(spot * 1.05, 2)
        legs = [
            {'action': 'long', 'type': 'stock', 'shares': 100},
            {'action': 'sell', 'type': 'call', 'strike': strike, 'dte': dte},
        ]
        expiry = _synth_friday(dte)
        # P6 — prefer the real chain mid for the short call.
        priced = _price_legs_from_chain(sym, dte, legs)
        if priced and priced['net_credit'] > 0:
            legs = priced['legs']
            credit = priced['net_credit']
            strike = next(l['strike'] for l in legs if l.get('type') == 'call')
            expiry = priced['expiry']
            price_source = 'chain_mid'
        else:
            credit = _bs_price(spot, strike, vol, dte, 'call')
            price_source = 'bs_proxy'
        if credit <= 0:
            continue
        pop = _pop_short(spot, strike, vol, dte, above_strike=False)
        out.append(_decorate({
            'symbol': sym,
            'strategy': 'covered_call',
            'strategy_label': f'持股掩護性買權 ({sym} {cfg["delta"]:.0%}Δ OTM)',
            'bias': 'neutral_bullish',
            'price_source': price_source,
            'legs': legs,
            'spot': round(spot, 2),
            'credit_per_share': round(credit, 2),
            'max_profit_usd': round((strike - spot + credit) * 100, 2),
            'max_loss_usd': round((spot - credit) * 100, 2),
            'cap_at_risk_usd': round(spot * 100, 2),
            'pop_pct': round(pop * 100, 1),
            'expiry': expiry,
            'dte': dte,
            'iv_rank_pct': ivr,
            'thesis': 'BXMD 式：OTM 30Δ 保留上行空間，月月收權利金',
        }, 'holdings_cc', alloc_scale=_alloc_scale(ivr)))
    return out


def _play_index_spread() -> List[Dict[str, Any]]:
    cfg = PLAYS['index_put_credit_spread']
    out = []
    for sym in _INDEX_ETFS:
        sv = _spot_vol_ivr(sym)
        if not sv:
            continue
        spot, vol, ivr = sv
        dte = int(cfg['dte'])
        short_k = _strike_for_delta(spot, vol, dte, cfg['short_delta'], 'put')
        long_k = _strike_for_delta(spot, vol, dte, cfg['long_delta'], 'put')
        if short_k <= long_k:
            continue
        legs = [
            {'action': 'sell', 'type': 'put', 'strike': short_k, 'dte': dte},
            {'action': 'buy', 'type': 'put', 'strike': long_k, 'dte': dte},
        ]
        expiry = _synth_friday(dte)
        # P6 — prefer real chain mids (strikes snapped to listed ones).
        priced = _price_legs_from_chain(sym, dte, legs)
        if (priced and priced['net_credit'] > 0
                and priced['legs'][0]['strike'] > priced['legs'][1]['strike']):
            legs = priced['legs']
            net = priced['net_credit']
            short_k = legs[0]['strike']
            long_k = legs[1]['strike']
            expiry = priced['expiry']
            price_source = 'chain_mid'
        else:
            net = (_bs_price(spot, short_k, vol, dte, 'put')
                   - _bs_price(spot, long_k, vol, dte, 'put'))
            price_source = 'bs_proxy'
        if net <= 0:
            continue
        width = short_k - long_k
        max_loss = (width - net) * 100
        if max_loss <= 0:
            continue
        pop = _pop_short(spot, short_k, vol, dte, above_strike=True)
        out.append(_decorate({
            'symbol': sym,
            'strategy': 'bull_put_spread',
            'strategy_label': f'指數賣權價差 ({sym} {dte}DTE 管理式)',
            'bias': 'bullish',
            'price_source': price_source,
            'legs': legs,
            'spot': round(spot, 2),
            'credit_per_share': round(net, 2),
            'max_profit_usd': round(net * 100, 2),
            'max_loss_usd': round(max_loss, 2),
            'cap_at_risk_usd': round(max_loss, 2),
            'pop_pct': round(pop * 100, 1),
            'expiry': expiry,
            'dte': dte,
            'iv_rank_pct': ivr,
            'thesis': '45DTE 賣 27Δ 買 15Δ：50% 權利金 / 21DTE / 2× 停損 管理',
        }, 'index_put_credit_spread', alloc_scale=_alloc_scale(ivr)))
    return out


def _play_preearnings_straddle(target_iso: str,
                               require_confirmed: bool = False) -> List[Dict[str, Any]]:
    """E1: with require_confirmed, a setup only fires when the dual-source
    calendar has >=2 sources agreeing on the date AND a known bmo/amc
    session — and the forced exit is session-aware (BMO prints before the
    open, so the last safe close is the day BEFORE the event). Without the
    flag (legacy / frozen straddle trial), the yfinance path is unchanged."""
    cfg = PLAYS['preearnings_straddle']
    lo, hi = cfg['entry_days_before']
    ec_mod = None
    if require_confirmed:
        try:
            try:
                from . import earnings_calendar as ec_mod  # type: ignore
            except ImportError:
                from web.modules import earnings_calendar as ec_mod  # type: ignore
        except Exception:
            return []  # confirmed-mode without the module = no trades, by design
    try:
        try:
            from .pro_calendar import _fetch_calendar
        except ImportError:
            from web.modules.pro_calendar import _fetch_calendar  # type: ignore
    except Exception:
        if not require_confirmed:
            return []
        _fetch_calendar = None  # type: ignore
    out = []
    today = datetime.fromisoformat(target_iso).date()
    for sym in _STRADDLE_UNIVERSE:
        if require_confirmed:
            ev = None
            try:
                ev = ec_mod.confirmed(sym)
            except Exception:
                ev = None
            if not ev:
                continue
            days_to = (datetime.fromisoformat(ev['event_date']).date()
                       - today).days
            if not (lo <= days_to <= hi):
                continue
            # Session-aware forced exit: never hold through the print.
            if ev['session'] == 'bmo':
                event_date = (datetime.fromisoformat(ev['event_date']).date()
                              - timedelta(days=1)).isoformat()
            else:  # amc — print is after the close; event-day close is safe
                event_date = ev['event_date']
        else:
            try:
                cal = _fetch_calendar(sym)
            except Exception:
                continue
            if not cal or cal.get('next_event_type') != 'earnings_date':
                continue
            days_to = cal.get('next_event_days')
            if days_to is None or not (lo <= int(days_to) <= hi):
                continue
            event_date = (today + timedelta(days=int(days_to))).isoformat()
        sv = _spot_vol_ivr(sym)
        if not sv:
            continue
        spot, vol, _ivr = sv
        dte = int(days_to) + int(cfg['extra_dte'])
        strike = round(spot, 0) or spot
        legs = [
            {'action': 'buy', 'type': 'call', 'strike': strike, 'dte': dte},
            {'action': 'buy', 'type': 'put', 'strike': strike, 'dte': dte},
        ]
        expiry = _synth_friday(dte)
        # P6 — price off the REAL chain when possible: the straddle's edge
        # is the IV run-up, which B-S on realized vol cannot see.
        priced = _price_legs_from_chain(sym, dte, legs)
        if priced and priced['net_credit'] < 0:
            legs = priced['legs']
            debit = -priced['net_credit']
            expiry = priced['expiry']
            price_source = 'chain_mid'
        else:
            debit = (_bs_price(spot, strike, vol, dte, 'call')
                     + _bs_price(spot, strike, vol, dte, 'put'))
            price_source = 'bs_proxy'
        if debit <= 0:
            continue
        out.append(_decorate({
            'symbol': sym,
            'strategy': 'long_straddle',
            'strategy_label': f'財報前跨式 ({sym} T−{days_to})',
            'bias': 'volatility',
            'price_source': price_source,
            'legs': legs,
            'spot': round(spot, 2),
            # Debit play — store as negative credit so the shared MTM math
            # (credit − liability) and the long_straddle settle branch agree.
            'credit_per_share': round(-debit, 2),
            'max_profit_usd': None,
            'max_loss_usd': round(debit * 100, 2),
            'cap_at_risk_usd': round(debit * 100, 2),
            'pop_pct': 50.0,
            'expiry': expiry,
            'dte': dte,
            'iv_rank_pct': None,
            'thesis': 'JFQA 2018：財報前 IV 爬升被系統性低估；公布日強制平倉、絕不抱過財報',
        }, 'preearnings_straddle', event_close_date=event_date))
    return out


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_recommendations(user_id: int, account_id: int, top_n: int = 5,
                             plays: Optional[List[str]] = None,
                             target_iso: Optional[str] = None,
                             require_confirmed_earnings: bool = False) -> List[Dict[str, Any]]:
    """Today's playbook recommendations, best-play-first. ``plays`` filters
    to a subset (account plan's options_plays); killed plays are excluded by
    the pre-registered criterion regardless of the plan.
    require_confirmed_earnings (E1) gates the pre-earnings straddle on
    dual-source date+session agreement."""
    init_playbook_tables()
    target_iso = target_iso or date.today().isoformat()
    wanted = [p for p in (plays or list(PLAYS))
              if PLAYS.get(p, {}).get('enabled')]
    dead = disabled_plays()
    wanted = [p for p in wanted if p not in dead]

    recs: List[Dict[str, Any]] = []
    for play in _ordered_by_scorecard(wanted):
        try:
            if play == 'index_csp':
                recs.extend(_play_index_csp())
            elif play == 'holdings_cc':
                recs.extend(_play_holdings_cc(user_id))
            elif play == 'index_put_credit_spread':
                recs.extend(_play_index_spread())
            elif play == 'preearnings_straddle':
                recs.extend(_play_preearnings_straddle(
                    target_iso, require_confirmed=require_confirmed_earnings))
        except Exception:
            continue
    return recs


def _ordered_by_scorecard(plays: List[str]) -> List[str]:
    """Down-weight losing plays by ordering: better realized avg P&L first
    (the follow engine fills top_n slots in order, so laggards get trimmed
    when capital is scarce). Neutral order when no history."""
    stats = {s['play_name']: s for s in latest_scorecard()}
    return sorted(plays,
                  key=lambda p: -(stats.get(p, {}).get('avg_pnl_usd') or 0.0))


def update_strategy_stats(asof: Optional[str] = None) -> Dict[str, Any]:
    """Recompute the all-time per-play scorecard from settled positions and
    persist today's snapshot, applying the pre-registered kill criterion."""
    init_playbook_tables()
    asof = asof or date.today().isoformat()
    with _conn() as c:
        rows = c.execute(
            '''SELECT play_name,
                      COUNT(*) AS n,
                      SUM(CASE WHEN realized_pnl_usd > 0 THEN 1 ELSE 0 END) AS wins,
                      SUM(realized_pnl_usd) AS total,
                      AVG(realized_pnl_usd) AS avg_p,
                      MIN(realized_pnl_usd) AS worst
               FROM paper_option_positions
               WHERE status='settled' AND play_name IS NOT NULL
                 AND realized_pnl_usd IS NOT NULL
               GROUP BY play_name''').fetchall()
        out = {}
        for r in rows:
            killed = (int(r['n']) >= _KILL_MIN_TRADES
                      and float(r['total'] or 0) < 0)
            status = 'killed' if killed else 'active'
            c.execute(
                '''INSERT OR REPLACE INTO options_strategy_stats
                   (play_name, asof_date, trades, wins, total_pnl_usd,
                    avg_pnl_usd, worst_pnl_usd, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                (r['play_name'], asof, int(r['n']), int(r['wins'] or 0),
                 round(float(r['total'] or 0), 2),
                 round(float(r['avg_p'] or 0), 2),
                 round(float(r['worst'] or 0), 2), status))
            out[r['play_name']] = {'trades': int(r['n']), 'status': status}
        c.commit()
    return {'success': True, 'asof': asof, 'plays': out}


def latest_scorecard() -> List[Dict[str, Any]]:
    init_playbook_tables()
    with _conn() as c:
        last = c.execute(
            'SELECT MAX(asof_date) AS d FROM options_strategy_stats').fetchone()
        if not last or not last['d']:
            return []
        rows = c.execute(
            'SELECT * FROM options_strategy_stats WHERE asof_date=?',
            (last['d'],)).fetchall()
    return [dict(r) for r in rows]


def disabled_plays() -> set:
    """Plays whose latest scorecard row tripped the kill criterion."""
    return {s['play_name'] for s in latest_scorecard()
            if s.get('status') == 'killed'}
