import Link from 'next/link'
import { 
  FaTwitter, 
  FaInstagram, 
  FaTiktok, 
  FaYoutube, 
  FaTelegram,
  FaDiscord
} from 'react-icons/fa'

export function Footer() {
  const socialLinks = [
    { name: 'Twitter', href: 'https://x.com/npgxplatform', icon: FaTwitter, color: 'hover:text-white' },
    { name: 'Instagram', href: 'https://instagram.com/npgxplatform', icon: FaInstagram, color: 'hover:text-white' },
    { name: 'TikTok', href: 'https://tiktok.com/@npgxplatform', icon: FaTiktok, color: 'hover:text-white' },
    { name: 'YouTube', href: 'https://youtube.com/@npgxplatform', icon: FaYoutube, color: 'hover:text-red-500' },
    { name: 'Telegram', href: 'https://t.me/npgxplatform', icon: FaTelegram, color: 'hover:text-white' },
    { name: 'Discord', href: 'https://discord.gg/npgxplatform', icon: FaDiscord, color: 'hover:text-white' }
  ]

  const quickLinks = [
    { name: 'Create', href: '/create' },
          { name: 'Gallery', href: '/ninja-punk-girls' },
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'Tokens', href: '/tokens' },
    { name: 'Affiliate', href: '/affiliate' }
  ]

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'DMCA', href: '/dmca' },
    { name: 'Cookies', href: '/cookies' }
  ]

  const platformLinks = [
    { name: 'Business Plan', href: '/business-plan' },
    { name: 'Investors', href: '/investors' },
    { name: 'Pitch Deck', href: '/pitch-deck' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Rankings', href: '/rankings' }
  ]

  return (
    <footer className="bg-black border-t border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-baseline mb-6" style={{ fontFamily: 'var(--font-brand)' }}>
              <span className="text-white font-black text-lg tracking-tight uppercase">NINJA PUNK GIRLS</span>
              <span className="text-red-500 font-black text-2xl ml-1.5">X</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              Revolutionary Ninja Punk Girls X Platform. Create, monetize, and rebel with the future of digital content.
            </p>
              <div className="flex space-x-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  className={`text-gray-400 ${link.color} transition-colors duration-200`}
                  aria-label={link.name}
                >
                  <link.icon className="h-6 w-6" />
                </a>
              ))}
              </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold text-red-400 mb-4">Platform</h4>
            <ul className="space-y-2">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                    className="text-gray-300 hover:text-red-400 transition-colors duration-200"
                    >
                    {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
          </div>

          {/* Business Links */}
          <div>
            <h4 className="text-lg font-bold text-white mb-4">Business</h4>
            <ul className="space-y-2">
              {platformLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                    className="text-gray-300 hover:text-red-400 transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
          </div>

          {/* Legal & Contact */}
          <div>
            <h4 className="text-lg font-bold text-red-400 mb-4">Legal & Support</h4>
            <ul className="space-y-2 mb-6">
                  {legalLinks.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                    className="text-gray-300 hover:text-red-400 transition-colors duration-200"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                    <div>
              <p className="text-gray-400 text-sm mb-2">Contact us:</p>
              <a 
                href="mailto:contact@npgx.com"
                className="text-red-400 hover:text-red-300 transition-colors duration-200 text-sm"
              >
                contact@npgx.com
              </a>
            </div>
          </div>
            </div>
            
        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; 2024 NPGX Platform. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <span className="text-gray-400">Powered by $NPGX Token</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400">Platform Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 