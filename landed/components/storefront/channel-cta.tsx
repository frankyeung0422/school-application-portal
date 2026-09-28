/** "Join the 到手價 Telegram channel" — shown only once the channel exists (TELEGRAM_CHANNEL_URL). */
export function ChannelCta({ compact = false }: { compact?: boolean }) {
  const url = process.env.TELEGRAM_CHANNEL_URL;
  if (!url || !/^https:\/\/t\.me\//.test(url)) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={compact ? "btn-secondary" : "card flex items-center justify-between gap-3 border-sky-200 bg-sky-50 p-4 hover:bg-sky-100"}>
      {compact ? (
        "📣 Telegram 頻道"
      ) : (
        <>
          <span>
            <span className="font-semibold">📣 每日抵買，直送 Telegram</span>
            <span className="block text-sm text-slate-600">每日一個帖：有價格紀錄證明嘅真抵買、真優惠，同埋每週超市指數。</span>
          </span>
          <span className="text-sky-700">加入 →</span>
        </>
      )}
    </a>
  );
}
