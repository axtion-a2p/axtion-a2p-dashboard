import { requireSiteSubAccount } from "../data";
import { OptInForm } from "./OptInForm";
import { optInCategoriesForUseCases } from "@/lib/optInCategories";

export default async function OptInPage({ params }: PageProps<"/site/[subdomain]/optin">) {
  const { subdomain } = await params;
  const subAccount = await requireSiteSubAccount(subdomain);
  const categories = optInCategoriesForUseCases(subAccount.campaigns.map((c) => c.useCase));

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign up for text alerts</h1>
      <p className="mt-2 text-sm text-slate-600">
        Choose which updates you&apos;d like from {subAccount.businessName} by text. You can opt out at any time.
      </p>
      <div className="mt-8">
        <OptInForm subdomain={subdomain} businessName={subAccount.businessName} categories={categories} />
      </div>
    </div>
  );
}
