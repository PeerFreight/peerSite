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
      <SiteHeader tone="solid" cta={{ href: "/quote", label: "Get a Quote" }} />
      <main id="main" className="section section--paper legal-page">
        <article className="wrap legal-content">
          <p className="eyebrow">Legal</p>
          <h1 className="display">Privacy Policy</h1>
          <p className="legal-updated">Effective August 5, 2026</p>

          <p>
            PeerCV, Inc., doing business as Peer Freight (&quot;Peer Freight,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), respects your privacy. This policy explains how we collect, use, disclose, and protect personal information when you visit our website, request a quote, use our customer portal, arrange transportation services, or communicate with us. Our services are designed for businesses, and the information we handle is collected in a business context.
          </p>

          <h2>Information we collect</h2>
          <p>Information you provide to us:</p>
          <ul>
            <li>Contact and business information, including your name, company, work email address, and phone number.</li>
            <li>Account information when you create a portal account, including your name, email address, and a password. Passwords are stored only in hashed form. If you sign in through Google or Microsoft, we receive basic profile information from that provider.</li>
            <li>Shipment and quote information, including origin and destination addresses, pickup and delivery dates and windows, commodity, equipment, dimensions, weight, declared value, temperature requirements, accessorials, reference numbers, and special handling requirements. For hazardous materials shipments this includes regulatory details you provide, such as UN numbers, shipping names, and an emergency contact.</li>
            <li>Shipment documents, such as bills of lading, proof-of-delivery documents, rate confirmations, and invoices, uploaded by you or by us in the course of servicing a shipment.</li>
            <li>Carrier and driver information provided in connection with a shipment, including carrier name, MC and DOT numbers, driver name and phone number, and truck and trailer numbers.</li>
            <li>Carrier onboarding information submitted through our carrier setup form, including company details, authority numbers, equipment, lanes, and payment preferences.</li>
            <li>Teammate information when you invite a colleague to your company&apos;s portal account, limited to their email address and role.</li>
            <li>Communications and preferences, including messages you send us and whether you choose to receive text messages.</li>
          </ul>
          <p>Information collected automatically:</p>
          <ul>
            <li>Basic technical information collected through normal website operations, such as IP address, browser type, device information, and server logs. When you sign in to the portal, we associate the IP address and browser information with your session as a security measure.</li>
            <li>An essential session cookie that keeps you signed in to the portal. We do not use advertising cookies, and we do not run third-party analytics or tracking scripts on our website.</li>
          </ul>
          <p>Location information:</p>
          <ul>
            <li>When live tracking is active on a shipment, we receive periodic location updates for the assigned driver, including coordinates, nearby city and state, and estimated time of arrival. Tracking is initiated through a tracking provider and requires the driver&apos;s participation. We collect this data only for the duration of the shipment and a short period around it.</li>
          </ul>

          <h2>How we use information</h2>
          <p>We use personal information to:</p>
          <ul>
            <li>Respond to quote requests and provide freight brokerage and related customer-care services.</li>
            <li>Operate the customer portal, including accounts, quotes, bookings, shipment status, live tracking, documents, and invoices.</li>
            <li>Coordinate, monitor, and communicate about shipments, including sending transactional emails about quotes, bookings, status changes, delays, documents, and invoices.</li>
            <li>Onboard and pay carriers, and verify carrier identity, authority, insurance, and safety information.</li>
            <li>Operate, secure, troubleshoot, and improve our website and services, including maintaining audit logs of account and shipment activity.</li>
            <li>Meet legal, regulatory, insurance, safety, and recordkeeping obligations, including those that apply to hazardous materials transportation.</li>
            <li>Send operational text messages only when you have consented or when you initiate a text conversation with us.</li>
          </ul>

          <h2>How we disclose information</h2>
          <p>
            We may disclose information to transportation providers and other parties involved in servicing a shipment; to your own company&apos;s portal account, where teammates you or your colleagues invite can see your company&apos;s quotes, shipments, documents, and invoices; to vendors that provide services on our behalf, including cloud hosting and infrastructure, database and file storage, transactional email delivery, mapping and geocoding, shipment tracking, form processing, and security; to professional advisers; to government authorities when required by law; and to parties involved in a corporate transaction. Service providers are permitted to use personal information only to provide services to us. We do not sell personal information, and we do not share it for cross-context behavioral advertising.
          </p>
          <p>
            If we share a tracking link for your shipment, anyone with the link can view a limited tracking page showing the shipment reference, status, origin and destination city and state, recent map location, and estimated arrival. Tracking pages do not show street addresses, contact details, commodity information, or pricing, and links expire after the shipment is delivered or when we revoke them.
          </p>
          <p>
            We will not share your SMS opt-in or consent status with third parties for purposes unrelated to providing the messaging program. We may disclose that information to service providers that help us deliver text messages, such as messaging platforms and telecommunications carriers. All other disclosure categories described above exclude text-messaging originator opt-in data and consent; that information will not be shared with third parties for their own purposes.
          </p>

          <h2>Retention and security</h2>
          <p>
            We retain information for as long as reasonably necessary to provide services, maintain business and compliance records, resolve disputes, and enforce agreements. Transportation records, including shipment details and documents, are kept for the periods required by transportation regulations and our insurers. We use reasonable administrative, technical, and physical safeguards, including encrypted connections, hashed passwords, access controls, and time-limited document links, but no method of transmission or storage is completely secure.
          </p>

          <h2>Your choices and rights</h2>
          <p>
            You may decline to provide optional information. You may opt out of Peer Freight text messages at any time by replying STOP. Reply HELP for help. To request access, correction, or deletion of personal information, contact us using the details below and we will respond within a reasonable time. We may need to retain certain information where required by law or for legitimate business records. California residents may also have rights under the California Consumer Privacy Act, including the rights to know, correct, and delete personal information and the right not to be discriminated against for exercising those rights; you can exercise them through the same contact details.
          </p>

          <h2>Children</h2>
          <p>
            Our website and services are intended for business users and are not directed to children. We do not knowingly collect personal information from anyone under 16.
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
