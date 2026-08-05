import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: "Terms & Conditions - Peer Freight",
  description:
    "Terms for using Peer Freight's website, customer portal, and SMS messaging program.",
  alternates: { canonical: "https://www.peer-freight.com/terms" },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader tone="solid" cta={{ href: "/quote", label: "Get a Quote" }} />
      <main id="main" className="section section--paper legal-page">
        <article className="wrap legal-content">
          <p className="eyebrow">Legal</p>
          <h1 className="display">Terms &amp; Conditions</h1>
          <p className="legal-updated">Effective August 5, 2026</p>

          <p>
            These Terms &amp; Conditions govern your use of the Peer Freight website, the Peer Freight customer portal, and the Peer Freight SMS messaging program. Peer Freight is operated by PeerCV, Inc., a Delaware corporation doing business as Peer Freight. By using the website or portal, requesting a quote, or opting into text messages, you agree to these terms. If you use our services on behalf of a company, you represent that you are authorized to accept these terms for that company, and &quot;you&quot; includes that company.
          </p>

          <h2>Business use</h2>
          <p>
            Our website and services are intended for businesses and their authorized representatives. You must be at least 18 years old to use them. You agree to provide accurate, current information and to keep it updated.
          </p>

          <h2>Website and quote requests</h2>
          <p>
            Website content is provided for general information. A quote request is not a binding offer, booking, or guarantee of capacity, and a quote we provide is an estimate that may expire or change until you accept it and we confirm the booking. You agree to provide accurate information and not to misuse the website or interfere with its operation.
          </p>

          <h2>Portal accounts</h2>
          <p>
            Parts of our service are available through a customer portal that requires an account. You are responsible for safeguarding your credentials and for all activity under your account. Accounts belong to your company&apos;s workspace: teammates invited to your company can view and act on your company&apos;s quotes, shipments, documents, and invoices, and you are responsible for who you invite. Notify us promptly at <a href="mailto:team@peer-freight.com">team@peer-freight.com</a> if you suspect unauthorized use. We may suspend or close accounts that violate these terms, present a security risk, or have been inactive for an extended period.
          </p>

          <h2>Transportation services</h2>
          <p>
            Peer Freight arranges freight transportation as a property broker. Transportation itself is performed by independent motor carriers, not by Peer Freight, and we do not take custody of your freight. Transportation services are governed by the applicable written agreement between us, such as a brokerage or transportation agreement, rate confirmation, or other signed service terms. If those documents conflict with these terms, those documents control for the services they cover.
          </p>
          <p>You are responsible for the accuracy and completeness of the shipment information you provide, including:</p>
          <ul>
            <li>Correct descriptions of the commodity, weight, dimensions, piece count, and value.</li>
            <li>Proper classification, packaging, marking, and labeling of your freight, and documentation required for it.</li>
            <li>For hazardous materials, accurate and complete regulatory information, including UN number, proper shipping name, hazard class, packing group, quantity, and a reachable emergency contact, as required by applicable law, including U.S. DOT hazardous materials regulations.</li>
          </ul>
          <p>
            Charges for detention, layover, re-delivery, and other accessorials that result from inaccurate information or conditions at your facilities are your responsibility as set out in the applicable rate confirmation or service agreement.
          </p>

          <h2>Shipment tracking</h2>
          <p>
            When live tracking is available on a shipment, location updates come from the assigned driver&apos;s device through a tracking provider and depend on the driver&apos;s participation, device, and network coverage. Tracking information, including estimated arrival times, is provided for convenience and is not a guarantee of transit time or delivery. If we share a tracking link with you, anyone with the link can view the shipment&apos;s tracking page until the link expires or is revoked, so share it only with people who should see it.
          </p>

          <h2>Documents and information you provide</h2>
          <p>
            You retain your rights in documents and information you submit, such as shipment details and uploaded paperwork. You grant us permission to use, store, and share them as needed to provide our services, including with carriers and vendors involved in servicing your shipments, and you represent that you have the right to provide them to us.
          </p>

          <h2>Invoices and payment</h2>
          <p>
            Rates, payment terms, and invoicing for transportation services are set out in the applicable rate confirmation or written agreement. Invoices we issue through the portal or by email are due according to those terms. If you believe an invoice is incorrect, contact us promptly and we will work through it with you.
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

          <h2>Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the website or portal in violation of law or these terms, or for freight that is illegal to transport.</li>
            <li>Attempt to access accounts, data, or systems you are not authorized to access, or probe or test the vulnerability of our systems without our written permission.</li>
            <li>Interfere with the operation of the website or portal, including by introducing malicious code or placing unreasonable load on our infrastructure.</li>
            <li>Scrape, harvest, or copy content or data from the website or portal by automated means without our written permission.</li>
            <li>Misrepresent your identity, your company, or your authority to act for a shipper or carrier.</li>
          </ul>

          <h2>Intellectual property</h2>
          <p>
            The website, portal, and their text, graphics, branding, software, and other content are owned by or licensed to Peer Freight and may not be copied, modified, or distributed without permission, except as allowed by law. We grant you a limited, revocable, non-transferable right to use the website and portal for your company&apos;s ordinary business purposes.
          </p>

          <h2>Third-party services</h2>
          <p>
            Our services rely on third-party providers, such as tracking, mapping, hosting, and email vendors, and the website may link to third-party sites. We are not responsible for third-party services or content, and your use of them may be subject to their own terms.
          </p>

          <h2>Disclaimers</h2>
          <p>
            To the fullest extent permitted by law, the website, portal, and SMS program are provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the website or portal will be uninterrupted, error-free, or secure, or that tracking information will be accurate or timely. This section does not limit obligations we expressly accept in a signed transportation agreement or rate confirmation.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, Peer Freight will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, or data, arising from use of the website, portal, or SMS program. To the same extent, our total liability arising from the website, portal, or SMS program will not exceed one hundred dollars ($100). Liability relating to transportation services is governed by the applicable transportation agreement, rate confirmation, and law, not by this paragraph. Nothing in these terms limits liability that cannot legally be limited.
          </p>

          <h2>Indemnification</h2>
          <p>
            You agree to indemnify and hold Peer Freight harmless from claims, damages, and expenses, including reasonable attorneys&apos; fees, arising from your breach of these terms, your misuse of the website or portal, or inaccurate or incomplete shipment information you provide, including hazardous materials declarations.
          </p>

          <h2>Governing law and disputes</h2>
          <p>
            These terms are governed by the laws of the State of California, without regard to its conflict of laws rules. Any dispute arising from these terms or your use of the website, portal, or SMS program that the parties cannot resolve informally will be brought exclusively in the state or federal courts located in Los Angeles County, California, and you consent to their jurisdiction. Disputes about transportation services are handled as set out in the applicable transportation agreement or rate confirmation.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these terms from time to time. The effective date above shows when they were last revised. Continued use after an update constitutes acceptance of the revised terms.
          </p>

          <h2>General</h2>
          <p>
            These terms, together with the agreements they reference, are the entire agreement between you and Peer Freight about the website, portal, and SMS program. If any provision is found unenforceable, the rest remain in effect. Our failure to enforce a provision is not a waiver. You may not assign these terms without our consent; we may assign them in connection with a merger, acquisition, or sale of assets.
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
