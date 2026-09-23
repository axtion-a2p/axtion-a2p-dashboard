// TextGrid's 10DLC API implementation. Confirmed against TextGrid's own docs
// (Brand and Campaign Registration, plus the Breeze API doc for core/auth):
// https://docs.google.com/document/d/10RpvMaEGwNRvUe0XNs6UhVWxrSzzH_5h_HRJ-8gF18c
//
// This is NOT a clone of Twilio's Trust Hub — it's a bespoke, TCR-direct JSON
// API (`Bearer {base64(accountSid:authToken)}` auth, `/campaigns/...` paths)
// with its own field names (displayName/companyName/entityType/brandRelationship
// /sample1-5/etc). It shares only the "Breeze" core account API
// (Accounts/.../IncomingPhoneNumbers.json) with Twilio's classic REST shape.
//
// Two open questions this implementation makes a documented judgment call on,
// since TCR's public doc doesn't spell out a full enum for either:
//   1. Brand `identityStatus`: doc shows PENDING (right after creation),
//      SELF_DECLARED (the steady-state for brands that didn't go through
//      external vetting — the common case) and VERIFIED/UNVERIFIED (only via
//      the BRAND_IDENTITY_STATUS_UPDATE webhook). We treat SELF_DECLARED and
//      VERIFIED as usable/APPROVED (a brand can register campaigns in both
//      states), PENDING as still-in-flight, and UNVERIFIED as FAILED.
//   2. Campaign `status`: the doc's only documented value is "ACTIVE"; there's
//      no published FAILED/REJECTED enum. We infer APPROVED from
//      campaignEnabled=true + status="ACTIVE", and fall back to PENDING_REVIEW
//      otherwise, treating campaignEnabled=false (post-creation) as SUSPENDED.
//      Re-check this against a real submission/webhook payload once available.

import { TextGridClient } from "./textgridClient";
import type {
  BrandInput,
  BrandStatus,
  CampaignInput,
  CampaignStatus,
  ProviderAdapter,
  ProviderPhoneNumber,
} from "./types";

export type TextGridProviderConfig = {
  accountSid: string;
  authToken: string;
  /** Base origin + Breeze API version, e.g. "https://api.textgrid.com/2010-04-01". Same host/version for both the core Breeze API and the 10DLC API. */
  apiBase: string;
};

type TextGridBrand = {
  brandId: string;
  identityStatus: "PENDING" | "SELF_DECLARED" | "VERIFIED" | "UNVERIFIED" | "UNVERIFED" | string;
  [key: string]: unknown;
};

type TextGridCampaign = {
  campaignId: string;
  status: string;
  campaignEnabled?: boolean;
  [key: string]: unknown;
};

/** Best-effort mapping from Twilio-style business_type strings to TextGrid's entityType enum. */
function inferEntityType(businessType: string): NonNullable<BrandInput["entityType"]> {
  const t = businessType.toLowerCase();
  if (t.includes("sole")) return "SOLE_PROPRIETOR";
  if (t.includes("government")) return "GOVERNMENT";
  if (t.includes("non") && t.includes("profit")) return "NON_PROFIT";
  if (t.includes("public")) return "PUBLIC_PROFIT";
  return "PRIVATE_PROFIT";
}

export class TextGridProvider implements ProviderAdapter {
  private client: TextGridClient;

  constructor(private config: TextGridProviderConfig) {
    this.client = new TextGridClient(config.accountSid, config.authToken);
  }

  private url(path: string) {
    return `${this.config.apiBase}${path}`;
  }

  async submitBrand(input: BrandInput): Promise<BrandStatus> {
    const entityType = input.entityType ?? inferEntityType(input.businessType);

    const brand = await this.client.request<TextGridBrand>("POST", this.url("/campaigns/brand/nonblocking"), {
      entityType,
      displayName: input.legalBusinessName,
      companyName: input.legalBusinessName,
      ein: input.ein,
      ...(entityType === "SOLE_PROPRIETOR"
        ? { firstName: input.authorizedRep.firstName, lastName: input.authorizedRep.lastName }
        : {}),
      phone: input.contactPhone,
      mobilePhone: input.mobilePhone ?? (entityType === "SOLE_PROPRIETOR" ? input.authorizedRep.phone : undefined),
      street: input.street,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
      email: input.contactEmail,
      website: input.website,
      brandRelationship: input.brandRelationship ?? "BASIC_ACCOUNT",
      vertical: input.vertical,
      stockSymbol: input.stockSymbol,
      stockExchange: input.stockExchange,
      altBusinessId: input.altBusinessId,
      altBusinessIdType: input.altBusinessIdType,
      referenceId: input.referenceId,
    });

    return this.mapBrandStatus(brand);
  }

  async getBrandStatus(providerBrandId: string): Promise<BrandStatus> {
    const brand = await this.client.request<TextGridBrand>("GET", this.url(`/campaigns/brand/${providerBrandId}`));
    return this.mapBrandStatus(brand);
  }

  private mapBrandStatus(brand: TextGridBrand): BrandStatus {
    const status = brand.identityStatus;
    const stage =
      status === "VERIFIED" || status === "SELF_DECLARED"
        ? "APPROVED"
        : status === "UNVERIFIED" || status === "UNVERIFED"
          ? "FAILED"
          : "PENDING_REVIEW";
    return {
      providerBrandId: brand.brandId,
      stage,
      raw: brand,
    };
  }

  /** TextGrid has no separate "Messaging Service" resource — campaigns attach directly to numbers. This is a no-op placeholder to satisfy the shared ProviderAdapter interface. */
  async createMessagingService(): Promise<{ sid: string }> {
    return { sid: "" };
  }

  async submitCampaign(brandId: string, input: CampaignInput): Promise<CampaignStatus> {
    // Step one: check whether the brand qualifies for this use case (informational
    // — restrictions/pricing/MNO metadata). Best-effort: a failure here shouldn't
    // block the actual campaign creation call in step two.
    try {
      await this.client.request("GET", this.url(`/campaigns/brand/${brandId}/usecase/${input.useCase}`));
    } catch {
      // ignore — step two will surface a real error if the brand truly doesn't qualify
    }

    const samples = input.sampleMessages.slice(0, 5);
    const campaign = await this.client.request<TextGridCampaign>("POST", this.url("/campaigns/campaign"), {
      brandId,
      usecase: input.useCase,
      subUsecases: input.subUsecases,
      description: input.description,
      embeddedLink: input.hasEmbeddedLinks,
      embeddedPhone: input.hasEmbeddedPhone,
      subscriberOptin: true,
      subscriberOptout: true,
      subscriberHelp: true,
      sample1: samples[0],
      sample2: samples[1],
      sample3: samples[2],
      sample4: samples[3],
      sample5: samples[4],
      messageFlow: input.optInDetails,
      termsAndConditionsLink: input.termsAndConditionsLink,
      privacyPolicyLink: input.privacyPolicyLink,
      helpKeywords: input.helpKeywords ?? "HELP",
      helpMessage: input.helpMessage,
      optinKeywords: input.optinKeywords ?? "START",
      optinMessage: input.optinMessage,
      optoutKeywords: input.optoutKeywords ?? "STOP",
      optoutMessage: input.optoutMessage,
      referenceId: input.referenceId,
      autoRenewal: input.autoRenewal ?? true,
    });

    return this.mapCampaignStatus(campaign);
  }

  /** `_messagingServiceSid` is unused for TextGrid — see getProvider()/actions.ts, which store the campaignId in that column for TextGrid rows since there's no separate messaging-service resource. */
  async getCampaignStatus(_messagingServiceSid: string, providerCampaignId: string): Promise<CampaignStatus> {
    const campaign = await this.client.request<TextGridCampaign>(
      "GET",
      this.url(`/campaigns/campaign/${providerCampaignId}`)
    );
    return this.mapCampaignStatus(campaign);
  }

  /** Edits an already-submitted campaign in place (e.g. filling in previously-missing sample messages) rather than creating a new one. Same field set as submitCampaign, PUT to the existing campaign's resource. */
  async updateCampaign(providerCampaignId: string, input: CampaignInput): Promise<CampaignStatus> {
    const samples = input.sampleMessages.slice(0, 5);
    const campaign = await this.client.request<TextGridCampaign>(
      "PUT",
      this.url(`/campaigns/campaign/${providerCampaignId}`),
      {
        usecase: input.useCase,
        subUsecases: input.subUsecases,
        description: input.description,
        embeddedLink: input.hasEmbeddedLinks,
        embeddedPhone: input.hasEmbeddedPhone,
        subscriberOptin: true,
        subscriberOptout: true,
        subscriberHelp: true,
        sample1: samples[0],
        sample2: samples[1],
        sample3: samples[2],
        sample4: samples[3],
        sample5: samples[4],
        messageFlow: input.optInDetails,
        termsAndConditionsLink: input.termsAndConditionsLink,
        privacyPolicyLink: input.privacyPolicyLink,
        helpKeywords: input.helpKeywords ?? "HELP",
        helpMessage: input.helpMessage,
        optinKeywords: input.optinKeywords ?? "START",
        optinMessage: input.optinMessage,
        optoutKeywords: input.optoutKeywords ?? "STOP",
        optoutMessage: input.optoutMessage,
        referenceId: input.referenceId,
        autoRenewal: input.autoRenewal ?? true,
      }
    );
    return this.mapCampaignStatus(campaign);
  }

  private mapCampaignStatus(campaign: TextGridCampaign): CampaignStatus {
    const stage =
      campaign.campaignEnabled === false
        ? "SUSPENDED"
        : campaign.status === "ACTIVE"
          ? "APPROVED"
          : "PENDING_REVIEW";
    return {
      providerCampaignId: campaign.campaignId,
      stage,
      raw: campaign,
    };
  }

  async listPhoneNumbers(): Promise<ProviderPhoneNumber[]> {
    const result = await this.client.request<{
      incoming_phone_numbers: { sid: string; phone_number: string }[];
    }>("GET", this.url(`/Accounts/${this.config.accountSid}/IncomingPhoneNumbers.json`));
    return result.incoming_phone_numbers.map((n) => ({ providerSid: n.sid, e164: n.phone_number }));
  }

  /** `messagingServiceSid` here is actually the TextGrid campaignId — see getCampaignStatus note above. */
  async assignNumberToMessagingService(messagingServiceSid: string, phoneNumberSid: string): Promise<void> {
    await this.client.request("POST", this.url(`/campaigns/number/${messagingServiceSid}`), {
      phoneNumberSids: [phoneNumberSid],
    });
  }
}
