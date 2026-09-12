import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BrandForm } from "./BrandForm";
import { CampaignForm } from "./CampaignForm";
import { Badge } from "@/components/Badge";
import { BrandKicker } from "@/components/Brand";
import { stageColor, healthColor, stageLabel } from "@/lib/status";

export default async function SubAccountDashboard({ params }: PageProps<"/d/[token]">) {
  const { token } = await params;

  const subAccount = await db.subAccount.findUnique({
    where: { token },
    include: {
      brand: true,
      campaigns: { include: { phoneNumbers: true }, orderBy: { createdAt: "desc" } },
      phoneNumbers: true,
      statusEvents: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });

  if (!subAccount) notFound();

  const brand = subAccount.brand;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <BrandKicker />
        <p className="text-sm text-neutral-500">{subAccount.provider === "TWILIO" ? "Twilio" : "TextGrid"} · A2P 10DLC</p>
        <h1 className="text-2xl font-semibold text-neutral-900">{subAccount.businessName}</h1>
      </header>

      <section className="mb-10 rounded-xl border border-neutral-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-900">Brand registration</h2>
          {brand && <Badge text={stageLabel(brand.stage)} className={stageColor[brand.stage]} />}
        </div>

        {!brand || brand.stage === "NOT_SUBMITTED" ? (
          <BrandForm token={token} />
        ) : (
          <div className="space-y-2 text-sm text-neutral-700">
            <Row label="Legal business name" value={brand.legalBusinessName} />
            <Row label="EIN" value={brand.ein ?? "—"} />
            <Row label="Vertical" value={brand.vertical ?? "—"} />
            <Row label="Submitted" value={brand.submittedAt?.toLocaleString() ?? "—"} />
            {brand.failureReason && (
              <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{brand.failureReason}</p>
            )}
            {brand.stage === "FAILED" && <BrandForm token={token} />}
          </div>
        )}
      </section>

      <section className="mb-10 rounded-xl border border-neutral-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-900">Campaigns</h2>
        </div>

        {subAccount.campaigns.length === 0 && (
          <p className="mb-4 text-sm text-neutral-500">No campaigns submitted yet.</p>
        )}

        <ul className="mb-6 space-y-3">
          {subAccount.campaigns.map((c) => (
            <li key={c.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-neutral-900">{c.useCase}</p>
                <div className="flex gap-2">
                  <Badge text={stageLabel(c.stage)} className={stageColor[c.stage]} />
                  <Badge text={stageLabel(c.health)} className={healthColor[c.health]} />
                </div>
              </div>
              <p className="mt-1 text-sm text-neutral-600">{c.description}</p>
              <p className="mt-2 text-xs text-neutral-500">
                {c.phoneNumbers.length} phone number{c.phoneNumbers.length === 1 ? "" : "s"} assigned
              </p>
              {c.phoneNumbers.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {c.phoneNumbers.map((n) => (
                    <li key={n.id} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                      {n.e164}
                    </li>
                  ))}
                </ul>
              )}
              {c.failureReason && (
                <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">{c.failureReason}</p>
              )}
            </li>
          ))}
        </ul>

        {brand?.stage === "APPROVED" ? (
          <CampaignForm token={token} />
        ) : (
          <p className="text-sm text-neutral-500">Your brand must be approved before you can submit a campaign.</p>
        )}
      </section>

      {subAccount.phoneNumbers.length > 0 && (
        <section className="mb-10 rounded-xl border border-neutral-200 p-6">
          <h2 className="mb-4 text-lg font-medium text-neutral-900">Phone numbers</h2>
          <ul className="space-y-2 text-sm">
            {subAccount.phoneNumbers.map((n) => (
              <li key={n.id} className="flex items-center justify-between">
                <span className="text-neutral-900">{n.e164}</span>
                <span className="text-neutral-500">{stageLabel(n.status)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 p-6">
        <h2 className="mb-4 text-lg font-medium text-neutral-900">Activity</h2>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-900">{value}</span>
    </div>
  );
}
