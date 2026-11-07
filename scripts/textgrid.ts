/**
 * Operate TextGrid brands and campaigns directly, without the dashboard
 * database. Brands/campaigns belong to whichever TextGrid account's
 * credentials authenticate the call, so pass the sub-account's own SID/token
 * (or the parent's) via env.
 *
 *   TEXTGRID_ACCOUNT_SID=... TEXTGRID_AUTH_TOKEN=... \
 *     npx tsx scripts/textgrid.ts <command> [args] [--yes]
 *
 * Read-only:
 *   brands | brand <brandId> | campaigns [brandId] | eligibility <brandId> <USE_CASE>
 * Writes (print the payload and stop unless --yes is passed):
 *   account:create <business name>       new sub-account under these (master) credentials;
 *                                        prints its SID/token — use those for the commands below
 *   brand:create <brand.json>            BrandInput
 *   campaign:create <brandId> <c.json>   CampaignInput; needs an approved brand, a
 *                                        passing use-case check, and no existing campaign
 *                                        of that use case on the brand (--force overrides)
 *   campaign:edit <campaignId> <c.json>  in-place edit
 *   campaign:resubmit <campaignId> <c.json>  edit + send a declined campaign back to review
 */
import { readFileSync } from "node:fs";
import { TextGridProvider } from "../src/lib/providers/textgridProvider";
import type { BrandInput, CampaignInput } from "../src/lib/providers/types";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [cmd, ...rest] = args.filter((a) => !a.startsWith("--"));
const yes = flags.has("--yes");

const sid = process.env.TEXTGRID_ACCOUNT_SID;
const token = process.env.TEXTGRID_AUTH_TOKEN;
if (!sid || !token) {
  console.error("Set TEXTGRID_ACCOUNT_SID and TEXTGRID_AUTH_TOKEN.");
  process.exit(1);
}
const tg = new TextGridProvider({
  accountSid: sid,
  authToken: token,
  apiBase: process.env.TEXTGRID_API_BASE || "https://api.textgrid.com/2010-04-01",
});

const readJson = <T>(path?: string): T => {
  if (!path) throw new Error("Missing JSON file argument.");
  return JSON.parse(readFileSync(path, "utf8")) as T;
};
const show = (v: unknown) => console.log(JSON.stringify(v, null, 2));
const summarize = (c: { campaignId: string; brandId?: unknown; usecase?: unknown; status: string; campaignEnabled?: boolean; SecondaryDcaSharingStatus?: string; SecondaryDcaDeclineReason?: string; numbersConnected?: unknown }) =>
  `${c.campaignId}  brand=${c.brandId}  ${c.usecase}  ${c.status}  enabled=${c.campaignEnabled}  dca=${c.SecondaryDcaSharingStatus ?? "-"}${c.SecondaryDcaDeclineReason ? ` (${c.SecondaryDcaDeclineReason})` : ""}  numbers=${c.numbersConnected ?? "-"}`;

function dryRun(what: string, payload: unknown): boolean {
  if (yes) return false;
  console.log(`DRY RUN — ${what}. Nothing was sent. Re-run with --yes to submit.\n`);
  show(payload);
  return true;
}

async function main() {
  switch (cmd) {
    case "brands":
      for (const b of await tg.listBrands()) console.log(`${b.brandId}  ${b.displayName}  ${b.identityStatus}  ${b.entityType}`);
      break;
    case "brand":
      show(await tg.getBrand(rest[0]));
      break;
    case "campaigns": {
      const list = rest[0] ? await tg.listCampaignsByBrand(rest[0]) : await tg.listCampaigns();
      for (const c of list) console.log(summarize(c as never));
      break;
    }
    case "eligibility":
      show(await tg.getUseCaseEligibility(rest[0], rest[1]));
      break;

    case "account:create": {
      const name = rest.join(" ");
      if (!name) throw new Error("Give the business name for the new sub-account.");
      if (dryRun(`create TextGrid sub-account "${name}"`, { friendlyName: name })) break;
      show(await tg.createSubAccount(name));
      break;
    }

    case "brand:create": {
      const input = readJson<BrandInput>(rest[0]);
      if (dryRun(`create brand "${input.legalBusinessName}"`, input)) break;
      show(await tg.submitBrand(input));
      break;
    }

    case "campaign:create": {
      const [brandId, file] = rest;
      const input = readJson<CampaignInput>(file);
      const brand = await tg.getBrand(brandId);
      if (brand.identityStatus !== "VERIFIED" && brand.identityStatus !== "SELF_DECLARED") {
        throw new Error(`Brand ${brandId} is ${brand.identityStatus}; it must be VERIFIED or SELF_DECLARED before a campaign can be registered.`);
      }
      await tg.getUseCaseEligibility(brandId, input.useCase); // throws if the brand can't run this use case
      const existing = (await tg.listCampaignsByBrand(brandId)).filter((c) => c.usecase === input.useCase);
      if (existing.length && !flags.has("--force")) {
        console.error(`Brand ${brandId} already has ${input.useCase} campaign(s) — not creating another. Edit or resubmit instead (or pass --force):`);
        for (const c of existing) console.error("  " + summarize(c as never));
        process.exit(2);
      }
      if (dryRun(`create ${input.useCase} campaign on ${brandId} (${brand.displayName})`, input)) break;
      show(await tg.submitCampaign(brandId, input));
      break;
    }

    case "campaign:edit":
    case "campaign:resubmit": {
      const [campaignId, file] = rest;
      const input = readJson<CampaignInput>(file);
      if (dryRun(`${cmd} ${campaignId}`, input)) break;
      show(cmd === "campaign:edit" ? await tg.updateCampaign(campaignId, input) : await tg.resubmitCampaign(campaignId, input));
      break;
    }

    default:
      console.error("Unknown command. See the header of scripts/textgrid.ts.");
      process.exit(1);
  }
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
