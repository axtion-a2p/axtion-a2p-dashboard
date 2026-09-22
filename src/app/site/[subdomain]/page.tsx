import Link from "next/link";
import { requireSiteSubAccount } from "./data";

export default async function SiteHome({ params }: PageProps<"/site/[subdomain]">) {
  const { subdomain } = await params;
  const subAccount = await requireSiteSubAccount(subdomain);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{subAccount.businessName}</h1>
      <p className="mt-4 text-neutral-600">
        Stay up to date with {subAccount.businessName} by signing up for SMS text alerts. We&apos;ll send you
        updates about your account and services — no spam, and you can opt out at any time.
      </p>
      <Link
        href={`/optin`}
        className="mt-6 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        Sign up for text alerts
      </Link>
    </div>
  );
}
