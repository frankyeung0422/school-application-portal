"""
Config + secrets hygiene (T7.5).

Wraps every ``os.getenv`` read behind ``config.get()`` so we can:
  - fail fast at startup on missing *required* keys instead of dying
    deep inside a request handler
  - warn on obvious example/default values like 'your-key-here' or '...'
    that snuck through from a template .env
  - load a ``.env`` file automatically when python-dotenv is available
  - audit every key the app reads via ``config.audit()`` for the dashboard

This module is intentionally tiny — no async, no fancy validation. The
contract: a key is either present (and not an example sentinel) or it
isn't. Callers decide how to react when ``required=False`` returns None.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set


logger = logging.getLogger('paper_trading')

# Sentinel values that almost always indicate a forgotten template. Any
# env var matching one of these (case-insensitive, exact match) is
# treated as missing AND a warning is logged.
_EXAMPLE_SENTINELS: Set[str] = {
    '', 'your-key-here', 'your_key_here', 'your-api-key', 'your_api_key',
    'changeme', 'change_me', 'change-me', 'todo', 'fixme', 'tbd',
    'xxx', 'xxxxxxxx', '...', 'placeholder', 'example',
    'sk-xxxxxxxx', 'sk-your-key', 'sk-yourkey',
    'replace-me', 'replace_me',
}


def _load_dotenv_once() -> None:
    """Load .env if present and python-dotenv is installed. Safe to call
    multiple times — dotenv's own load_dotenv is idempotent."""
    try:
        from dotenv import load_dotenv  # type: ignore
    except Exception:
        return
    # Look for .env in standard locations: project root and web/
    candidates = [
        Path(__file__).resolve().parents[2] / '.env',
        Path(__file__).resolve().parents[1] / '.env',
    ]
    for p in candidates:
        if p.exists():
            load_dotenv(str(p), override=False)
            return


_load_dotenv_once()


# Audit trail of every key the app has asked for, with whether it was
# present. Useful for an admin "config status" page.
_AUDIT: Dict[str, Dict[str, Any]] = {}


def get(key: str, default: Optional[str] = None, *,
        required: bool = False, secret: bool = True) -> Optional[str]:
    """Read an env var with hygiene.

    Args:
        key: the env var name (e.g. 'ANTHROPIC_API_KEY')
        default: returned when the var is missing AND required=False
        required: if True, raise RuntimeError when the var is missing or
                  matches an example-sentinel. Use this for keys without
                  which the app cannot do its job.
        secret: when True (default), the audit log records only whether
                the key was present, not its value. Set False for benign
                keys like a port number that you want to see in /healthz.

    Returns:
        The string value, or default when absent.
    """
    raw = os.environ.get(key, None)
    is_present = raw is not None and raw != ''
    is_sentinel = (raw or '').strip().lower() in _EXAMPLE_SENTINELS
    effective_value: Optional[str] = None
    if is_present and not is_sentinel:
        effective_value = raw
    elif default is not None:
        effective_value = default

    # Audit (only metadata for secrets)
    audit_entry: Dict[str, Any] = {
        'present': is_present,
        'sentinel': is_sentinel,
        'has_default': default is not None,
        'required': required,
    }
    if not secret and effective_value is not None:
        audit_entry['value'] = effective_value
    _AUDIT[key] = audit_entry

    if is_sentinel:
        logger.warning(
            f'config[{key}] looks like a template placeholder ({raw!r}); '
            f'treating as missing. Set it in your .env or environment.',
            extra={'account': '-'},
        )

    if required and effective_value is None:
        raise RuntimeError(
            f"Required config key {key!r} is missing. "
            f"Set it in your environment or .env file. "
            f"(Got: {'sentinel ' + repr(raw) if is_sentinel else 'unset'})"
        )
    return effective_value


def audit() -> Dict[str, Dict[str, Any]]:
    """Snapshot of every key seen so far. Useful for an admin page."""
    return {k: dict(v) for k, v in _AUDIT.items()}


def check_required(keys: List[str]) -> List[str]:
    """Check several required keys at once. Returns the list of missing
    keys (empty when all present). Doesn't raise — caller can decide
    whether missing keys are fatal or just degrade a feature.
    """
    missing: List[str] = []
    for k in keys:
        v = get(k, required=False)
        if v is None:
            missing.append(k)
    return missing
