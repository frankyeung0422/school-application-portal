"""
E2 — Statistical Jump Model regime engine (SHADOW mode).

Why: the live entry gate uses a 2-state Gaussian HMM on SPY. Shu, Yu &
Mulvey (Journal of Asset Management, 2024) show statistical jump models
beat HMMs out-of-sample (US/DE/JP, 1990-2023, net of costs) precisely on
the HMM's weak points — state persistence and false alarms — via an
explicit jump penalty cross-validated on strategy performance. The
follow-up (arXiv 2410.14841) lifted factor-allocation IR from 0.05 to ~0.4
with regime-conditional weights.

SHADOW contract: this module runs alongside hmm_regime with ZERO live
impact. Every nightly row in jump_regime_state logs the JM verdict NEXT TO
the HMM verdict (agree column), so by the time anyone proposes flipping the
gate, there is a disagreement track record to judge it on. The tick only
consults JM when a plan explicitly sets use_jump_regime=True — a flag no
existing account has, and which create_account deliberately defaults to
False even for new accounts.

Implementation notes:
  - Features follow the paper/package worked example: EWM mean return and
    EWM downside deviation at halflives 5/21/63 days, clipped at 3σ and
    standardized with the TRAINING-time scaler (persisted in the bundle, so
    nightly updates never re-fit preprocessing on data the model hasn't
    seen).
  - Bear state is identified empirically after fit (the state with the
    lower mean realized return on training data), not by trusting the
    package's sort convention.
  - predict_proba_online() is causal — the regime at t uses data up to t.
"""
from __future__ import annotations

import math
import pickle
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from modules.pro_backtest import _fetch
except Exception:
    from web.modules.pro_backtest import _fetch  # type: ignore

_MODEL_PATH = Path(__file__).resolve().parents[1] / 'data' / 'jump_model.pkl'
_HALFLIVES = (5, 21, 63)
_JUMP_PENALTY = 50.0      # package-recommended order of magnitude for daily data
_CLIP_STD = 3.0


def _conn():
    try:
        from . import paper_trading as _pt
    except Exception:
        from web.modules import paper_trading as _pt  # type: ignore
    return _pt._conn()


def init_jump_tables() -> None:
    with _conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS jump_regime_state (
            date TEXT PRIMARY KEY,
            regime TEXT NOT NULL,          -- 'bull' | 'bear'
            bear_prob REAL NOT NULL,
            model_version TEXT NOT NULL,
            hmm_state TEXT,                -- shadow comparison vs the live gate
            hmm_bear_prob REAL,
            agree INTEGER
        );
        ''')
        c.commit()


# ---------------------------------------------------------------------------
# Features
# ---------------------------------------------------------------------------

def _build_features(closes: List[float]):
    """EWM return + EWM downside deviation per halflife — the package's
    worked-example feature set. Returns (features_df, log_returns_series)."""
    import numpy as np
    import pandas as pd
    px = pd.Series([float(c) for c in closes], dtype=float)
    ret = np.log(px / px.shift(1))
    feats = {}
    for hl in _HALFLIVES:
        feats[f'ret_mean_h{hl}'] = ret.ewm(halflife=hl).mean()
        downside = ret.clip(upper=0.0)
        feats[f'dd_h{hl}'] = np.sqrt((downside ** 2).ewm(halflife=hl).mean())
    X = pd.DataFrame(feats)
    return X.iloc[1:].reset_index(drop=True), ret.iloc[1:].reset_index(drop=True)


def _preprocess_fit(X):
    from jumpmodels.preprocess import StandardScalerPD, DataClipperStd
    clipper = DataClipperStd(mul=_CLIP_STD)
    scaler = StandardScalerPD()
    Xp = scaler.fit_transform(clipper.fit_transform(X))
    return Xp, clipper, scaler


def _preprocess_apply(X, clipper, scaler):
    return scaler.transform(clipper.transform(X))


# ---------------------------------------------------------------------------
# Fit / update
# ---------------------------------------------------------------------------

def fit_weekly(symbol: str = 'SPY', period: str = '5y',
               jump_penalty: float = _JUMP_PENALTY) -> Dict[str, Any]:
    """Refit the jump model and persist the bundle. Returns a summary; never
    raises for data problems."""
    try:
        from jumpmodels.jump import JumpModel
    except ImportError:
        return {'success': False, 'error': 'jumpmodels not installed'}

    data = _fetch(symbol, period)
    if not data:
        return {'success': False, 'error': f'no data for {symbol}'}
    _dates, closes, _h, _l = data
    if len(closes) < 300:
        return {'success': False, 'error': f'history too short ({len(closes)})'}

    X, ret = _build_features(closes)
    Xp, clipper, scaler = _preprocess_fit(X)

    model = JumpModel(n_components=2, jump_penalty=jump_penalty, cont=False)
    try:
        model.fit(Xp, ret, sort_by='cumret')
    except TypeError:
        model.fit(Xp)

    # Identify the bear state EMPIRICALLY: lower mean realized return.
    labels = model.predict(Xp)
    try:
        import numpy as np
        lab = np.asarray(labels).reshape(-1)
        r = ret.to_numpy()
        means = {int(s): float(r[lab == s].mean()) for s in set(lab.tolist())}
        bear_state = min(means, key=means.get)
    except Exception:
        bear_state = 1  # package sort_by='cumret' convention fallback

    version = datetime.now().strftime('%Y%m%d_%H%M%S')
    _MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_MODEL_PATH, 'wb') as f:
        pickle.dump({'model': model, 'clipper': clipper, 'scaler': scaler,
                     'bear_state': bear_state, 'symbol': symbol,
                     'jump_penalty': jump_penalty, 'version': version,
                     'fitted_at': datetime.now().isoformat()[:19]}, f)

    n_bear = int((labels == bear_state).sum()) if hasattr(labels, 'sum') else 0
    return {'success': True, 'version': version, 'n_obs': len(X),
            'bear_state': bear_state,
            'bear_frac': round(n_bear / max(1, len(X)), 3)}


def _load_bundle() -> Optional[Dict[str, Any]]:
    try:
        with open(_MODEL_PATH, 'rb') as f:
            return pickle.load(f)
    except Exception:
        return None


def update_daily() -> Dict[str, Any]:
    """Nightly: causal (online) regime probability for the latest bar,
    written next to the HMM's verdict for the shadow comparison."""
    bundle = _load_bundle()
    if not bundle:
        return {'success': False, 'error': 'no fitted jump model on disk'}
    init_jump_tables()

    data = _fetch(bundle.get('symbol', 'SPY'), '2y')
    if not data:
        return {'success': False, 'error': 'no data'}
    _dates, closes, _h, _l = data
    X, _ret = _build_features(closes)
    try:
        Xp = _preprocess_apply(X, bundle['clipper'], bundle['scaler'])
        proba = bundle['model'].predict_proba_online(Xp)
    except Exception as e:
        return {'success': False, 'error': f'online predict failed: {e}'}

    bear_state = int(bundle.get('bear_state', 1))
    try:
        last = proba.iloc[-1]
        bear_prob = float(last.iloc[bear_state]
                          if bear_state < len(last) else last.iloc[-1])
    except AttributeError:
        bear_prob = float(proba[-1][bear_state])
    regime = 'bear' if bear_prob >= 0.5 else 'bull'

    # Shadow comparison vs the live HMM gate.
    hmm_state = None
    hmm_bear = None
    try:
        try:
            from .hmm_regime import current_regime as _hmm_current
        except ImportError:
            from web.modules.hmm_regime import current_regime as _hmm_current  # type: ignore
        cr = _hmm_current() or {}
        hmm_state = cr.get('regime')
        hmm_bear = (cr.get('posterior') or {}).get('bear')
    except Exception:
        pass
    agree = (int(regime == hmm_state)
             if hmm_state in ('bull', 'bear') else None)

    today = date.today().isoformat()
    with _conn() as c:
        c.execute(
            '''INSERT OR REPLACE INTO jump_regime_state
               (date, regime, bear_prob, model_version, hmm_state,
                hmm_bear_prob, agree)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (today, regime, round(bear_prob, 4), bundle.get('version', '?'),
             hmm_state, hmm_bear, agree))
        c.commit()
    return {'success': True, 'date': today, 'regime': regime,
            'bear_prob': round(bear_prob, 4), 'hmm_state': hmm_state,
            'agree': agree}


# ---------------------------------------------------------------------------
# Queries (mirror hmm_regime's surface)
# ---------------------------------------------------------------------------

def current_regime() -> Dict[str, Any]:
    init_jump_tables()
    with _conn() as c:
        row = c.execute(
            'SELECT * FROM jump_regime_state ORDER BY date DESC LIMIT 1'
        ).fetchone()
    if not row:
        return {'regime': 'unknown', 'posterior': {'bear': 0.0}}
    return {'regime': row['regime'],
            'posterior': {'bear': float(row['bear_prob'])},
            'date': row['date'], 'model_version': row['model_version']}


def is_bear(threshold: float = 0.7) -> bool:
    cr = current_regime()
    return float((cr.get('posterior') or {}).get('bear') or 0.0) >= threshold


def disagreement_rate(days: int = 30) -> Optional[float]:
    """Fraction of recent shadow rows where JM and HMM disagreed."""
    init_jump_tables()
    with _conn() as c:
        rows = c.execute(
            'SELECT agree FROM jump_regime_state '
            'WHERE agree IS NOT NULL ORDER BY date DESC LIMIT ?',
            (days,)).fetchall()
    if not rows:
        return None
    return round(sum(1 for r in rows if not r['agree']) / len(rows), 3)
