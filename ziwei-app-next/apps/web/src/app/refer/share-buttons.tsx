'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

const MESSAGE = (url: string) =>
  `我在紫微閣排了完整命盤, 解讀很準。用我的邀請碼註冊, 你我各得 1 個月免費試用: ${url}`;

export function ShareButtons({ code, url }: { code: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(MESSAGE(url));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(MESSAGE(url))}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(MESSAGE(url))}`;
  const fbUrl = `https://www.facebook.com/dialog/send?app_id=&link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap gap-3 justify-center mt-6">
      <Button asChild size="md" variant="gold">
        <a href={lineUrl} target="_blank" rel="noreferrer">LINE</a>
      </Button>
      <Button asChild size="md" variant="primary">
        <a href={waUrl} target="_blank" rel="noreferrer">WhatsApp</a>
      </Button>
      <Button asChild size="md" variant="primary">
        <a href={fbUrl} target="_blank" rel="noreferrer">FB Messenger</a>
      </Button>
      <Button size="md" variant="ghost" onClick={copy}>
        {copied ? '✓ 已複製' : '複製訊息'}
      </Button>
    </div>
  );
}
