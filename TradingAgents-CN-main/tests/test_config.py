"""
Regression tests for web/modules/config.py (T7.5).

Covered:
  - get() returns the env value when set
  - get() returns the default when env is unset
  - get(required=True) raises a clear error when the value is missing
  - example/template sentinels (e.g. 'your-key-here') are treated as
    missing AND emit a warning log
  - audit() reports per-key metadata WITHOUT secret values
  - secret=False audit DOES include the value
  - check_required() returns the list of missing keys (and doesn't raise)
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))


@pytest.fixture()
def cfg(monkeypatch):
    """Fresh config module per test — clear the audit dict and remove any
    test-set env vars."""
    import modules.config as c
    c._AUDIT.clear()
    return c


def test_get_returns_env_value(cfg, monkeypatch):
    monkeypatch.setenv('TEST_KEY', 'real-secret-value')
    assert cfg.get('TEST_KEY') == 'real-secret-value'


def test_get_returns_default_when_unset(cfg, monkeypatch):
    monkeypatch.delenv('NEVER_SET', raising=False)
    assert cfg.get('NEVER_SET', default='fallback') == 'fallback'


def test_get_returns_none_when_unset_no_default(cfg, monkeypatch):
    monkeypatch.delenv('NEVER_SET', raising=False)
    assert cfg.get('NEVER_SET') is None


def test_required_missing_raises_runtime_error(cfg, monkeypatch):
    monkeypatch.delenv('CRITICAL_KEY', raising=False)
    with pytest.raises(RuntimeError) as excinfo:
        cfg.get('CRITICAL_KEY', required=True)
    assert 'CRITICAL_KEY' in str(excinfo.value)


def test_required_with_sentinel_value_also_raises(cfg, monkeypatch):
    """A literal 'your-key-here' value should NOT satisfy required=True —
    it's just as broken as missing entirely."""
    monkeypatch.setenv('TEMPLATE_KEY', 'your-key-here')
    with pytest.raises(RuntimeError):
        cfg.get('TEMPLATE_KEY', required=True)


def test_sentinel_treated_as_missing(cfg, monkeypatch, caplog):
    """When the value matches a known template sentinel, get() returns
    the default and logs a warning."""
    monkeypatch.setenv('TEMPLATE_KEY', 'changeme')
    with caplog.at_level(logging.WARNING, logger='paper_trading'):
        out = cfg.get('TEMPLATE_KEY', default='fallback')
    assert out == 'fallback'
    assert any('template placeholder' in rec.message for rec in caplog.records), (
        f'no sentinel-warning log emitted; got: {[r.message for r in caplog.records]}')


def test_sentinel_case_insensitive(cfg, monkeypatch):
    """Sentinels match regardless of case."""
    monkeypatch.setenv('K', 'CHANGEME')
    assert cfg.get('K') is None
    monkeypatch.setenv('K', 'TODO')
    assert cfg.get('K') is None


def test_audit_records_presence_without_secret(cfg, monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 'sensitive')
    cfg.get('SECRET_KEY', secret=True)
    entry = cfg.audit()['SECRET_KEY']
    assert entry['present'] is True
    assert entry['sentinel'] is False
    assert 'value' not in entry, 'secret value leaked into audit'


def test_audit_records_value_when_not_secret(cfg, monkeypatch):
    monkeypatch.setenv('PORT', '8080')
    cfg.get('PORT', secret=False)
    entry = cfg.audit()['PORT']
    assert entry['value'] == '8080'


def test_check_required_returns_missing_list(cfg, monkeypatch):
    monkeypatch.setenv('A', 'present')
    monkeypatch.delenv('B', raising=False)
    monkeypatch.setenv('C', 'your-key-here')   # sentinel = effectively missing
    missing = cfg.check_required(['A', 'B', 'C'])
    assert 'A' not in missing
    assert 'B' in missing
    assert 'C' in missing
