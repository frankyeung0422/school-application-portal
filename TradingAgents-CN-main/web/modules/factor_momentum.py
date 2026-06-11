"""
P2 — Factor-momentum overlay for the conviction engine.

Factor momentum (upweight factors that have recently been working, downweight
ones that haven't) is the only factor-timing approach with out-of-sample
support across markets including China A-shares (Ehsani & Linnainmaa;
A-share confirmation in Finance Research Letters 2024: 0.56%/mo, t=3.85).

Implementation: for each conviction factor (news / flow / technical /
insider / risk) compute the trailing rank IC — the Spearman correlation of
the factor's value with the realized trade outcome — over the last
``window_days``, EXCLUDING the most recent ``exclude_days`` (the standard
12-1 construction: skip the most recent stretch, which is dominated by
short-term reversal). The data join reuses
conviction_calibration._training_rows (conviction_scores × closed
paper_positions), so factor performance is measured on trades the platform
actually took.

Output: a bounded multiplier per factor in [1-_MAX_TILT, 1+_MAX_TILT],
persisted to factor_momentum_weights and applied ON TOP of the calibrated
weights in conviction_engine.score_symbol. It is an overlay, not a regime
bet — ±30% max tilt, and with thin data every multiplier stays at 1.0.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

_FACTORS = ('news', 'flow', 'technical', 'insider', 'risk')
_MAX_TILT = 0.30          # multipliers live in [0.70, 1.30]
_IC_TO_TILT_SCALE = 1.5   # |IC| 0.20 → full ±30% tilt
_MIN_SAMPLES = 40         # below this the overlay stays neutral (all 1.0)


def _conn():
    try:
        from . import paper_trading as _pt
    except Exception:
        from web.modules import paper_trading as _pt  # type: ignore
    return _pt._conn()


def init_factor_momentum_table() -> None:
    with _conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS factor_momentum_weights (
            asof_date TEXT NOT NULL,
            factor TEXT NOT NULL,
            trailing_ic REAL,
            n_samples INTEGER,
            weight_multiplier REAL NOT NULL,
            PRIMARY KEY (asof_date, factor)
        );
        ''')
        c.commit()


def _clip(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def compute_weights(window_days: int = 365,
                    exclude_days: int = 21) -> Dict[str, Any]:
    """Fit and persist today's factor multipliers. Never raises for data
    problems — thin data yields neutral multipliers."""
    init_factor_momentum_table()
    try:
        try:
            from .conviction_calibration import _training_rows, _spearman
        except ImportError:
            from web.modules.conviction_calibration import (  # type: ignore
                _training_rows, _spearman)
        rows = _training_rows()
    except Exception as e:
        return {'success': False, 'error': f'sample load failed: {e}'}

    today = date.today()
    lo = (today - timedelta(days=window_days)).isoformat()
    hi = (today - timedelta(days=exclude_days)).isoformat()  # 12-1: skip recent
    window = []
    for r in rows:
        d = (r.get('score_date') or '')[:10]
        if lo <= d <= hi:
            window.append(r)

    multipliers: Dict[str, float] = {f: 1.0 for f in _FACTORS}
    ics: Dict[str, Optional[float]] = {f: None for f in _FACTORS}
    if len(window) >= _MIN_SAMPLES:
        outcomes = [r['outcome'] for r in window]
        for f in _FACTORS:
            vals = [r[f] for r in window]
            ic = _spearman(vals, outcomes)
            # risk is a PENALTY: it "works" when high risk predicts BAD
            # outcomes, i.e. negative IC → upweight the penalty.
            signed = -ic if f == 'risk' else ic
            ics[f] = round(ic, 4)
            multipliers[f] = round(
                _clip(1.0 + signed * _IC_TO_TILT_SCALE, 1 - _MAX_TILT, 1 + _MAX_TILT), 4)

    asof = today.isoformat()
    with _conn() as c:
        for f in _FACTORS:
            c.execute(
                '''INSERT OR REPLACE INTO factor_momentum_weights
                   (asof_date, factor, trailing_ic, n_samples, weight_multiplier)
                   VALUES (?, ?, ?, ?, ?)''',
                (asof, f, ics[f], len(window), multipliers[f]))
        c.commit()
    return {'success': True, 'asof_date': asof, 'n_samples': len(window),
            'multipliers': multipliers, 'ics': ics,
            'neutral': len(window) < _MIN_SAMPLES}


def current_multipliers(max_age_days: int = 14) -> Dict[str, float]:
    """Latest persisted multipliers; neutral (all 1.0) when missing/stale so
    a dead weekly job can never silently distort scoring."""
    neutral = {f: 1.0 for f in _FACTORS}
    try:
        init_factor_momentum_table()
        with _conn() as c:
            last = c.execute(
                'SELECT MAX(asof_date) AS d FROM factor_momentum_weights').fetchone()
            if not last or not last['d']:
                return neutral
            try:
                age = (date.today() - date.fromisoformat(last['d'])).days
            except Exception:
                return neutral
            if age > max_age_days:
                return neutral
            rows = c.execute(
                'SELECT factor, weight_multiplier FROM factor_momentum_weights '
                'WHERE asof_date=?', (last['d'],)).fetchall()
        out = dict(neutral)
        for r in rows:
            if r['factor'] in out:
                out[r['factor']] = float(r['weight_multiplier'])
        return out
    except Exception:
        return neutral


def history(limit: int = 60) -> List[Dict[str, Any]]:
    init_factor_momentum_table()
    with _conn() as c:
        rows = c.execute(
            'SELECT * FROM factor_momentum_weights ORDER BY asof_date DESC, factor '
            'LIMIT ?', (limit,)).fetchall()
    return [dict(r) for r in rows]
