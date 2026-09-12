"use client";

import { useActionState } from "react";
import { submitBrand, type FormState } from "./actions";

const initialState: FormState = {};

const BUSINESS_TYPES = ["Sole Proprietor", "Partnership", "Limited Liability Corporation", "Corporation", "Co-operative", "Non-profit Corporation"];
const VERTICALS = [
  "REAL_ESTATE",
  "HEALTHCARE",
  "RETAIL",
  "PROFESSIONAL",
  "HOSPITALITY",
  "TECHNOLOGY",
  "AGRICULTURE",
  "INSURANCE",
  "CONSTRUCTION",
  "EDUCATION",
  "NGO",
  "OTHER",
];
const JOB_POSITIONS = ["Director", "GM", "VP", "CEO", "CFO", "General Counsel", "Other"];

export function BrandForm({ token }: { token: string }) {
  const action = submitBrand.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-white">Business</legend>
        <Field label="Legal business name" name="legalBusinessName" required />
        <Field label="EIN" name="ein" required placeholder="12-3456789" />
        <Select label="Business type" name="businessType" options={BUSINESS_TYPES} />
        <Select label="Industry / vertical" name="vertical" options={VERTICALS} />
        <Field label="Website" name="website" type="url" placeholder="https://" />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-white">Business address</legend>
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
        <legend className="text-sm font-medium text-white">Business contact</legend>
        <Field label="Contact email" name="contactEmail" type="email" required />
        <Field label="Contact phone" name="contactPhone" type="tel" required placeholder="+1..." />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-white">Authorized representative</legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" name="repFirstName" required />
          <Field label="Last name" name="repLastName" required />
        </div>
        <Field label="Email" name="repEmail" type="email" required />
        <Field label="Phone" name="repPhone" type="tel" required placeholder="+1..." />
        <Field label="Business title" name="repBusinessTitle" required placeholder="Owner" />
        <Select label="Job position" name="repJobPosition" options={JOB_POSITIONS} />
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit brand for review"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-white" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <div>
      <label className="block text-sm text-white" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
