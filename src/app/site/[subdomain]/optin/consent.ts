/** The exact SMS consent disclosure shown on the opt-in form, snapshotted into OptInSubmission.consentText at signup time. */
export function consentText(businessName: string): string {
  return `By checking this box and submitting this form, I agree to receive SMS text messages from ${businessName}. Message frequency may vary. Message and data rates may apply. Reply STOP to opt out at any time, or HELP for help. See our Privacy Policy and Terms of Service.`;
}
