"""
P1c — LightGBM cross-sectional learning-to-rank stock selector.

Why ranking instead of another score: for a top-K long book only the ORDERING
of names matters, and listwise/pairwise LTR objectives optimize exactly that.
Published out-of-sample comparisons (Poh/Lim/Zohren 2021) show LambdaMART-style
rankers roughly tripling the Sharpe of regression-style cross-sectional
scoring — which is what pro_screener._ai_score / ai_picks._score_symbol do.

Design:
  - Weekly cross-sections over the equity universes in ai_picks.UNIVERSES
    (crypto excluded — different microstructure, separate model if ever).
  - Features are 100% point-in-time price/volume statistics (Alpha158-style):
    everything is computed from bars at-or-before the snapshot date.
    Fundamentals from yfinance .info are deliberately NOT used for training:
    .info returns CURRENT values, and stamping today's PE onto a snapshot a
    year ago leaks the future. snapshot_fundamentals() persists daily
    fundamental snapshots so a future model version can train on a true
    point-in-time store once enough history accumulates.
  - Label: quintile (0..4) of the forward `label_horizon`-bar return within
    each snapshot's cross-section.
  - Purged validation: the last `holdout_dates` snapshot cross-sections are
    held out, with an embargo gap so no training label window overlaps the
    holdout (López de Prado-style purging, sized for weekly snaps).
  - Reported metrics: mean holdout rank IC (Spearman of prediction vs
    realized forward return per date) and NDCG@10. Persisted to
    ml_ranker_metrics so the IC trend is auditable before anyone trusts it.

Consumers: ai_picks.top_long_symbols branches to top_symbols() when an
account plan sets pick_source='ml_ranker'; scores must be < max_stale_days
old or we return [] and the caller falls back to the heuristic scan.
"""
from __future__ import annotations

import json
import math
import pickle
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

try:
    from modules.pro_backtest import _fetch_full
except Exception:
    from web.modules.pro_backtest import _fetch_full  # type: ignore

# Default training/scoring pool: every equity universe. Crypto excluded.
_EQUITY_UNIVERSE_IDS = ('sp500_top50', 'tech', 'hsi')

_MODEL_PATH = Path(__file__).resolve().parents[1] / 'data' / 'ml_ranker.pkl'

# Panel geometry
_SNAP_EVERY = 5          # bars between snapshots (≈ weekly)
_LABEL_HORIZON = 5       # forward bars for the label (≈ next week)
_MIN_HISTORY = 130       # bars required before the first snapshot
_HOLDOUT_DATES = 8       # last N snapshot cross-sections held out
_EMBARGO_SNAPSHOTS = 1   # snapshots dropped between train and holdout
_QUANTILES = 5


def _conn():
    """Share paper_trading's DB (and its WAL pragmas + test monkeypatching)."""
    try:
        from . import paper_trading as _pt
    except Exception:
        from web.modules import paper_trading as _pt  # type: ignore
    return _pt._conn()


def init_ml_tables() -> None:
    with _conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS ml_rank_scores (
            score_date TEXT NOT NULL,
            symbol TEXT NOT NULL,
            rank_score REAL NOT NULL,
            rank_position INTEGER NOT NULL,
            model_version TEXT,
            PRIMARY KEY (score_date, symbol)
        );
        CREATE TABLE IF NOT EXISTS ml_ranker_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_date TEXT NOT NULL,
            rank_ic REAL,
            ndcg10 REAL,
            n_samples INTEGER,
            n_holdout_dates INTEGER,
            model_version TEXT,
            note TEXT
        );
        -- Point-in-time fundamentals accumulator (NOT yet a training input —
        -- see module docstring). One row per (snap_date, symbol).
        CREATE TABLE IF NOT EXISTS ml_fundamentals_snapshots (
            snap_date TEXT NOT NULL,
            symbol TEXT NOT NULL,
            pe REAL, pb REAL, ps REAL, peg REAL,
            roe REAL, profit_margin REAL, debt_to_equity REAL,
            revenue_growth REAL, earnings_growth REAL,
            dividend_yield REAL, market_cap REAL, beta REAL,
            PRIMARY KEY (snap_date, symbol)
        );
        CREATE INDEX IF NOT EXISTS idx_ml_scores_date ON ml_rank_scores(score_date);
        ''')
        c.commit()


# ---------------------------------------------------------------------------
# Features
# ---------------------------------------------------------------------------

def _safe_div(a: float, b: float, default: float = 0.0) -> float:
    return a / b if b else default


def _base_features(prices: List[float], volumes: List[float]) -> Optional[Dict[str, float]]:
    """The 18 technical features from the (dormant) MLStockPicker — reused,
    not rebuilt. The web server runs with sys.path[0]=web/, so the repo root
    that holds the tradingagents package may need to be added explicitly."""
    try:
        from tradingagents.quant.ml_stock_picker import MLStockPicker
    except ImportError:
        import sys as _sys
        _root = str(Path(__file__).resolve().parents[2])
        if _root not in _sys.path:
            _sys.path.insert(0, _root)
        try:
            from tradingagents.quant.ml_stock_picker import MLStockPicker
        except Exception:
            return None
    try:
        return MLStockPicker.extract_features(prices, volumes)
    except Exception:
        return None


def _panel_features(closes: Sequence[float], highs: Sequence[float],
                    lows: Sequence[float], volumes: Sequence[float],
                    t: int) -> Optional[Dict[str, float]]:
    """Feature vector for one (symbol, bar t) snapshot. Uses ONLY data at
    indices <= t. Returns None when there's not enough history."""
    if t + 1 < _MIN_HISTORY:
        return None
    base = _base_features(list(closes[t - 25:t + 1]), list(volumes[t - 25:t + 1]))
    if not base:
        return None

    feats = dict(base)
    c_t = float(closes[t])
    if c_t <= 0:
        return None

    # Longer-horizon momentum than the base set carries (Alpha158-style)
    feats['ret_60d'] = _safe_div(c_t, float(closes[t - 60]), 1.0) - 1.0
    feats['ret_120d'] = _safe_div(c_t, float(closes[t - 120]), 1.0) - 1.0

    # Intraday range ratios — realized choppiness at two horizons
    for name, win in (('range_5d', 5), ('range_20d', 20)):
        rngs = [_safe_div(float(highs[j]) - float(lows[j]), float(closes[j]))
                for j in range(t - win + 1, t + 1) if closes[j]]
        feats[name] = sum(rngs) / len(rngs) if rngs else 0.0

    # Volume z-score: 5-bar average vs 60-bar distribution
    v60 = [float(v) for v in volumes[t - 59:t + 1]]
    if v60 and any(v60):
        mean60 = sum(v60) / len(v60)
        var60 = sum((v - mean60) ** 2 for v in v60) / len(v60)
        std60 = math.sqrt(var60)
        mean5 = sum(v60[-5:]) / 5
        feats['vol_z_5v60'] = _safe_div(mean5 - mean60, std60)
    else:
        feats['vol_z_5v60'] = 0.0

    # Position inside the trailing 60-bar range (52w-high-distance proxy)
    h60 = max(float(h) for h in highs[t - 59:t + 1])
    l60 = min(float(low) for low in lows[t - 59:t + 1])
    feats['close_to_high60'] = _safe_div(h60 - c_t, c_t)
    feats['close_to_low60'] = _safe_div(c_t - l60, c_t)
    feats['range_pos_60'] = _safe_div(c_t - l60, h60 - l60, 0.5)

    return feats


def _spearman(a: Sequence[float], b: Sequence[float]) -> float:
    """Spearman rank correlation without scipy."""
    n = len(a)
    if n < 3 or n != len(b):
        return 0.0

    def _ranks(x):
        order = sorted(range(n), key=lambda i: x[i])
        r = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j + 1 < n and x[order[j + 1]] == x[order[i]]:
                j += 1
            avg = (i + j) / 2.0 + 1.0
            for k in range(i, j + 1):
                r[order[k]] = avg
            i = j + 1
        return r

    ra, rb = _ranks(list(a)), _ranks(list(b))
    ma = sum(ra) / n
    mb = sum(rb) / n
    cov = sum((ra[i] - ma) * (rb[i] - mb) for i in range(n))
    va = math.sqrt(sum((x - ma) ** 2 for x in ra))
    vb = math.sqrt(sum((x - mb) ** 2 for x in rb))
    return cov / (va * vb) if va and vb else 0.0


def _universe_symbols(universe_ids: Optional[Sequence[str]] = None) -> List[str]:
    try:
        from modules.ai_picks import UNIVERSES
    except Exception:
        from web.modules.ai_picks import UNIVERSES  # type: ignore
    ids = list(universe_ids or _EQUITY_UNIVERSE_IDS)
    out: List[str] = []
    seen = set()
    for uid in ids:
        for s in UNIVERSES.get(uid, {}).get('symbols', []):
            if s not in seen:
                seen.add(s)
                out.append(s)
    return out


# ---------------------------------------------------------------------------
# Panel build
# ---------------------------------------------------------------------------

def build_panel(symbols: Sequence[str], period: str = '2y',
                snap_every: int = _SNAP_EVERY,
                label_horizon: int = _LABEL_HORIZON,
                llm_block: bool = True) -> Dict[str, Any]:
    """Weekly cross-sectional panel: one row per (snapshot_date, symbol) with
    point-in-time features and the realized forward return (the raw label).

    llm_block (P2): join the llm_features columns (news tone, event tags,
    bear-case red flags) as-of each snapshot date. Point-in-time and
    outcome-embargo rules are enforced inside llm_features' SQL; snapshots
    before the extraction job existed simply get zeros.

    Returns {'rows': [{'date', 'symbol', 'features', 'fwd_ret'}], 'feature_names'}.
    """
    llm_mod = None
    if llm_block:
        try:
            try:
                from . import llm_features as llm_mod  # type: ignore
            except ImportError:
                from web.modules import llm_features as llm_mod  # type: ignore
        except Exception:
            llm_mod = None

    rows: List[Dict[str, Any]] = []
    feature_names: Optional[List[str]] = None
    for sym in symbols:
        try:
            data = _fetch_full(sym, period)
        except Exception:
            data = None
        if not data:
            continue
        dates, opens, closes, highs, lows, volumes = data
        n = len(closes)
        if n < _MIN_HISTORY + label_horizon:
            continue
        for t in range(_MIN_HISTORY - 1, n - label_horizon, snap_every):
            feats = _panel_features(closes, highs, lows, volumes, t)
            if not feats:
                continue
            if llm_mod is not None:
                try:
                    feats.update(llm_mod.panel_features(sym, dates[t]))
                    feats.update(llm_mod.embargoed_trade_outcomes(sym, dates[t]))
                except Exception:
                    pass
            if feature_names is None:
                feature_names = sorted(feats.keys())
            c_t = float(closes[t])
            c_fwd = float(closes[t + label_horizon])
            if c_t <= 0 or c_fwd <= 0:
                continue
            rows.append({
                'date': dates[t],
                'symbol': sym,
                'features': feats,
                'fwd_ret': c_fwd / c_t - 1.0,
            })
    return {'rows': rows, 'feature_names': feature_names or []}


def _quintile_labels(rows: List[Dict[str, Any]]) -> None:
    """Assign in place: label = forward-return quintile (0..4) within each
    snapshot date's cross-section. Rank-based, so fat tails don't dominate."""
    by_date: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        by_date.setdefault(r['date'], []).append(r)
    for d, grp in by_date.items():
        grp.sort(key=lambda r: r['fwd_ret'])
        m = len(grp)
        for i, r in enumerate(grp):
            r['label'] = min(_QUANTILES - 1, int(i * _QUANTILES / m))


# ---------------------------------------------------------------------------
# Train
# ---------------------------------------------------------------------------

def train_weekly(universe_ids: Optional[Sequence[str]] = None,
                 period: str = '2y',
                 holdout_dates: int = _HOLDOUT_DATES,
                 lgbm_params: Optional[Dict[str, Any]] = None,
                 llm_block: bool = True,
                 ablate_llm: bool = True) -> Dict[str, Any]:
    """Build the panel, train LGBMRanker (lambdarank) with a purged holdout,
    persist the model + metrics. Returns a summary dict (never raises for
    data problems — returns {'success': False, 'error': ...}).

    ablate_llm (P2): when the panel actually contains non-zero LLM columns,
    also train a second model with those columns removed and record its
    holdout IC in ml_ranker_metrics (note='ablation_no_llm'). The IC delta
    is the LLM block's measured contribution — the audit-trail answer to
    "do the LLM features earn their tokens?"."""
    try:
        from lightgbm import LGBMRanker
    except ImportError:
        return {'success': False, 'error': 'lightgbm not installed'}

    init_ml_tables()
    symbols = _universe_symbols(universe_ids)
    panel = build_panel(symbols, period=period, llm_block=llm_block)
    rows = panel['rows']
    feature_names = panel['feature_names']
    if not rows or not feature_names:
        return {'success': False, 'error': 'empty panel — no symbol had data'}

    _quintile_labels(rows)

    # Order by snapshot date; one lambdarank group per cross-section.
    all_dates = sorted({r['date'] for r in rows})
    min_cross_section = max(5, _QUANTILES)
    usable_dates = [d for d in all_dates
                    if sum(1 for r in rows if r['date'] == d) >= min_cross_section]
    if len(usable_dates) < holdout_dates + _EMBARGO_SNAPSHOTS + 5:
        return {'success': False,
                'error': f'too few cross-sections ({len(usable_dates)})'}

    holdout = set(usable_dates[-holdout_dates:])
    # Purge/embargo: snapshots whose label window could touch the holdout.
    embargo = set(usable_dates[-(holdout_dates + _EMBARGO_SNAPSHOTS):-holdout_dates])
    train_dates = [d for d in usable_dates if d not in holdout and d not in embargo]

    def _fit_and_eval(feat_subset: List[str]):
        """Train on train_dates / evaluate on holdout with this feature set.
        Returns (model, rank_ic, ndcg10, n_train_rows, n_holdout_dates)."""
        X_tr, y_tr, g_tr = [], [], []
        for d in train_dates:
            grp = [r for r in rows if r['date'] == d]
            if len(grp) < min_cross_section:
                continue
            for r in grp:
                X_tr.append([float(r['features'].get(f, 0.0)) for f in feat_subset])
                y_tr.append(int(r['label']))
            g_tr.append(len(grp))
        if not X_tr:
            return None, 0.0, None, 0, 0

        params = {
            'objective': 'lambdarank',
            'n_estimators': 200,
            'learning_rate': 0.05,
            'num_leaves': 31,
            'min_child_samples': 20,
            'verbose': -1,
        }
        params.update(lgbm_params or {})
        model = LGBMRanker(**params)
        model.fit(X_tr, y_tr, group=g_tr)

        ics: List[float] = []
        ndcgs: List[float] = []
        try:
            from sklearn.metrics import ndcg_score
        except ImportError:
            ndcg_score = None
        for d in sorted(holdout):
            grp = [r for r in rows if r['date'] == d]
            if len(grp) < min_cross_section:
                continue
            Xg = [[float(r['features'].get(f, 0.0)) for f in feat_subset]
                  for r in grp]
            preds = list(model.predict(Xg))
            ics.append(_spearman(preds, [r['fwd_ret'] for r in grp]))
            if ndcg_score is not None:
                try:
                    ndcgs.append(float(ndcg_score(
                        [[int(r['label']) for r in grp]], [preds],
                        k=min(10, len(grp)))))
                except Exception:
                    pass
        rank_ic = sum(ics) / len(ics) if ics else 0.0
        ndcg10 = sum(ndcgs) / len(ndcgs) if ndcgs else None
        return model, rank_ic, ndcg10, len(X_tr), len(ics)

    model, rank_ic, ndcg10, n_train, n_hold = _fit_and_eval(feature_names)
    if model is None:
        return {'success': False, 'error': 'no training rows after purge'}
    version = datetime.now().strftime('%Y%m%d_%H%M%S')

    # P2 ablation — measure the LLM block's contribution. Only meaningful
    # once some panel rows actually carry non-zero LLM/memory values.
    _is_llm_col = lambda f: f.startswith('llm_') or f.startswith('mem_')
    llm_cols = [f for f in feature_names if _is_llm_col(f)]
    ablation_ic: Optional[float] = None
    if ablate_llm and llm_cols:
        has_signal = any(
            any(float(r['features'].get(f, 0.0)) != 0.0 for f in llm_cols)
            for r in rows)
        if has_signal:
            base_cols = [f for f in feature_names if not _is_llm_col(f)]
            _m2, ablation_ic, _n2, _x2, _h2 = _fit_and_eval(base_cols)

    _MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_MODEL_PATH, 'wb') as f:
        pickle.dump({
            'model': model,
            'feature_names': feature_names,
            'version': version,
            'trained_at': datetime.now().isoformat()[:19],
            'rank_ic': rank_ic,
            'ndcg10': ndcg10,
            'n_samples': n_train,
        }, f)

    with _conn() as c:
        c.execute(
            '''INSERT INTO ml_ranker_metrics
               (train_date, rank_ic, ndcg10, n_samples, n_holdout_dates,
                model_version, note)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (date.today().isoformat(), rank_ic, ndcg10, n_train, n_hold,
             version, f'period={period} universes={list(universe_ids or _EQUITY_UNIVERSE_IDS)}'))
        if ablation_ic is not None:
            c.execute(
                '''INSERT INTO ml_ranker_metrics
                   (train_date, rank_ic, ndcg10, n_samples, n_holdout_dates,
                    model_version, note)
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (date.today().isoformat(), ablation_ic, None, n_train, n_hold,
                 version, 'ablation_no_llm'))
        c.commit()

    return {'success': True, 'version': version, 'rank_ic': round(rank_ic, 4),
            'ndcg10': round(ndcg10, 4) if ndcg10 is not None else None,
            'n_samples': n_train, 'n_holdout_dates': n_hold,
            'n_features': len(feature_names),
            'ablation_no_llm_ic': (round(ablation_ic, 4)
                                   if ablation_ic is not None else None),
            'llm_ic_delta': (round(rank_ic - ablation_ic, 4)
                             if ablation_ic is not None else None)}


def _load_model() -> Optional[Dict[str, Any]]:
    try:
        with open(_MODEL_PATH, 'rb') as f:
            return pickle.load(f)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Score + consume
# ---------------------------------------------------------------------------

def score_universe(universe_ids: Optional[Sequence[str]] = None) -> Dict[str, Any]:
    """Score the latest bar of every universe symbol with the persisted model
    and write today's cross-section to ml_rank_scores."""
    bundle = _load_model()
    if not bundle:
        return {'success': False, 'error': 'no trained model on disk'}
    model = bundle['model']
    feature_names = bundle['feature_names']

    init_ml_tables()
    symbols = _universe_symbols(universe_ids)
    feats_by_sym: Dict[str, Dict[str, float]] = {}
    for sym in symbols:
        try:
            data = _fetch_full(sym, '1y')
        except Exception:
            data = None
        if not data:
            continue
        dates, opens, closes, highs, lows, volumes = data
        f = _panel_features(closes, highs, lows, volumes, len(closes) - 1)
        if f:
            # P2 — same LLM/memory columns the model trained with; zeros
            # when the extraction job hasn't covered this name yet.
            try:
                try:
                    from . import llm_features as _llm
                except ImportError:
                    from web.modules import llm_features as _llm  # type: ignore
                f.update(_llm.panel_features(sym, dates[-1]))
                f.update(_llm.embargoed_trade_outcomes(sym, dates[-1]))
            except Exception:
                pass
            feats_by_sym[sym] = f
    if not feats_by_sym:
        return {'success': False, 'error': 'no symbol produced features'}

    syms = list(feats_by_sym.keys())
    X = [[float(feats_by_sym[s].get(f, 0.0)) for f in feature_names] for s in syms]
    preds = list(model.predict(X))
    ranked = sorted(zip(syms, preds), key=lambda t: -t[1])

    today = date.today().isoformat()
    with _conn() as c:
        for pos, (sym, score) in enumerate(ranked, start=1):
            c.execute(
                '''INSERT OR REPLACE INTO ml_rank_scores
                   (score_date, symbol, rank_score, rank_position, model_version)
                   VALUES (?, ?, ?, ?, ?)''',
                (today, sym, float(score), pos, bundle.get('version')))
        c.commit()
    return {'success': True, 'score_date': today, 'n_scored': len(ranked),
            'model_version': bundle.get('version')}


def top_symbols(universe: str = 'sp500_top50', top_n: int = 5,
                custom_symbols: Optional[List[str]] = None,
                max_stale_days: int = 7) -> List[str]:
    """Top-N of the universe by the latest persisted rank scores.

    Returns [] when there are no scores or they are older than
    ``max_stale_days`` — the caller (ai_picks.top_long_symbols) treats an
    empty list as "fall back to the heuristic scan", so a dead model degrades
    gracefully instead of freezing the account's picks."""
    try:
        from modules.ai_picks import _resolve_universes
    except Exception:
        from web.modules.ai_picks import _resolve_universes  # type: ignore
    wanted, _ids, _label = _resolve_universes(universe, custom_symbols)
    if not wanted:
        return []
    wanted_set = set(wanted)

    init_ml_tables()
    with _conn() as c:
        last = c.execute('SELECT MAX(score_date) AS d FROM ml_rank_scores').fetchone()
        if not last or not last['d']:
            return []
        score_date = last['d']
        try:
            age = (date.today() - date.fromisoformat(score_date)).days
        except Exception:
            return []
        if age > max_stale_days:
            return []
        rows = c.execute(
            '''SELECT symbol FROM ml_rank_scores
               WHERE score_date=? ORDER BY rank_position''',
            (score_date,)).fetchall()
    picks = [r['symbol'] for r in rows if r['symbol'] in wanted_set]
    return picks[:max(1, top_n)]


def confidence_state(ic_window: int = 8) -> Dict[str, Any]:
    """P2 — uncertainty gate for position sizing, in [0.3, 1.0].

    Two degradation signals, both observable without lookahead:
      - trailing mean holdout rank IC over the last ``ic_window`` (weekly)
        training runs: the model's recent out-of-sample hit rate;
      - cross-sectional score dispersion of the latest scored date vs the
        trailing median dispersion: when the model scores everything the
        same, it has no opinion and should not size like it does.

    Consumed by the tick loop's sizing section: slice_cash *= gate. Sizing
    only — the gate never picks or vetoes individual names ("crowding/vol
    signals size positions, they don't pick stocks")."""
    out = {'gate': 1.0, 'trailing_ic': None, 'dispersion_ratio': None,
           'reason': 'no data — neutral'}
    try:
        init_ml_tables()
        with _conn() as c:
            ics = [r['rank_ic'] for r in c.execute(
                '''SELECT rank_ic FROM ml_ranker_metrics
                   WHERE note IS NULL OR note NOT LIKE 'ablation%'
                   ORDER BY id DESC LIMIT ?''', (ic_window,)).fetchall()
                if r['rank_ic'] is not None]
            disp_rows = c.execute(
                '''SELECT score_date,
                          AVG(rank_score * rank_score) - AVG(rank_score) * AVG(rank_score)
                              AS var
                   FROM ml_rank_scores GROUP BY score_date
                   ORDER BY score_date DESC LIMIT 13''').fetchall()
    except Exception:
        return out

    gate = 1.0
    reasons = []
    if ics:
        mean_ic = sum(ics) / len(ics)
        out['trailing_ic'] = round(mean_ic, 4)
        if mean_ic <= 0:
            gate = min(gate, 0.3)
            reasons.append(f'trailing IC {mean_ic:.3f} <= 0')
        elif mean_ic < 0.03:
            gate = min(gate, 0.6)
            reasons.append(f'trailing IC {mean_ic:.3f} < 0.03')

    if len(disp_rows) >= 4:
        latest_var = float(disp_rows[0]['var'] or 0.0)
        trail = sorted(float(r['var'] or 0.0) for r in disp_rows[1:])
        median_var = trail[len(trail) // 2]
        if median_var > 0:
            ratio = latest_var / median_var
            out['dispersion_ratio'] = round(ratio, 3)
            if ratio < 0.25:
                gate = min(gate, 0.5)
                reasons.append(f'score dispersion collapsed ({ratio:.2f}x median)')

    out['gate'] = max(0.3, min(1.0, gate))
    out['reason'] = '; '.join(reasons) if reasons else 'healthy'
    return out


def latest_metrics(limit: int = 12) -> List[Dict[str, Any]]:
    init_ml_tables()
    with _conn() as c:
        rows = c.execute(
            'SELECT * FROM ml_ranker_metrics ORDER BY id DESC LIMIT ?',
            (limit,)).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Point-in-time fundamentals accumulator (future training input)
# ---------------------------------------------------------------------------

def snapshot_fundamentals(universe_ids: Optional[Sequence[str]] = None,
                          max_symbols: int = 200) -> Dict[str, Any]:
    """Persist TODAY's fundamentals for the universe so that, months from
    now, a model can train on fundamentals as they were known at the time
    (instead of leaking current values into the past). Best-effort."""
    init_ml_tables()
    symbols = _universe_symbols(universe_ids)[:max_symbols]
    today = date.today().isoformat()
    written = 0
    try:
        import yfinance as yf
    except ImportError:
        return {'success': False, 'error': 'yfinance not installed'}
    with _conn() as c:
        for sym in symbols:
            try:
                info = yf.Ticker(sym).info or {}
            except Exception:
                continue
            c.execute(
                '''INSERT OR REPLACE INTO ml_fundamentals_snapshots
                   (snap_date, symbol, pe, pb, ps, peg, roe, profit_margin,
                    debt_to_equity, revenue_growth, earnings_growth,
                    dividend_yield, market_cap, beta)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (today, sym,
                 info.get('trailingPE'), info.get('priceToBook'),
                 info.get('priceToSalesTrailing12Months'), info.get('pegRatio'),
                 info.get('returnOnEquity'), info.get('profitMargins'),
                 info.get('debtToEquity'), info.get('revenueGrowth'),
                 info.get('earningsGrowth'), info.get('dividendYield'),
                 info.get('marketCap'), info.get('beta')))
            written += 1
        c.commit()
    return {'success': True, 'snap_date': today, 'written': written}
