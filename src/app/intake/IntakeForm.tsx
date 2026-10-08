"use client";

import { useActionState } from "react";
import { submitIntake, type IntakeState } from "./actions";
import { BrandKicker } from "@/components/Brand";
import { CAMPAIGN_USE_CASES } from "@/lib/campaignUseCases";

const initialState: IntakeState = {};

const BUSINESS_TYPES = ["Sole Proprietor", "Partnership", "Limited Liability Corporation", "Corporation", "Co-operative", "Non-profit Corporation"];
const VERTICALS = [
  "REAL_ESTATE", "HEALTHCARE", "RETAIL", "PROFESSIONAL", "HOSPITALITY",
  "TECHNOLOGY", "AGRICULTURE", "INSURANCE", "CONSTRUCTION", "EDUCATION", "NGO", "OTHER",
];
const JOB_POSITIONS = ["Director", "GM", "VP", "CEO", "CFO", "General Counsel", "Other"];

export function IntakeForm() {
  const [state, formAction, pending] = useActionState(submitIntake, initialState);

  if (state.dashboardUrl) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <BrandKicker />
        <h1 className="text-xl font-semibold text-neutral-900">You&apos;re all set</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Your business info has been submitted for A2P 10DLC brand review. Bookmark this link — it&apos;s your
          dashboard to track status and, once your brand is approved, submit your campaign.
        </p>
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <code className="break-all text-sm text-neutral-900">{state.dashboardUrl}</code>
        </div>
        <a href={state.dashboardUrl} className="mt-6 inline-block text-sm font-medium text-primary underline">
          Go to my dashboard
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <BrandKicker />
      <h1 className="text-xl font-semibold text-neutral-900">A2P 10DLC registration</h1>
      <p className="mt-2 text-sm text-neutral-600">
        One form, submitted once — this creates your dashboard and submits your business for brand review
        immediately. Your Terms &amp; Privacy pages and standard opt-out/help replies are generated for you
        automatically, so there&apos;s nothing to write for those.
      </p>

      <form action={formAction} className="mt-8 space-y-6">
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-neutral-900">Provider</legend>
          <div>
            <label className="block text-sm text-neutral-900" htmlFor="provider">
              Submit via
            </label>
            <select id="provider" name="provider" required defaultValue="TWILIO" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
              <option value="TWILIO">Twilio</option>
              <option value="TEXTGRID">TextGrid</option>
            </select>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-neutral-900">Business</legend>
          <Field label="Business name" name="businessName" required />
          <Field label="EIN" name="ein" required placeholder="12-3456789" />
          <Select label="Business type" name="businessType" options={BUSINESS_TYPES} />
          <Select label="Industry / vertical" name="vertical" options={VERTICALS} />
          <Field label="Website" name="website" type="url" placeholder="https://" />
          <Field label="Area codes requested (optional)" name="areaCodesRequested" placeholder="e.g. 205" />
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-neutral-900">Business address</legend>
          <Field label="Street" name="street" required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="City" name="city" required />
            <Field label="State" name="state" required placeholder="CA" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Postal code" name="postalCode" required />
            <Field label="Country" name="country" required defaultValue="US" />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-neutral-900">Business contact</legend>
          <Field label="Your name" name="contactName" required />
          <Field label="Contact email" name="contactEmail" type="email" required />
          <Field label="Contact phone" name="contactPhone" type="tel" required placeholder="+1..." />
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-neutral-900">Authorized representative</legend>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" name="repFirstName" required />
            <Field label="Last name" name="repLastName" required />
          </div>
          <Field label="Email" name="repEmail" type="email" required />
          <Field label="Phone" name="repPhone" type="tel" required placeholder="+1..." />
          <Field label="Business title" name="repBusinessTitle" required placeholder="Owner" />
          <Select label="Job position" name="repJobPosition" options={JOB_POSITIONS} />
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-neutral-900">Campaign (held until your brand is approved)</legend>
          <Select label="Use case" name="useCase" options={CAMPAIGN_USE_CASES} />
          <Textarea label="Campaign description" name="description" required minLength={40} placeholder="What will you text customers about? (min. 40 characters)" />
          <Textarea label="How do customers opt in?" name="optInDetails" required minLength={40} placeholder="e.g. Customers check a box at checkout agreeing to receive SMS updates. (min. 40 characters)" />
          <Textarea
            label="Sample messages (one per line, up to 5)"
            name="sampleMessages"
            required
            placeholder={"Hi {name}, your appointment is confirmed for {date}.\nReply STOP to opt out."}
          />
          <div className="flex gap-6 text-sm text-neutral-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="hasEmbeddedLinks" /> Includes links
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="hasEmbeddedPhone" /> Includes phone numbers
            </label>
          </div>
        </fieldset>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit for brand review"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label, name, type = "text", required, placeholder, defaultValue,
}: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return (
    <div>
      <label className="block text-sm text-neutral-900" htmlFor={name}>{label}</label>
      <input
        id={name} name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function Textarea({
  label, name, required, minLength, placeholder,
}: { label: string; name: string; required?: boolean; minLength?: number; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm text-neutral-900" htmlFor={name}>{label}</label>
      <textarea
        id={name} name={name} required={required} minLength={minLength} rows={3} placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <div>
      <label className="block text-sm text-neutral-900" htmlFor={name}>{label}</label>
      <select id={name} name={name} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
        {options.map((o) => (
          <option key={o} value={o}>{o.replaceAll("_", " ")}</option>
        ))}
      </select>
    </div>
  );
}
