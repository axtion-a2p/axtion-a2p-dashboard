export type BrandInput = {
  legalBusinessName: string;
  ein: string;
  businessType: string; // Twilio business_type enum, e.g. "Private Corporation", "Sole Proprietor"
  vertical: string; // Twilio business_industry enum, e.g. "REAL_ESTATE", "HEALTHCARE"
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
