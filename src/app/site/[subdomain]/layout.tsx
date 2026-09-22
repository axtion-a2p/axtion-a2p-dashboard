import Link from "next/link";
import { requireSiteSubAccount } from "./data";

export default async function SiteLayout({ children, params }: LayoutProps<"/site/[subdomain]">) {
  const { subdomain } = await params;
  const subAccount = await requireSiteSubAccount(subdomain);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      <header className="mb-10 flex items-center justify-between">
        <Link href={`/`} className="text-lg font-semibold text-neutral-900">
          {subAccount.businessName}
        </Link>
        <nav className="flex gap-4 text-sm text-neutral-600">
          <Link href={`/optin`}>Text Alerts</Link>
          <Link href={`/privacy`}>Privacy</Link>
          <Link href={`/terms`}>Terms</Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-10 border-t border-neutral-200 pt-6 text-xs text-neutral-400">
        © {new Date().getFullYear()} {subAccount.businessName}. All rights reserved.
      </footer>
    </div>
  );
}
