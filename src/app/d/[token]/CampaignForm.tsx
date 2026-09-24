"use client";

import { useActionState, useRef } from "react";
import { submitCampaign, type FormState } from "./actions";
import { marketingCampaignTemplate } from "@/lib/campaignTemplate";
import { CAMPAIGN_USE_CASES } from "@/lib/campaignUseCases";

const initialState: FormState = {};

const PROVIDER_LABELS: Record<string, string> = { TEXTGRID: "TextGrid", TWILIO: "Twilio" };

export function CampaignForm({
  token,
  businessName,
  subdomain,
  approvedProviders,
}: {
  token: string;
  businessName: string;
  subdomain: string | null;
  approvedProviders: string[];
}) {
  const action = submitCampaign.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  const useCaseRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const optInDetailsRef = useRef<HTMLTextAreaElement>(null);
  const sampleMessagesRef = useRef<HTMLTextAreaElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const privacyRef = useRef<HTMLInputElement>(null);
  const optinMessageRef = useRef<HTMLTextAreaElement>(null);
  const optoutMessageRef = useRef<HTMLTextAreaElement>(null);
  const helpMessageRef = useRef<HTMLTextAreaElement>(null);

  function applyStandardTemplate() {
    if (!subdomain) return;
    const t = marketingCampaignTemplate(businessName, subdomain);
    if (useCaseRef.current) useCaseRef.current.value = t.useCase;
    if (descriptionRef.current) descriptionRef.current.value = t.description;
    if (optInDetailsRef.current) optInDetailsRef.current.value = t.optInDetails;
    if (sampleMessagesRef.current) sampleMessagesRef.current.value = t.sampleMessages.join("\n");
    if (termsRef.current) termsRef.current.value = t.termsAndConditionsLink;
    if (privacyRef.current) privacyRef.current.value = t.privacyPolicyLink;
    if (optinMessageRef.current) optinMessageRef.current.value = t.optinMessage;
    if (optoutMessageRef.current) optoutMessageRef.current.value = t.optoutMessage;
    if (helpMessageRef.current) helpMessageRef.current.value = t.helpMessage;
  }

  return (
    <form action={formAction} className="space-y-4 border-t border-neutral-200 pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900">Submit a new campaign</h3>
        {subdomain && (
          <button
            type="button"
            onClick={applyStandardTemplate}
            className="text-xs font-medium text-primary underline"
          >
            Use standard Marketing template
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm text-neutral-900" htmlFor="provider">
          Submit via
        </label>
        <select id="provider" name="provider" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {approvedProviders.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_LABELS[p] ?? p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-neutral-900" htmlFor="useCase">
          Use case
        </label>
        <select
          id="useCase"
          name="useCase"
          required
          ref={useCaseRef}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          {CAMPAIGN_USE_CASES.map((u) => (
            <option key={u} value={u}>
              {u.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-neutral-900" htmlFor="description">
          Campaign description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          minLength={40}
          ref={descriptionRef}
          placeholder="What will you text customers about? (min. 40 characters)"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-900" htmlFor="optInDetails">
          How do customers opt in?
        </label>
        <textarea
          id="optInDetails"
          name="optInDetails"
          required
          rows={3}
          minLength={40}
          ref={optInDetailsRef}
          placeholder="e.g. Customers check a box at checkout agreeing to receive SMS updates. (min. 40 characters)"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-900" htmlFor="sampleMessages">
          Sample messages (one per line, up to 5)
        </label>
        <textarea
          id="sampleMessages"
          name="sampleMessages"
          required
          rows={4}
          ref={sampleMessagesRef}
          placeholder={"Hi {name}, your appointment is confirmed for {date}.\nReply STOP to opt out."}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-900" htmlFor="termsAndConditionsLink">
            Terms &amp; Conditions URL
          </label>
          <input
            id="termsAndConditionsLink"
            name="termsAndConditionsLink"
            type="url"
            required
            ref={termsRef}
            placeholder="https://example.com/terms"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-900" htmlFor="privacyPolicyLink">
            Privacy Policy URL
          </label>
          <input
            id="privacyPolicyLink"
            name="privacyPolicyLink"
            type="url"
            required
            ref={privacyRef}
            placeholder="https://example.com/privacy"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-neutral-900" htmlFor="optinMessage">
          Opt-in confirmation message
        </label>
        <textarea
          id="optinMessage"
          name="optinMessage"
          required
          rows={2}
          minLength={20}
          ref={optinMessageRef}
          placeholder="e.g. You are now subscribed to [Brand] alerts. Msg frequency may vary. Reply HELP for help, STOP to opt out. Msg&Data rates may apply."
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-900" htmlFor="optoutMessage">
          Opt-out confirmation message
        </label>
        <textarea
          id="optoutMessage"
          name="optoutMessage"
          required
          rows={2}
          minLength={20}
          ref={optoutMessageRef}
          placeholder="e.g. You have been unsubscribed from [Brand] alerts and will not receive further messages. Reply START to resubscribe."
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-900" htmlFor="helpMessage">
          Help message
        </label>
        <textarea
          id="helpMessage"
          name="helpMessage"
          required
          rows={2}
          minLength={20}
          ref={helpMessageRef}
          placeholder="e.g. [Brand] Support: Reply STOP to unsubscribe. Contact us at support@example.com for help. Msg&Data rates may apply."
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-6 text-sm text-neutral-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="hasEmbeddedLinks" /> Includes links
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="hasEmbeddedPhone" /> Includes phone numbers
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit campaign"}
      </button>
    </form>
  );
}
