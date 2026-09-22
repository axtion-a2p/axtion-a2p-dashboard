import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { BrandKicker } from "@/components/Brand";
import { stageColor, healthColor, stageLabel } from "@/lib/status";
import { subdomainUrl } from "@/lib/subdomain";
import { syncSubAccount, syncPhoneNumbers, assignNumberToCampaign, assignSubdomain } from "../actions";

export default async function AdminSubAccountPage({ params }: PageProps<"/admin/[id]">) {
  const { id } = await params;

  const subAccount = await db.subAccount.findUnique({
    where: { id },
    include: {
      brand: true,
      campaigns: { include: { phoneNumbers: true }, orderBy: { createdAt: "desc" } },
      phoneNumbers: true,
      statusEvents: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!subAccount) notFound();

  const unassignedNumbers = subAccount.phoneNumbers.filter((n) => n.status === "UNASSIGNED");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin" className="text-sm text-neutral-500 underline">
        ← All sub-accounts
      </Link>

      <div className="mt-4 mb-8 flex items-center justify-between">
        <div>
          <BrandKicker />
          <p className="text-sm text-neutral-500">{subAccount.provider === "TWILIO" ? "Twilio" : "TextGrid"}</p>
          <h1 className="text-2xl font-semibold text-neutral-900">{subAccount.businessName}</h1>
          <p className="text-xs text-neutral-400">/d/{subAccount.token}</p>
          {subAccount.subdomain ? (
            <a
              href={subdomainUrl(subAccount.subdomain)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline"
            >
              {subdomainUrl(subAccount.subdomain)}
            </a>
          ) : (
            <form action={assignSubdomain.bind(null, subAccount.id)}>
              <button className="text-xs font-medium text-primary underline">Assign compliance site</button>
            </form>
          )}
        </div>
        <form action={syncSubAccount.bind(null, subAccount.id)}>
          <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-900">
            Sync status
          </button>
        </form>
      </div>

      <section className="mb-8 rounded-xl border border-neutral-200 p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-900">Brand</h2>
          {subAccount.brand && <Badge text={stageLabel(subAccount.brand.stage)} className={stageColor[subAccount.brand.stage]} />}
        </div>
        {subAccount.brand ? (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Dt label="Legal name" value={subAccount.brand.legalBusinessName} />
            <Dt label="EIN" value={subAccount.brand.ein ?? "—"} />
            <Dt label="Provider brand ID" value={subAccount.brand.providerBrandId ?? "—"} />
            <Dt label="Submitted" value={subAccount.brand.submittedAt?.toLocaleString() ?? "—"} />
          </dl>
        ) : (
          <p className="text-sm text-neutral-500">Not submitted yet.</p>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-neutral-200 p-6">
        <h2 className="mb-3 text-lg font-medium text-neutral-900">Campaigns</h2>
        {subAccount.campaigns.length === 0 && <p className="text-sm text-neutral-500">No campaigns yet.</p>}
        <ul className="space-y-3">
          {subAccount.campaigns.map((c) => (
            <li key={c.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-neutral-900">{c.useCase}</p>
                <div className="flex gap-2">
                  <Badge text={stageLabel(c.stage)} className={stageColor[c.stage]} />
                  <Badge text={stageLabel(c.health)} className={healthColor[c.health]} />
                </div>
              </div>
              <p className="mt-1 text-xs text-neutral-500">Messaging service: {c.messagingServiceSid ?? "—"}</p>
              <p className="mt-1 text-xs text-neutral-500">
                Numbers: {c.phoneNumbers.map((n) => n.e164).join(", ") || "none"}
              </p>

              {unassignedNumbers.length > 0 && c.stage === "APPROVED" && (
                <form action={assignNumberToCampaign.bind(null, subAccount.id)} className="mt-3 flex items-center gap-2">
                  <input type="hidden" name="campaignId" value={c.id} />
                  <select name="phoneNumberId" required className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
                    <option value="">Assign a number…</option>
                    {unassignedNumbers.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.e164}
                      </option>
                    ))}
                  </select>
                  <button className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover">Assign</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-xl border border-neutral-200 p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-900">Phone numbers</h2>
          <form action={syncPhoneNumbers.bind(null, subAccount.id)}>
            <button className="text-xs font-medium text-primary underline">Pull from provider</button>
          </form>
        </div>
        <ul className="space-y-1 text-sm">
          {subAccount.phoneNumbers.map((n) => (
            <li key={n.id} className="flex justify-between">
              <span>{n.e164}</span>
              <span className="text-neutral-500">{stageLabel(n.status)}</span>
            </li>
          ))}
          {subAccount.phoneNumbers.length === 0 && <p className="text-sm text-neutral-500">No numbers pulled yet.</p>}
        </ul>
      </section>

      <section className="rounded-xl border border-neutral-200 p-6">
        <h2 className="mb-3 text-lg font-medium text-neutral-900">Activity</h2>
        <ul className="space-y-2 text-sm text-neutral-600">
          {subAccount.statusEvents.map((e) => (
            <li key={e.id} className="flex justify-between gap-4">
              <span>{e.message}</span>
              <span className="shrink-0 text-neutral-400">{e.createdAt.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Dt({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-900">{value}</dd>
    </div>
  );
}
