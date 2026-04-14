import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-transparent py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/5 rounded-2xl shadow-xl p-8 sm:p-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-4">
              Terms of Service
            </h1>
            <p className="text-gray-400 text-lg">
              Last updated: March 10, 2026
            </p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                By accessing and using the $NPGX platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Age Restriction</h2>
              <p className="text-gray-300 leading-relaxed">
                You must be at least 18 years old to use this service. By using our platform, you represent and warrant that you are at least 18 years old 
                and have the legal capacity to enter into this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. AI-Generated Content</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  All content generated through our platform is created using artificial intelligence and does not represent real individuals. 
                  Users acknowledge that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All NPGX characters are fictional characters created by AI algorithms</li>
                  <li>Images, videos, and conversations are entirely AI-generated</li>
                  <li>No real persons are depicted or represented in our AI-generated content</li>
                  <li>Content is for entertainment and fantasy purposes only</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Token Economy & Blockchain</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  Our platform includes a token-based economy where each NPGX character has associated cryptocurrency tokens:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Tokens can be launched on multiple blockchains (BTC, ETH, SOL, TRON, SUI, BSV)</li>
                  <li>Token values fluctuate based on market conditions</li>
                  <li>We do not guarantee token performance or value</li>
                  <li>Cryptocurrency investments carry inherent risks</li>
                  <li>Users are responsible for their own investment decisions</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Content Policy</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  While our platform generates adult content, we maintain strict policies:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All generated content must comply with applicable laws</li>
                  <li>No content depicting minors or illegal activities</li>
                  <li>Users may not use our service for harassment or harmful purposes</li>
                  <li>We reserve the right to remove content that violates our policies</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Intellectual Property</h2>
              <p className="text-gray-300 leading-relaxed">
                Users retain rights to content they create using our platform. However, by using our service, you grant us a license to use, 
                modify, and distribute your content for platform operation and improvement purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Platform Fees</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  Our platform charges fees for various services:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>AI image generation: $0.01 - $0.025 per image</li>
                  <li>Premium features and subscriptions</li>
                  <li>Token launch and management fees</li>
                  <li>Transaction fees may apply for blockchain operations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Disclaimers</h2>
              <div className="text-gray-300 leading-relaxed space-y-4">
                <p>
                  THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DISCLAIM ALL WARRANTIES, 
                  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Merchantability and fitness for a particular purpose</li>
                  <li>Accuracy or reliability of AI-generated content</li>
                  <li>Uninterrupted or error-free service</li>
                  <li>Security of user data or tokens</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-300 leading-relaxed">
                IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, 
                INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, OR OTHER INTANGIBLE LOSSES.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
              <p className="text-gray-300 leading-relaxed">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, 
                including without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Changes to Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, 
                we will try to provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Contact Information</h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about these Terms, please contact us at:
                <br />
                <strong>Email:</strong> ninjapunkgirlsx@gmail.com
                <br />
                <strong>Address:</strong> $NPGX Legal Department, Digital Services Division
              </p>
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