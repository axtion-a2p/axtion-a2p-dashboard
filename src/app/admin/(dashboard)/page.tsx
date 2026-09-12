import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { stageColor, healthColor, stageLabel } from "@/lib/status";
import { logout } from "./actions";

export default async function AdminIndexPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const providerFilter = typeof sp.provider === "string" ? sp.provider : undefined;

  const subAccounts = await db.subAccount.findMany({
    where: providerFilter ? { provider: providerFilter as "TWILIO" | "TEXTGRID" } : undefined,
    include: { brand: true, campaigns: true, phoneNumbers: true },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    all: subAccounts.length,
    twilio: subAccounts.filter((s) => s.provider === "TWILIO").length,
    textgrid: subAccounts.filter((s) => s.provider === "TEXTGRID").length,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">All sub-accounts</h1>
        <div className="flex items-center gap-4">
          <Link href="/signup" className="text-sm font-medium text-neutral-900 underline">
            + New sub-account
          </Link>
          <form action={logout}>
            <button className="text-sm text-neutral-500 hover:text-neutral-900">Sign out</button>
          </form>
        </div>
      </div>

      <div className="mb-6 flex gap-2 text-sm">
        <FilterLink label={`All (${counts.all})`} href="/admin" active={!providerFilter} />
        <FilterLink label={`Twilio (${counts.twilio})`} href="/admin?provider=TWILIO" active={providerFilter === "TWILIO"} />
        <FilterLink label={`TextGrid (${counts.textgrid})`} href="/admin?provider=TEXTGRID" active={providerFilter === "TEXTGRID"} />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <Th>Business</Th>
              <Th>Provider</Th>
              <Th>Brand</Th>
              <Th>Campaigns</Th>
              <Th>Numbers</Th>
              <Th>GHL location</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {subAccounts.map((s) => (
              <tr key={s.id} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{s.businessName}</p>
                  <p className="text-xs text-neutral-500">{s.contactEmail}</p>
                </td>
                <td className="px-4 py-3">{s.provider === "TWILIO" ? "Twilio" : "TextGrid"}</td>
                <td className="px-4 py-3">
                  {s.brand ? <Badge text={stageLabel(s.brand.stage)} className={stageColor[s.brand.stage]} /> : <span className="text-neutral-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  {s.campaigns.length === 0 ? (
                    <span className="text-neutral-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {s.campaigns.map((c) => (
                        <Badge key={c.id} text={stageLabel(c.health)} className={healthColor[c.health]} />
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{s.phoneNumbers.length}</td>
                <td className="px-4 py-3 text-neutral-500">{s.ghlLocationName ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/${s.id}`} className="font-medium text-neutral-900 underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {subAccounts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                  No sub-accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>;
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 ${active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}
    >
      {label}
    </Link>
  );
}
