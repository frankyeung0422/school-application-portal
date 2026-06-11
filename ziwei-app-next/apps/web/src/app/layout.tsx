import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Noto_Sans_TC, Noto_Serif_TC } from 'next/font/google';
import '@/styles/globals.css';
import { PostHogProvider } from '@/components/providers/posthog-provider';

const notoSerifTC = Noto_Serif_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-noto-serif-tc',
  display: 'swap',
});

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-tc',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://aifortunetelling.org'),
  title: {
    default: '紫微閣 · 命理引擎',
    template: '%s · 紫微閣',
  },
  description: '結合千年命理智慧與當代人工智能。深度個人命盤、流年分析、命理預警 — 為認真追尋人生方向的您而設。',
  keywords: ['紫微斗數', '八字命理', '命盤分析', '流年運勢', '命理顧問', '香港命理', '台灣命理'],
  authors: [{ name: '紫微閣命理顧問團隊' }],
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    siteName: '紫微閣',
    title: '紫微閣 · 命理引擎',
    description: '結合千年命理智慧與當代人工智能。',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0E1330',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`${notoSerifTC.variable} ${notoSansTC.variable}`}>
      <body className="bg-ink-wash min-h-screen antialiased">
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
