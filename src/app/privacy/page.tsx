import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-transparent py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/5 rounded-2xl shadow-xl p-8 sm:p-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-4">
              Privacy Policy
            </h1>
            <p className="text-gray-400 text-lg">
              Last updated: March 10, 2026
            </p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  We collect information you provide directly to us, such as when you create an account, 
                  generate AI content, or contact us for support:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Account information (email, username, profile data)</li>
                  <li>Payment and billing information</li>
                  <li>AI generation preferences and settings</li>
                  <li>Content creation history and generated images</li>
                  <li>Communication and support interactions</li>
                  <li>Blockchain wallet addresses and transaction data</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide, maintain, and improve our NPGX platform</li>
                  <li>Process payments and manage your account</li>
                  <li>Generate personalized AI content based on your preferences</li>
                  <li>Facilitate token transactions and blockchain operations</li>
                  <li>Send you technical notices, updates, and promotional communications</li>
                  <li>Provide customer support and respond to your inquiries</li>
                  <li>Monitor and analyze platform usage and performance</li>
                  <li>Detect, prevent, and address technical issues and fraud</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Information Sharing and Disclosure</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  We may share your information in the following circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Service Providers:</strong> Third-party companies that help us operate our platform (AI providers, payment processors, cloud storage)</li>
                  <li><strong>Blockchain Networks:</strong> Token transactions are recorded on public blockchains</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and users</li>
                  <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
                  <li><strong>Consent:</strong> When you explicitly consent to sharing</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. AI-Generated Content Privacy</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  Regarding AI-generated content on our platform:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All NPGX characters are fictional and not based on real individuals</li>
                  <li>Generated images and content are stored securely in your account</li>
                  <li>We may use anonymized generation data to improve our AI models</li>
                  <li>Content preferences help us personalize your experience</li>
                  <li>You control the sharing and distribution of your generated content</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Cryptocurrency and Blockchain Privacy</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  Our token economy involves blockchain transactions:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Blockchain transactions are public and permanent</li>
                  <li>Wallet addresses may be linked to your account</li>
                  <li>Token holdings and transactions are visible on blockchain explorers</li>
                  <li>We don't control blockchain data once transactions are confirmed</li>
                  <li>Consider privacy implications before engaging in token activities</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Data Security</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  We implement appropriate security measures to protect your information:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security audits and vulnerability assessments</li>
                  <li>Access controls and authentication requirements</li>
                  <li>Secure cloud infrastructure and data centers</li>
                  <li>Employee training on data protection practices</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights and Choices</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  You have the following rights regarding your personal information:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                  <li><strong>Portability:</strong> Export your data in a structured format</li>
                  <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                  <li><strong>Restriction:</strong> Limit how we process your data</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Cookies and Tracking</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  We use cookies and similar technologies to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Authenticate your account and maintain sessions</li>
                  <li>Analyze platform usage and performance</li>
                  <li>Provide personalized content and recommendations</li>
                  <li>Deliver targeted advertisements (with consent)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. International Data Transfers</h2>
              <p className="text-gray-300 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place to protect your data during international transfers, 
                in accordance with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Children's Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Our service is not intended for users under 18 years of age. We do not knowingly collect 
                personal information from children under 18. If we become aware that we have collected 
                personal information from a child under 18, we will take steps to delete such information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by 
                posting the new Privacy Policy on this page and updating the "Last updated" date. 
                We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Contact Us</h2>
              <div className="text-gray-300 leading-relaxed">
                <p className="mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-transparent p-4 rounded-lg">
                                        <p><strong>Email:</strong> ninjapunkgirlsx@gmail.com</p>
            <p><strong>Data Protection Officer:</strong> ninjapunkgirlsx@gmail.com</p>
                            <p><strong>Address:</strong> $NPGX Privacy Team, Digital Services Division</p>
          <p><strong>Phone:</strong> +1 (555) NPGX-PRIVACY</p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-center">
            <Link
              href="/"
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-full font-semibold hover:scale-105 transition-transform"
            >
              Return to Platform
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 