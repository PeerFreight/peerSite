import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy - Peer Freight",
  description: "How Peer Freight collects, uses, and protects personal information.",
  alternates: { canonical: "https://www.peer-freight.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader cta={{ href: "/quote", label: "Get a Quote" }} />
      <main id="main" className="section section--paper legal-page">
        <article className="wrap legal-content">
          <p className="eyebrow">Legal</p>
          <h1 className="display">Privacy Policy</h1>
          <p className="legal-updated">Effective July 30, 2026</p>

          <p>
            PeerCV, Inc., doing business as Peer Freight (&quot;Peer Freight,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), respects your privacy. This policy explains how we collect, use, disclose, and protect personal information when you visit our website, request a quote, arrange transportation services, or communicate with us.
          </p>

          <h2>Information we collect</h2>
          <p>We may collect:</p>
          <ul>
            <li>Contact and business information, including your name, company, email address, and optional phone number.</li>
            <li>Shipment and quote information, including origin, destination, commodity, equipment, dates, dimensions, weight, and special handling requirements.</li>
            <li>Communications and preferences, including messages you send us and whether you choose to receive text messages.</li>
            <li>Basic technical information collected through normal website operations, such as IP address, browser type, device information, and server logs.</li>
          </ul>

          <h2>How we use information</h2>
          <p>We use personal information to:</p>
          <ul>
            <li>Respond to quote requests and provide freight brokerage and related customer-care services.</li>
            <li>Coordinate, monitor, and communicate about shipments.</li>
            <li>Operate, secure, troubleshoot, and improve our website and services.</li>
            <li>Meet legal, regulatory, insurance, safety, and recordkeeping obligations.</li>
            <li>Send operational text messages only when you have consented or when you initiate a text conversation with us.</li>
          </ul>

          <h2>How we disclose information</h2>
          <p>
            We may disclose information to transportation providers and other parties involved in servicing a shipment; vendors that provide hosting, forms, email, communications, security, and other business services; professional advisers; government authorities when required by law; and parties involved in a corporate transaction. We do not sell personal information.
          </p>
          <p>
            We will not share your SMS opt-in or consent status with third parties for purposes unrelated to providing the messaging program. We may disclose that information to service providers that help us deliver text messages, such as messaging platforms and telecommunications carriers. All other disclosure categories described above exclude text-messaging originator opt-in data and consent; that information will not be shared with third parties for their own purposes.
          </p>

          <h2>Retention and security</h2>
          <p>
            We retain information for as long as reasonably necessary to provide services, maintain business and compliance records, resolve disputes, and enforce agreements. We use reasonable administrative, technical, and physical safeguards, but no method of transmission or storage is completely secure.
          </p>

          <h2>Your choices</h2>
          <p>
            You may decline to provide optional information. You may opt out of Peer Freight text messages at any time by replying STOP. Reply HELP for help. To request access, correction, or deletion of personal information, contact us using the details below. We may need to retain certain information where required by law or for legitimate business records.
          </p>

          <h2>Updates to this policy</h2>
          <p>
            We may update this policy from time to time. The effective date above shows when it was last revised.
          </p>

          <h2>Contact us</h2>
          <p>
            Peer Freight<br />
            Email: <a href="mailto:team@peer-freight.com">team@peer-freight.com</a><br />
            Phone: <a href="tel:+15625343334">+1 562-534-3334</a>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
