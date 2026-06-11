"""
P2 — LLM/news outputs as FEATURE COLUMNS, not buy/sell decisions.

The 2026 audits of LLM-agent trading systems ("The Alpha Illusion",
arXiv 2605.16895; the Agentic Trading survey) found that end-to-end LLM
decision-making in TradingAgents-lineage systems shows negative alpha once
frictions are applied, and that episodic agent memory leaks post-hoc outcome
narratives into decisions (the "Oracle Fallacy"). Their prescription — which
this module implements — is to demote LLM/news analysis to an auditable
information-extraction layer whose outputs are columns in a quantitative
model's feature panel, so the LLM contribution can be ablation-tested.

Two integrity rules, both enforced in SQL so they are testable:
  1. Point-in-time news: a feature row for date D may only be built from
     articles with published_at <= D (build_daily_features always builds
     for *today*, and panel_features() only serves rows with
     feature_date <= the requested as-of date).
  2. Outcome embargo: trade-outcome memory for an as-of date D may only
     aggregate positions with exit_date <= D - embargo_days. An episode's
     outcome is not retrievable until it is ``embargo_days`` old, so the
     model can never condition on an outcome a live decision-maker could
     not have known.

Consumed by ml_ranker.build_panel(llm_block=True); ablation = train with
vs without these columns and compare holdout rank IC (ml_ranker.train_weekly
records both).
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence

_EVENT_TAGS = ('earnings', 'ma', 'regulatory', 'macro')

_EVENT_KEYWORDS = {
    'earnings': ('earnings', 'eps', 'revenue', 'guidance', 'quarter', '財報',
                 '業績', '盈利'),
    'ma': ('acquisition', 'merger', 'acquire', 'takeover', 'buyout', '收購',
           '合併'),
    'regulatory': ('sec', 'lawsuit', 'antitrust', 'regulator', 'fine', 'probe',
                   'investigation', '監管', '訴訟', '罰款'),
    'macro': ('fed', 'rates', 'inflation', 'tariff', 'gdp', '加息', '減息',
              '關稅'),
}

_DEFAULT_EMBARGO_DAYS = 7


def _conn():
    try:
        from . import paper_trading as _pt
    except Exception:
        from web.modules import paper_trading as _pt  # type: ignore
    return _pt._conn()


def init_llm_features_table() -> None:
    with _conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS llm_features (
            feature_date TEXT NOT NULL,
            symbol TEXT NOT NULL,
            tone_score REAL,           -- news momentum / sentiment, ~[-1, 1]
            article_count INTEGER,
            event_earnings INTEGER DEFAULT 0,
            event_ma INTEGER DEFAULT 0,
            event_regulatory INTEGER DEFAULT 0,
            event_macro INTEGER DEFAULT 0,
            red_flag_count INTEGER,    -- bear-case top_risks count
            bear_severity REAL,        -- bear-case severity 0..1
            source TEXT,
            model TEXT,
            PRIMARY KEY (feature_date, symbol)
        );
        CREATE INDEX IF NOT EXISTS idx_llm_feat_sym ON llm_features(symbol, feature_date);
        ''')
        c.commit()


def _classify_events(headlines: Sequence[str]) -> Dict[str, int]:
    text = ' '.join(h.lower() for h in headlines)
    return {tag: int(any(k in text for k in kws))
            for tag, kws in _EVENT_KEYWORDS.items()}


def build_daily_features(symbols: Optional[Sequence[str]] = None,
                         feature_date: Optional[str] = None) -> Dict[str, Any]:
    """Extract today's feature row per symbol from already-persisted news
    (news_articles) and bear-case analyses (bear_case_cache). Only data
    published at or before ``feature_date`` is visible — enforced in the
    SQL below, not by convention."""
    init_llm_features_table()
    fdate = feature_date or date.today().isoformat()
    if symbols is None:
        try:
            try:
                from .ml_ranker import _universe_symbols
            except ImportError:
                from web.modules.ml_ranker import _universe_symbols  # type: ignore
            symbols = _universe_symbols()
        except Exception:
            symbols = []

    written = 0
    with _conn() as c:
        for sym in symbols:
            s = sym.upper()
            # Point-in-time: only articles published on/before fdate, within
            # the trailing week.
            week_ago = (date.fromisoformat(fdate) - timedelta(days=7)).isoformat()
            try:
                arts = c.execute(
                    '''SELECT headline FROM news_articles
                       WHERE symbol=? AND published_at IS NOT NULL
                         AND substr(published_at, 1, 10) <= ?
                         AND substr(published_at, 1, 10) >= ?
                       ORDER BY published_at DESC LIMIT 40''',
                    (s, fdate, week_ago)).fetchall()
            except Exception:
                arts = []
            headlines = [r['headline'] for r in arts]
            events = _classify_events(headlines)

            tone = None
            try:
                try:
                    from .news_aggregator import news_momentum
                except ImportError:
                    from web.modules.news_aggregator import news_momentum  # type: ignore
                tone = float(news_momentum(s, days=7))
            except Exception:
                tone = None

            red_flags = None
            severity = None
            try:
                bc = c.execute(
                    '''SELECT top_risks_json, severity FROM bear_case_cache
                       WHERE symbol=? AND score_date <= ?
                       ORDER BY score_date DESC LIMIT 1''',
                    (s, fdate)).fetchone()
                if bc:
                    import json as _json
                    risks = _json.loads(bc['top_risks_json'] or '[]')
                    red_flags = len(risks)
                    severity = float(bc['severity'] or 0)
            except Exception:
                pass

            if not headlines and tone is None and red_flags is None:
                continue  # nothing known for this name — write no row
            c.execute(
                '''INSERT OR REPLACE INTO llm_features
                   (feature_date, symbol, tone_score, article_count,
                    event_earnings, event_ma, event_regulatory, event_macro,
                    red_flag_count, bear_severity, source, model)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (fdate, s, tone, len(headlines),
                 events['earnings'], events['ma'], events['regulatory'],
                 events['macro'], red_flags, severity,
                 'news_articles+bear_case', None))
            written += 1
        c.commit()
    return {'success': True, 'feature_date': fdate, 'written': written}


# Column names served into the ranker panel (zeros when nothing is known —
# the GBDT learns "no news" as its own state).
PANEL_COLUMNS = ('llm_tone', 'llm_article_count', 'llm_event_earnings',
                 'llm_event_ma', 'llm_event_regulatory', 'llm_event_macro',
                 'llm_red_flags', 'llm_bear_severity')


def panel_features(symbol: str, asof_date: str,
                   max_age_days: int = 7) -> Dict[str, float]:
    """Feature block for one (symbol, as-of date) panel row. Serves the most
    recent row with feature_date <= asof_date (point-in-time), no older than
    ``max_age_days``. Missing → all zeros."""
    out = {k: 0.0 for k in PANEL_COLUMNS}
    try:
        lo = (date.fromisoformat(asof_date[:10]) -
              timedelta(days=max_age_days)).isoformat()
    except Exception:
        return out
    try:
        with _conn() as c:
            r = c.execute(
                '''SELECT * FROM llm_features
                   WHERE symbol=? AND feature_date <= ? AND feature_date >= ?
                   ORDER BY feature_date DESC LIMIT 1''',
                (symbol.upper(), asof_date[:10], lo)).fetchone()
    except Exception:
        return out
    if not r:
        return out
    out['llm_tone'] = float(r['tone_score'] or 0.0)
    out['llm_article_count'] = float(r['article_count'] or 0)
    out['llm_event_earnings'] = float(r['event_earnings'] or 0)
    out['llm_event_ma'] = float(r['event_ma'] or 0)
    out['llm_event_regulatory'] = float(r['event_regulatory'] or 0)
    out['llm_event_macro'] = float(r['event_macro'] or 0)
    out['llm_red_flags'] = float(r['red_flag_count'] or 0)
    out['llm_bear_severity'] = float(r['bear_severity'] or 0.0)
    return out


def embargoed_trade_outcomes(symbol: str, asof_date: str,
                             embargo_days: int = _DEFAULT_EMBARGO_DAYS,
                             window_days: int = 180) -> Dict[str, float]:
    """Outcome-embargoed trade memory for (symbol, as-of date): aggregates of
    THIS symbol's closed paper trades whose exit_date is at least
    ``embargo_days`` before the as-of date. The embargo is in the WHERE
    clause — an outcome simply does not exist for the model until it ages
    past the embargo (Oracle-Fallacy fix from the agentic-trading audits)."""
    out = {'mem_n_trades': 0.0, 'mem_win_rate': 0.0, 'mem_avg_pnl_pct': 0.0}
    try:
        cutoff = (date.fromisoformat(asof_date[:10]) -
                  timedelta(days=embargo_days)).isoformat()
        lo = (date.fromisoformat(asof_date[:10]) -
              timedelta(days=window_days)).isoformat()
    except Exception:
        return out
    try:
        with _conn() as c:
            r = c.execute(
                '''SELECT COUNT(*) AS n,
                          AVG(CASE WHEN pnl_pct > 0 THEN 1.0 ELSE 0.0 END) AS wr,
                          AVG(pnl_pct) AS ap
                   FROM paper_positions
                   WHERE symbol=? AND status='closed' AND pnl_pct IS NOT NULL
                     AND exit_date <= ? AND exit_date >= ?''',
                (symbol.upper(), cutoff, lo)).fetchone()
    except Exception:
        return out
    if r and r['n']:
        out['mem_n_trades'] = float(r['n'])
        out['mem_win_rate'] = float(r['wr'] or 0.0)
        out['mem_avg_pnl_pct'] = float(r['ap'] or 0.0)
    return out
