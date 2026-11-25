// Blocx 10DLC implementation (https://api.otterblocx.com — spec at /openapi.json).
//
// Blocx is a single-account API: brands, campaigns, numbers and messaging
// profiles all live under one API key pair, so there is no per-client
// sub-account like Twilio/TextGrid. Dashboard sub-accounts map onto Blocx
// *brands*; the platform-wide key pair comes from BLOCX_ACCESS_KEY_ID /
// BLOCX_SECRET_ACCESS_KEY (see getProvider()).
//
// Mapping onto the shared ProviderAdapter interface:
//   - "messaging service"  -> Blocx messaging profile (POST /messaging-profiles).
//     Numbers must belong to a profile AND be assigned to the campaign before
//     US application traffic can be sent (Blocx guide "Creating a 10DLC Campaign").
//   - CampaignStatus.providerCampaignId / the "messagingServiceSid" column hold
//     the Blocx campaign id (same convention as TextGrid, see d/[token]/actions.ts)
//     so assignNumberToMessagingService() can attach a number to the campaign.
//
// Documented judgment calls (the spec doesn't pin these down):
//   1. Brand: identityStatus VERIFIED / VETTED_VERIFIED / SELF_DECLARED => usable
//      (same call as TextGrid, both sit on TCR); FAILED / UNVERIFIED => failed;
//      PENDING => in flight. A brand with status DELETED is failed.
//   2. Campaign: `status` ACTIVE => APPROVED, PENDING_REGISTRATION => pending,
//      SUSPENDED => suspended, EXPIRED/DELETED => rejected. A DECLINED/FAILED
//      sharingStatus or a *FAIL*/*REJECT* registration pipeline status
//      (`telnyxCampaignStatus`, "TCR_PENDING … MNO_PROVISIONED") is a rejection.
//      `enabled` is only reported when that pipeline status is present: true once
//      it reaches MNO_PROVISIONED.
//   3. Campaigns cannot be edited after creation (the spec has no PUT /campaigns/{id}),
//      so updateCampaign() throws — register a new campaign instead.
//   4. Sole proprietors aren't supported by POST /brands (entityType has no
//      SOLE_PROPRIETOR), so submitBrand() rejects them with a clear message.

import { BlocxApiError, BlocxClient } from "./blocxClient";
import type {
  AvailableNumber,
  BrandInput,
  BrandStatus,
  CampaignInput,
  CampaignStatus,
  InboundRoutingAuditResult,
  ProviderAdapter,
  ProviderPhoneNumber,
} from "./types";

export type BlocxProviderConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  /** Origin only, e.g. "https://api.otterblocx.com". */
  apiBase: string;
};

type BlocxBrand = {
  id: number;
  tcrBrandId?: string | null;
  identityStatus: "PENDING" | "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "VETTED_VERIFIED" | "FAILED" | string;
  status: "PENDING_REGISTRATION" | "ACTIVE" | "DELETED" | string;
  [key: string]: unknown;
};

type BlocxCampaign = {
  id: number;
  status: "PENDING_REGISTRATION" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "DELETED" | string;
  telnyxCampaignStatus?: string | null;
  sharingStatus?: "PENDING" | "ACCEPTED" | "DECLINED" | "FAILED" | string | null;
  shareError?: string | null;
  mnoStatus?: string | null;
  [key: string]: unknown;
};

type BlocxPhoneNumber = { id: number; phoneNumber: string; messagingProfileId?: number | null };

/** The platform's default messaging profile, used when a number is bought without a client-specific one. */
const DEFAULT_PROFILE_NAME = "Axtion default";

/** Business type strings the dashboard collects (Twilio-style) -> Blocx entityType. */
function inferEntityType(input: BrandInput): "PRIVATE_PROFIT" | "PUBLIC_PROFIT" | "NON_PROFIT" | "GOVERNMENT" {
  if (input.entityType) {
    if (input.entityType === "SOLE_PROPRIETOR") {
      throw new Error("Blocx does not support sole-proprietor brands — register this client with Twilio or TextGrid.");
    }
    return input.entityType;
  }
  const t = input.businessType.toLowerCase();
  if (t.includes("sole")) {
    throw new Error("Blocx does not support sole-proprietor brands — register this client with Twilio or TextGrid.");
  }
  if (t.includes("government")) return "GOVERNMENT";
  if (t.includes("non") && t.includes("profit")) return "NON_PROFIT";
  if (t.includes("public")) return "PUBLIC_PROFIT";
  return "PRIVATE_PROFIT";
}

/** Dashboard verticals -> Blocx's enum. OTHER has no Blocx equivalent; PROFESSIONAL is the closest generic bucket. */
const VERTICALS = new Set([
  "PROFESSIONAL", "REAL_ESTATE", "HEALTHCARE", "HUMAN_RESOURCES", "ENERGY", "ENTERTAINMENT", "RETAIL",
  "TRANSPORTATION", "AGRICULTURE", "INSURANCE", "POSTAL", "EDUCATION", "HOSPITALITY", "FINANCIAL",
  "POLITICAL", "GAMBLING", "LEGAL", "CONSTRUCTION", "NGO", "MANUFACTURING", "GOVERNMENT", "TECHNOLOGY",
  "COMMUNICATION",
]);
function mapVertical(vertical: string): string {
  const v = vertical.toUpperCase();
  return VERTICALS.has(v) ? v : "PROFESSIONAL";
}

const toKeywords = (s: string | undefined, fallback: string): string[] =>
  (s ?? fallback).split(",").map((k) => k.trim().toUpperCase()).filter(Boolean);

export class BlocxProvider implements ProviderAdapter {
  private client: BlocxClient;
  private defaultProfileId: number | undefined;

  constructor(config: BlocxProviderConfig) {
    this.client = new BlocxClient(config.accessKeyId, config.secretAccessKey, config.apiBase);
  }

  // ---- Brands ---------------------------------------------------------------

  async submitBrand(input: BrandInput): Promise<BrandStatus> {
    const entityType = inferEntityType(input);
    const brand = await this.client.request<BlocxBrand>("POST", "/brands", {
      body: {
        entityType,
        displayName: input.legalBusinessName,
        companyName: input.legalBusinessName,
        ein: input.ein,
        einIssuingCountry: input.country,
        phone: input.contactPhone,
        street: input.street,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        email: input.contactEmail,
        website: input.website || undefined,
        vertical: mapVertical(input.vertical),
        brandRelationship: input.brandRelationship ?? "BASIC_ACCOUNT",
        stockSymbol: input.stockSymbol,
        stockExchange: input.stockExchange,
        altBusinessId: input.altBusinessId,
        altBusinessIdType: input.altBusinessIdType,
        firstName: input.authorizedRep.firstName,
        lastName: input.authorizedRep.lastName,
        mobilePhone: input.mobilePhone ?? input.authorizedRep.phone,
        businessContactEmail: input.authorizedRep.email,
        referenceId: input.referenceId,
      },
    });
    return this.mapBrandStatus(brand);
  }

  async getBrandStatus(providerBrandId: string): Promise<BrandStatus> {
    const brand = await this.client.request<BlocxBrand>("GET", `/brands/${providerBrandId}`);
    const status = this.mapBrandStatus(brand);
    if (status.stage === "FAILED") {
      // Blocx exposes the registry's rejection categories on a separate endpoint.
      try {
        const fb = await this.client.request<{ category?: string[] }>("GET", `/brands/${providerBrandId}/feedback`);
        if (fb.category?.length) status.failureReason = fb.category.join(", ");
      } catch {
        // feedback is best-effort; the stage alone is still correct
      }
    }
    return status;
  }

  private mapBrandStatus(brand: BlocxBrand): BrandStatus {
    const s = brand.identityStatus;
    const stage: BrandStatus["stage"] =
      brand.status === "DELETED" || s === "FAILED" || s === "UNVERIFIED"
        ? "FAILED"
        : s === "VERIFIED" || s === "VETTED_VERIFIED" || s === "SELF_DECLARED"
          ? "APPROVED"
          : "PENDING_REVIEW";
    return { providerBrandId: String(brand.id), stage, raw: brand };
  }

  // ---- Messaging profiles ---------------------------------------------------

  /** A Blocx messaging profile is the closest thing to a Twilio Messaging Service. */
  async createMessagingService(friendlyName: string): Promise<{ sid: string }> {
    const profile = await this.client.request<{ id: number }>("POST", "/messaging-profiles", {
      body: { name: friendlyName },
    });
    return { sid: String(profile.id) };
  }

  /** Finds (or creates) the platform default profile that purchased numbers are filed under. */
  private async ensureDefaultProfile(): Promise<number> {
    if (this.defaultProfileId) return this.defaultProfileId;
    const list = await this.client.request<{ profiles: { id: number; name: string }[] }>("GET", "/messaging-profiles", {
      query: { search: DEFAULT_PROFILE_NAME, limit: 50 },
    });
    const existing = list.profiles?.find((p) => p.name === DEFAULT_PROFILE_NAME);
    if (existing) return (this.defaultProfileId = existing.id);
    const created = await this.client.request<{ id: number }>("POST", "/messaging-profiles", {
      body: { name: DEFAULT_PROFILE_NAME },
    });
    return (this.defaultProfileId = created.id);
  }

  // ---- Campaigns ------------------------------------------------------------

  async submitCampaign(brandId: string, input: CampaignInput): Promise<CampaignStatus> {
    // Blocx requires all three messages (20+ chars); fail early with the field
    // names instead of a generic 400 so the admin knows what to fill in.
    const missing = (
      [
        ["helpMessage", input.helpMessage],
        ["optinMessage", input.optinMessage],
        ["optoutMessage", input.optoutMessage],
        ["optInDetails (message flow)", input.optInDetails],
      ] as const
    )
      .filter(([, v]) => !v || !v.trim())
      .map(([k]) => k);
    if (missing.length) throw new Error(`Blocx campaign is missing required field(s): ${missing.join(", ")}`);

    const samples = input.sampleMessages.slice(0, 5);
    const campaign = await this.client.request<BlocxCampaign>("POST", "/campaigns", {
      body: {
        brandId: Number(brandId),
        usecase: input.useCase,
        contentType: "SMS",
        subUsecases: input.subUsecases,
        description: input.description,
        messageFlow: input.optInDetails,
        helpMessage: input.helpMessage,
        helpKeywords: toKeywords(input.helpKeywords, "HELP"),
        optinMessage: input.optinMessage,
        optinKeywords: toKeywords(input.optinKeywords, "START"),
        optoutMessage: input.optoutMessage,
        optoutKeywords: toKeywords(input.optoutKeywords, "STOP"),
        sample1: samples[0],
        sample2: samples[1],
        sample3: samples[2],
        sample4: samples[3],
        sample5: samples[4],
        embeddedLink: input.hasEmbeddedLinks,
        embeddedPhone: input.hasEmbeddedPhone,
        numberPool: input.numberPool,
        ageGated: input.ageGated,
        directLending: input.directLending,
        subscriberOptIn: true,
        subscriberOptOut: true,
        subscriberHelp: true,
        termsAndConditions: Boolean(input.termsAndConditionsLink),
        termsAndConditionsLink: input.termsAndConditionsLink,
        privacyPolicyLink: input.privacyPolicyLink,
        autoRenewal: input.autoRenewal ?? true,
      },
    });
    return this.mapCampaignStatus(campaign);
  }

  /** `_messagingServiceSid` is unused: the Blocx campaign id is stored in that column (like TextGrid). */
  async getCampaignStatus(_messagingServiceSid: string, providerCampaignId: string): Promise<CampaignStatus> {
    const campaign = await this.client.request<BlocxCampaign>("GET", `/campaigns/${providerCampaignId}`);
    return this.mapCampaignStatus(campaign);
  }

  async updateCampaign(): Promise<CampaignStatus> {
    throw new Error("Blocx campaigns can't be edited after creation — submit a new campaign instead.");
  }

  private mapCampaignStatus(c: BlocxCampaign): CampaignStatus {
    const pipeline = c.telnyxCampaignStatus ?? undefined;
    const declined = c.sharingStatus === "DECLINED" || c.sharingStatus === "FAILED";
    const pipelineFailed = pipeline ? /FAIL|REJECT|DECLIN/i.test(pipeline) : false;

    let stage: CampaignStatus["stage"];
    let failureReason: string | undefined;
    if (declined || pipelineFailed) {
      stage = "REJECTED";
      failureReason = c.shareError || (pipelineFailed ? `Registration status: ${pipeline}` : "Declined by carrier review");
    } else if (c.status === "SUSPENDED") {
      stage = "SUSPENDED";
    } else if (c.status === "EXPIRED" || c.status === "DELETED") {
      stage = "REJECTED";
      failureReason = `Campaign is ${c.status.toLowerCase()}`;
    } else if (c.status === "ACTIVE") {
      stage = "APPROVED";
    } else {
      stage = "PENDING_REVIEW";
    }

    return {
      providerCampaignId: String(c.id),
      stage,
      failureReason,
      enabled: pipeline ? pipeline === "MNO_PROVISIONED" : undefined,
      raw: c,
    };
  }

  // ---- Numbers --------------------------------------------------------------

  async listPhoneNumbers(): Promise<ProviderPhoneNumber[]> {
    const out: ProviderPhoneNumber[] = [];
    for (let page = 1; page <= 50; page++) {
      const res = await this.client.request<{ numbers: BlocxPhoneNumber[]; total: number; limit: number }>(
        "GET",
        "/phone-numbers",
        { query: { page, limit: 100 } }
      );
      for (const n of res.numbers) {
        out.push({
          providerSid: String(n.id),
          e164: n.phoneNumber,
          assignedMessagingServiceSid: n.messagingProfileId ? String(n.messagingProfileId) : undefined,
        });
      }
      if (out.length >= res.total || res.numbers.length === 0) break;
    }
    return out;
  }

  async searchAvailableNumbers(areaCode: string): Promise<AvailableNumber[]> {
    const res = await this.client.request<{ numbers: { phoneNumber: string }[] }>("GET", "/phone-numbers/search", {
      query: { country: "US", areaCode, limit: 20 },
    });
    return (res.numbers ?? []).map((n) => ({ e164: n.phoneNumber }));
  }

  /** Orders a number into the platform default messaging profile, then resolves its Blocx id. */
  async purchaseNumber(e164: string): Promise<ProviderPhoneNumber> {
    const messagingProfileId = await this.ensureDefaultProfile();
    const order = await this.client.request<{ id: number; status: "PENDING" | "COMPLETED" | "FAILED" }>(
      "POST",
      "/phone-orders",
      { body: { items: [{ phoneNumber: e164, capabilities: ["SMS"] }], messagingProfileId } }
    );
    if (order.status === "FAILED") throw new Error(`Blocx could not purchase ${e164} (order ${order.id} failed)`);

    // Orders can be asynchronous: poll the number list for the new id for up to ~15s.
    for (let attempt = 0; attempt < 6; attempt++) {
      const found = await this.client.request<{ numbers: BlocxPhoneNumber[] }>("GET", "/phone-numbers", {
        query: { search: e164, limit: 5 },
      });
      const hit = found.numbers?.find((n) => n.phoneNumber === e164);
      if (hit) return { providerSid: String(hit.id), e164: hit.phoneNumber, assignedMessagingServiceSid: String(messagingProfileId) };
      await new Promise((r) => setTimeout(r, 2500));
    }
    throw new Error(`Blocx order ${order.id} for ${e164} is still processing — sync numbers later to pick it up.`);
  }

  /** `messagingServiceSid` here is the Blocx campaign id — see getCampaignStatus note above. */
  async assignNumberToMessagingService(messagingServiceSid: string, phoneNumberSid: string): Promise<void> {
    const res = await this.client.request<{ assigned: number; failed: number }>(
      "POST",
      `/campaigns/${messagingServiceSid}/phone-numbers/assign`,
      { body: { phoneNumberIds: [Number(phoneNumberSid)] } }
    );
    if (res.failed > 0 && res.assigned === 0) {
      throw new BlocxApiError(`Blocx could not assign number ${phoneNumberSid} to campaign ${messagingServiceSid}`, 422, res);
    }
  }

  /** No-op: the inbound-routing failure mode this audit catches is specific to Twilio Messaging Services. */
  async auditInboundRouting(): Promise<InboundRoutingAuditResult[]> {
    return [];
  }
}
