/**
 * Hand-rolled email layout — inline styles, table-based, Outlook-safe.
 * Branded midnight + gold. Used by every transactional + marketing email.
 */

export interface LayoutOpts {
  title: string;
  preview?: string; // hidden preheader
  body: string; // pre-rendered HTML for the content area
  ctaUrl?: string;
  ctaText?: string;
  footerNote?: string;
}

const BG = '#0E1330';
const BG_ELEVATED = '#1A1E36';
const GOLD = '#C9A14A';
const GOLD_BRIGHT = '#E8C36A';
const PAPER = '#F5EFE0';
const PAPER_DIM = '#C5C0B0';
const SERIF = "'Noto Serif TC','Source Han Serif TC','PingFang TC',serif";

export function renderEmail(opts: LayoutOpts): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="https://www.w3.org/1999/xhtml" lang="zh-Hant">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>${escapeHtml(opts.title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:${BG};font-family:${SERIF};color:${PAPER};">
${opts.preview ? `<div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(opts.preview)}</div>` : ''}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG};padding:40px 0;">
  <tr>
    <td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:${BG_ELEVATED};border:1px solid rgba(201,161,74,0.2);border-radius:8px;">
        <tr>
          <td style="padding:32px 40px 16px 40px;text-align:center;">
            <div style="font-family:${SERIF};font-size:28px;font-weight:600;color:${GOLD_BRIGHT};letter-spacing:0.04em;">紫微閣</div>
            <div style="font-size:11px;color:${PAPER_DIM};letter-spacing:0.3em;margin-top:4px;">命理引擎</div>
            <div style="height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:24px 0 0 0;opacity:0.5;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;">
            ${opts.body}
          </td>
        </tr>
        ${opts.ctaUrl && opts.ctaText ? `
        <tr>
          <td style="padding:8px 40px 32px 40px;text-align:center;">
            <a href="${escapeAttr(opts.ctaUrl)}"
               style="display:inline-block;background:${GOLD};color:${BG};padding:14px 32px;text-decoration:none;border-radius:4px;font-weight:600;font-family:${SERIF};font-size:15px;letter-spacing:0.05em;">
              ${escapeHtml(opts.ctaText)}
            </a>
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:24px 40px 32px 40px;border-top:1px solid rgba(201,161,74,0.15);">
            <div style="font-size:11px;color:${PAPER_DIM};line-height:1.6;text-align:center;">
              ${opts.footerNote ? `<div style="margin-bottom:8px;">${escapeHtml(opts.footerNote)}</div>` : ''}
              © ${new Date().getFullYear()} 紫微閣 · aifortunetelling.org<br />
              命理參考用途, 不構成醫療、財務或法律建議。
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
