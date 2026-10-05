// Twilio's A2P 10DLC + Messaging REST API implementation (verified against
// Twilio's current docs, Sept 2026). TextGrid has its own, unrelated
// implementation — see textgridProvider.ts.
//
// Reference (fetched live while building this):
// https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv-api
// https://www.twilio.com/docs/messaging/api/brand-registration-resource
// https://www.twilio.com/docs/messaging/api/usapptoperson-resource

import { RestClient } from "./restClient";
import type {
  AvailableNumber,
  BrandInput,
  BrandStatus,
  CampaignInput,
  CampaignStatus,
  ProviderAdapter,
  ProviderPhoneNumber,
} from "./types";

// Our A2P profile is Twilio's own "Secondary Customer Profile of type Business"
// policy — confirmed via GET /v1/Policies/{A2P_POLICY_SID}. It unconditionally
// requires an EntityAssignment to an approved/in-review Primary Customer Profile
// (one of the business/nonprofit/government variants) to pass evaluation.
const A2P_POLICY_SID = "RNdfbf3fae0e1107f8aded0e7cead80bf5";
// "Primary Customer Profile of type Business" — found via GET /v1/Policies?PageSize=1000.
const PRIMARY_POLICY_SID = "RN6433641899984f951173ef1738c3bdd0";
// Twilio rejects POST /v1/CustomerProfiles with this PolicySid via the API
// ("This operation is restricted via API for Primary Customer Profiles. Use
// Twilio Console instead.") — a Primary profile can only be created by a human
// in Trust Hub, once per Twilio (sub)account. Our code can only look one up.
const PRIMARY_PROFILE_ACCEPTABLE_STATUSES = new Set(["twilio-approved", "pending-review"]);

export type TenDlcProviderConfig = {
  /** Account SID (AC...) used in REST URL paths. */
  accountSid: string;
  /** Basic Auth username: either the same Account SID (classic auth) or an API Key SID (SK...). */
  authUsername: string;
  /** Basic Auth password: the Auth Token (classic) or API Key Secret. */
  authPassword: string;
  apiBase: string; // core REST API (Addresses, IncomingPhoneNumbers)
  trustHubBase: string; // CustomerProfiles, EndUsers, SupportingDocuments
  messagingBase: string; // Services, BrandRegistrations, Usa2p
  /** Email that receives Trust Hub status-change notifications. Must be the ISV's own, not the end customer's. */
  statusEmail: string;
};

export class TenDlcProvider implements ProviderAdapter {
  private client: RestClient;

  constructor(private config: TenDlcProviderConfig) {
    this.client = new RestClient(config.authUsername, config.authPassword);
  }

  private async createCustomerProfile(friendlyName: string) {
    return this.client.request<{ sid: string }>("POST", `${this.config.trustHubBase}/v1/CustomerProfiles`, {
      FriendlyName: friendlyName,
      Email: this.config.statusEmail,
      PolicySid: A2P_POLICY_SID,
    });
  }

  private async createEndUser(type: string, friendlyName: string, attributes: Record<string, unknown>) {
    return this.client.request<{ sid: string }>("POST", `${this.config.trustHubBase}/v1/EndUsers`, {
      Type: type,
      FriendlyName: friendlyName,
      Attributes: JSON.stringify(attributes),
    });
  }

  private async attachEntity(profileSid: string, objectSid: string) {
    return this.client.request(
      "POST",
      `${this.config.trustHubBase}/v1/CustomerProfiles/${profileSid}/EntityAssignments`,
      { ObjectSid: objectSid }
    );
  }

  private async createAddress(input: BrandInput) {
    return this.client.request<{ sid: string }>(
      "POST",
      `${this.config.apiBase}/2010-04-01/Accounts/${this.config.accountSid}/Addresses.json`,
      {
        FriendlyName: `${input.legalBusinessName} address`,
        CustomerName: input.legalBusinessName,
        Street: input.street,
        City: input.city,
        Region: input.state,
        PostalCode: input.postalCode,
        IsoCountry: input.country,
      }
    );
  }

  private async createAddressSupportingDocument(friendlyName: string, addressSid: string) {
    return this.client.request<{ sid: string }>(
      "POST",
      `${this.config.trustHubBase}/v1/SupportingDocuments`,
      {
        Type: "customer_profile_address",
        FriendlyName: friendlyName,
        Attributes: JSON.stringify({ address_sids: addressSid }),
      }
    );
  }

  private async evaluateProfile(profileSid: string) {
    return this.client.request<{ status: string; results?: unknown }>(
      "POST",
      `${this.config.trustHubBase}/v1/CustomerProfiles/${profileSid}/Evaluations`,
      { PolicySid: A2P_POLICY_SID }
    );
  }

  private async submitProfileForReview(profileSid: string) {
    return this.client.request(
      "POST",
      `${this.config.trustHubBase}/v1/CustomerProfiles/${profileSid}`,
      { Status: "pending-review" }
    );
  }

  /**
   * Finds this account's existing Primary Customer Profile (of type Business).
   * Twilio blocks creating one via the API, so it must already exist — a human
   * created it once in Trust Hub Console (Customer Profiles > Create new >
   * Business Profile, not the A2P/Secondary option).
   */
  private async findExistingPrimaryProfile(): Promise<string | undefined> {
    const result = await this.client.request<{
      results: { sid: string; policy_sid: string; status: string }[];
    }>("GET", `${this.config.trustHubBase}/v1/CustomerProfiles?PageSize=50`);
    const match = result.results.find(
      (p) => p.policy_sid === PRIMARY_POLICY_SID && PRIMARY_PROFILE_ACCEPTABLE_STATUSES.has(p.status)
    );
    return match?.sid;
  }

  async submitBrand(input: BrandInput): Promise<BrandStatus> {
    const friendlyBase = input.legalBusinessName;

    const primaryProfileSid = await this.findExistingPrimaryProfile();
    if (!primaryProfileSid) {
      throw new Error(
        "No approved or in-review Primary Business Profile found on this Twilio account. Twilio only allows " +
          "creating a Primary Customer Profile through Trust Hub Console, not the API — in Twilio Console, go to " +
          "Trust Hub > Customer Profiles > Create new, choose \"Business Profile\" (not the A2P one), fill in the " +
          "same business details, and submit it. Once that exists, resubmit this brand."
      );
    }

    const profile = await this.createCustomerProfile(`${friendlyBase} - A2P Profile`);

    const businessInfo = await this.createEndUser("customer_profile_business_information", `${friendlyBase} - Business Info`, {
      business_name: input.legalBusinessName,
      business_type: input.businessType,
      business_industry: input.vertical,
      business_identity: "direct_customer",
      business_regions_of_operation: "USA_AND_CANADA",
      business_registration_identifier: "EIN",
      business_registration_number: input.ein,
      website_url: input.website ?? "",
    });
    await this.attachEntity(profile.sid, businessInfo.sid);

    const rep = await this.createEndUser("authorized_representative_1", `${friendlyBase} - Authorized Rep`, {
      first_name: input.authorizedRep.firstName,
      last_name: input.authorizedRep.lastName,
      email: input.authorizedRep.email,
      phone_number: input.authorizedRep.phone,
      business_title: input.authorizedRep.businessTitle,
      job_position: input.authorizedRep.jobPosition,
    });
    await this.attachEntity(profile.sid, rep.sid);

    const address = await this.createAddress(input);
    const addressDoc = await this.createAddressSupportingDocument(`${friendlyBase} - Address`, address.sid);
    await this.attachEntity(profile.sid, addressDoc.sid);

    await this.attachEntity(profile.sid, primaryProfileSid);

    const evaluation = await this.evaluateProfile(profile.sid);
    await this.submitProfileForReview(profile.sid);

    // The BrandRegistration itself is created once the secondary profile clears
    // Twilio's async review and flips to "twilio-approved" — that happens out of
    // band (webhook/poll), so we return PENDING_REVIEW here and create the
    // BrandRegistration from the sync job once the profile is approved.
    return {
      providerBrandId: profile.sid,
      stage: "PENDING_REVIEW",
      raw: { profile, evaluation },
    };
  }

  /** Call once a secondary CustomerProfile (providerBrandId) has reached twilio-approved. */
  async createBrandRegistration(primaryProfileBundleSid: string, a2pProfileBundleSid: string): Promise<BrandStatus> {
    const brand = await this.client.request<{ sid: string; status: string; errors?: unknown[]; failure_reason?: string }>(
      "POST",
      `${this.config.messagingBase}/v1/a2p/BrandRegistrations`,
      {
        CustomerProfileBundleSid: primaryProfileBundleSid,
        A2PProfileBundleSid: a2pProfileBundleSid,
      }
    );
    return this.mapBrandStatus(brand);
  }

  async getBrandStatus(providerBrandId: string): Promise<BrandStatus> {
    // providerBrandId may be either the CustomerProfile sid (BU..., still pending
    // the BrandRegistration step above) or a BrandRegistration sid (BN...).
    if (providerBrandId.startsWith("BN")) {
      const brand = await this.client.request<{ sid: string; status: string; errors?: unknown[]; failure_reason?: string }>(
        "GET",
        `${this.config.messagingBase}/v1/a2p/BrandRegistrations/${providerBrandId}`
      );
      return this.mapBrandStatus(brand);
    }
    const profile = await this.client.request<{ sid: string; status: string }>(
      "GET",
      `${this.config.trustHubBase}/v1/CustomerProfiles/${providerBrandId}`
    );
    // The profile itself carries no failure reason (its `errors` field is routinely
    // null even when rejected) — the actual policy-check results live on this
    // sub-resource. Best-effort: a profile with no evaluations yet shouldn't block
    // reporting the profile's own status.
    let evaluations: unknown;
    try {
      evaluations = await this.client.request(
        "GET",
        `${this.config.trustHubBase}/v1/CustomerProfiles/${providerBrandId}/Evaluations`
      );
    } catch {
      // ignore
    }
    return {
      providerBrandId: profile.sid,
      stage: profile.status === "twilio-rejected" ? "FAILED" : "PENDING_REVIEW",
      raw: { profile, evaluations },
    };
  }

  // BrandRegistration statuses per Twilio: PENDING, IN_REVIEW, APPROVED, FAILED, SUSPENDED.
  // `failure_reason` is a deprecated field now consolidated into `errors[]` — prefer that.
  private mapBrandStatus(brand: { sid: string; status: string; errors?: unknown[]; failure_reason?: string }): BrandStatus {
    const stage =
      brand.status === "APPROVED"
        ? "APPROVED"
        : brand.status === "FAILED" || brand.status === "SUSPENDED"
          ? "FAILED"
          : "PENDING_REVIEW";
    return {
      providerBrandId: brand.sid,
      stage,
      failureReason: brand.errors?.length ? JSON.stringify(brand.errors) : brand.failure_reason,
      raw: brand,
    };
  }

  async createMessagingService(friendlyName: string): Promise<{ sid: string }> {
    return this.client.request<{ sid: string }>("POST", `${this.config.messagingBase}/v1/Services`, {
      FriendlyName: friendlyName,
    });
  }

  async submitCampaign(brandRegistrationSid: string, input: CampaignInput): Promise<CampaignStatus> {
    const campaign = await this.client.request<{
      sid: string;
      campaign_status: string;
      errors?: unknown[];
      message_flow?: string;
    }>("POST", `${this.config.messagingBase}/v1/Services/${input.messagingServiceSid}/Compliance/Usa2p`, {
      BrandRegistrationSid: brandRegistrationSid,
      Description: input.description,
      MessageFlow: input.optInDetails ?? "Customer opts in during checkout or by texting the business's number.",
      UsAppToPersonUsecase: input.useCase,
      HasEmbeddedLinks: input.hasEmbeddedLinks,
      HasEmbeddedPhone: input.hasEmbeddedPhone,
      MessageSamples: input.sampleMessages.slice(0, 5),
    });
    return this.mapCampaignStatus(campaign);
  }

  async getCampaignStatus(messagingServiceSid: string, providerCampaignId: string): Promise<CampaignStatus> {
    const campaign = await this.client.request<{
      sid: string;
      campaign_status: string;
      errors?: unknown[];
    }>("GET", `${this.config.messagingBase}/v1/Services/${messagingServiceSid}/Compliance/Usa2p/${providerCampaignId}`);
    return this.mapCampaignStatus(campaign);
  }

  /**
   * Twilio's Usa2p resource has no documented general-purpose update endpoint —
   * most fields are immutable post-submission by design. This POSTs to the
   * existing campaign's own resource (Twilio's convention elsewhere for partial
   * updates, e.g. CustomerProfile status), which as of this writing only
   * actually accepts new message samples. Treat other field changes here as
   * best-effort — Twilio may reject them, surfaced via the normal ApiError.
   */
  async updateCampaign(providerCampaignId: string, input: CampaignInput): Promise<CampaignStatus> {
    const campaign = await this.client.request<{
      sid: string;
      campaign_status: string;
      errors?: unknown[];
    }>("POST", `${this.config.messagingBase}/v1/Services/${input.messagingServiceSid}/Compliance/Usa2p/${providerCampaignId}`, {
      Description: input.description,
      MessageFlow: input.optInDetails ?? "Customer opts in during checkout or by texting the business's number.",
      HasEmbeddedLinks: input.hasEmbeddedLinks,
      HasEmbeddedPhone: input.hasEmbeddedPhone,
      MessageSamples: input.sampleMessages.slice(0, 5),
    });
    return this.mapCampaignStatus(campaign);
  }

  // UsAppToPerson campaign_status per Twilio: PENDING, IN_PROGRESS, VERIFIED, FAILED, and
  // rarely SUSPENDED (post-approval enforcement action).
  private mapCampaignStatus(campaign: { sid: string; campaign_status: string; errors?: unknown[] }): CampaignStatus {
    const stage =
      campaign.campaign_status === "VERIFIED"
        ? "APPROVED"
        : campaign.campaign_status === "FAILED"
          ? "REJECTED"
          : campaign.campaign_status === "SUSPENDED"
            ? "SUSPENDED"
            : "PENDING_REVIEW";
    return {
      providerCampaignId: campaign.sid,
      stage,
      failureReason: campaign.errors?.length ? JSON.stringify(campaign.errors) : undefined,
      raw: campaign,
    };
  }

  async listPhoneNumbers(): Promise<ProviderPhoneNumber[]> {
    const result = await this.client.request<{
      incoming_phone_numbers: { sid: string; phone_number: string }[];
    }>("GET", `${this.config.apiBase}/2010-04-01/Accounts/${this.config.accountSid}/IncomingPhoneNumbers.json`);
    return result.incoming_phone_numbers.map((n) => ({ providerSid: n.sid, e164: n.phone_number }));
  }

  async searchAvailableNumbers(areaCode: string): Promise<AvailableNumber[]> {
    const result = await this.client.request<{ available_phone_numbers: { phone_number: string }[] }>(
      "GET",
      `${this.config.apiBase}/2010-04-01/Accounts/${this.config.accountSid}/AvailablePhoneNumbers/US/Local.json?AreaCode=${encodeURIComponent(areaCode)}`
    );
    return (result.available_phone_numbers ?? []).map((n) => ({ e164: n.phone_number }));
  }

  async purchaseNumber(e164: string): Promise<ProviderPhoneNumber> {
    const result = await this.client.request<{ sid: string; phone_number: string }>(
      "POST",
      `${this.config.apiBase}/2010-04-01/Accounts/${this.config.accountSid}/IncomingPhoneNumbers.json`,
      { PhoneNumber: e164 }
    );
    return { providerSid: result.sid, e164: result.phone_number };
  }

  async assignNumberToMessagingService(messagingServiceSid: string, phoneNumberSid: string): Promise<void> {
    await this.client.request("POST", `${this.config.messagingBase}/v1/Services/${messagingServiceSid}/PhoneNumbers`, {
      PhoneNumberSid: phoneNumberSid,
    });
  }
}
