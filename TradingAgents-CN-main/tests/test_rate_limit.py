"""
Regression tests for T8.3 — per-user rate limits + plan quotas.

Reaches into web/api.py via the same source-extraction trick used by
test_auth_security.py — pulls out just the RateLimiter class + the
USER_RATE_QUOTAS constant, exec's into an isolated namespace, exercises.
"""
from __future__ import annotations

import re
import sys
import time
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'


@pytest.fixture()
def rl():
    """Return a fresh RateLimiter instance + the USER_RATE_QUOTAS dict
    sourced from web/api.py."""
    src = (WEB / 'api.py').read_text(encoding='utf-8')
    # Find the class block
    cls_match = re.search(r'^class RateLimiter:[\s\S]*?(?=\n^class |\n^def )',
                          src, re.MULTILINE)
    assert cls_match, "couldn't find class RateLimiter in api.py"
    cls_src = cls_match.group(0)
    # Find the USER_RATE_QUOTAS dict
    quota_match = re.search(r'^USER_RATE_QUOTAS\s*=\s*\{[\s\S]*?^\}',
                            src, re.MULTILINE)
    assert quota_match, "couldn't find USER_RATE_QUOTAS in api.py"
    quota_src = quota_match.group(0)

    import collections
    import threading
    ns = {
        '__name__': 'rl_under_test',
        'time': time,
        'defaultdict': collections.defaultdict,
        'deque': collections.deque,
        'threading': threading,
        'print': lambda *a, **kw: None,
    }
    exec(quota_src + '\n\n' + cls_src, ns)
    return ns['RateLimiter'](max_requests=30, time_window=60), ns


def test_user_under_quota_allowed(rl):
    rate_limiter, ns = rl
    # basic quota = 30/60s
    for i in range(30):
        assert rate_limiter.check_user_rate_limit(user_id=42, plan_type='basic') is True
    # 31st should fail
    assert rate_limiter.check_user_rate_limit(user_id=42, plan_type='basic') is False


def test_pro_user_gets_higher_quota(rl):
    rate_limiter, ns = rl
    # pro quota = 120/60s
    for i in range(120):
        assert rate_limiter.check_user_rate_limit(user_id=43, plan_type='pro') is True
    # 121st should fail
    assert rate_limiter.check_user_rate_limit(user_id=43, plan_type='pro') is False


def test_anonymous_user_passes(rl):
    """user_id=0 / None should bypass user-level limiting (IP limiter
    handles anonymous requests)."""
    rate_limiter, ns = rl
    for _ in range(1000):
        assert rate_limiter.check_user_rate_limit(user_id=0, plan_type='free') is True


def test_unknown_plan_defaults_to_basic(rl):
    rate_limiter, ns = rl
    for i in range(30):
        assert rate_limiter.check_user_rate_limit(user_id=44, plan_type='enterprise_plus') is True
    assert rate_limiter.check_user_rate_limit(user_id=44, plan_type='enterprise_plus') is False


def test_user_limit_independent_of_ip(rl):
    """User-level deque is keyed 'user:N' so a heavy user doesn't
    consume IP-level budget."""
    rate_limiter, ns = rl
    for i in range(30):
        rate_limiter.check_user_rate_limit(user_id=50, plan_type='basic')
    # IP-level check on a fresh IP should still work
    assert rate_limiter.check_rate_limit('1.2.3.4') is True
