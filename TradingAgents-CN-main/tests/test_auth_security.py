"""
Regression tests for T7.3 — persistent sessions + bcrypt passwords.

Covered:
  - hash_password produces a bcrypt-prefixed string
  - verify_password accepts both bcrypt AND legacy SHA256 (back-compat)
  - _maybe_upgrade_password_hash transparently re-hashes legacy users
  - create_session/get_session/destroy_session survive simulated restart
    (in-memory cache cleared, session still resolvable from DB)
  - Expired sessions return None and self-clean
  - cleanup_expired_sessions removes only stale rows
"""
from __future__ import annotations

import hashlib
import importlib
import sqlite3
import sys
import time
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[1] / 'web'
sys.path.insert(0, str(WEB))


@pytest.fixture()
def api_mod(monkeypatch, tmp_path):
    """Import web/api.py with its DB path pointed at a temp file.

    api.py is a fat HTTP-server module — importing it for real would start
    the entire app. Instead we exec only the auth fragment by reading the
    file, splicing the DB path, and exec'ing into a fresh namespace.
    Heavy but isolates each test cleanly.
    """
    # Simpler: import api as a module but monkeypatch its db_path closures.
    # The auth functions look up Path(__file__).parent / 'trading_agents.db'
    # each call, so a monkeypatch on Path is brittle. We use a real api
    # import + override the file location via the existing test-DB pattern:
    test_db = tmp_path / 'trading_agents.db'
    # Create a minimal users table + sessions table at the test path so
    # create_session etc. can write to it.
    with sqlite3.connect(str(test_db)) as c:
        c.execute('''CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username TEXT,
            email TEXT,
            password_hash TEXT,
            plan_type TEXT,
            analysis_count INTEGER DEFAULT 0,
            max_analyses INTEGER DEFAULT 10
        )''')
        c.commit()

    # Patch the web/api.py db-path resolution: every auth function builds
    # `Path(__file__).parent / 'trading_agents.db'`. We swap __file__ on
    # the import path via a stub module.
    import importlib.util
    spec = importlib.util.spec_from_file_location('api_under_test', WEB / 'api.py')
    # Load the source but only execute the snippet we need to avoid
    # starting the HTTP server. Easier: read source and exec auth fragment.
    src = (WEB / 'api.py').read_text(encoding='utf-8')

    # We only need: hashlib, sqlite3, json, os, time, Path, session_lock,
    # active_sessions, SUBSCRIPTION_PLANS stub, hash_password,
    # verify_password, _maybe_upgrade_password_hash, _ensure_sessions_table,
    # create_session, get_session, destroy_session, cleanup_expired_sessions.
    import json as _json
    import os as _os
    import threading
    ns = {
        '__file__': str(tmp_path / 'api.py'),  # so Path(__file__).parent → tmp_path
        '__name__': 'api_under_test',
        'hashlib': hashlib,
        'sqlite3': sqlite3,
        'json': _json,
        'os': _os,
        'time': time,
        'Path': Path,
        'session_lock': threading.Lock(),
        'active_sessions': {},
        'print': lambda *a, **kw: None,   # mute the diagnostic prints
        'SUBSCRIPTION_PLANS': {'basic': {'analysis_limit': 10}},
        # Hard-code the constants instead of trying to extract multi-line
        # tuples from source. Kept in sync with web/api.py.
        '_SESSION_TTL_SECS': 7 * 24 * 3600,
        '_SESSIONS_TABLE_READY': False,
        '_AUDIT_TABLE_READY': False,
        '_AUDIT_RETENTION_DAYS': 90,
        '_AUDIT_SKIP_PREFIXES': ('/healthz', '/readyz', '/metrics',
                                  '/favicon.ico', '/robots.txt', '/ads.txt'),
        '_AUDIT_SKIP_SUFFIXES': ('.css', '.js', '.png', '.jpg', '.svg', '.ico', '.map'),
    }
    # Compile only the relevant function defs by scanning for them.
    snippets = []
    in_target = False
    target_names = {
        'hash_password', 'verify_password', '_maybe_upgrade_password_hash',
        '_ensure_sessions_table', 'create_session', 'get_session',
        'destroy_session', 'cleanup_expired_sessions',
        '_ensure_audit_table', '_audit_skip', '_audit_request',
        'cleanup_audit_log',
    }
    lines = src.splitlines(keepends=True)
    i = 0
    while i < len(lines):
        line = lines[i]
        # Look for def or _GLOBAL = at module level
        if line.startswith('def '):
            name = line.split('(')[0][4:].strip()
            block = [line]
            i += 1
            while i < len(lines):
                nxt = lines[i]
                # Next top-level def/class breaks the block; '_SESSION_TTL_SECS = …'
                # constants at col 0 should also stop us.
                if (nxt and not nxt.startswith((' ', '\t'))
                        and nxt.strip() and not nxt.startswith(('#', '"""', "'''"))):
                    break
                block.append(nxt)
                i += 1
            if name in target_names:
                snippets.append(''.join(block))
            continue
        # Constants are pre-seeded in ns above; no need to extract from source
        i += 1

    exec(''.join(snippets), ns)
    return ns, test_db


# ---------------------- password hashing ----------------------

def test_hash_password_produces_bcrypt(api_mod):
    ns, _ = api_mod
    h = ns['hash_password']('correct horse battery staple')
    assert h.startswith(('$2a$', '$2b$', '$2y$')), f'expected bcrypt prefix, got {h[:7]!r}'


def test_verify_accepts_bcrypt_and_legacy_sha256(api_mod):
    ns, _ = api_mod
    plain = 'hunter2'
    bcrypt_hash = ns['hash_password'](plain)
    sha256_hash = hashlib.sha256(plain.encode()).hexdigest()
    assert ns['verify_password'](plain, bcrypt_hash) is True
    assert ns['verify_password'](plain, sha256_hash) is True
    assert ns['verify_password']('wrong', bcrypt_hash) is False
    assert ns['verify_password']('wrong', sha256_hash) is False


def test_legacy_hash_upgraded_on_verify(api_mod):
    ns, db_path = api_mod
    plain = 'legacy_secret'
    legacy = hashlib.sha256(plain.encode()).hexdigest()
    with sqlite3.connect(str(db_path)) as c:
        c.execute(
            "INSERT INTO users (id, username, email, password_hash, plan_type) "
            "VALUES (1, 'u', 'u@e.com', ?, 'basic')",
            (legacy,))
        c.commit()
    # Call the upgrade helper as authenticate_user would
    assert ns['verify_password'](plain, legacy) is True
    ns['_maybe_upgrade_password_hash'](1, plain, legacy)
    with sqlite3.connect(str(db_path)) as c:
        new_hash = c.execute('SELECT password_hash FROM users WHERE id=1').fetchone()[0]
    assert new_hash.startswith(('$2a$', '$2b$', '$2y$')), f'no upgrade, still {new_hash[:10]!r}'
    # And it still validates the same password
    assert ns['verify_password'](plain, new_hash) is True


# ---------------------- session persistence ----------------------

def _user_data(uid=1):
    return {'id': uid, 'username': 'alice', 'email': 'a@e.com',
            'plan_type': 'basic', 'analysis_count': 0, 'max_analyses': 10}


def test_session_create_and_get_roundtrip(api_mod):
    ns, _ = api_mod
    sid = ns['create_session'](_user_data())
    assert sid and len(sid) >= 16
    out = ns['get_session'](sid)
    assert out is not None
    assert out['user_id'] == 1


def test_session_survives_in_memory_cache_clear(api_mod):
    """Simulate a server restart: clear active_sessions dict, then
    get_session should hydrate the row from SQLite."""
    ns, _ = api_mod
    sid = ns['create_session'](_user_data(uid=42))
    # Wipe the in-memory cache
    ns['active_sessions'].clear()
    out = ns['get_session'](sid)
    assert out is not None
    assert out['user_id'] == 42


def test_session_expiry_returns_none(api_mod):
    ns, db_path = api_mod
    sid = ns['create_session'](_user_data())
    # Force-expire the row
    with sqlite3.connect(str(db_path)) as c:
        c.execute('UPDATE sessions SET expires_at = ? WHERE id = ?',
                  (time.time() - 60, sid))
        c.commit()
    ns['active_sessions'].clear()  # force DB hydration path
    out = ns['get_session'](sid)
    assert out is None
    # And the expired row should have been deleted
    with sqlite3.connect(str(db_path)) as c:
        row = c.execute('SELECT 1 FROM sessions WHERE id=?', (sid,)).fetchone()
    assert row is None


def test_destroy_session_removes_from_both_stores(api_mod):
    ns, db_path = api_mod
    sid = ns['create_session'](_user_data())
    ns['destroy_session'](sid)
    assert sid not in ns['active_sessions']
    with sqlite3.connect(str(db_path)) as c:
        row = c.execute('SELECT 1 FROM sessions WHERE id=?', (sid,)).fetchone()
    assert row is None


# ---------------------- audit log (T7.4) ----------------------

def test_audit_skip_excludes_health_and_static(api_mod):
    ns, _ = api_mod
    assert ns['_audit_skip']('/healthz') is True
    assert ns['_audit_skip']('/metrics') is True
    assert ns['_audit_skip']('/readyz?token=x') is True
    assert ns['_audit_skip']('/static/app.js') is True
    assert ns['_audit_skip']('/favicon.ico') is True
    # Real API paths must NOT be skipped
    assert ns['_audit_skip']('/api/paper/run') is False
    assert ns['_audit_skip']('/api/admin/audit') is False


def test_audit_request_persists_row(api_mod):
    ns, db_path = api_mod
    ns['_audit_request'](user_id=42, ip='1.2.3.4', method='POST',
                         path='/api/paper/run', status=200, latency_ms=87)
    with sqlite3.connect(str(db_path)) as c:
        c.row_factory = sqlite3.Row
        row = c.execute('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1').fetchone()
    assert row['user_id'] == 42
    assert row['ip'] == '1.2.3.4'
    assert row['method'] == 'POST'
    assert row['path'] == '/api/paper/run'
    assert row['status'] == 200
    assert row['latency_ms'] == 87


def test_audit_skipped_paths_not_persisted(api_mod):
    ns, db_path = api_mod
    ns['_audit_request'](user_id=1, ip='x', method='GET', path='/healthz', status=200)
    ns['_audit_request'](user_id=1, ip='x', method='GET', path='/metrics', status=200)
    ns['_audit_request'](user_id=1, ip='x', method='GET', path='/api/paper/list', status=200)
    with sqlite3.connect(str(db_path)) as c:
        n = c.execute('SELECT COUNT(*) FROM audit_log').fetchone()[0]
    assert n == 1, 'only /api/paper/list should be audited'


def test_cleanup_audit_log_removes_old_rows(api_mod):
    ns, db_path = api_mod
    # Plant rows: one fresh, one ancient (200 days old)
    with sqlite3.connect(str(db_path)) as c:
        c.execute('''CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, user_id INTEGER,
            ip TEXT, method TEXT, path TEXT, status INTEGER, latency_ms INTEGER)''')
        c.execute('INSERT INTO audit_log (ts, path) VALUES (?, ?)',
                  (time.time(), '/api/x'))
        c.execute('INSERT INTO audit_log (ts, path) VALUES (?, ?)',
                  (time.time() - 200 * 86400, '/api/old'))
        c.commit()
    n = ns['cleanup_audit_log'](keep_days=90)
    assert n == 1
    with sqlite3.connect(str(db_path)) as c:
        rows = [r[0] for r in c.execute('SELECT path FROM audit_log').fetchall()]
    assert '/api/x' in rows and '/api/old' not in rows


def test_cleanup_expired_sessions(api_mod):
    ns, db_path = api_mod
    fresh = ns['create_session'](_user_data(uid=1))
    stale = ns['create_session'](_user_data(uid=2))
    with sqlite3.connect(str(db_path)) as c:
        c.execute('UPDATE sessions SET expires_at = ? WHERE id = ?',
                  (time.time() - 1, stale))
        c.commit()
    n = ns['cleanup_expired_sessions']()
    assert n == 1
    with sqlite3.connect(str(db_path)) as c:
        ids = [r[0] for r in c.execute('SELECT id FROM sessions').fetchall()]
    assert fresh in ids and stale not in ids
