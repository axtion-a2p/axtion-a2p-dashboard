import { requireSiteSubAccount } from "../data";
import { OptInForm } from "./OptInForm";
import { siteOptInCategories, siteProfile } from "@/lib/siteProfiles";

export default async function OptInPage({ params, searchParams }: PageProps<"/site/[subdomain]/optin">) {
  const { subdomain } = await params;
  const { program } = await searchParams;
  const programValue = typeof program === "string" ? program : undefined;
  const subAccount = await requireSiteSubAccount(subdomain);
  const profile = siteProfile(subdomain);
  const categories = siteOptInCategories(
    profile,
    subAccount.campaigns.map((c) => c.useCase),
    programValue,
  );
  const name = subAccount.businessName;

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {profile ? `Get ${profile.offering} from ${name}` : "Sign up for text alerts"}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {profile
          ? `${profile.about(name)} Share your details below and a representative will follow up with ${profile.offering}. Funding is subject to review and approval.`
          : `Choose which updates you'd like from ${name} by text. You can opt out at any time.`}
      </p>
      <div className="mt-8">
        <OptInForm
          subdomain={subdomain}
          businessName={name}
          categories={categories}
          program={programValue}
          submitLabel={profile ? `Get ${profile.offering}` : "Sign up"}
          successMessage={
            profile
              ? `Thank you — we've received your request and a ${name} representative will follow up with ${profile.offering}. If you agreed to text messages, reply STOP at any time to opt out.`
              : undefined
          }
        />
      </div>
    </div>
  );
}
