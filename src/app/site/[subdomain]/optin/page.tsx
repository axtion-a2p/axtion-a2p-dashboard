import { requireSiteSubAccount } from "../data";
import { OptInForm } from "./OptInForm";

export default async function OptInPage({ params }: PageProps<"/site/[subdomain]/optin">) {
  const { subdomain } = await params;
  const subAccount = await requireSiteSubAccount(subdomain);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Sign up for text alerts</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Get account updates from {subAccount.businessName} by text. You can opt out at any time.
      </p>
      <div className="mt-6">
        <OptInForm subdomain={subdomain} businessName={subAccount.businessName} />
      </div>
    </div>
  );
}
