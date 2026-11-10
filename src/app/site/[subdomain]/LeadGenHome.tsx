import Link from "next/link";
import type { LeadGenProfile } from "@/lib/siteProfiles";

export function LeadGenHome({ name, profile }: { name: string; profile: LeadGenProfile }) {
  const steps = [
    { title: "Tell us about you", description: "Share your name and contact details through our short secure form." },
    { title: "We review your request", description: `A ${name} representative looks at your request and reaches out to you.` },
    { title: "Receive your options", description: `We follow up with ${profile.offering} based on what you tell us.` },
  ];

  const faqs = [
    {
      q: `Is ${name} a direct lender?`,
      a: `Yes. ${name} is a direct lender — we provide funding ourselves rather than passing your information along to a marketplace of other lenders.`,
    },
    {
      q: "Does submitting the form commit me to anything?",
      a: "No. Submitting the form is a request to hear about your options. Funding is subject to review and approval, and you decide whether to move forward.",
    },
    {
      q: "Will I receive text messages?",
      a: "Only if you choose to. Text messaging is a separate, optional checkbox on the form. You can submit the form without agreeing to receive texts, and consent is not a condition of any purchase or of receiving funding.",
    },
    {
      q: "How do I stop receiving texts?",
      a: "Reply STOP to any message at any time. Reply HELP for help. Message frequency varies, and message and data rates may apply.",
    },
    {
      q: "Will my information be shared?",
      a: "No mobile opt-in data or consent is shared with third parties for marketing purposes. See our Privacy Policy for details.",
    },
  ];

  return (
    <div className="space-y-20">
      <section className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {profile.badge}
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          {profile.headline(name)}
        </h1>
        <p className="mt-4 text-lg text-slate-600">{profile.subtext(name)}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={`/optin`}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            {profile.cta}
          </Link>
          <span className="text-sm text-slate-500">Takes about a minute. Funding subject to review and approval.</span>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-600">How it works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-600">Frequently asked questions</h2>
        <dl className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {faqs.map((faq) => (
            <div key={faq.q} className="p-6">
              <dt className="text-sm font-semibold text-slate-900">{faq.q}</dt>
              <dd className="mt-2 text-sm text-slate-600">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl bg-slate-900 px-8 py-10 text-center sm:px-12">
        <h2 className="text-2xl font-semibold text-white">Ready to see your options?</h2>
        <p className="mt-2 text-slate-300">Tell {name} about your business in under a minute.</p>
        <Link
          href={`/optin`}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
        >
          {profile.cta}
        </Link>
      </section>
    </div>
  );
}
