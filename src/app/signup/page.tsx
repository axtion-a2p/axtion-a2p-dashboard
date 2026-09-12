"use client";

import { useActionState } from "react";
import { createSubAccount, type SignupState } from "./actions";

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(createSubAccount, initialState);

  if (state.dashboardUrl) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-xl font-semibold text-neutral-900">Sub-account created</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Paste this URL into a custom menu link inside this sub-account&apos;s GoHighLevel location. It has no
          login — the link itself is the access credential, so only share it with that client.
        </p>
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <code className="break-all text-sm text-neutral-900">{state.dashboardUrl}</code>
        </div>
        <a href="/signup" className="mt-6 inline-block text-sm font-medium text-neutral-900 underline">
          Create another
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-xl font-semibold text-neutral-900">New A2P 10DLC sub-account</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Create a dashboard for a client&apos;s app.axtion.ai sub-account so they can submit their 10DLC business
        info and track approval status.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <Field label="Business name" name="businessName" required />
        <Field label="Your contact name" name="contactName" required />
        <Field label="Your contact email" name="contactEmail" type="email" required />

        <div>
          <label className="block text-sm font-medium text-white">Phone provider</label>
          <select
            name="provider"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            defaultValue="TWILIO"
          >
            <option value="TWILIO">Twilio</option>
            <option value="TEXTGRID">TextGrid</option>
          </select>
        </div>

        <Field label="GHL location ID (optional)" name="ghlLocationId" />
        <Field label="GHL location name (optional)" name="ghlLocationName" />

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create dashboard link"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
