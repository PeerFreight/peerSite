import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: "Terms & Conditions - Peer Freight",
  description: "Terms for using Peer Freight's website and SMS messaging program.",
  alternates: { canonical: "https://www.peer-freight.com/terms" },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader cta={{ href: "/quote", label: "Get a Quote" }} />
      <main id="main" className="section section--paper legal-page">
        <article className="wrap legal-content">
          <p className="eyebrow">Legal</p>
          <h1 className="display">Terms &amp; Conditions</h1>
          <p className="legal-updated">Effective July 30, 2026</p>

          <p>
            These Terms &amp; Conditions govern your use of the Peer Freight website and the Peer Freight SMS messaging program. Peer Freight is operated by PeerCV, Inc. By using the website or opting into text messages, you agree to the applicable terms below.
          </p>

          <h2>Website and quote requests</h2>
          <p>
            Website content is provided for general information. A quote request is not a binding offer, booking, or guarantee of capacity. Transportation services are subject to a separate written agreement, rate confirmation, or other applicable service terms. You agree to provide accurate information and not to misuse the website or interfere with its operation.
          </p>

          <h2>Peer Freight SMS messaging program</h2>
          <p>
            When you opt in, Peer Freight may send conversational and operational text messages about your quote requests, customer-care questions, and shipments. Messages may include quote follow-ups, pickup and in-transit updates, delivery notices, document requests, and responses to support questions. We do not use this program for marketing or promotional messages.
          </p>
          <ul>
            <li><strong>Frequency:</strong> Message frequency varies based on your requests and shipment activity.</li>
            <li><strong>Charges:</strong> Message and data rates may apply. Peer Freight does not charge a separate fee for the SMS program.</li>
            <li><strong>Opt out:</strong> Reply STOP at any time to unsubscribe. You will receive a final confirmation and then no further messages unless you opt in again.</li>
            <li><strong>Help:</strong> Reply HELP, call <a href="tel:+15625343334">+1 562-534-3334</a>, or email <a href="mailto:team@peer-freight.com">team@peer-freight.com</a>.</li>
            <li><strong>Consent:</strong> Consent to receive text messages is not a condition of purchasing goods or services.</li>
          </ul>
          <p>
            Wireless carriers are not liable for delayed or undelivered messages. Availability may vary by carrier and device. You are responsible for keeping your mobile number current and for promptly opting out if you no longer control that number. See our <a href="/privacy">Privacy Policy</a> for how we handle personal information and SMS consent data.
          </p>

          <h2>Intellectual property</h2>
          <p>
            The website and its text, graphics, branding, and other content are owned by or licensed to Peer Freight and may not be copied, modified, or distributed without permission, except as allowed by law.
          </p>

          <h2>Disclaimers and limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, the website is provided &quot;as is&quot; without warranties of any kind. Peer Freight is not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the website or SMS program. Nothing in these terms limits liability that cannot legally be limited.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these terms from time to time. The effective date above shows when they were last revised. Continued use after an update constitutes acceptance of the revised terms.
          </p>

          <h2>Contact us</h2>
          <p>
            Questions about these terms or the SMS program can be sent to <a href="mailto:team@peer-freight.com">team@peer-freight.com</a> or <a href="tel:+15625343334">+1 562-534-3334</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
