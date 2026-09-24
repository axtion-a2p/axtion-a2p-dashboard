import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { BrandKicker } from "@/components/Brand";
import { stageColor, healthColor, stageLabel } from "@/lib/status";
import { subdomainUrl } from "@/lib/subdomain";
import { CAMPAIGN_USE_CASES } from "@/lib/campaignUseCases";
import { getProvider } from "@/lib/providers";
import type { AvailableNumber } from "@/lib/providers/types";
import {
  syncSubAccount,
  syncPhoneNumbers,
  assignNumberToCampaign,
  assignSubdomain,
  updateCampaignDetails,
  purchaseAndAssignNumber,
} from "../actions";

const PROVIDER_LABELS: Record<string, string> = { TEXTGRID: "TextGrid", TWILIO: "Twilio" };
const PROVIDERS: { value: "TEXTGRID" | "TWILIO"; label: string }[] = [
  { value: "TEXTGRID", label: "TextGrid" },
  { value: "TWILIO", label: "Twilio" },
];

export default async function AdminSubAccountPage({ params, searchParams }: PageProps<"/admin/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const areaCode = typeof sp.areaCode === "string" ? sp.areaCode.trim() : undefined;
  const searchProvider = (typeof sp.provider === "string" ? sp.provider : "TEXTGRID") as "TEXTGRID" | "TWILIO";

  const subAccount = await db.subAccount.findUnique({
    where: { id },
    include: {
      brands: true,
      campaigns: { include: { phoneNumbers: true }, orderBy: { createdAt: "desc" } },
      phoneNumbers: true,
      statusEvents: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!subAccount) notFound();

  const unassignedNumbers = subAccount.phoneNumbers.filter((n) => n.status === "UNASSIGNED");
  const approvedCampaignsForSearch = subAccount.campaigns.filter((c) => c.stage === "APPROVED" && c.provider === searchProvider);

  let availableNumbers: AvailableNumber[] = [];
  let searchError: string | undefined;
  if (areaCode) {
    try {
      const provider = getProvider(searchProvider, subAccount.providerAccountSid, subAccount.providerAuthToken);
      availableNumbers = await provider.searchAvailableNumbers(areaCode);
    } catch (err) {
      searchError = err instanceof Error ? err.message : "Search failed";
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin" className="text-sm text-neutral-500 underline">
        ← All sub-accounts
      </Link>

      <div className="mt-4 mb-8 flex items-center justify-between">
        <div>
          <BrandKicker />
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
        <h2 className="mb-3 text-lg font-medium text-neutral-900">Brand</h2>
        {subAccount.brands.length === 0 ? (
          <p className="text-sm text-neutral-500">Not submitted yet.</p>
        ) : (
          <ul className="space-y-3">
            {subAccount.brands.map((brand) => (
              <li key={brand.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-900">{PROVIDER_LABELS[brand.provider]}</p>
                  <Badge text={stageLabel(brand.stage)} className={stageColor[brand.stage]} />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <Dt label="Legal name" value={brand.legalBusinessName} />
                  <Dt label="EIN" value={brand.ein ?? "—"} />
                  <Dt label="Provider brand ID" value={brand.providerBrandId ?? "—"} />
                  <Dt label="Submitted" value={brand.submittedAt?.toLocaleString() ?? "—"} />
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-neutral-200 p-6">
        <h2 className="mb-3 text-lg font-medium text-neutral-900">Campaigns</h2>
        {subAccount.campaigns.length === 0 && <p className="text-sm text-neutral-500">No campaigns yet.</p>}
        <ul className="space-y-3">
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
              <p className="mt-1 text-xs text-neutral-500">Messaging service: {c.messagingServiceSid ?? "—"}</p>
              <p className="mt-1 text-xs text-neutral-500">
                Numbers: {c.phoneNumbers.map((n) => n.e164).join(", ") || "none"}
              </p>

              {(() => {
                const eligibleNumbers = unassignedNumbers.filter((n) => n.provider === c.provider);
                return (
                  eligibleNumbers.length > 0 &&
                  c.stage === "APPROVED" && (
                    <form action={assignNumberToCampaign.bind(null, subAccount.id)} className="mt-3 flex items-center gap-2">
                      <input type="hidden" name="campaignId" value={c.id} />
                      <select name="phoneNumberId" required className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
                        <option value="">Assign a number…</option>
                        {eligibleNumbers.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.e164}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover">Assign</button>
                    </form>
                  )
                );
              })()}

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-primary underline">Edit campaign</summary>
                <form action={updateCampaignDetails.bind(null, c.id)} className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs text-neutral-900" htmlFor={`useCase-${c.id}`}>
                      Use case
                    </label>
                    <select
                      id={`useCase-${c.id}`}
                      name="useCase"
                      defaultValue={c.useCase}
                      required
                      className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                    >
                      {CAMPAIGN_USE_CASES.map((u) => (
                        <option key={u} value={u}>
                          {u.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-900" htmlFor={`description-${c.id}`}>
                      Campaign description
                    </label>
                    <textarea
                      id={`description-${c.id}`}
                      name="description"
                      defaultValue={c.description}
                      required
                      rows={2}
                      minLength={40}
                      className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-900" htmlFor={`optInDetails-${c.id}`}>
                      How do customers opt in?
                    </label>
                    <textarea
                      id={`optInDetails-${c.id}`}
                      name="optInDetails"
                      defaultValue={c.optInDetails ?? ""}
                      required
                      rows={2}
                      minLength={40}
                      className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-900" htmlFor={`sampleMessages-${c.id}`}>
                      Sample messages (one per line, up to 5)
                    </label>
                    <textarea
                      id={`sampleMessages-${c.id}`}
                      name="sampleMessages"
                      defaultValue={(c.sampleMessages as string[]).join("\n")}
                      required
                      rows={4}
                      className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-900" htmlFor={`terms-${c.id}`}>
                        Terms &amp; Conditions URL
                      </label>
                      <input
                        id={`terms-${c.id}`}
                        name="termsAndConditionsLink"
                        type="url"
                        defaultValue={c.termsAndConditionsLink ?? ""}
                        required
                        className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-900" htmlFor={`privacy-${c.id}`}>
                        Privacy Policy URL
                      </label>
                      <input
                        id={`privacy-${c.id}`}
                        name="privacyPolicyLink"
                        type="url"
                        defaultValue={c.privacyPolicyLink ?? ""}
                        required
                        className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-900" htmlFor={`optinMessage-${c.id}`}>
                      Opt-in confirmation message
                    </label>
                    <textarea
                      id={`optinMessage-${c.id}`}
                      name="optinMessage"
                      defaultValue={c.optinMessage ?? ""}
                      required
                      rows={2}
                      minLength={20}
                      className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-900" htmlFor={`optoutMessage-${c.id}`}>
                      Opt-out confirmation message
                    </label>
                    <textarea
                      id={`optoutMessage-${c.id}`}
                      name="optoutMessage"
                      defaultValue={c.optoutMessage ?? ""}
                      required
                      rows={2}
                      minLength={20}
                      className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-900" htmlFor={`helpMessage-${c.id}`}>
                      Help message
                    </label>
                    <textarea
                      id={`helpMessage-${c.id}`}
                      name="helpMessage"
                      defaultValue={c.helpMessage ?? ""}
                      required
                      rows={2}
                      minLength={20}
                      className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-neutral-700">
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" name="hasEmbeddedLinks" defaultChecked={c.hasEmbeddedLinks} /> Includes links
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" name="hasEmbeddedPhone" defaultChecked={c.hasEmbeddedPhone} /> Includes phone numbers
                    </label>
                  </div>
                  <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover">
                    Save changes
                  </button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-xl border border-neutral-200 p-6">
        <h2 className="mb-3 text-lg font-medium text-neutral-900">Phone numbers</h2>
        <ul className="space-y-1 text-sm">
          {subAccount.phoneNumbers.map((n) => (
            <li key={n.id} className="flex justify-between">
              <span>
                {n.e164} <span className="text-neutral-400">· {PROVIDER_LABELS[n.provider]}</span>
              </span>
              <span className="text-neutral-500">{stageLabel(n.status)}</span>
            </li>
          ))}
          {subAccount.phoneNumbers.length === 0 && <p className="text-sm text-neutral-500">No numbers pulled yet.</p>}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {PROVIDERS.map((p) => (
            <form key={p.value} action={syncPhoneNumbers.bind(null, subAccount.id)}>
              <input type="hidden" name="provider" value={p.value} />
              <button className="text-xs font-medium text-primary underline">Pull from {p.label}</button>
            </form>
          ))}
        </div>

        <form className="mt-4 flex items-center gap-2">
          <select name="provider" defaultValue={searchProvider} className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="areaCode"
            defaultValue={areaCode ?? ""}
            placeholder="Area code"
            className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-xs"
          />
          <button className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-900">
            Search numbers to buy
          </button>
        </form>

        {areaCode && (
          <div className="mt-3">
            {searchError ? (
              <p className="text-xs text-red-600">Search failed: {searchError}</p>
            ) : availableNumbers.length === 0 ? (
              <p className="text-xs text-neutral-500">
                No numbers available in area code {areaCode} on {PROVIDER_LABELS[searchProvider]}.
              </p>
            ) : (
              <ul className="space-y-2">
                {availableNumbers.map((n) => (
                  <li key={n.e164} className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 p-2 text-xs">
                    <span className="font-medium text-neutral-900">{n.e164}</span>
                    <form action={purchaseAndAssignNumber.bind(null, subAccount.id)} className="flex items-center gap-2">
                      <input type="hidden" name="provider" value={searchProvider} />
                      <input type="hidden" name="e164" value={n.e164} />
                      <select name="campaignId" className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
                        <option value="">Don&apos;t assign yet</option>
                        {approvedCampaignsForSearch.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.useCase}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover">
                        Buy &amp; assign
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
