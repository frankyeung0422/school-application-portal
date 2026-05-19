"""
Unified notification fan-out: email + Slack webhook + Telegram bot.

Each user can opt into any combination via their `notification_prefs` JSON
column on the `users` table. Per-tick alerts, drawdown alerts, and the
daily digest all funnel through `notify_user()`.

Schema migration is idempotent — `init_user_prefs()` adds the column if
missing. Defaults are conservative: nothing fires unless the user opts in.
"""
from __future__ import annotations

import json
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional

_DB = Path(__file__).resolve().parents[1] / 'trading_agents.db'

DEFAULT_PREFS: Dict[str, Any] = {
    'paper_tick_email': True,       # email for each paper tick with new tx
    'paper_tick_slack': False,
    'paper_tick_telegram': False,
    'drawdown_alert': True,         # extra-loud notice when an account auto-pauses
    'daily_digest': False,          # consolidated end-of-day email
    'ai_ideas_email': False,        # daily AI trade ideas digest by email
    'ai_ideas_market': 'all',       # 'us' | 'hk' | 'all'
    'ai_ideas_risk': 'medium',      # 'low' | 'medium' | 'high'
    'slack_webhook_url': '',
    'telegram_bot_token': '',
    'telegram_chat_id': '',
}


def init_user_prefs() -> None:
    """Add notification_prefs column to users table if missing."""
    conn = sqlite3.connect(str(_DB))
    try:
        cols = {r[1] for r in conn.execute('PRAGMA table_info(users)').fetchall()}
        if 'notification_prefs' not in cols:
            conn.execute('ALTER TABLE users ADD COLUMN notification_prefs TEXT')
            conn.commit()
    finally:
        conn.close()


def get_prefs(user_id: int) -> Dict[str, Any]:
    init_user_prefs()
    conn = sqlite3.connect(str(_DB))
    try:
        row = conn.execute(
            'SELECT notification_prefs, email FROM users WHERE id = ?', (user_id,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return dict(DEFAULT_PREFS)
    raw = row[0]
    prefs = dict(DEFAULT_PREFS)
    if raw:
        try:
            saved = json.loads(raw) or {}
            for k, v in saved.items():
                if k in prefs:
                    prefs[k] = v
        except Exception:
            pass
    prefs['email'] = row[1] or ''
    return prefs


def save_prefs(user_id: int, prefs: Dict[str, Any]) -> Dict[str, Any]:
    init_user_prefs()
    cleaned = dict(DEFAULT_PREFS)
    for k in DEFAULT_PREFS:
        if k in prefs:
            cleaned[k] = prefs[k]
    # Coerce booleans
    for bk in ('paper_tick_email', 'paper_tick_slack', 'paper_tick_telegram',
              'drawdown_alert', 'daily_digest', 'ai_ideas_email'):
        cleaned[bk] = bool(cleaned.get(bk))
    # Strip strings
    for sk in ('slack_webhook_url', 'telegram_bot_token', 'telegram_chat_id'):
        cleaned[sk] = (cleaned.get(sk) or '').strip()
    # Constrained choices
    market = (cleaned.get('ai_ideas_market') or 'all').lower()
    cleaned['ai_ideas_market'] = market if market in ('us', 'hk', 'all') else 'all'
    risk = (cleaned.get('ai_ideas_risk') or 'medium').lower()
    cleaned['ai_ideas_risk'] = risk if risk in ('low', 'medium', 'high') else 'medium'
    conn = sqlite3.connect(str(_DB))
    try:
        conn.execute('UPDATE users SET notification_prefs = ? WHERE id = ?',
                     (json.dumps(cleaned), user_id))
        conn.commit()
    finally:
        conn.close()
    return {'success': True, 'prefs': cleaned}


def _post_json(url: str, payload: dict, timeout: int = 8) -> bool:
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return 200 <= resp.status < 300
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        print(f"⚠️ webhook POST failed ({url[:60]}): {e}")
        return False


def send_slack(webhook_url: str, text: str) -> bool:
    if not webhook_url:
        return False
    return _post_json(webhook_url, {'text': text})


def send_telegram(bot_token: str, chat_id: str, text: str) -> bool:
    if not bot_token or not chat_id:
        return False
    url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
    return _post_json(url, {'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'})


def send_email(to: str, subject: str, html: str) -> bool:
    """Wrapper around the existing email service."""
    if not to:
        return False
    try:
        from tradingagents.quant.email_service import _send_email
        res = _send_email(to, subject, html)
        return bool(res.get('success'))
    except Exception as e:
        print(f"⚠️ email send failed: {e}")
        return False


def notify_user(user_id: int, subject: str, *,
                html: Optional[str] = None,
                text: Optional[str] = None,
                channels: Optional[Dict[str, bool]] = None) -> Dict[str, bool]:
    """
    Fan-out notification to whichever channels the user has opted into.

    `channels` is an optional override (e.g. {'paper_tick_email': True}) —
    when None, uses the user's stored prefs as-is.
    Returns {channel: success_bool}.
    """
    prefs = get_prefs(user_id)
    if channels:
        for k, v in channels.items():
            if v is False:
                prefs[k] = False
    out: Dict[str, bool] = {}

    text_body = text or (html and _strip_html(html)) or subject
    html_body = html or f"<p>{text_body}</p>"

    if prefs.get('paper_tick_email') and prefs.get('email'):
        out['email'] = send_email(prefs['email'], subject, html_body)

    if prefs.get('paper_tick_slack') and prefs.get('slack_webhook_url'):
        out['slack'] = send_slack(prefs['slack_webhook_url'], f"*{subject}*\n{text_body}")

    if prefs.get('paper_tick_telegram') and prefs.get('telegram_bot_token') and prefs.get('telegram_chat_id'):
        out['telegram'] = send_telegram(
            prefs['telegram_bot_token'],
            prefs['telegram_chat_id'],
            f"<b>{subject}</b>\n{text_body}",
        )

    return out


def notify_admins(subject: str, *, html: Optional[str] = None,
                  text: Optional[str] = None) -> Dict[str, Any]:
    """Fan-out to every user whose email is in ADMIN_EMAILS. Used by the
    scheduler resurrection path to alert operators when auto-run is
    persistently failing.

    Imports ADMIN_EMAILS from api.py at call time to avoid a circular
    module-load dependency. Returns {admin_email: notify_user_result}.
    """
    try:
        # Late import — api.py imports this module too.
        import sys
        api_mod = sys.modules.get('api') or sys.modules.get('__main__')
        admin_emails = getattr(api_mod, 'ADMIN_EMAILS', None) or []
    except Exception:
        admin_emails = []
    if not admin_emails:
        return {}
    # Look up admin user_ids by email
    import sqlite3
    from pathlib import Path as _P
    db = _P(__file__).resolve().parents[1] / 'trading_agents.db'
    out: Dict[str, Any] = {}
    try:
        with sqlite3.connect(str(db)) as c:
            c.row_factory = sqlite3.Row
            placeholders = ','.join('?' * len(admin_emails))
            rows = c.execute(
                f'SELECT id, email FROM users WHERE email IN ({placeholders})',
                tuple(admin_emails)).fetchall()
        for r in rows:
            try:
                out[r['email']] = notify_user(
                    r['id'], subject, html=html, text=text,
                    channels={'paper_tick_email': True, 'paper_tick_slack': True,
                              'paper_tick_telegram': True},
                )
            except Exception as e:
                out[r['email']] = {'error': str(e)}
    except Exception as e:
        return {'error': f'admin lookup failed: {e}'}
    return out


def _strip_html(html: str) -> str:
    """Very small HTML→text fallback — good enough for plaintext channels."""
    import re
    txt = re.sub(r'<[^>]+>', ' ', html)
    txt = re.sub(r'\s+', ' ', txt).strip()
    return txt[:1500]


def test_channels(user_id: int) -> Dict[str, Any]:
    """Send a test message to every configured channel."""
    out = notify_user(
        user_id,
        '🔔 TradingAgents 通知測試',
        text='如果您看到這則訊息，您的通知設定已正確。',
        html='<p>✅ 如果您看到這則訊息，您的通知設定已正確。</p>',
    )
    return {'success': True, 'results': out}
