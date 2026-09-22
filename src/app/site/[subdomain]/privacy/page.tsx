import { requireSiteSubAccount } from "../data";

export default async function PrivacyPage({ params }: PageProps<"/site/[subdomain]/privacy">) {
  const { subdomain } = await params;
  const subAccount = await requireSiteSubAccount(subdomain);
  const name = subAccount.businessName;

  return (
    <div className="prose prose-sm max-w-none space-y-4 text-neutral-800">
      <h1 className="text-2xl font-semibold text-neutral-900">Privacy Policy</h1>
      <p className="text-neutral-500">Last updated {new Date().toLocaleDateString()}</p>

      <p>
        This Privacy Policy describes how {name} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects,
        uses, and protects information you provide when you sign up to receive SMS text messages from us.
      </p>

      <h2 className="text-lg font-medium text-neutral-900">Information we collect</h2>
      <p>
        When you opt in to receive text messages, we collect your name and mobile phone number. We may also
        collect information you share with us in the course of using our services.
      </p>

      <h2 className="text-lg font-medium text-neutral-900">How we use your information</h2>
      <p>
        We use your phone number to send you SMS messages related to your account and our services, such as
        account notifications, updates, and other communications you&apos;ve opted in to receive.
      </p>

      <h2 className="text-lg font-medium text-neutral-900">Sharing your information</h2>
      <p>
        No mobile opt-in data or consent will be shared with any third party for marketing or promotional
        purposes. Your phone number and opt-in status are used solely by {name} to send you the messages you
        signed up for, and are not sold or shared with unaffiliated third parties.
      </p>

      <h2 className="text-lg font-medium text-neutral-900">Opting out</h2>
      <p>
        You can opt out of text messages at any time by replying STOP to any message you receive from us. You
        can also reply HELP for assistance. Message and data rates may apply.
      </p>

      <h2 className="text-lg font-medium text-neutral-900">Data security</h2>
      <p>
        We take reasonable measures to protect the information you provide from unauthorized access, use, or
        disclosure.
      </p>

      <h2 className="text-lg font-medium text-neutral-900">Contact us</h2>
      <p>
        If you have questions about this Privacy Policy, contact us at{" "}
        {subAccount.contactEmail ?? "the contact information on our website"}.
      </p>
    </div>
  );
}
