import Link from "next/link";
import { db } from "@/lib/db";
import { BrandKicker } from "@/components/Brand";
import { DonutChart } from "@/components/DonutChart";
import { getCurrentAdminUser, getAccessibleSubAccountIds } from "@/lib/auth";
import { resolveRange } from "@/lib/delivery/range";
import { getDeliverySummary, getFailureBreakdown, getAccountMetrics } from "@/lib/delivery/queries";
import { RangePicker } from "./RangePicker";
import { AccountSelector } from "./AccountSelector";
import { AutoRefresh } from "./AutoRefresh";
import { syncNow } from "./actions";

export default async function DeliveryReportPage({ searchParams }: PageProps<"/admin/delivery-report">) {
  const sp = await searchParams;
  const rangeKind = typeof sp.range === "string" ? sp.range : "7";
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
      received: acc.received + r.received,
      delivered: acc.delivered + r.delivered,
      blocked: acc.blocked + r.blocked,
      error: acc.error + r.error,
    }),
    {
      spend: user.canViewSpend ? 0 : null,
      callsSent: 0,
      smsSent: 0,
      mmsSent: 0,
      received: 0,
      delivered: 0,
      blocked: 0,
      error: 0,
    } as {
      spend: number | null;
      callsSent: number;
      smsSent: number;
      mmsSent: number;
      received: number;
      delivered: number;
      blocked: number;
      error: number;
    }
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Keeps numbers current without a manual click — re-requests this page
          every 20s client-side. Not Twilio push; see note by the selector. */}
      <AutoRefresh intervalSeconds={20} />

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
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <Th>Sub-account</Th>
                {user.canViewSpend && <Th>Spend</Th>}
                <Th>Calls sent</Th>
                <Th>SMS sent</Th>
                <Th>MMS sent</Th>
                <Th>Received</Th>
                <Th>Delivered</Th>
                <Th>Blocked</Th>
                <Th>Error</Th>
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
                  <td className="px-4 py-3">{r.received}</td>
                  <td className="px-4 py-3 text-emerald-700">{r.delivered}</td>
                  <td className="px-4 py-3 text-amber-700">{r.blocked}</td>
                  <td className="px-4 py-3 text-red-700">{r.error}</td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr>
                  <td colSpan={user.canViewSpend ? 9 : 8} className="px-4 py-10 text-center text-neutral-400">
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
                  <td className="px-4 py-3">{totals.received}</td>
                  <td className="px-4 py-3 text-emerald-700">{totals.delivered}</td>
                  <td className="px-4 py-3 text-amber-700">{totals.blocked}</td>
                  <td className="px-4 py-3 text-red-700">{totals.error}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Table 2: Blocked & Error reasons */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Blocked &amp; error reasons</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Grouped by sub-account, channel, and reason — not a per-message log. Blocked = Twilio accepted it, then the
          carrier/handset rejected it. Error = it never reached the carrier (bad number, account issue, etc).
        </p>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
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
                    <span className={f.statusLabel === "Error" ? "text-red-700" : "text-amber-700"}>{f.statusLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{f.errorCode ?? "—"}</td>
                  <td className="px-4 py-3">{f.reasonLabel}</td>
                  <td className="px-4 py-3">{f.count}</td>
                </tr>
              ))}
              {failures.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                    Nothing blocked or errored in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Individual account selector + real-time-ish stats */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Sub-account detail</h2>
          <p className="text-xs text-neutral-400">Auto-refreshes every 20s · or hit Sync now for this instant</p>
        </div>
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
            <div className="mb-6 grid grid-cols-2 gap-6 text-sm sm:grid-cols-4">
              <div>
                <p className="text-neutral-500">Sent</p>
                <p className="text-xl font-semibold text-neutral-900">{accountMetrics.sent}</p>
              </div>
              <div>
                <p className="text-neutral-500">Received</p>
                <p className="text-xl font-semibold text-neutral-900">{accountMetrics.received}</p>
              </div>
              <div>
                <p className="text-neutral-500">Blocked</p>
                <p className="text-xl font-semibold text-amber-700">{accountMetrics.blocked}</p>
              </div>
              <div>
                <p className="text-neutral-500">Error</p>
                <p className="text-xl font-semibold text-red-700">{accountMetrics.error}</p>
              </div>
            </div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">Outcome of sent messages/calls</p>
            <DonutChart
              slices={[
                { key: "delivered", label: "Delivered", value: accountMetrics.delivered, colorClass: "stroke-emerald-500" },
                { key: "blocked", label: "Blocked", value: accountMetrics.blocked, colorClass: "stroke-amber-500" },
                { key: "error", label: "Error", value: accountMetrics.error, colorClass: "stroke-red-500" },
                { key: "pending", label: "Pending", value: accountMetrics.pending, colorClass: "stroke-neutral-300" },
              ]}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-2 font-medium whitespace-nowrap">{children}</th>;
}
