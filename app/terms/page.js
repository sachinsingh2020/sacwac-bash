import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";
import "./policy.css";

export const metadata = {
  title: "Terms of Service | Magic Moments",
  description: "Terms and conditions of use for Magic Moments celebration creator and services.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <Link href="/" className="legal-brand">
            <span>✨</span> Magic Moments
          </Link>
          <span className="legal-badge">Legal & Security</span>
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last Updated: October 14, 2026</p>
        </header>

        <section className="legal-content">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using <strong>Magic Moments</strong> (&quot;the Service&quot;), hosted at{" "}
            <a href="https://www.magicmoments.live">https://www.magicmoments.live</a>, you agree to be bound by these
            Terms of Service. If you do not agree to these terms, please do not use the service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Magic Moments is an online celebration craft platform that enables users to create personalized interactive
            digital greeting pages featuring touch-responsive games, 3D candle blowouts, love letters, and memory vaults.
          </p>

          <h2>3. User Accounts and Pricing Tiers</h2>
          <p>
            We offer transparent pricing options:
          </p>
          <ul>
            <li>
              <strong>Instant Purchase (Without Login):</strong> Users may purchase and unlock celebration links directly
              at our standard one-time rate (₹199).
            </li>
            <li>
              <strong>Member Purchase (With Login):</strong> Users who sign in using Google OAuth or verified email
              receive exclusive discounted creator pricing (₹49) and have access to draft management.
            </li>
          </ul>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials and for all activities that
            occur under your account.
          </p>

          <h2>4. User Content &amp; Conduct</h2>
          <p>
            You retain ownership of any photographs, messages, or text you submit to Magic Moments. However, you agree
            not to upload, transmit, or share any content that:
          </p>
          <ul>
            <li>Is unlawful, harmful, defamatory, obscene, harassing, or invasive of another person&apos;s privacy.</li>
            <li>Infringes any copyright, trademark, trade secret, or other proprietary rights.</li>
            <li>Contains viruses, malicious code, or software designed to compromise user security.</li>
          </ul>

          <h2>5. Payment, Refunds &amp; Delivery</h2>
          <p>
            All payments are processed securely via Razorpay. Upon successful transaction authorization, your custom
            celebration link is instantly generated and delivered in your browser with 1-click WhatsApp sharing options.
            Due to the immediate digital nature of the generated URLs, all sales are considered final once the custom
            celebration page is created. If you encounter any technical glitch during order creation, contact our support
            for immediate remediation.
          </p>

          <h2>6. Service Availability &amp; Modifications</h2>
          <p>
            We strive to provide continuous uptime and uninterrupted access to your celebration links. However, we reserve
            the right to modify, suspend, or discontinue any aspect of the service with reasonable notice when necessary
            for infrastructure maintenance.
          </p>

          <h2>7. Limitation of Liability</h2>
          <p>
            In no event shall Magic Moments, its founders, or affiliates be liable for any indirect, incidental, or
            consequential damages resulting from your access to or inability to use the platform.
          </p>

          <h2>8. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict
            of law provisions.
          </p>

          <h2>9. Contact Us</h2>
          <div className="legal-contact-box">
            <strong>Magic Moments Legal Support</strong>
            <p>Website: <a href="https://www.magicmoments.live">https://www.magicmoments.live</a></p>
            <p>Email: <a href="mailto:magicmoments.work@gmail.com">magicmoments.work@gmail.com</a></p>
          </div>
        </section>

        <footer className="legal-footer">
          <Link href="/">← Back to Magic Moments</Link>
          <Link href="/privacy">Privacy Policy →</Link>
        </footer>
      </div>
      <SiteFooter />
    </main>
  );
}
