import Link from "next/link";
import { requireSiteSubAccount } from "./data";

export default async function SiteHome({ params }: PageProps<"/site/[subdomain]">) {
  const { subdomain } = await params;
  const subAccount = await requireSiteSubAccount(subdomain);

  const perks = [
    "Account updates and service notifications by text",
    "No spam — only messages you signed up for",
    "Opt out any time by replying STOP",
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
        SMS Updates
      </span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{subAccount.businessName}</h1>
      <p className="mt-3 text-slate-600">
        Stay up to date with {subAccount.businessName} by signing up for SMS text alerts. We&apos;ll send you
        updates about your account and services.
      </p>
      <ul className="mt-6 space-y-2.5 text-sm text-slate-600">
        {perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600">
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                clipRule="evenodd"
              />
            </svg>
            {perk}
          </li>
        ))}
      </ul>
      <Link
        href={`/optin`}
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        Sign up for text alerts
      </Link>
    </div>
  );
}
