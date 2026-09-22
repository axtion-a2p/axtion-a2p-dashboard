import { NextRequest, NextResponse } from "next/server";
import { SUBDOMAIN_ROOT } from "@/lib/subdomain";

// Routes a request to {subdomain}.lnxnow.com through to the per-client
// compliance micro-site at /site/[subdomain]/... without changing the URL
// the visitor sees. The apex domain and app.axtion.ai/vercel.app hosts are
// left untouched — only genuine lnxnow.com subdomains are rewritten.
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  if (!hostname.endsWith(`.${SUBDOMAIN_ROOT}`)) {
    return NextResponse.next();
  }

  const subdomain = hostname.slice(0, -(`.${SUBDOMAIN_ROOT}`.length));
  if (!subdomain || subdomain === "www") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/site/${subdomain}${request.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
