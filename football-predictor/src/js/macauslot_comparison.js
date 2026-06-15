/**
 * MacauSlot vs HKJC odds comparison panel + alert system.
 * - GET /api/v1/macauslot/comparison  — full match cards
 * - GET /api/v1/macauslot/alert-summary — lightweight badge/toast polling
 *
 * Alert tiers:
 *   gap >= 3%  → tab badge + green toast
 *   gap >= 7%  → orange toast + in-panel banner
 *   gap >= 10% → red toast (big opportunity)
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);

    // ── state ──────────────────────────────────────────────────────────────
    let _refreshTimer = null;
    let _pollTimer    = null;
    let _loaded       = false;
    let _lastBestGap  = 0;
    let _lastOpCount  = -1;   // -1 = never polled
    const _recTexts   = [];

    // ── helpers ────────────────────────────────────────────────────────────
    function escapeHtml(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, ch =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function fmtDate(iso) {
        if (!iso) return '--';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleString('zh-HK', {
            month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false,
        });
    }

    function gapBadge(gap) {
        const pct = Number(gap).toFixed(1);
        let bg = 'rgba(72,187,120,0.2)', fg = '#48bb78';
        if (gap >= 10) { bg = 'rgba(239,68,68,0.25)'; fg = '#f87171'; }
        else if (gap >= 5) { bg = 'rgba(245,158,11,0.22)'; fg = '#fbbf24'; }
        else if (gap < 3) { bg = 'rgba(160,174,192,0.15)'; fg = '#a0aec0'; }
        return `<span style="padding:2px 9px;border-radius:999px;background:${bg};color:${fg};font-size:11px;font-weight:700">+${pct}%</span>`;
    }

    function marketBadge(market) {
        const isHiLo = market === 'HiLo';
        return `<span style="padding:1px 7px;border-radius:999px;` +
            `background:${isHiLo ? 'rgba(91,141,239,0.18)' : 'rgba(160,174,192,0.12)'};` +
            `color:${isHiLo ? '#5b8def' : '#a0aec0'};font-size:10px;font-weight:600">${escapeHtml(market)}</span>`;
    }

    // ── tab badge ──────────────────────────────────────────────────────────
    function _ensureBadge() {
        let badge = document.getElementById('ms-tab-badge');
        if (badge) return badge;
        const btn = document.querySelector('[data-mobile-tab="opportunities"]');
        if (!btn) return null;
        badge = document.createElement('span');
        badge.id = 'ms-tab-badge';
        badge.style.cssText = [
            'display:none', 'align-items:center', 'justify-content:center',
            'min-width:16px', 'height:16px', 'border-radius:999px',
            'background:#ef4444', 'color:#fff', 'font-size:10px', 'font-weight:700',
            'padding:0 4px', 'margin-left:4px', 'vertical-align:middle', 'line-height:1',
        ].join(';');
        btn.appendChild(badge);
        return badge;
    }

    function updateTabBadge(count) {
        const badge = _ensureBadge();
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // ── in-panel alert banner ─────────────────────────────────────────────
    function _ensureAlertBanner() {
        let banner = document.getElementById('ms-alert-banner');
        if (banner) return banner;
        const grid = $('macauslot-comparison-grid');
        if (!grid || !grid.parentNode) return null;
        banner = document.createElement('div');
        banner.id = 'ms-alert-banner';
        banner.style.cssText = [
            'display:none', 'align-items:flex-start', 'gap:10px',
            'background:rgba(245,158,11,0.1)', 'border:1px solid rgba(245,158,11,0.4)',
            'border-radius:10px', 'padding:12px 16px', 'margin-bottom:12px',
            'font-size:13px', 'color:#fbbf24',
        ].join(';');
        grid.parentNode.insertBefore(banner, grid);
        return banner;
    }

    function updateAlertBanner(best) {
        const banner = _ensureAlertBanner();
        if (!banner) return;
        if (!best || best.gap_pct < 7) {
            banner.style.display = 'none';
            return;
        }
        const icon = best.gap_pct >= 10 ? '🔴' : '🟠';
        banner.innerHTML = `
            <span style="font-size:20px;line-height:1">${icon}</span>
            <div>
                <div style="font-weight:700;margin-bottom:3px">
                    高差距警報：${escapeHtml(best.match)}
                </div>
                <div style="font-size:12px;color:#fde68a">
                    ${escapeHtml(best.market)} · ${escapeHtml(best.outcome)} —
                    HKJC <strong>${Number(best.hkjc_odds).toFixed(2)}</strong>
                    vs 澳門彩票 ${Number(best.macauslot_odds).toFixed(2)}
                    <span style="margin-left:6px;background:rgba(245,158,11,0.25);
                                 padding:1px 8px;border-radius:999px;font-weight:700">
                        +${Number(best.gap_pct).toFixed(1)}%
                    </span>
                </div>
            </div>`;
        banner.style.display = 'flex';
    }

    // ── toast notification ─────────────────────────────────────────────────
    function _injectToastStyles() {
        if (document.getElementById('ms-toast-style')) return;
        const style = document.createElement('style');
        style.id = 'ms-toast-style';
        style.textContent = `
            @keyframes ms-slide-in {
                from { opacity:0; transform:translateX(30px); }
                to   { opacity:1; transform:translateX(0); }
            }
            #ms-toast-container .ms-toast {
                animation: ms-slide-in 0.25s ease;
                cursor: pointer;
            }`;
        document.head.appendChild(style);
    }

    function _ensureToastContainer() {
        let el = document.getElementById('ms-toast-container');
        if (el) return el;
        _injectToastStyles();
        el = document.createElement('div');
        el.id = 'ms-toast-container';
        el.style.cssText = [
            'position:fixed', 'bottom:80px', 'right:16px', 'z-index:9999',
            'display:flex', 'flex-direction:column-reverse', 'gap:8px',
            'max-width:360px', 'pointer-events:none',
        ].join(';');
        document.body.appendChild(el);
        return el;
    }

    function showToast(msg, type, durationMs) {
        const container = _ensureToastContainer();
        const palette = {
            info: { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  txt: '#4ade80', icon: '✅' },
            warn: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.5)', txt: '#fbbf24', icon: '⚠️' },
            hot:  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.5)',  txt: '#f87171', icon: '🔥' },
        };
        const c = palette[type] || palette.info;
        const toast = document.createElement('div');
        toast.className = 'ms-toast';
        toast.style.cssText = [
            `background:${c.bg}`, `border:1px solid ${c.border}`, 'border-radius:10px',
            'padding:11px 14px', 'backdrop-filter:blur(8px)',
            'box-shadow:0 4px 24px rgba(0,0,0,0.4)',
            'font-size:13px', `color:${c.txt}`,
            'display:flex', 'align-items:flex-start', 'gap:9px',
            'pointer-events:all',
        ].join(';');
        toast.innerHTML = `
            <span style="font-size:16px;line-height:1.3;flex-shrink:0">${c.icon}</span>
            <span style="flex:1;line-height:1.5">${escapeHtml(msg)}</span>
            <button onclick="this.closest('.ms-toast').remove()"
                style="font-size:16px;color:rgba(255,255,255,0.35);background:none;
                       border:none;cursor:pointer;padding:0;line-height:1;flex-shrink:0">&times;</button>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.4s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 450);
        }, durationMs || 6000);
    }

    // ── alert logic ────────────────────────────────────────────────────────
    function applyAlerts(summary) {
        const count  = summary.total_opportunities || 0;
        const top    = summary.best_gap_pct || 0;
        const best   = summary.best_opportunity || null;

        updateTabBadge(count);
        updateAlertBanner(best);

        const isNew = (_lastOpCount >= 0 && count !== _lastOpCount)
            || (top - _lastBestGap >= 2);

        if (isNew && count > 0) {
            if (top >= 10) {
                const label = best
                    ? `${best.match} — ${best.market} +${Number(top).toFixed(1)}%`
                    : `${count} 個機會`;
                showToast(`🔥 高差距警報：${label}，立即在 HKJC 投注`, 'hot', 9000);
            } else if (top >= 5) {
                showToast(
                    `HKJC 賠率優勢：${count} 場賽事 (最大差距 +${Number(top).toFixed(1)}%)`,
                    'warn', 7000,
                );
            } else {
                showToast(`找到 ${count} 個 HKJC 優於澳門彩票的賠率機會`, 'info', 5000);
            }
        } else if (isNew && count === 0 && _lastOpCount > 0) {
            showToast('澳門彩票 vs HKJC：目前差距縮窄，無明顯優勢', 'info', 4000);
        }

        _lastOpCount = count;
        _lastBestGap = top;
    }

    // ── lightweight background poll (every 60s) ───────────────────────────
    async function pollAlertSummary() {
        try {
            const res = await fetch('/api/v1/macauslot/alert-summary?min_gap_pct=3', {
                credentials: 'include',
            });
            if (!res.ok) return;
            applyAlerts(await res.json());
        } catch (_) { /* silent */ }
    }

    function startAlertPoll() {
        if (_pollTimer) clearInterval(_pollTimer);
        void pollAlertSummary();
        _pollTimer = setInterval(pollAlertSummary, 60_000);
    }

    // ── full comparison panel ─────────────────────────────────────────────
    function advantageRow(adv) {
        const idx = _recTexts.length;
        _recTexts.push(adv.recommended_bet);
        return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
            <td style="padding:8px 10px;color:#e6ecf5;font-size:13px">${marketBadge(adv.market)} ${escapeHtml(adv.outcome)}</td>
            <td style="padding:8px 10px;color:#fc8181;font-size:13px;text-align:center">${Number(adv.macauslot_odds).toFixed(2)}</td>
            <td style="padding:8px 10px;color:#68d391;font-size:13px;text-align:center;font-weight:700">${Number(adv.hkjc_odds).toFixed(2)}</td>
            <td style="padding:8px 10px;text-align:center">${gapBadge(adv.gap_pct)}</td>
            <td style="padding:8px 10px;text-align:right">
                <button data-rec-idx="${idx}"
                    style="font-size:11px;padding:3px 9px;border-radius:6px;
                           border:1px solid rgba(72,187,120,0.35);
                           background:rgba(72,187,120,0.1);color:#48bb78;cursor:pointer">
                    複製建議
                </button>
            </td>
        </tr>`;
    }

    function matchCard(item) {
        const home = (item.home_team_ch && item.home_team_ch.trim()) || item.home_team;
        const away = (item.away_team_ch && item.away_team_ch.trim()) || item.away_team;
        const gap  = item.best_gap_pct;
        const borderColor = gap >= 10 ? '#ef4444' : gap >= 5 ? '#f59e0b' : '#48bb78';
        const urgencyPill  = gap >= 10
            ? `<span style="font-size:10px;padding:2px 7px;border-radius:999px;
                            background:rgba(239,68,68,0.2);color:#f87171;font-weight:700;margin-left:6px">🔥 高差距</span>`
            : gap >= 5
            ? `<span style="font-size:10px;padding:2px 7px;border-radius:999px;
                            background:rgba(245,158,11,0.2);color:#fbbf24;font-weight:700;margin-left:6px">⚠️ 留意</span>`
            : '';
        const rows = (item.advantages || [])
            .sort((a, b) => b.gap_pct - a.gap_pct)
            .map(advantageRow).join('');

        return `
        <div style="background:rgba(255,255,255,0.04);border-left:3px solid ${borderColor};
                    border-radius:10px;padding:14px 16px;margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;
                        gap:12px;flex-wrap:wrap;margin-bottom:10px">
                <div>
                    <div style="font-weight:700;font-size:15px;color:#e6ecf5">
                        ${escapeHtml(home)}
                        <span style="color:#8aa0c7;font-weight:400"> vs </span>
                        ${escapeHtml(away)}${urgencyPill}
                    </div>
                    <div style="font-size:12px;color:#8aa0c7;margin-top:2px">
                        ${escapeHtml(item.league || '')} · ${fmtDate(item.match_date)}
                    </div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:11px;color:#8aa0c7;margin-bottom:3px">最大優勢</div>
                    ${gapBadge(gap)}
                </div>
            </div>
            <table style="width:100%;border-collapse:collapse">
                <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1)">
                        <th style="padding:6px 10px;text-align:left;font-size:11px;color:#8aa0c7;font-weight:600">市場/結果</th>
                        <th style="padding:6px 10px;text-align:center;font-size:11px;color:#fc8181;font-weight:600">澳門彩票</th>
                        <th style="padding:6px 10px;text-align:center;font-size:11px;color:#68d391;font-weight:600">香港賽馬會</th>
                        <th style="padding:6px 10px;text-align:center;font-size:11px;color:#8aa0c7;font-weight:600">差距</th>
                        <th style="padding:6px 10px;text-align:right;font-size:11px;color:#8aa0c7;font-weight:600">操作</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    function renderSummaryStats(comparisons) {
        if (!comparisons || !comparisons.length) return '';
        const total  = comparisons.length;
        const bigCnt = comparisons.filter(c => c.best_gap_pct >= 10).length;
        const medCnt = comparisons.filter(c => c.best_gap_pct >= 5 && c.best_gap_pct < 10).length;
        const top    = Math.max(...comparisons.map(c => c.best_gap_pct));
        return `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
            <div style="flex:1;min-width:80px;background:rgba(72,187,120,0.08);
                        border:1px solid rgba(72,187,120,0.2);border-radius:8px;padding:10px 14px;text-align:center">
                <div style="font-size:22px;font-weight:700;color:#48bb78">${total}</div>
                <div style="font-size:11px;color:#8aa0c7;margin-top:2px">HKJC 優勢場次</div>
            </div>
            ${bigCnt > 0 ? `
            <div style="flex:1;min-width:80px;background:rgba(239,68,68,0.08);
                        border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:10px 14px;text-align:center">
                <div style="font-size:22px;font-weight:700;color:#f87171">${bigCnt}</div>
                <div style="font-size:11px;color:#8aa0c7;margin-top:2px">差距 ≥10%</div>
            </div>` : ''}
            ${medCnt > 0 ? `
            <div style="flex:1;min-width:80px;background:rgba(245,158,11,0.08);
                        border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:10px 14px;text-align:center">
                <div style="font-size:22px;font-weight:700;color:#fbbf24">${medCnt}</div>
                <div style="font-size:11px;color:#8aa0c7;margin-top:2px">差距 5–10%</div>
            </div>` : ''}
            <div style="flex:1;min-width:80px;background:rgba(91,141,239,0.08);
                        border:1px solid rgba(91,141,239,0.2);border-radius:8px;padding:10px 14px;text-align:center">
                <div style="font-size:22px;font-weight:700;color:#5b8def">+${top.toFixed(1)}%</div>
                <div style="font-size:11px;color:#8aa0c7;margin-top:2px">最大差距</div>
            </div>
        </div>`;
    }

    function render(comparisons) {
        const grid = $('macauslot-comparison-grid');
        if (!grid) return;
        _recTexts.length = 0;

        if (!comparisons || comparisons.length === 0) {
            grid.innerHTML = `
                <div style="padding:20px;text-align:center;color:#8aa0c7;font-size:13px">
                    目前未發現 HKJC 優於澳門彩票的賠率機會。<br>
                    <span style="font-size:11px;opacity:0.7">澳門彩票賠率將每 15 分鐘自動更新。</span>
                </div>`;
            updateAlertBanner(null);
            return;
        }

        grid.innerHTML = renderSummaryStats(comparisons) + comparisons.map(matchCard).join('');
    }

    async function load(force) {
        const loading = $('macauslot-loading');
        const grid    = $('macauslot-comparison-grid');
        if (!loading || !grid) return;
        if (!force && _loaded) return;

        loading.style.display = 'block';
        grid.classList.add('hidden');

        try {
            const url = '/api/v1/macauslot/comparison?days_ahead=3' + (force ? '&refresh=true' : '');
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const comparisons = data.comparisons || [];
            render(comparisons);

            // Drive alerts from full-load data (no extra request needed)
            if (comparisons.length) {
                const top  = Math.max(...comparisons.map(c => c.best_gap_pct));
                const c0   = comparisons[0];
                const a0   = c0.advantages[0];
                const home = (c0.home_team_ch || c0.home_team || '').trim();
                const away = (c0.away_team_ch || c0.away_team || '').trim();
                applyAlerts({
                    total_opportunities: comparisons.length,
                    big_gap_count: comparisons.filter(c => c.best_gap_pct >= 10).length,
                    best_gap_pct: top,
                    best_opportunity: a0 ? {
                        match: `${home} vs ${away}`,
                        market: a0.market, outcome: a0.outcome,
                        hkjc_odds: a0.hkjc_odds, macauslot_odds: a0.macauslot_odds,
                        gap_pct: a0.gap_pct,
                    } : null,
                });
            } else {
                applyAlerts({ total_opportunities: 0, big_gap_count: 0, best_gap_pct: 0, best_opportunity: null });
            }

            _loaded = true;
        } catch (err) {
            if (grid) {
                grid.innerHTML = `<div style="padding:12px;color:#fc8181;font-size:13px">載入失敗: ${escapeHtml(String(err))}</div>`;
            }
        } finally {
            if (loading) loading.style.display = 'none';
            if (grid) grid.classList.remove('hidden');
        }
    }

    async function manualRefresh() {
        const btn = $('macauslot-refresh-btn');
        if (btn) { btn.disabled = true; btn.textContent = '刷新中…'; }
        try {
            await fetch('/api/v1/macauslot/refresh', { method: 'POST', credentials: 'include' });
            await load(true);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '刷新比較'; }
        }
    }

    function startAutoRefresh() {
        if (_refreshTimer) clearInterval(_refreshTimer);
        _refreshTimer = setInterval(() => load(true), 5 * 60 * 1000);
    }

    // ── init ───────────────────────────────────────────────────────────────
    function init() {
        const refreshBtn = $('macauslot-refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', manualRefresh);

        // Copy recommendation event delegation
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('button[data-rec-idx]');
            if (!btn) return;
            const idx = parseInt(btn.getAttribute('data-rec-idx'), 10);
            const text = _recTexts[idx];
            if (!text) return;
            if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
            const orig = btn.textContent;
            btn.textContent = '已複製！';
            setTimeout(() => { btn.textContent = orig; }, 1500);
        });

        // Load when the section scrolls into view
        const section = document.getElementById('odds-opportunities');
        if (section) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting && !_loaded) {
                        load(false);
                        startAutoRefresh();
                    }
                });
            }, { threshold: 0.05 });
            observer.observe(section);
        }

        // Hash-based navigation
        function onHashChange() {
            if (location.hash === '#odds-opportunities' && !_loaded) {
                load(false);
                startAutoRefresh();
            }
        }
        window.addEventListener('hashchange', onHashChange);
        if (location.hash === '#odds-opportunities') {
            load(false);
            startAutoRefresh();
        }

        // Background alert polling always runs — regardless of which tab is open
        startAlertPoll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
