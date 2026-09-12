export type BrandInput = {
  legalBusinessName: string;
  ein: string;
  businessType: string; // Twilio business_type enum, e.g. "Private Corporation", "Sole Proprietor"
  vertical: string; // Twilio business_industry / TextGrid vertical enum, e.g. "REAL_ESTATE", "HEALTHCARE"
  website?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  authorizedRep: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    businessTitle: string;
    jobPosition: string; // Twilio job_position enum: "Director", "GM", "VP", "CEO", "CFO", "General Counsel", "Other"
  };

  // TextGrid-only fields below. Twilio's provider ignores all of these. When
  // omitted, the TextGrid provider derives sensible defaults (see
  // textgridProvider.ts) so a submission still works without a UI change.
  mobilePhone?: string; // required by TCR for Sole Proprietor OTP verification
  entityType?: "SOLE_PROPRIETOR" | "PRIVATE_PROFIT" | "PUBLIC_PROFIT" | "NON_PROFIT" | "GOVERNMENT";
  brandRelationship?: "BASIC_ACCOUNT" | "SMALL_ACCOUNT" | "MEDIUM_ACCOUNT" | "LARGE_ACCOUNT" | "KEY_ACCOUNT";
  stockSymbol?: string;
  stockExchange?: string;
  altBusinessId?: string;
  altBusinessIdType?: string;
  referenceId?: string;
};

export type BrandStatus = {
  providerBrandId: string;
  stage: "PENDING_REVIEW" | "APPROVED" | "FAILED";
  failureReason?: string;
  raw?: unknown;
};

export type CampaignInput = {
  messagingServiceSid: string;
  useCase: string;
  description: string;
  sampleMessages: string[];
  optInDetails?: string;
  optInImageUrl?: string;
  hasEmbeddedLinks: boolean;
  hasEmbeddedPhone: boolean;

  // TextGrid-only fields below. Twilio's provider ignores all of these. When
  // omitted, the TextGrid provider derives sensible defaults (see
  // textgridProvider.ts) so a submission still works without a UI change.
  subUsecases?: string[];
  termsAndConditionsLink?: string;
  privacyPolicyLink?: string;
  helpKeywords?: string;
  helpMessage?: string;
  optinKeywords?: string;
  optinMessage?: string;
  optoutKeywords?: string;
  optoutMessage?: string;
  referenceId?: string;
  autoRenewal?: boolean;
};

export type CampaignStatus = {
  providerCampaignId: string;
  stage: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
  failureReason?: string;
  throughputPerMinute?: number;
  raw?: unknown;
};

export type ProviderPhoneNumber = {
  providerSid: string;
  e164: string;
  assignedMessagingServiceSid?: string;
};

export interface ProviderAdapter {
  submitBrand(input: BrandInput): Promise<BrandStatus>;
  getBrandStatus(providerBrandId: string): Promise<BrandStatus>;

  createMessagingService(friendlyName: string): Promise<{ sid: string }>;
  submitCampaign(brandId: string, input: CampaignInput): Promise<CampaignStatus>;
  getCampaignStatus(messagingServiceSid: string, providerCampaignId: string): Promise<CampaignStatus>;

  listPhoneNumbers(): Promise<ProviderPhoneNumber[]>;
  assignNumberToMessagingService(messagingServiceSid: string, phoneNumberSid: string): Promise<void>;
}
