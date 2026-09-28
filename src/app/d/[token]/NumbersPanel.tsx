import { getProvider } from "@/lib/providers";
import type { AvailableNumber } from "@/lib/providers/types";
import { stageLabel } from "@/lib/status";
import { purchaseAndAssignNumber } from "./actions";

const PROVIDER_LABELS: Record<string, string> = { TEXTGRID: "TextGrid", TWILIO: "Twilio" };
const PROVIDERS: { value: "TEXTGRID" | "TWILIO"; label: string }[] = [
  { value: "TEXTGRID", label: "TextGrid" },
  { value: "TWILIO", label: "Twilio" },
];

type PhoneNumber = { id: string; e164: string; status: string; provider: string; campaignId: string | null };
type Campaign = { id: string; useCase: string; stage: string; provider: string };

export async function NumbersPanel({
  token,
  phoneNumbers,
  campaigns,
  providerAccountSid,
  providerAuthToken,
  areaCode,
  searchProvider,
}: {
  token: string;
  phoneNumbers: PhoneNumber[];
  campaigns: Campaign[];
  providerAccountSid: string | null;
  providerAuthToken: string | null;
  areaCode?: string;
  searchProvider: "TEXTGRID" | "TWILIO";
}) {
  const approvedCampaignsForSearch = campaigns.filter((c) => c.stage === "APPROVED" && c.provider === searchProvider);

  let availableNumbers: AvailableNumber[] = [];
  let searchError: string | undefined;
  if (areaCode) {
    try {
      const provider = getProvider(searchProvider, providerAccountSid, providerAuthToken);
      availableNumbers = await provider.searchAvailableNumbers(areaCode);
    } catch (err) {
      searchError = err instanceof Error ? err.message : "Search failed";
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 p-6">
      <h2 className="mb-4 text-lg font-medium text-neutral-900">Phone numbers</h2>

      <ul className="mb-6 space-y-1 text-sm">
        {phoneNumbers.map((n) => (
          <li key={n.id} className="flex items-center justify-between">
            <span className="text-neutral-900">
              {n.e164} <span className="text-neutral-400">· {PROVIDER_LABELS[n.provider]}</span>
            </span>
            <span className="text-neutral-500">{stageLabel(n.status)}</span>
          </li>
        ))}
        {phoneNumbers.length === 0 && <p className="text-neutral-500">No numbers yet.</p>}
      </ul>

      <h3 className="mb-2 text-sm font-medium text-neutral-900">Buy a number</h3>
      <form className="flex items-center gap-2">
        <input type="hidden" name="tab" value="numbers" />
        <select name="provider" defaultValue={searchProvider} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
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
          className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-900">Search</button>
      </form>

      {areaCode && (
        <div className="mt-4">
          {searchError ? (
            <p className="text-sm text-red-600">Search failed: {searchError}</p>
          ) : availableNumbers.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No numbers available in area code {areaCode} on {PROVIDER_LABELS[searchProvider]}.
            </p>
          ) : approvedCampaignsForSearch.length === 0 ? (
            <p className="text-sm text-neutral-500">
              You need an approved {PROVIDER_LABELS[searchProvider]} campaign before you can attach a number to it.
            </p>
          ) : (
            <ul className="space-y-2">
              {availableNumbers.map((n) => (
                <li key={n.e164} className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 p-3 text-sm">
                  <span className="font-medium text-neutral-900">{n.e164}</span>
                  <form action={purchaseAndAssignNumber.bind(null, token)} className="flex items-center gap-2">
                    <input type="hidden" name="provider" value={searchProvider} />
                    <input type="hidden" name="e164" value={n.e164} />
                    <select name="campaignId" required className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
                      {approvedCampaignsForSearch.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.useCase}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover">
                      Buy &amp; attach
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
