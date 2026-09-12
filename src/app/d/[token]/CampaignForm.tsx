"use client";

import { useActionState } from "react";
import { submitCampaign, type FormState } from "./actions";

const initialState: FormState = {};

const USE_CASES = ["MIXED", "MARKETING", "CUSTOMER_CARE", "ACCOUNT_NOTIFICATION", "APPOINTMENT_REMINDER", "DELIVERY_NOTIFICATION", "TWO_FACTOR_AUTHENTICATION"];

export function CampaignForm({ token }: { token: string }) {
  const action = submitCampaign.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4 border-t border-neutral-200 pt-6">
      <h3 className="text-sm font-medium text-white">Submit a new campaign</h3>

      <div>
        <label className="block text-sm text-white" htmlFor="useCase">
          Use case
        </label>
        <select id="useCase" name="useCase" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {USE_CASES.map((u) => (
            <option key={u} value={u}>
              {u.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-white" htmlFor="description">
          Campaign description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          minLength={40}
          placeholder="What will you text customers about? (min. 40 characters)"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-white" htmlFor="optInDetails">
          How do customers opt in?
        </label>
        <textarea
          id="optInDetails"
          name="optInDetails"
          required
          rows={3}
          minLength={40}
          placeholder="e.g. Customers check a box at checkout agreeing to receive SMS updates. (min. 40 characters)"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-white" htmlFor="sampleMessages">
          Sample messages (one per line, up to 5)
        </label>
        <textarea
          id="sampleMessages"
          name="sampleMessages"
          required
          rows={4}
          placeholder={"Hi {name}, your appointment is confirmed for {date}.\nReply STOP to opt out."}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-6 text-sm text-white">
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
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit campaign"}
      </button>
    </form>
  );
}
