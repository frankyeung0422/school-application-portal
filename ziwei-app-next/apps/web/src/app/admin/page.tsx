import { Card, CardContent, CardHeader, CardTitle, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { GoldNumeral } from '@/components/chart';

export const metadata = { title: '管理後台' };

/**
 * Admin dashboard — gated by middleware.ts (P2: check admin role on user table).
 * For now this is a placeholder showing the planned tab structure.
 */
export default function AdminPage() {
  return (
    <main className="max-w-[var(--max-w-wide)] mx-auto px-6 py-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">管理後台</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">內部用 · 僅限管理員</p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">總覽</TabsTrigger>
          <TabsTrigger value="users">用戶</TabsTrigger>
          <TabsTrigger value="subscriptions">訂閱</TabsTrigger>
          <TabsTrigger value="cost-ledger">AI 成本</TabsTrigger>
          <TabsTrigger value="calc-audit">計算校驗</TabsTrigger>
          <TabsTrigger value="content-queue">內容審核</TabsTrigger>
          <TabsTrigger value="marketing">行銷排程</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'MRR', value: 'HK$0' },
              { label: '付費用戶', value: 0 },
              { label: '試用中', value: 0 },
              { label: '今日 AI 成本', value: 'US$0' },
            ].map((s) => (
              <Card key={s.label} variant="ink" padding="md">
                <CardHeader><CardTitle>{s.label}</CardTitle></CardHeader>
                <CardContent>
                  <GoldNumeral value={s.value} size="xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users">{/* TODO P2 */}</TabsContent>
        <TabsContent value="subscriptions">{/* TODO P2 */}</TabsContent>
        <TabsContent value="cost-ledger">{/* TODO P4 */}</TabsContent>
        <TabsContent value="calc-audit">{/* TODO P3 */}</TabsContent>
        <TabsContent value="content-queue">{/* TODO P5 */}</TabsContent>
        <TabsContent value="marketing">{/* TODO P5 */}</TabsContent>
      </Tabs>
    </main>
  );
}
