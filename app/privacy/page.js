import Link from "next/link";
import "./policy.css";

export const metadata = {
  title: "Privacy Policy | Magic Moments",
  description: "Privacy Policy and Google User Data handling practices for Magic Moments.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <Link href="/" className="legal-brand">
            <span>✨</span> Magic Moments
          </Link>
          <span className="legal-badge">Legal & Security</span>
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last Updated: October 14, 2026</p>
        </header>

        <section className="legal-content">
          <h2>1. Introduction</h2>
          <p>
            Welcome to <strong>Magic Moments</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), accessible at{" "}
            <a href="https://www.magicmoments.live">https://www.magicmoments.live</a>. We are committed to protecting
            your privacy and safeguarding your personal information. This Privacy Policy details how we collect, use,
            protect, and disclose information when you use our interactive celebration creator, authentication services,
            and shared memory pages.
          </p>

          <h2>2. Information We Collect</h2>
          <p>We only collect information necessary to provide and enhance our services:</p>
          <ul>
            <li>
              <strong>Account &amp; Authentication Information:</strong> When you sign in via Google OAuth or Email verification,
              we collect your email address, name, and profile picture (if provided by Google) to authenticate your account
              and maintain your saved celebration drafts.
            </li>
            <li>
              <strong>Celebration Content:</strong> When you design a celebration page, you may provide names, nicknames,
              birthdates, personalized messages, curated reasons, and photographs you choose to upload.
            </li>
            <li>
              <strong>Payment Information:</strong> All financial transactions are processed securely through our verified
              payment gateway, Razorpay. We do not store credit/debit card numbers, CVVs, or banking credentials on our servers.
            </li>
            <li>
              <strong>Usage &amp; Device Information:</strong> We log non-personally identifiable technical information such
              as browser type, operating system, device category (mobile/desktop), and approximate timestamps to ensure
              interactive features (such as candle blowing, animations, and sound effects) render properly on your device.
            </li>
          </ul>

          <h2>3. Google User Data Policy &amp; OAuth Compliance</h2>
          <p>
            Magic Moments complies with the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements:
          </p>
          <ul>
            <li>
              <strong>Data Access:</strong> We strictly request read-only profile access (<code>openid</code>, <code>email</code>, <code>profile</code>)
              solely to verify your identity and link your purchased or drafted celebration links to your account.
            </li>
            <li>
              <strong>No Transfer or Sale:</strong> We <em>never</em> sell, rent, trade, or transfer your Google user data to
              third-party advertisers, data brokers, or information resellers.
            </li>
            <li>
              <strong>No AI Model Training:</strong> Your Google user data is never used to train generalized artificial
              intelligence or machine learning models.
            </li>
            <li>
              <strong>Data Retention:</strong> You may request deletion of your account and associated celebration pages at
              any time by contacting our support team.
            </li>
          </ul>

          <h2>4. How We Use Your Information</h2>
          <p>We use collected data solely for:</p>
          <ul>
            <li>Generating your personalized interactive celebration surprise page.</li>
            <li>Authenticating your session and providing discounted member pricing (₹49 tier vs ₹199 non-login tier).</li>
            <li>Sending transactional notices (e.g., payment confirmation receipts and optional milestone reminders).</li>
            <li>Diagnosing technical issues, preventing fraud, and optimizing system uptime.</li>
          </ul>

          <h2>5. Data Storage and Security</h2>
          <p>
            We implement industry-standard encryption (HTTPS/TLS) across all client-server communications. User credentials
            and tokens are securely stored using cryptographic hashing and strict environment separation.
          </p>

          <h2>6. Third-Party Services</h2>
          <p>We partner with trusted third-party providers for core infrastructure:</p>
          <ul>
            <li><strong>Google Identity Services:</strong> For secure OAuth authentication.</li>
            <li><strong>Razorpay:</strong> For RBI-compliant, PCI-DSS certified payment processing.</li>
            <li><strong>Cloudinary:</strong> For secure storage and CDN delivery of user-uploaded celebration photos.</li>
            <li><strong>MongoDB Atlas:</strong> For secure database management and encrypted record storage.</li>
          </ul>

          <h2>7. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or wish to request data deletion, contact us at:
          </p>
          <div className="legal-contact-box">
            <strong>Magic Moments Support</strong>
            <p>Website: <a href="https://www.magicmoments.live">https://www.magicmoments.live</a></p>
            <p>Email: <a href="mailto:magicmoments.work@gmail.com">magicmoments.work@gmail.com</a></p>
          </div>
        </section>

        <footer className="legal-footer">
          <Link href="/">← Back to Magic Moments</Link>
          <Link href="/terms">Terms of Service →</Link>
        </footer>
      </div>
    </main>
  );
}
