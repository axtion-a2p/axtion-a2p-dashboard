import Link from "next/link";
import { requireSiteSubAccount } from "./data";
import { PhoneIllustration } from "./PhoneIllustration";

export default async function SiteHome({ params }: PageProps<"/site/[subdomain]">) {
  const { subdomain } = await params;
  const subAccount = await requireSiteSubAccount(subdomain);
  const name = subAccount.businessName;

  const steps = [
    { title: "Sign up", description: "Enter your name and mobile number on our secure opt-in form." },
    { title: "Get updates", description: `Receive account updates and service notifications from ${name} by text.` },
    { title: "Opt out anytime", description: "Reply STOP to stop receiving messages at any time, no questions asked." },
  ];

  const faqs = [
    {
      q: "How often will I get texts?",
      a: "Message frequency varies. We only send messages relevant to your account and the services you've opted in to.",
    },
    {
      q: "Will my information be shared?",
      a: `No. Your phone number and opt-in status are never shared with third parties for marketing purposes — see our Privacy Policy for details.`,
    },
    {
      q: "How do I stop receiving messages?",
      a: "Reply STOP to any message at any time. You'll get one confirmation message and then no further texts unless you opt back in.",
    },
    {
      q: "Will I be charged?",
      a: "Message and data rates may apply, depending on your mobile carrier and plan.",
    },
  ];

  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            SMS Updates
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Stay in the loop with {name}
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Get account updates and service notifications sent straight to your phone. Quick to join, easy to
            leave — you&apos;re always in control.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/optin`}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Sign up for text alerts
            </Link>
            <span className="text-sm text-slate-500">No spam. Opt out anytime.</span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-xs lg:max-w-sm">
          <PhoneIllustration />
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
        <h2 className="text-2xl font-semibold text-white">Ready to get started?</h2>
        <p className="mt-2 text-slate-300">Join {name}&apos;s SMS list in under a minute.</p>
        <Link
          href={`/optin`}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Sign up for text alerts
        </Link>
      </section>
    </div>
  );
}
