// Pure helpers only — no `db` import here. This file is bundled into Edge
// middleware and client components (via campaignTemplate.ts), neither of
// which can pull in the Node-only Postgres driver. Server-only subdomain
// generation lives in generateSubdomain.ts instead.

/** Root domain the per-client compliance micro-sites are hosted under. */
export const SUBDOMAIN_ROOT = "axtion.app";

export function slugify(businessName: string): string {
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
  return slug || "client";
}

export function subdomainUrl(subdomain: string, path = ""): string {
  return `https://${subdomain}.${SUBDOMAIN_ROOT}${path}`;
}
