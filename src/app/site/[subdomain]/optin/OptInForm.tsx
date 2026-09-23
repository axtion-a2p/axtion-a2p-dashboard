"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitOptIn, type OptInState } from "./actions";
import { OPT_IN_CATEGORY_FIELD_NAME, optInStatement, type OptInCategory } from "@/lib/optInCategories";

const initialState: OptInState = {};

export function OptInForm({
  subdomain,
  businessName,
  categories,
}: {
  subdomain: string;
  businessName: string;
  categories: OptInCategory[];
}) {
  const action = submitOptIn.bind(null, subdomain);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.ok) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
            clipRule="evenodd"
          />
        </svg>
        <span>You&apos;re signed up. Reply STOP at any time to opt out.</span>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="phone">
          Mobile phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="+1..."
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
      </div>

      <div className="space-y-3">
        {categories.map((category) => (
          <label key={category} className="flex items-start gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              name={OPT_IN_CATEGORY_FIELD_NAME(category)}
              required={categories.length === 1}
              className="mt-1 h-4 w-4 accent-slate-900"
            />
            <span>
              {optInStatement(category, businessName)} See our{" "}
              <Link href={`/privacy`} className="font-medium text-slate-900 underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href={`/terms`} className="font-medium text-slate-900 underline">
                Terms of Service
              </Link>
              .
            </span>
          </label>
        ))}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Sign up"}
      </button>
    </form>
  );
}
