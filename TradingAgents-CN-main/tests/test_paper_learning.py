"""
Regression tests for T6.1 — live-fitness scoring in evolve_account_plan.

Covered:
  - _live_fitness returns applicable=False when too few trades exist
  - _live_fitness returns applicable=False when too few equity snapshots
  - _live_fitness with a winning equity curve produces a positive score
  - _live_fitness with a losing curve produces a negative score
  - _blend_baseline_with_live: ignores live when not applicable
  - _blend_baseline_with_live: shifts baseline toward live when applicable
  - Migration: live_score_last column exists after init_paper_tables
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))


@pytest.fixture()
def pt(monkeypatch, tmp_path):
    import modules.paper_trading as m
    monkeypatch.setattr(m, '_DB', tmp_path / 'learn.db')
    m.init_paper_tables()
    return m


def _seed_account(pt, initial_capital=10000.0, start_date='2026-01-01'):
    with sqlite3.connect(str(pt._DB)) as c:
        cur = c.execute(
            "INSERT INTO paper_accounts "
            "(user_id, name, plan_json, initial_capital, cash, status, start_date, "
            " peak_equity, base_currency) "
            "VALUES (1, 'T', ?, ?, ?, 'active', ?, ?, 'USD')",
            (json.dumps({'strategies': ['ma_cross'], 'combine_mode': 'any'}),
             initial_capital, initial_capital, start_date, initial_capital))
        c.commit()
        return cur.lastrowid


def _seed_equity(pt, account_id, points):
    """Insert (date, equity) pairs into paper_equity_history."""
    with sqlite3.connect(str(pt._DB)) as c:
        for d, eq in points:
            c.execute(
                'INSERT INTO paper_equity_history (account_id, date, cash, positions_value, equity) '
                'VALUES (?, ?, ?, ?, ?)',
                (account_id, d, eq, 0, eq))
        c.commit()


def _seed_closed_trades(pt, account_id, pnl_pcts):
    with sqlite3.connect(str(pt._DB)) as c:
        for i, pnl in enumerate(pnl_pcts):
            c.execute(
                "INSERT INTO paper_positions "
                "(account_id, symbol, shares, entry_price, entry_date, status, "
                " exit_price, exit_date, exit_reason, pnl_abs, pnl_pct) "
                "VALUES (?, 'AAPL', 10, 100, '2026-01-01', 'closed', "
                "100, '2026-02-01', 'TP', 0, ?)",
                (account_id, pnl))
        c.commit()


# ---------- migration ----------

def test_live_score_last_column_exists(pt):
    """init_paper_tables must add the new column."""
    with sqlite3.connect(str(pt._DB)) as c:
        cols = [r[1] for r in c.execute('PRAGMA table_info(paper_accounts)').fetchall()]
    assert 'live_score_last' in cols


# ---------- _live_fitness ----------

def test_live_fitness_not_applicable_too_few_trades(pt):
    acct = _seed_account(pt)
    _seed_equity(pt, acct, [(f'2026-01-{d:02d}', 10000 + d * 50)
                            for d in range(1, 11)])
    _seed_closed_trades(pt, acct, [1.0, 2.0])  # only 2 trades
    out = pt._live_fitness(acct, since_iso=None, target_annual_pct=80.0)
    assert out['applicable'] is False
    assert 'closed trades' in out['reason']


def test_live_fitness_not_applicable_too_few_snapshots(pt):
    acct = _seed_account(pt)
    _seed_equity(pt, acct, [('2026-01-01', 10000), ('2026-01-02', 10100)])
    _seed_closed_trades(pt, acct, [1.0, 2.0, 3.0])  # enough trades
    out = pt._live_fitness(acct, since_iso=None, target_annual_pct=80.0)
    assert out['applicable'] is False
    assert 'snapshots' in out['reason']


def test_live_fitness_winning_curve_scores_positive(pt):
    acct = _seed_account(pt)
    # Linear-ish climb 10000 → 11000 over 30 days
    points = [(f'2026-01-{d:02d}', 10000 + 33 * d) for d in range(1, 31)]
    _seed_equity(pt, acct, points)
    _seed_closed_trades(pt, acct, [3.0, 4.0, 5.0, 2.0])
    out = pt._live_fitness(acct, since_iso=None, target_annual_pct=80.0)
    assert out['applicable'] is True
    assert out['n_trades'] == 4
    assert out['annual_return_pct'] > 0
    # A consistent uptrend usually yields a positive blended score
    assert out['score'] > 0, f"expected positive score, got {out}"


def test_live_fitness_losing_curve_scores_negative(pt):
    acct = _seed_account(pt)
    # Linear decline 10000 → 8500 over 30 days
    points = [(f'2026-01-{d:02d}', 10000 - 50 * d) for d in range(1, 31)]
    _seed_equity(pt, acct, points)
    _seed_closed_trades(pt, acct, [-3.0, -5.0, -2.0, -4.0])
    out = pt._live_fitness(acct, since_iso=None, target_annual_pct=80.0)
    assert out['applicable'] is True
    assert out['total_return_pct'] < 0
    # The -20 penalty for negative return should push score deeply negative
    assert out['score'] < 0


# ---------- _blend_baseline_with_live ----------

def test_blend_ignores_live_when_not_applicable(pt):
    score, annual, w = pt._blend_baseline_with_live(
        10.0, 5.0,
        {'applicable': False, 'reason': 'too few trades'},
    )
    assert score == 10.0
    assert annual == 5.0
    assert w == 0.0


def test_blend_shifts_toward_live(pt):
    """With weight=0.4, a baseline of 0 and live score of 100 should
    produce a blended score of 40."""
    live = {'applicable': True, 'score': 100.0, 'annual_return_pct': 50.0}
    score, annual, w = pt._blend_baseline_with_live(0.0, 0.0, live)
    assert w == pt._LIVE_FITNESS_WEIGHT
    # 0.6*0 + 0.4*100 = 40
    assert abs(score - 40.0) < 1e-6
    assert abs(annual - 20.0) < 1e-6


def test_blend_with_live_underperforming_baseline_drops(pt):
    """If live is much worse than the backtest predicted, the blend
    should drag the baseline score down — this is exactly what makes
    the optimizer 'learn from live trades'."""
    backtest_score = 50.0
    live = {'applicable': True, 'score': -50.0, 'annual_return_pct': -20.0}
    blended, _, _ = pt._blend_baseline_with_live(backtest_score, 30.0, live)
    # 0.6*50 + 0.4*(-50) = 30 - 20 = 10
    assert blended < backtest_score
    assert abs(blended - 10.0) < 1e-6


# ============================================================================
# T6.2 — champion / challenger framework
# ============================================================================

def test_challengers_table_created(pt):
    """init_paper_tables must add the paper_challengers table."""
    with sqlite3.connect(str(pt._DB)) as c:
        names = [r[0] for r in c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='paper_challengers'"
        ).fetchall()]
    assert 'paper_challengers' in names


def test_add_challenger_respects_max_cap(pt, monkeypatch):
    """Adding > MAX_CHALLENGERS active candidates must be a no-op for
    the overflow — caller is responsible for dropping a loser first."""
    from modules import paper_learning as pl
    monkeypatch.setattr(pl, 'MAX_CHALLENGERS', 2)
    acct = _seed_account(pt)
    a = pl.add_challenger(acct, {'strategies': ['ma_cross']}, 'mutation', pt._conn)
    b = pl.add_challenger(acct, {'strategies': ['rsi_meanreversion']}, 'mutation', pt._conn)
    c_id = pl.add_challenger(acct, {'strategies': ['macd_cross']}, 'mutation', pt._conn)
    assert a is not None and b is not None
    assert c_id is None, 'third candidate must be rejected at the cap'


def test_mutate_plan_perturbs_within_bounds(pt):
    """mutate_plan must keep TP/SL/pos within their configured bounds."""
    from modules import paper_learning as pl
    import random
    rng = random.Random(42)
    champ = {'strategies': ['ma_cross'], 'combine_mode': 'any',
             'take_profit_pct': 10.0, 'stop_loss_pct': 5.0, 'pos_size_pct': 20.0,
             'symbols': ['AAPL']}
    for _ in range(50):
        m = pl.mutate_plan(champ, rng)
        assert 2 <= m['take_profit_pct'] <= 30
        assert 1 <= m['stop_loss_pct'] <= 15
        assert 5 <= m['pos_size_pct'] <= 80
        # Symbols are user-owned; must not be mutated
        assert m.get('symbols') == ['AAPL']


def test_evaluate_challengers_increments_streaks(pt):
    """A challenger that beats the champion records a win_streak bump.
    A challenger that loses gets loss_streak instead."""
    from modules import paper_learning as pl
    acct = _seed_account(pt)
    pl.add_challenger(acct, {'strategies': ['rsi_meanreversion']}, 'mutation', pt._conn,
                      note='strong')
    pl.add_challenger(acct, {'strategies': ['breakout']}, 'mutation', pt._conn,
                      note='weak')

    def scorer(plan_dict):
        # Strong challenger wins, weak loses
        if 'rsi_meanreversion' in plan_dict.get('strategies', []):
            return {'score': 100.0, 'annual_return_pct': 50.0}
        return {'score': -10.0, 'annual_return_pct': -5.0}

    summary = pl.evaluate_challengers(acct, champion_score=10.0,
                                       scorer=scorer, conn_factory=pt._conn)
    assert len(summary['evaluated']) == 2
    winners = [e for e in summary['evaluated'] if e['won']]
    losers = [e for e in summary['evaluated'] if not e['won']]
    assert len(winners) == 1 and winners[0]['source'] == 'mutation'
    assert winners[0]['win_streak'] == 1
    assert losers[0]['loss_streak'] == 1


def test_promote_after_win_streak(pt, monkeypatch):
    """A challenger that wins WIN_STREAK_TO_PROMOTE cycles in a row
    must end up as the promoted summary entry, and promote_challenger
    must swap the live plan_json."""
    from modules import paper_learning as pl
    monkeypatch.setattr(pl, 'WIN_STREAK_TO_PROMOTE', 2)
    acct = _seed_account(pt)
    cid = pl.add_challenger(acct, {'strategies': ['macd_cross']}, 'mutation', pt._conn)
    def scorer(_):
        return {'score': 100.0, 'annual_return_pct': 50.0}
    # Cycle 1: win, streak 1 (no promote yet)
    s1 = pl.evaluate_challengers(acct, 0.0, scorer, pt._conn)
    assert s1['promoted'] is None
    # Cycle 2: win, streak 2 = promote!
    s2 = pl.evaluate_challengers(acct, 0.0, scorer, pt._conn)
    assert s2['promoted'] is not None
    assert s2['promoted']['id'] == cid
    # Apply the promotion and verify the live plan_json swapped
    pl.promote_challenger(cid, acct, pt._conn)
    with sqlite3.connect(str(pt._DB)) as c:
        c.row_factory = sqlite3.Row
        row = c.execute('SELECT plan_json FROM paper_accounts WHERE id=?',
                        (acct,)).fetchone()
    live_plan = json.loads(row['plan_json'])
    assert live_plan.get('strategies') == ['macd_cross']


def test_loss_streak_drops_challenger(pt, monkeypatch):
    from modules import paper_learning as pl
    monkeypatch.setattr(pl, 'LOSS_STREAK_TO_DROP', 2)
    acct = _seed_account(pt)
    cid = pl.add_challenger(acct, {'strategies': ['breakout']}, 'mutation', pt._conn)
    def scorer(_):
        return {'score': -50.0, 'annual_return_pct': -20.0}
    pl.evaluate_challengers(acct, 100.0, scorer, pt._conn)   # loss 1
    s = pl.evaluate_challengers(acct, 100.0, scorer, pt._conn)  # loss 2 → drop
    assert any(d['id'] == cid for d in s['dropped'])
    with sqlite3.connect(str(pt._DB)) as c:
        c.row_factory = sqlite3.Row
        row = c.execute('SELECT status FROM paper_challengers WHERE id=?',
                        (cid,)).fetchone()
    assert row['status'] == 'dropped'


# ============================================================================
# T6.3 — regime detection
# ============================================================================

def test_classify_regime_unknown_when_too_few_bars():
    from modules.paper_learning import classify_regime, REGIME_UNKNOWN
    out = classify_regime(spy_closes=[100, 101, 102], vix_level=15)
    assert out['regime'] == REGIME_UNKNOWN
    assert 'need >=21' in out['reason']


def test_classify_regime_trend_up():
    from modules.paper_learning import classify_regime, REGIME_TREND_UP
    # 21 bars climbing 0.5%/day → ~10.5% over 20 days
    closes = [100 * (1.005 ** i) for i in range(21)]
    out = classify_regime(spy_closes=closes, vix_level=15)
    assert out['regime'] == REGIME_TREND_UP
    assert out['spy_ret_20d_pct'] > 5


def test_classify_regime_trend_down():
    from modules.paper_learning import classify_regime, REGIME_TREND_DOWN
    # 21 bars dropping 0.5%/day → ~-10% over 20 days
    closes = [100 * (0.995 ** i) for i in range(21)]
    out = classify_regime(spy_closes=closes, vix_level=20)
    assert out['regime'] == REGIME_TREND_DOWN
    assert out['spy_ret_20d_pct'] < -5


def test_classify_regime_high_vol_overrides_trend():
    """VIX >= 28 = high_vol regardless of SPY direction."""
    from modules.paper_learning import classify_regime, REGIME_HIGH_VOL
    closes = [100 * (1.005 ** i) for i in range(21)]   # would be trend_up
    out = classify_regime(spy_closes=closes, vix_level=35)
    assert out['regime'] == REGIME_HIGH_VOL
    assert 'vix 35' in out['reason']


def test_classify_regime_low_vol_when_quiet():
    from modules.paper_learning import classify_regime, REGIME_LOW_VOL
    closes = [100 + 0.05 * i for i in range(21)]  # ~1% over 20d → not trend
    out = classify_regime(spy_closes=closes, vix_level=10)
    assert out['regime'] == REGIME_LOW_VOL


def test_classify_regime_chop_default():
    from modules.paper_learning import classify_regime, REGIME_CHOP
    closes = [100 + 0.05 * i for i in range(21)]  # tiny moves, mid vix
    out = classify_regime(spy_closes=closes, vix_level=18)
    assert out['regime'] == REGIME_CHOP


def test_upsert_regime_persists_and_idempotent(pt):
    """Two calls on the same date must end up with one row, latest values."""
    from modules import paper_learning as pl
    pl.upsert_regime('2026-05-19', {'regime': 'chop', 'vix': 17.0,
                                     'spy_ret_20d_pct': 0.5,
                                     'reason': 'mid', 'classified_at': 'x'},
                     pt._conn)
    pl.upsert_regime('2026-05-19', {'regime': 'high_vol', 'vix': 33.0,
                                     'spy_ret_20d_pct': -2.0,
                                     'reason': 'spike', 'classified_at': 'y'},
                     pt._conn)
    with sqlite3.connect(str(pt._DB)) as c:
        c.row_factory = sqlite3.Row
        rows = c.execute('SELECT * FROM market_regime_daily').fetchall()
    assert len(rows) == 1
    assert rows[0]['regime'] == 'high_vol'
    assert rows[0]['vix'] == 33.0


def test_regime_just_flipped_detects_recent_change(pt):
    from modules import paper_learning as pl
    pl.upsert_regime('2026-05-17', {'regime': 'chop'}, pt._conn)
    pl.upsert_regime('2026-05-18', {'regime': 'chop'}, pt._conn)
    pl.upsert_regime('2026-05-19', {'regime': 'high_vol'}, pt._conn)
    # Last 3 rows: chop, chop, high_vol → flipped
    assert pl.regime_just_flipped(pt._conn, window_days=3) is True
    # Last 2 rows: chop, high_vol → flipped
    assert pl.regime_just_flipped(pt._conn, window_days=2) is True


def test_regime_just_flipped_false_when_stable(pt):
    from modules import paper_learning as pl
    pl.upsert_regime('2026-05-17', {'regime': 'chop'}, pt._conn)
    pl.upsert_regime('2026-05-18', {'regime': 'chop'}, pt._conn)
    pl.upsert_regime('2026-05-19', {'regime': 'chop'}, pt._conn)
    assert pl.regime_just_flipped(pt._conn, window_days=3) is False


# ============================================================================
# T6.4 — challenger sources (random mutation / GA / LLM)
# ============================================================================

def test_source_random_mutation_returns_proposal():
    """source_random_mutation should always return a mutated copy (unless
    champion is empty) — this is the cheapest, never-fails source."""
    from modules.paper_learning import source_random_mutation
    import random
    champ = {'strategies': ['ma_cross'], 'combine_mode': 'any',
             'take_profit_pct': 10, 'stop_loss_pct': 5, 'pos_size_pct': 20,
             'symbols': ['AAPL']}
    out = source_random_mutation(champ, base_plan=champ, scorer=None,
                                  rng=random.Random(42))
    assert out is not None
    # Symbols must be preserved (user-owned)
    assert out['symbols'] == ['AAPL']


def test_source_random_mutation_handles_empty_champion():
    from modules.paper_learning import source_random_mutation
    assert source_random_mutation({}, base_plan={}, scorer=None) is None


def test_genome_params_to_plan_translates_and_clamps():
    """The GA→PT translation should map known fields and clamp out-of-range
    values to the paper-trading bounds (so a wild genome can't smuggle
    pos_size_pct=200 into a live plan)."""
    from modules.paper_learning import _genome_params_to_plan
    champ = {'strategies': ['ma_cross'], 'symbols': ['AAPL'],
             'pos_size_pct': 20.0, 'stop_loss_pct': 5.0, 'take_profit_pct': 10.0}
    genome_params = {
        'position_pct': 2.5,    # 250% — must clamp to 80
        'stop_loss': -0.50,     # 50% — must clamp to 15
        'take_profit': 0.01,    # 1% — must clamp up to 2
    }
    out = _genome_params_to_plan(genome_params, 'multi_factor', champ)
    assert out['pos_size_pct'] == 80.0
    assert out['stop_loss_pct'] == 15.0
    assert out['take_profit_pct'] == 2.0
    # Strategy mapping: multi_factor → macd_cross
    assert out['strategies'] == ['macd_cross']
    # Symbols preserved
    assert out['symbols'] == ['AAPL']


def test_source_ga_mutation_returns_dict_or_none():
    """The GA source should either return a valid plan dict or None
    (when StrategyGenome is unavailable). Either is acceptable behavior."""
    from modules.paper_learning import source_ga_mutation
    import random
    champ = {'strategies': ['macd_cross'], 'combine_mode': 'any',
             'take_profit_pct': 10, 'stop_loss_pct': 5, 'pos_size_pct': 20,
             'symbols': ['AAPL']}
    out = source_ga_mutation(champ, base_plan=champ, scorer=None,
                              rng=random.Random(7))
    if out is None:
        pytest.skip('StrategyGenome unavailable on this install')
    assert isinstance(out, dict)
    assert out['symbols'] == ['AAPL']


def test_source_llm_proposal_returns_none_when_no_api_key(monkeypatch):
    """Without an API key configured, _try_llm returns None and the
    source must gracefully return None (NOT raise)."""
    from modules import paper_learning as pl
    from modules import pro_ai
    monkeypatch.setattr(pro_ai, '_try_llm', lambda *a, **kw: None)
    champ = {'strategies': ['ma_cross'], 'combine_mode': 'any',
             'take_profit_pct': 10, 'stop_loss_pct': 5, 'pos_size_pct': 20,
             'symbols': ['AAPL']}
    assert pl.source_llm_proposal(champ, base_plan=champ, scorer=None) is None


def test_source_llm_proposal_parses_valid_json(monkeypatch):
    """When the LLM returns valid JSON, the source should parse + clamp it
    and return a plan dict — preserving symbols from the champion."""
    from modules import paper_learning as pl
    from modules import pro_ai

    def fake_llm(prompt, system=''):
        return ('{"strategies": ["rsi_meanreversion", "macd_cross"], '
                '"combine_mode": "majority", '
                '"take_profit_pct": 12, "stop_loss_pct": 4, '
                '"pos_size_pct": 25}')
    monkeypatch.setattr(pro_ai, '_try_llm', fake_llm)
    champ = {'strategies': ['ma_cross'], 'combine_mode': 'any',
             'take_profit_pct': 10, 'stop_loss_pct': 5, 'pos_size_pct': 20,
             'symbols': ['AAPL', 'MSFT']}
    out = pl.source_llm_proposal(champ, base_plan=champ, scorer=None)
    assert out is not None
    assert out['strategies'] == ['rsi_meanreversion', 'macd_cross']
    assert out['combine_mode'] == 'majority'
    assert out['take_profit_pct'] == 12
    assert out['stop_loss_pct'] == 4
    assert out['pos_size_pct'] == 25
    # Symbols are user-owned — must not be replaced by LLM output
    assert out['symbols'] == ['AAPL', 'MSFT']


def test_source_llm_proposal_strips_code_fences(monkeypatch):
    """Some models wrap JSON in ```json ... ``` despite being told not to."""
    from modules import paper_learning as pl
    from modules import pro_ai
    def fake_llm(prompt, system=''):
        return ('```json\n'
                '{"strategies":["breakout"],"combine_mode":"any",'
                '"take_profit_pct":8,"stop_loss_pct":3,"pos_size_pct":15}\n'
                '```')
    monkeypatch.setattr(pro_ai, '_try_llm', fake_llm)
    champ = {'strategies': ['ma_cross'], 'symbols': ['AAPL'],
             'combine_mode': 'any', 'take_profit_pct': 10,
             'stop_loss_pct': 5, 'pos_size_pct': 20}
    out = pl.source_llm_proposal(champ, base_plan=champ, scorer=None)
    assert out is not None
    assert out['strategies'] == ['breakout']
    assert out['take_profit_pct'] == 8


def test_source_llm_proposal_clamps_out_of_range_values(monkeypatch):
    """LLM hallucinations must NOT smuggle bad values into live plans."""
    from modules import paper_learning as pl
    from modules import pro_ai
    def fake_llm(prompt, system=''):
        return ('{"strategies":["ma_cross"],"combine_mode":"any",'
                '"take_profit_pct":99,"stop_loss_pct":50,"pos_size_pct":150}')
    monkeypatch.setattr(pro_ai, '_try_llm', fake_llm)
    champ = {'strategies': ['ma_cross'], 'symbols': ['AAPL'],
             'combine_mode': 'any', 'take_profit_pct': 10,
             'stop_loss_pct': 5, 'pos_size_pct': 20}
    out = pl.source_llm_proposal(champ, base_plan=champ, scorer=None)
    assert out['take_profit_pct'] == 30   # clamped to 30
    assert out['stop_loss_pct'] == 15     # clamped to 15
    assert out['pos_size_pct'] == 80      # clamped to 80


def test_source_llm_proposal_rejects_non_json(monkeypatch):
    from modules import paper_learning as pl
    from modules import pro_ai
    monkeypatch.setattr(pro_ai, '_try_llm', lambda *a, **kw: 'sorry, I cannot comply')
    champ = {'strategies': ['ma_cross'], 'symbols': ['AAPL']}
    assert pl.source_llm_proposal(champ, base_plan=champ, scorer=None) is None


# ============================================================================
# T6.5 — Thompson-sampling bandit
# ============================================================================

def test_bandit_table_created(pt):
    with sqlite3.connect(str(pt._DB)) as c:
        names = [r[0] for r in c.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='bandit_state'"
        ).fetchall()]
    assert 'bandit_state' in names


def test_bandit_reward_increments_alpha_on_win(pt):
    from modules import paper_learning as pl
    acct = _seed_account(pt)
    out = pl.record_bandit_reward(acct, 'macd_cross', won=True, conn_factory=pt._conn)
    assert out['alpha'] == 2.0   # prior 1 + win 1
    assert out['beta'] == 1.0
    assert out['wins'] == 1
    assert out['losses'] == 0


def test_bandit_reward_increments_beta_on_loss(pt):
    from modules import paper_learning as pl
    acct = _seed_account(pt)
    out = pl.record_bandit_reward(acct, 'rsi_meanreversion', won=False, conn_factory=pt._conn)
    assert out['alpha'] == 1.0
    assert out['beta'] == 2.0
    assert out['losses'] == 1


def test_bandit_weights_normalize_to_one(pt):
    from modules import paper_learning as pl
    import random
    acct = _seed_account(pt)
    weights = pl.bandit_weights(acct, ['ma_cross', 'rsi_meanreversion', 'macd_cross'],
                                  conn_factory=pt._conn, rng=random.Random(7))
    assert abs(sum(weights.values()) - 1.0) < 1e-9
    assert set(weights.keys()) == {'ma_cross', 'rsi_meanreversion', 'macd_cross'}


def test_bandit_concentrates_weight_on_winner(pt):
    """A strategy that wins 50× in a row should get materially more
    Thompson-sampled weight than one with a default Beta(1,1) prior."""
    from modules import paper_learning as pl
    import random
    acct = _seed_account(pt)
    # Train strategy 'good' with 50 wins, 'bad' with 50 losses
    for _ in range(50):
        pl.record_bandit_reward(acct, 'good', won=True, conn_factory=pt._conn)
        pl.record_bandit_reward(acct, 'bad', won=False, conn_factory=pt._conn)
    # Average over many draws to suppress per-sample variance
    rng = random.Random(42)
    n = 200
    sum_good = sum_bad = 0.0
    for _ in range(n):
        w = pl.bandit_weights(acct, ['good', 'bad'], conn_factory=pt._conn, rng=rng)
        sum_good += w['good']
        sum_bad += w['bad']
    avg_good = sum_good / n
    avg_bad = sum_bad / n
    # With α=51,β=1 vs α=1,β=51, posterior means are ~0.98 vs ~0.02
    assert avg_good > 0.8, f"winning bandit didn't dominate: good={avg_good}"
    assert avg_bad < 0.2, f"losing bandit didn't recede: bad={avg_bad}"


def test_get_bandit_state_orders_by_win_rate(pt):
    from modules import paper_learning as pl
    acct = _seed_account(pt)
    # 'best' = 8W, 2L; 'mid' = 5W, 5L; 'worst' = 1W, 9L
    for _ in range(8): pl.record_bandit_reward(acct, 'best', True, pt._conn)
    for _ in range(2): pl.record_bandit_reward(acct, 'best', False, pt._conn)
    for _ in range(5): pl.record_bandit_reward(acct, 'mid', True, pt._conn)
    for _ in range(5): pl.record_bandit_reward(acct, 'mid', False, pt._conn)
    for _ in range(1): pl.record_bandit_reward(acct, 'worst', True, pt._conn)
    for _ in range(9): pl.record_bandit_reward(acct, 'worst', False, pt._conn)
    rows = pl.get_bandit_state(acct, pt._conn)
    names = [r['strategy'] for r in rows]
    assert names[0] == 'best'
    assert names[-1] == 'worst'


def test_promotion_supersedes_other_challengers(pt, monkeypatch):
    """When one challenger promotes, all other active challengers should
    be dropped — they were comparing against the now-defunct champion."""
    from modules import paper_learning as pl
    monkeypatch.setattr(pl, 'WIN_STREAK_TO_PROMOTE', 1)
    acct = _seed_account(pt)
    winner = pl.add_challenger(acct, {'strategies': ['macd_cross']}, 'mutation', pt._conn)
    pl.add_challenger(acct, {'strategies': ['rsi_meanreversion']}, 'mutation', pt._conn)
    def scorer(plan_dict):
        if 'macd_cross' in plan_dict.get('strategies', []):
            return {'score': 100.0, 'annual_return_pct': 50.0}
        return {'score': -1.0, 'annual_return_pct': 0.0}  # not enough to win
    s = pl.evaluate_challengers(acct, 0.0, scorer, pt._conn)
    assert s['promoted']['id'] == winner
    pl.promote_challenger(winner, acct, pt._conn)
    with sqlite3.connect(str(pt._DB)) as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(
            'SELECT id, status FROM paper_challengers WHERE account_id=?',
            (acct,)).fetchall()
    statuses = {r['id']: r['status'] for r in rows}
    assert statuses[winner] == 'promoted'
    # The other challenger must have been swept aside
    others = [s for cid, s in statuses.items() if cid != winner]
    assert all(s == 'dropped' for s in others)
