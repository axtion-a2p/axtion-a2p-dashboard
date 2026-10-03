import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BrandForm } from "./BrandForm";
import { CampaignForm } from "./CampaignForm";
import { NumbersPanel } from "./NumbersPanel";
import { Badge } from "@/components/Badge";
import { BrandKicker } from "@/components/Brand";
import { stageColor, healthColor, stageLabel } from "@/lib/status";
import { subdomainUrl } from "@/lib/subdomain";
import { carrierStatusLabel, carrierStatusColor } from "@/lib/campaignHealth";

const PROVIDER_LABELS: Record<string, string> = { TEXTGRID: "TextGrid", TWILIO: "Twilio" };
const TABS = [
  { key: "overview", label: "Overview" },
  { key: "campaigns", label: "Campaigns" },
  { key: "numbers", label: "Numbers" },
] as const;

export default async function SubAccountDashboard({ params, searchParams }: PageProps<"/d/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" ? sp.tab : "overview") as (typeof TABS)[number]["key"];
  const areaCode = typeof sp.areaCode === "string" ? sp.areaCode.trim() : undefined;
  const searchProvider = (typeof sp.provider === "string" ? sp.provider : "TEXTGRID") as "TEXTGRID" | "TWILIO";

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
      <header className="mb-6">
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

      <section className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex flex-wrap gap-2">
          {subAccount.brands.length === 0 && <span className="text-sm text-neutral-500">No brand submitted yet.</span>}
          {subAccount.brands.map((b) => (
            <Badge key={b.id} text={`${PROVIDER_LABELS[b.provider]} brand: ${stageLabel(b.stage)}`} className={stageColor[b.stage]} />
          ))}
          {subAccount.campaigns.map((c) => {
            const carrierStatus = carrierStatusLabel(c);
            return (
              <span key={c.id} className="flex items-center gap-1">
                <Badge
                  text={`${c.useCase} (${PROVIDER_LABELS[c.provider]}): ${stageLabel(c.stage)} · ${stageLabel(c.health)}`}
                  className={stageColor[c.stage]}
                />
                {carrierStatus && (
                  <Badge
                    text={`Carrier: ${stageLabel(carrierStatus)}`}
                    className={carrierStatusColor[carrierStatus] ?? "bg-neutral-100 text-neutral-600"}
                  />
                )}
              </span>
            );
          })}
        </div>
      </section>

      <nav className="mb-8 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "overview" ? `/d/${token}` : `/d/${token}?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-b-2 border-primary text-primary"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <>
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
                    {brand.stage === "FAILED" && brand.rawPayload != null && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-red-700 underline">
                          Raw provider response (no structured failure reason was captured)
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-neutral-900 p-3 text-xs text-neutral-100">
                          {JSON.stringify(brand.rawPayload, null, 2)}
                        </pre>
                      </details>
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
        </>
      )}

      {tab === "campaigns" && (
        <section className="rounded-xl border border-neutral-200 p-6">
          <h2 className="mb-4 text-lg font-medium text-neutral-900">Campaigns</h2>

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
                    {carrierStatusLabel(c) && (
                      <Badge
                        text={`Carrier: ${stageLabel(carrierStatusLabel(c)!)}`}
                        className={carrierStatusColor[carrierStatusLabel(c)!] ?? "bg-neutral-100 text-neutral-600"}
                      />
                    )}
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
      )}

      {tab === "numbers" && (
        <NumbersPanel
          token={token}
          phoneNumbers={subAccount.phoneNumbers}
          campaigns={subAccount.campaigns}
          providerAccountSid={subAccount.providerAccountSid}
          providerAuthToken={subAccount.providerAuthToken}
          areaCode={areaCode}
          searchProvider={searchProvider}
        />
      )}
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
