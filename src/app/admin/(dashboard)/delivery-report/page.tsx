import Link from "next/link";
import { db } from "@/lib/db";
import { BrandKicker } from "@/components/Brand";
import { DonutChart } from "@/components/DonutChart";
import { getCurrentAdminUser, getAccessibleSubAccountIds } from "@/lib/auth";
import { resolveRange } from "@/lib/delivery/range";
import { getDeliverySummary, getFailureBreakdown, getAccountMetrics } from "@/lib/delivery/queries";
import { RangePicker } from "./RangePicker";
import { AccountSelector } from "./AccountSelector";
import { syncNow } from "./actions";

export default async function DeliveryReportPage({ searchParams }: PageProps<"/admin/delivery-report">) {
  const sp = await searchParams;
  const rangeKind = typeof sp.range === "string" ? sp.range : "day";
  const fromParam = typeof sp.from === "string" ? sp.from : undefined;
  const toParam = typeof sp.to === "string" ? sp.to : undefined;
  const selectedAccountId = typeof sp.account === "string" ? sp.account : undefined;

  const user = await getCurrentAdminUser();
  if (!user) return null; // layout already redirects unauthenticated requests to /admin/login

  const range = resolveRange(rangeKind, fromParam, toParam);
  const accessibleIds = await getAccessibleSubAccountIds(user);

  const [summary, failures, accounts] = await Promise.all([
    getDeliverySummary(range, accessibleIds, user.canViewSpend),
    getFailureBreakdown(range, accessibleIds),
    db.subAccount.findMany({
      where: { id: { in: accessibleIds }, provider: "TWILIO" },
      select: { id: true, businessName: true },
      orderBy: { businessName: "asc" },
    }),
  ]);

  const selectedAccount = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) : undefined;
  const accountMetrics = selectedAccount ? await getAccountMetrics(selectedAccount.id, range) : null;

  const totals = summary.reduce(
    (acc, r) => ({
      spend: acc.spend === null || r.spend === null ? null : acc.spend + r.spend,
      callsSent: acc.callsSent + r.callsSent,
      smsSent: acc.smsSent + r.smsSent,
      mmsSent: acc.mmsSent + r.mmsSent,
      delivered: acc.delivered + r.delivered,
      failed: acc.failed + r.failed,
    }),
    { spend: user.canViewSpend ? 0 : null, callsSent: 0, smsSent: 0, mmsSent: 0, delivered: 0, failed: 0 } as {
      spend: number | null;
      callsSent: number;
      smsSent: number;
      mmsSent: number;
      delivered: number;
      failed: number;
    }
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <BrandKicker />
          <h1 className="text-2xl font-semibold text-neutral-900">Twilio delivery report</h1>
          <p className="text-sm text-neutral-500">{range.label}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm font-medium text-primary underline">
            ← All sub-accounts
          </Link>
          {user.role === "SUPER_ADMIN" && (
            <Link href="/admin/users" className="text-sm font-medium text-primary underline">
              Manage users
            </Link>
          )}
          <form action={async () => { "use server"; await syncNow(); }}>
            <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Sync now
            </button>
          </form>
        </div>
      </div>

      <div className="mb-6">
        <RangePicker current={range.kind} from={fromParam} to={toParam} />
      </div>

      {/* Table 1: Delivery Report */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Delivery report</h2>
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <Th>Sub-account</Th>
                {user.canViewSpend && <Th>Spend</Th>}
                <Th>Calls sent</Th>
                <Th>SMS sent</Th>
                <Th>MMS sent</Th>
                <Th>Delivered</Th>
                <Th>Failed</Th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r) => (
                <tr key={r.subAccountId} className="border-t border-neutral-100">
                  <td className="px-4 py-3 font-medium text-neutral-900">{r.businessName}</td>
                  {user.canViewSpend && <td className="px-4 py-3">${(r.spend ?? 0).toFixed(2)}</td>}
                  <td className="px-4 py-3">{r.callsSent}</td>
                  <td className="px-4 py-3">{r.smsSent}</td>
                  <td className="px-4 py-3">{r.mmsSent}</td>
                  <td className="px-4 py-3 text-emerald-700">{r.delivered}</td>
                  <td className="px-4 py-3 text-red-700">{r.failed}</td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr>
                  <td colSpan={user.canViewSpend ? 7 : 6} className="px-4 py-10 text-center text-neutral-400">
                    No accessible sub-accounts.
                  </td>
                </tr>
              )}
            </tbody>
            {summary.length > 0 && (
              <tfoot className="border-t border-neutral-200 bg-neutral-50 font-medium">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  {user.canViewSpend && <td className="px-4 py-3">${(totals.spend ?? 0).toFixed(2)}</td>}
                  <td className="px-4 py-3">{totals.callsSent}</td>
                  <td className="px-4 py-3">{totals.smsSent}</td>
                  <td className="px-4 py-3">{totals.mmsSent}</td>
                  <td className="px-4 py-3 text-emerald-700">{totals.delivered}</td>
                  <td className="px-4 py-3 text-red-700">{totals.failed}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Table 2: Deliveries & Failures (reason codes) */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Deliveries &amp; failures</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Grouped by sub-account, channel, and reason — not a per-message log.
        </p>
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <Th>Sub-account</Th>
                <Th>Channel</Th>
                <Th>Status</Th>
                <Th>Reason code</Th>
                <Th>Reason</Th>
                <Th>Count</Th>
              </tr>
            </thead>
            <tbody>
              {failures.map((f, i) => (
                <tr key={`${f.subAccountId}-${f.channel}-${f.status}-${f.errorCode}-${i}`} className="border-t border-neutral-100">
                  <td className="px-4 py-3 font-medium text-neutral-900">{f.businessName}</td>
                  <td className="px-4 py-3">{f.channel}</td>
                  <td className="px-4 py-3">
                    <span className={f.status === "FAILED" ? "text-red-700" : "text-amber-700"}>{f.status}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{f.errorCode ?? "—"}</td>
                  <td className="px-4 py-3">{f.reasonLabel}</td>
                  <td className="px-4 py-3">{f.count}</td>
                </tr>
              ))}
              {failures.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                    No failures or undelivered messages in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Individual account selector + pie chart */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Sub-account detail</h2>
        <div className="mb-4">
          <AccountSelector accounts={accounts} selectedId={selectedAccountId} />
        </div>
        {selectedAccount && accountMetrics && (
          <div className="rounded-xl border border-neutral-200 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-neutral-900">{selectedAccount.businessName}</h3>
              <form action={async () => { "use server"; await syncNow(selectedAccount.id); }}>
                <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                  Sync this account
                </button>
              </form>
            </div>
            <div className="mb-6 flex gap-8 text-sm">
              <div>
                <p className="text-neutral-500">Delivered</p>
                <p className="text-xl font-semibold text-emerald-700">{accountMetrics.delivered}</p>
              </div>
              <div>
                <p className="text-neutral-500">Failed</p>
                <p className="text-xl font-semibold text-red-700">{accountMetrics.failed}</p>
              </div>
            </div>
            <DonutChart
              slices={[
                { key: "delivered", label: "Delivered", value: accountMetrics.breakdown.delivered, colorClass: "stroke-emerald-500" },
                { key: "undelivered", label: "Undelivered", value: accountMetrics.breakdown.undelivered, colorClass: "stroke-amber-500" },
                { key: "failed", label: "Failed", value: accountMetrics.breakdown.failed, colorClass: "stroke-red-500" },
                { key: "unknown", label: "Unknown / pending", value: accountMetrics.breakdown.unknown, colorClass: "stroke-neutral-300" },
              ]}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>;
}
