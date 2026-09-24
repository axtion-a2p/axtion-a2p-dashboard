import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BrandForm } from "./BrandForm";
import { CampaignForm } from "./CampaignForm";
import { Badge } from "@/components/Badge";
import { BrandKicker } from "@/components/Brand";
import { stageColor, healthColor, stageLabel } from "@/lib/status";
import { subdomainUrl } from "@/lib/subdomain";

const PROVIDER_LABELS: Record<string, string> = { TEXTGRID: "TextGrid", TWILIO: "Twilio" };

export default async function SubAccountDashboard({ params }: PageProps<"/d/[token]">) {
  const { token } = await params;

  const subAccount = await db.subAccount.findUnique({
    where: { token },
    include: {
      brands: true,
      campaigns: { include: { phoneNumbers: true }, orderBy: { createdAt: "desc" } },
      phoneNumbers: true,
      statusEvents: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });

  if (!subAccount) notFound();

  const approvedProviders = subAccount.brands.filter((b) => b.stage === "APPROVED").map((b) => b.provider);
  const submittedProviders = new Set(subAccount.brands.map((b) => b.provider));
  const nextProvider = (["TEXTGRID", "TWILIO"] as const).find((p) => !submittedProviders.has(p));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <BrandKicker />
        <p className="text-sm text-neutral-500">A2P 10DLC</p>
        <h1 className="text-2xl font-semibold text-neutral-900">{subAccount.businessName}</h1>
        {subAccount.subdomain && (
          <p className="mt-1 text-sm text-neutral-500">
            Compliance site:{" "}
            <a href={subdomainUrl(subAccount.subdomain)} target="_blank" rel="noreferrer" className="text-primary underline">
              {subdomainUrl(subAccount.subdomain)}
            </a>
          </p>
        )}
      </header>

      <section className="mb-10 rounded-xl border border-neutral-200 p-6">
        <h2 className="mb-4 text-lg font-medium text-neutral-900">Brand registration</h2>

        {subAccount.brands.length > 0 && (
          <ul className="mb-6 space-y-3">
            {subAccount.brands.map((brand) => (
              <li key={brand.id} className="rounded-lg border border-neutral-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-900">{PROVIDER_LABELS[brand.provider]}</p>
                  <Badge text={stageLabel(brand.stage)} className={stageColor[brand.stage]} />
                </div>
                <div className="space-y-2 text-sm text-neutral-700">
                  <Row label="Legal business name" value={brand.legalBusinessName} />
                  <Row label="EIN" value={brand.ein ?? "—"} />
                  <Row label="Vertical" value={brand.vertical ?? "—"} />
                  <Row label="Submitted" value={brand.submittedAt?.toLocaleString() ?? "—"} />
                </div>
                {brand.failureReason && (
                  <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{brand.failureReason}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mb-2 text-sm text-neutral-500">
          {subAccount.brands.length > 0
            ? "Submit to another provider, or resubmit one that failed:"
            : "Choose which provider to register this brand with:"}
        </p>
        <BrandForm token={token} defaultProvider={nextProvider} />
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
                <p className="font-medium text-neutral-900">
                  {c.useCase} <span className="font-normal text-neutral-400">· {PROVIDER_LABELS[c.provider]}</span>
                </p>
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

        {approvedProviders.length > 0 ? (
          <CampaignForm
            token={token}
            businessName={subAccount.businessName}
            subdomain={subAccount.subdomain}
            approvedProviders={approvedProviders}
          />
        ) : (
          <p className="text-sm text-neutral-500">A brand must be approved before you can submit a campaign through it.</p>
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
