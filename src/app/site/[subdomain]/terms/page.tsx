import { requireSiteSubAccount } from "../data";

export default async function TermsPage({ params }: PageProps<"/site/[subdomain]/terms">) {
  const { subdomain } = await params;
  const subAccount = await requireSiteSubAccount(subdomain);
  const name = subAccount.businessName;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
      <div className="prose prose-sm max-w-none space-y-4 text-slate-700">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Terms of Service</h1>
        <p className="text-slate-500">Last updated {new Date().toLocaleDateString()}</p>

        <h2 className="text-lg font-medium text-slate-900">SMS messaging program</h2>
        <p>
          By opting in to receive SMS text messages from {name}, you agree to these Terms of Service. Message
          frequency may vary. Message and data rates may apply, depending on your mobile carrier and plan.
        </p>

        <h2 className="text-lg font-medium text-slate-900">Opt-in and opt-out</h2>
        <p>
          You may opt in to this program through our website opt-in form. You can opt out of receiving messages
          at any time by replying STOP to any message. After you opt out, you will receive one final message
          confirming your opt-out; you will not receive further messages unless you opt back in. Reply HELP at
          any time for assistance, or contact us at {subAccount.contactEmail ?? "the contact information on our website"}.
        </p>

        <h2 className="text-lg font-medium text-slate-900">Supported carriers</h2>
        <p>
          Carriers are not liable for delayed or undelivered messages. Participating carriers include major U.S.
          wireless carriers. Coverage and reliability may vary by carrier and device.
        </p>

        <h2 className="text-lg font-medium text-slate-900">No guarantee</h2>
        <p>
          We do not guarantee the delivery, timing, or accuracy of any message. {name} is not liable for delays
          or failures in sending or receiving messages.
        </p>

        <h2 className="text-lg font-medium text-slate-900">Changes to these terms</h2>
        <p>
          We may update these Terms of Service from time to time. Continued participation in our SMS program
          after changes are posted constitutes acceptance of the updated terms.
        </p>

        <h2 className="text-lg font-medium text-slate-900">Contact us</h2>
        <p>
          If you have questions about these Terms, contact us at{" "}
          {subAccount.contactEmail ?? "the contact information on our website"}.
        </p>
      </div>
    </div>
  );
}
