import Link from "next/link";
import { requireSiteSubAccount } from "./data";

export default async function SiteLayout({ children, params }: LayoutProps<"/site/[subdomain]">) {
  const { subdomain } = await params;
  const subAccount = await requireSiteSubAccount(subdomain);

  const initial = subAccount.businessName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <Link href={`/`} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="text-base font-semibold text-slate-900">{subAccount.businessName}</span>
          </Link>
          <nav className="flex gap-5 text-sm font-medium text-slate-500">
            <Link href={`/optin`} className="transition hover:text-slate-900">
              Text Alerts
            </Link>
            <Link href={`/privacy`} className="transition hover:text-slate-900">
              Privacy
            </Link>
            <Link href={`/terms`} className="transition hover:text-slate-900">
              Terms
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-6 pb-10 text-xs text-slate-400">
        © {new Date().getFullYear()} {subAccount.businessName}. All rights reserved.
      </footer>
    </div>
  );
}
