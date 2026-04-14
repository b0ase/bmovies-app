'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { FaUserCircle } from 'react-icons/fa'
import { WalletButton } from '@/components/WalletButton'
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaTwitter,
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaTelegram,
  FaChartLine,
  FaPalette,
  FaBriefcase,
  FaRocket,
  FaUsers,
  FaFileContract,
  FaBullseye,
  FaShoppingCart,
  FaDollarSign,
  FaTrophy,
  FaSignInAlt,
  FaCoins,
  FaExchangeAlt,
  FaSkull,
  FaFire,
  FaBook,
  FaIdCard,
  FaSlidersH,
  FaCamera,
  FaVideo,
  FaUserNinja,
  FaWrench,
  FaMusic,
  FaBolt,
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaMicrochip,
  FaFont,
  FaCogs,
  FaCompactDisc
} from 'react-icons/fa'
import { NPGX_ROSTER } from '@/lib/npgx-roster'
import { useMusic } from '@/hooks/MusicProvider'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'

const HIDE_MUSIC_ON = ['/movie-editor', '/watch']

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const { data: session } = useSession()
  const pathname = usePathname()
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || null
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Use shared music context — single audio source for the whole app
  const { isPlaying, toggle: togglePlay, volume, setVolume, isMuted, setMuted } = useMusic()

  const toggleMute = () => setMuted(!isMuted)
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // NPGX mega-menu data — all 26 from roster with avatar thumbnails
  const characterItems = NPGX_ROSTER.map(c => ({
    name: c.name,
    href: `/npgx/${c.slug}`,
    letter: c.letter,
    image: c.image,
  }))

  const mainNavigation = [
    {
      name: 'Create',
      icon: FaPalette,
      dropdown: [
        { name: 'Poster Studio', href: '/image-gen', icon: FaCamera },
        { name: 'Video Generator', href: '/video-gen', icon: FaVideo },
        { name: 'One-Shot Generator', href: '/one-shot', icon: FaBolt },
        { name: 'Title Designer', href: '/title-designer', icon: FaFont },
        { name: 'Graphic Design', href: '/graphic-design', icon: FaFont },
        { name: 'Motion Graphics', href: '/motion-graphics', icon: FaFont },
        { name: 'Director', href: '/director', icon: FaVideo },
        { name: 'Storyboard', href: '/storyboard', icon: FaVideo },
        { name: 'MV Editor', href: '/music-video-editor', icon: FaVideo },
        { name: 'Prompt Generator', href: '/prompt-gen', icon: FaFire },
        { name: 'All Tools Hub', href: '/tools', icon: FaWrench },
      ]
    },
    {
      name: 'Studio',
      icon: FaSlidersH,
      dropdown: [
        { name: 'Video Mixer', href: '/mixer', icon: FaSlidersH },
        { name: 'Storyline Generator', href: '/storyline-gen', icon: FaFileContract },
        { name: 'Script Generator', href: '/script-gen', icon: FaFileContract },
        { name: 'Storyboard Generator', href: '/storyboard-gen', icon: FaVideo },
        { name: 'Music Studio', href: '/music-studio', icon: FaMusic },
        { name: 'Movie Editor', href: '/movie-editor', icon: FaVideo },
        { name: 'Quality Checker', href: '/quality-checker', icon: FaWrench },
      ]
    },
    {
      name: 'NPGX',
      icon: FaUserNinja,
      megaMenu: true,
    },
    {
      name: 'Watch',
      icon: FaPlay,
      dropdown: [
        { name: 'Watch NPGX', href: '/watch', icon: FaPlay },
        { name: 'Music Videos', href: '/music-videos', icon: FaVideo },
        { name: 'Movies', href: '/movies', icon: FaVideo },
        { name: 'Music', href: '/music', icon: FaMusic },
        { name: 'Albums', href: '/album', icon: FaCompactDisc },
        { name: 'XXX Gallery', href: '/xxx', icon: FaFire },
      ]
    },
    {
      name: 'Platform',
      icon: FaUsers,
      dropdown: [
        { name: 'Store', href: '/store', icon: FaShoppingCart },
        { name: 'Launchpad', href: '/launchpad', icon: FaRocket },
        { name: 'Exchange', href: '/exchange', icon: FaExchangeAlt },
        { name: '$NPGX Tokens', href: '/tokens', icon: FaCoins },
        { name: 'Leaderboard', href: '/rankings', icon: FaTrophy },
        { name: 'Magazine', href: '/magazine', icon: FaBook },
        { name: 'Trading Cards', href: '/cards', icon: FaIdCard },
        { name: 'Character Viewer', href: '/character-viewer', icon: FaUserNinja },
        { name: 'Marketplace', href: '/marketplace', icon: FaShoppingCart },
        { name: 'Skills', href: '/skills', icon: FaCogs },
        { name: 'Agent', href: '/agent', icon: FaMicrochip },
      ]
    },
    {
      name: 'Business',
      icon: FaBriefcase,
      dropdown: [
        { name: 'Business Model', href: '/business-model', icon: FaUsers },
        { name: '$NPGX Token', href: '/token', icon: FaDollarSign },
        { name: 'Investors', href: '/investors', icon: FaDollarSign },
        { name: 'Revolution Plan', href: '/business-plan', icon: FaFileContract },
        { name: 'Pitch Deck', href: '/pitch-deck', icon: FaBullseye },
        { name: 'Metrics', href: '/metrics', icon: FaChartLine },
      ]
    },
  ]

  const socialLinks = [
    { name: 'Twitter', href: 'https://x.com/ninjapunkgirlsx', icon: FaTwitter, color: 'hover:text-red-400' },
    { name: 'Instagram', href: 'https://instagram.com/ninjapunkgirls', icon: FaInstagram, color: 'hover:text-red-400' },
    { name: 'TikTok', href: 'https://tiktok.com/@ninjapunkgirls', icon: FaTiktok, color: 'hover:text-red-500' },
    { name: 'YouTube', href: 'https://youtube.com/@ninjapunkgirls', icon: FaYoutube, color: 'hover:text-red-600' },
    { name: 'Telegram', href: 'https://t.me/ninjapunkgirls', icon: FaTelegram, color: 'hover:text-red-400' }
  ]

  const handleDropdownToggle = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name)
  }

  return (
    <nav className="bg-black/95 backdrop-blur-md shadow-2xl relative z-50 border-b border-white/10">
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center h-16 lg:h-20 gap-4">

          {/* ─── LEFT: Logo + Player ─── */}
          <div className="flex items-center gap-5 flex-shrink-0">
            <Link href="/home" className="flex items-baseline gap-1.5">
              <span className="text-white font-black text-lg lg:text-xl tracking-tight uppercase" style={{ fontFamily: 'var(--font-brand)' }}>
                NINJA PUNK GIRLS
              </span>
              <span className="text-red-500 font-black text-xl lg:text-2xl leading-none" style={{ fontFamily: 'var(--font-brand)' }}>
                X
              </span>
            </Link>

            {/* Music Player — disabled for now */}
            {false && <div className="flex items-center gap-2 bg-red-950/30 px-3 py-1.5" style={{ clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
              <button
                onClick={togglePlay}
                className={`p-1 transition-all ${isPlaying ? 'text-red-500' : 'text-red-700 hover:text-red-400'}`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <FaPause className="w-3 h-3" /> : <FaPlay className="w-3 h-3" />}
              </button>
              {isPlaying && (
                <div className="flex items-center gap-px">
                  {[1,2,3,4,5].map(i => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-red-500"
                      animate={{ height: [3, 14, 5, 11, 3] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }}
                    />
                  ))}
                </div>
              )}
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolume}
                className="hidden sm:block w-14 h-0.5 accent-red-500 cursor-pointer"
              />
              <button
                onClick={toggleMute}
                className="hidden sm:block text-red-700 hover:text-red-400 p-0.5 transition-colors"
              >
                {isMuted || volume === 0 ? <FaVolumeMute className="w-3 h-3" /> : <FaVolumeUp className="w-3 h-3" />}
              </button>
            </div>}
          </div>

          {/* ─── CENTER: Nav items (desktop only) ─── */}
          <div className="hidden lg:flex flex-1 justify-center" ref={dropdownRef}>
            <div className="flex items-center">
              {mainNavigation.map((item) => (
                <div key={item.name} className="relative">
                  {'megaMenu' in item && item.megaMenu ? (
                    /* Characters mega-menu — all 26 in a grid */
                    <div className="relative">
                      <button
                        onClick={() => handleDropdownToggle(item.name)}
                        className="text-red-500/80 hover:text-red-400 px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wide transition-all flex items-center gap-1.5"
                      >
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="hidden xl:inline">{item.name}</span>
                        <ChevronDownIcon className={`h-3 w-3 transition-transform ${activeDropdown === item.name ? 'rotate-180' : ''}`} />
                      </button>

                      {activeDropdown === item.name && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[520px] bg-black/95 backdrop-blur-xl shadow-2xl shadow-red-950/20 p-4 z-50 border border-red-500/10 rounded-lg"
                        >
                          <Link
                            href="/npgx"
                            className="block text-center text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-widest mb-3 pb-2 border-b border-white/10"
                            onClick={() => setActiveDropdown(null)}
                          >
                            View Full A-Z Roster
                          </Link>
                          <div className="grid grid-cols-4 gap-1">
                            {characterItems.map(c => (
                              <Link
                                key={c.letter}
                                href={c.href}
                                className="flex items-center gap-2 px-2 py-1.5 text-gray-400 hover:bg-red-600/10 hover:text-red-400 transition-all rounded text-xs font-medium"
                                onClick={() => setActiveDropdown(null)}
                              >
                                <img
                                  src={c.image}
                                  alt={c.name}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-red-500/20"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
                                />
                                <span className="w-5 h-5 rounded-full bg-red-600/30 flex items-center justify-center text-[10px] font-black text-red-400 flex-shrink-0 font-[family-name:var(--font-brand)] hidden">
                                  {c.letter}
                                </span>
                                <span className="truncate">{c.name.split(' ')[0]}</span>
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ) : 'dropdown' in item && item.dropdown ? (
                    <div className="relative">
                      <button
                        onClick={() => handleDropdownToggle(item.name)}
                        className="text-red-500/80 hover:text-red-400 px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wide transition-all flex items-center gap-1.5"
                      >
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="hidden xl:inline">{item.name}</span>
                        <ChevronDownIcon className={`h-3 w-3 transition-transform ${activeDropdown === item.name ? 'rotate-180' : ''}`} />
                      </button>

                      {activeDropdown === item.name && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-full left-0 mt-2 w-60 bg-black/95 backdrop-blur-xl shadow-2xl shadow-red-950/20 py-2 z-50 border border-red-500/10"
                          style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 6px) 100%, 6px 100%)' }}
                        >
                          {item.dropdown.map((subItem) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className="flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:bg-red-600/10 hover:text-red-400 transition-all mx-1.5 rounded-md text-sm font-medium"
                              onClick={() => setActiveDropdown(null)}
                            >
                              <subItem.icon className="w-3.5 h-3.5 flex-shrink-0 text-red-600/50" />
                              <span>{subItem.name}</span>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={'href' in item ? item.href! : '#'}
                      className="text-red-500/80 hover:text-red-400 px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wide transition-all flex items-center gap-1.5"
                    >
                      <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="hidden xl:inline">{item.name}</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: Socials + Auth + Hamburger ─── */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {/* Social icons — xl only */}
            <div className="hidden xl:flex items-center gap-1">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className={`text-gray-400 ${social.color} p-2 rounded-lg transition-all hover:bg-white/10`}
                  title={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>

            {/* Divider — xl only */}
            <div className="hidden xl:block w-px h-6 bg-white/10" />

            {/* Account — lg+ */}
            <div className="hidden lg:flex items-center gap-2">
              <WalletButton variant="nav" />
              {userName && (
                <Link
                  href="/user/account"
                  className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10"
                >
                  <FaUserNinja className="w-4 h-4 text-red-500" />
                  <span className="hidden xl:inline">{userName}</span>
                </Link>
              )}
            </div>

            {/* Hamburger — below lg */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden text-gray-300 hover:text-white p-2 rounded-lg transition-colors"
            >
              {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* ─── Mobile menu ─── */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-white/10"
            >
              <div className="py-4 space-y-3">
                {mainNavigation.map((item) => (
                  <div key={item.name}>
                    {'megaMenu' in item && item.megaMenu ? (
                      <>
                        <div className="flex items-center gap-2.5 text-gray-400 px-2 py-1.5 text-sm font-medium">
                          <item.icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </div>
                        <div className="ml-7 grid grid-cols-2 gap-0.5">
                          <Link href="/npgx" className="col-span-2 text-red-400 hover:text-red-300 px-2 py-1 text-xs font-bold uppercase" onClick={() => setIsOpen(false)}>
                            View All A-Z
                          </Link>
                          {characterItems.map(c => (
                            <Link
                              key={c.letter}
                              href={c.href}
                              className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 px-2 py-1 text-xs transition-colors rounded-md"
                              onClick={() => setIsOpen(false)}
                            >
                              <img
                                src={c.image}
                                alt={c.name}
                                className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-red-500/20"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
                              />
                              <span className="w-4 h-4 rounded-full bg-red-600/30 flex items-center justify-center text-[8px] font-black text-red-400 flex-shrink-0 hidden">{c.letter}</span>
                              <span className="truncate">{c.name.split(' ')[0]}</span>
                            </Link>
                          ))}
                        </div>
                      </>
                    ) : 'dropdown' in item && item.dropdown ? (
                      <>
                        <div className="flex items-center gap-2.5 text-gray-400 px-2 py-1.5 text-sm font-medium">
                          <item.icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </div>
                        <div className="ml-7 space-y-0.5">
                          {item.dropdown.map((subItem) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className="flex items-center gap-2.5 text-gray-500 hover:text-red-400 px-2 py-1.5 text-sm transition-colors rounded-md"
                              onClick={() => setIsOpen(false)}
                            >
                              <subItem.icon className="w-3.5 h-3.5" />
                              <span>{subItem.name}</span>
                            </Link>
                          ))}
                        </div>
                      </>
                    ) : (
                      <Link
                        href={'href' in item ? item.href! : '#'}
                        className="flex items-center gap-2.5 text-gray-400 hover:text-red-400 px-2 py-1.5 text-sm font-medium transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    )}
                  </div>
                ))}

                {/* Mobile social + auth */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    {socialLinks.map((social) => (
                      <a
                        key={social.name}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-gray-500 ${social.color} p-1.5 transition-colors`}
                      >
                        <social.icon className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                  <Link
                    href="/user/account"
                    onClick={() => setIsOpen(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 ${
                      userName ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'
                    }`}
                  >
                    {userName ? <FaUserNinja className="w-3 h-3" /> : <FaCoins className="w-3 h-3" />}
                    <span>{userName || 'Link Wallet'}</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </nav>
  )
}
