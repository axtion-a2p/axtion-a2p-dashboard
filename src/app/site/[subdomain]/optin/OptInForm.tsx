"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitOptIn, type OptInState } from "./actions";

const initialState: OptInState = {};

export function OptInForm({ subdomain, businessName }: { subdomain: string; businessName: string }) {
  const action = submitOptIn.bind(null, subdomain);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        You&apos;re signed up. Reply STOP at any time to opt out.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm text-neutral-900" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-neutral-900" htmlFor="phone">
          Mobile phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="+1..."
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>
          By checking this box and submitting this form, I agree to receive SMS text messages from{" "}
          {businessName}. Message frequency may vary. Message and data rates may apply. Reply STOP to opt out
          at any time, or HELP for help. See our{" "}
          <Link href={`/privacy`} className="underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href={`/terms`} className="underline">
            Terms of Service
          </Link>
          .
        </span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Sign up"}
      </button>
    </form>
  );
}
