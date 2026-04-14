'use client'
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  HeartIcon,
  ChatBubbleLeftRightIcon,
  PlayIcon,
  ShareIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UsersIcon,
  ShoppingBagIcon,
  SparklesIcon,
  EyeIcon,
  HandThumbUpIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  VideoCameraIcon,
  GiftIcon
} from '@heroicons/react/24/outline'
import {
  FaInstagram,
  FaTwitter,
  FaTiktok,
  FaYoutube,
  FaDiscord,
  FaTelegram,
  FaSnapchat
} from 'react-icons/fa'

export default function BellaBBExample() {
  const [activeTab, setActiveTab] = useState('content')
  const [chatMessage, setChatMessage] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'bella', message: 'Hey babe! 💕 Just finished my morning yoga routine. How are you doing today?', timestamp: '10:23 AM' },
    { id: 2, sender: 'user', message: 'Good morning beautiful! You look amazing as always 😍', timestamp: '10:25 AM' },
    { id: 3, sender: 'bella', message: 'Aww thank you! 🥰 I have some exciting new content coming today... want a sneak peek? 😉', timestamp: '10:26 AM' }
  ])
  const [tokenPrice, setTokenPrice] = useState(0.0234)
  const [priceChange, setPriceChange] = useState(+12.4)

  // Simulate real-time token price updates
  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 0.002
      setTokenPrice(prev => Math.max(0.001, prev + change))
      setPriceChange(prev => prev + (Math.random() - 0.5) * 2)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const bellaProfile = {
    name: "Bella BB",
    tagline: "Your Fitness & Lifestyle Queen 👑",
    age: 24,
    location: "Miami, FL 🌴",
    personality: "Bubbly, Motivational, Flirty",
    interests: ["Fitness", "Fashion", "Travel", "Wellness", "Cooking"],
    // eslint-disable-next-line react/no-unescaped-entities
    bio: "Hey gorgeous! I'm Bella, your personal fitness motivation and lifestyle inspiration! 💪✨ I love helping my fans achieve their dreams while looking absolutely stunning. From morning workouts to evening glamour, I'm here to make your day brighter! Let's get fit, fabulous, and have some fun together! 😘",
    stats: {
      followers: 2847000,
      posts: 1247,
      likes: 45600000,
      revenue: 892000,
      engagement: 8.7
    }
  }

  const contentGallery = [
    { id: 1, type: 'image', url: '/npgx-images/characters/luna-cyberblade-1.jpg', title: 'Morning Yoga Flow', likes: 45672, views: 234567, premium: false },
    { id: 2, type: 'video', url: '/npgx-images/characters/nova-bloodmoon-1.jpg', title: 'Workout Routine', likes: 67890, views: 456789, premium: true },
    { id: 3, type: 'image', url: '/npgx-images/characters/raven-shadowblade-1.jpg', title: 'Beach Vibes', likes: 89012, views: 567890, premium: false },
    { id: 4, type: 'video', url: '/npgx-images/characters/phoenix-darkfire-1.jpg', title: 'Cooking Tutorial', likes: 34567, views: 234567, premium: false },
    { id: 5, type: 'image', url: '/npgx-images/characters/storm-razorclaw-1.jpg', title: 'Fashion Haul', likes: 78901, views: 345678, premium: true },
    { id: 6, type: 'image', url: '/npgx-images/heroes/hero-1.jpg', title: 'Sunset Selfie', likes: 56789, views: 456789, premium: false },
    { id: 7, type: 'video', url: '/npgx-images/heroes/hero-2.jpg', title: 'Dance Workout', likes: 91234, views: 678901, premium: true },
    { id: 8, type: 'image', url: '/npgx-images/heroes/hero-3.jpg', title: 'Skincare Routine', likes: 67890, views: 234567, premium: false }
  ]

  const tokenMetrics = {
    price: tokenPrice,
    change24h: priceChange,
    marketCap: tokenPrice * 10000000,
    volume24h: 234567,
    holders: 15847,
    liquidity: 456789,
    circulatingSupply: 10000000,
    totalSupply: 50000000,
    burnedTokens: 2500000
  }

  const socialLinks = [
    { name: 'Instagram', icon: FaInstagram, followers: '2.8M', url: 'https://instagram.com/bellabb', color: 'text-red-500' },
    { name: 'TikTok', icon: FaTiktok, followers: '3.2M', url: 'https://tiktok.com/@bellabb', color: 'text-red-500' },
    { name: 'Twitter', icon: FaTwitter, followers: '1.9M', url: 'https://twitter.com/bellabb', color: 'text-gray-400' },
    { name: 'YouTube', icon: FaYoutube, followers: '1.2M', url: 'https://youtube.com/@bellabb', color: 'text-red-600' },
    { name: 'Snapchat', icon: FaSnapchat, followers: '890K', url: 'https://snapchat.com/add/bellabb', color: 'text-gray-400' },
    { name: 'Discord', icon: FaDiscord, followers: '234K', url: 'https://discord.gg/bellabb', color: 'text-red-500' },
    { name: 'Telegram', icon: FaTelegram, followers: '567K', url: 'https://t.me/bellabb', color: 'text-blue-500' }
  ]

  const affiliateProducts = [
    {
      category: "Fitness & Health",
      products: [
        // eslint-disable-next-line react/no-unescaped-entities
        { name: "Bella's Protein Powder", price: "$49.99", commission: "25%", sales: 2847, revenue: "$35,000" },
        { name: "Workout Resistance Bands", price: "$29.99", commission: "30%", sales: 1567, revenue: "$14,000" },
        { name: "Pre-Workout Supplement", price: "$39.99", commission: "20%", sales: 3456, revenue: "$27,000" },
        { name: "Yoga Mat & Accessories", price: "$79.99", commission: "35%", sales: 987, revenue: "$27,000" }
      ]
    },
    {
      category: "Beauty & Skincare",
      products: [
        { name: "Bella's Glow Serum", price: "$89.99", commission: "40%", sales: 4567, revenue: "$164,000" },
        { name: "Luxury Face Mask Set", price: "$59.99", commission: "45%", sales: 2345, revenue: "$63,000" },
        { name: "Anti-Aging Cream", price: "$129.99", commission: "35%", sales: 1876, revenue: "$85,000" },
        { name: "Makeup Brush Collection", price: "$149.99", commission: "30%", sales: 1234, revenue: "$55,000" }
      ]
    },
    {
      category: "Fashion & Accessories",
      products: [
        { name: "Bella's Activewear Line", price: "$89.99", commission: "25%", sales: 5678, revenue: "$127,000" },
        { name: "Designer Jewelry Set", price: "$199.99", commission: "20%", sales: 876, revenue: "$35,000" },
        { name: "Luxury Handbag", price: "$299.99", commission: "15%", sales: 543, revenue: "$24,000" },
        { name: "Sunglasses Collection", price: "$79.99", commission: "35%", sales: 2109, revenue: "$59,000" }
      ]
    },
    {
      category: "Lifestyle & Courses",
      products: [
        { name: "Bella's Fitness Masterclass", price: "$197", commission: "50%", sales: 3456, revenue: "$340,000" },
        { name: "Confidence Building Course", price: "$97", commission: "60%", sales: 2876, revenue: "$167,000" },
        { name: "Nutrition Guide & Meal Plans", price: "$47", commission: "70%", sales: 4567, revenue: "$150,000" },
        { name: "Dating & Relationship Tips", price: "$67", commission: "55%", sales: 1987, revenue: "$73,000" }
      ]
    }
  ]

  const sendMessage = () => {
    if (!chatMessage.trim()) return
    
    const newMessage = {
      id: chatMessages.length + 1,
      sender: 'user',
      message: chatMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    setChatMessages([...chatMessages, newMessage])
    setChatMessage('')
    
    // Simulate Bella's response
    setTimeout(() => {
      const responses = [
        // eslint-disable-next-line react/no-unescaped-entities
        "That's so sweet! 💕 You always know how to make me smile!",
        "Mmm, I love talking with you! 😘 Tell me more...",
        // eslint-disable-next-line react/no-unescaped-entities
        "You're making me blush! 🥰 Want to see something special?",
        // eslint-disable-next-line react/no-unescaped-entities
        "I've been thinking about you all day! 💭💕",
        // eslint-disable-next-line react/no-unescaped-entities
        "You're so charming! 😍 I have a surprise for you later...",
        // eslint-disable-next-line react/no-unescaped-entities
        "Aww, you're the best! 🥰 How was your day, handsome?"
      ]
      
      const bellaResponse = {
        id: chatMessages.length + 2,
        sender: 'bella',
        message: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      
      setChatMessages(prev => [...prev, bellaResponse])
    }, 1000 + Math.random() * 2000)
  }

  const tabs = [
    { id: 'content', name: 'Content', icon: PhotoIcon },
    { id: 'token', name: '$BELLA Token', icon: CurrencyDollarIcon },
    { id: 'social', name: 'Social Media', icon: ShareIcon },
    { id: 'affiliates', name: 'Products', icon: ShoppingBagIcon },
    { id: 'chat', name: 'Live Chat', icon: ChatBubbleLeftRightIcon }
  ]

  return (
    <div className="min-h-screen bg-transparent pt-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-700 to-red-800">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Profile Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-white"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-white/5 rounded-full p-1">
                  <div 
                    className="w-full h-full bg-cover bg-center rounded-full"
                    style={{ backgroundImage: `url('/npgx-images/characters/luna-cyberblade-1.jpg')` }}
                  />
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2">{bellaProfile.name}</h1>
                  <p className="text-xl text-gray-300">{bellaProfile.tagline}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span>📍 {bellaProfile.location}</span>
                    <span>🎂 {bellaProfile.age} years old</span>
                  </div>
                </div>
              </div>
              
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                {bellaProfile.bio}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-2xl font-bold">{(bellaProfile.stats.followers / 1000000).toFixed(1)}M</div>
                  <div className="text-sm text-gray-300">Followers</div>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-2xl font-bold">{bellaProfile.stats.posts.toLocaleString()}</div>
                  <div className="text-sm text-gray-300">Posts</div>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-2xl font-bold">${(bellaProfile.stats.revenue / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-gray-300">Revenue</div>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-2xl font-bold">{bellaProfile.stats.engagement}%</div>
                  <div className="text-sm text-gray-300">Engagement</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {bellaProfile.interests.map((interest, index) => (
                  <span key={index} className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                    {interest}
                  </span>
                ))}
              </div>
              
              <div className="flex space-x-4">
                <button className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg font-bold hover:scale-105 transition-transform flex items-center space-x-2">
                  <HeartIcon className="w-5 h-5" />
                  <span>Follow Bella</span>
                </button>
                <button className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-bold hover:bg-white/30 transition-colors flex items-center space-x-2">
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  <span>Start Chat</span>
                </button>
              </div>
            </motion.div>
            
            {/* Profile Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="relative w-full max-w-md mx-auto">
                <div 
                  className="w-full h-96 bg-cover bg-center rounded-2xl shadow-2xl"
                  style={{ backgroundImage: `url('/npgx-images/characters/nova-bloodmoon-1.jpg')` }}
                />
                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                  <div className="w-2 h-2 bg-white/5 rounded-full animate-pulse"></div>
                  <span>LIVE</span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Currently: Morning Workout 💪</span>
                    <div className="flex items-center space-x-2">
                      <EyeIcon className="w-4 h-4" />
                      <span className="text-sm">12.4K watching</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/5 shadow-lg sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'text-red-500 border-b-2 border-red-600 bg-white/5'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-transparent'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'content' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Bella's Content Gallery</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Exclusive photos, videos, and behind-the-scenes content from your favorite NPGX character
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contentGallery.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.05 }}
                  className="relative group cursor-pointer"
                >
                  <div 
                    className="w-full h-64 bg-cover bg-center rounded-xl shadow-lg"
                    style={{ backgroundImage: `url('${item.url}')` }}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 rounded-xl flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {item.type === 'video' ? (
                        <PlayIcon className="w-12 h-12 text-white" />
                      ) : (
                        <PhotoIcon className="w-12 h-12 text-white" />
                      )}
                    </div>
                  </div>
                  
                  {/* Premium Badge */}
                  {item.premium && (
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                      VIP
                    </div>
                  )}
                  
                  {/* Content Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-xl">
                    <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                    <div className="flex items-center justify-between text-white/80 text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <HandThumbUpIcon className="w-3 h-3" />
                          <span>{(item.likes / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <EyeIcon className="w-3 h-3" />
                          <span>{(item.views / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                      {item.type === 'video' && (
                        <div className="bg-black/50 px-2 py-1 rounded text-xs">
                          {Math.floor(Math.random() * 10 + 2)}:{'0' + Math.floor(Math.random() * 60)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'token' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">$BELLA Token Metrics</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Trade Bella's personal token and earn from her success
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 rounded-xl p-6 shadow-lg border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 text-sm font-medium">Token Price</h3>
                  <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-white">${tokenMetrics.price.toFixed(4)}</div>
                <div className={`text-sm font-medium ${tokenMetrics.change24h >= 0 ? 'text-gray-300' : 'text-red-600'}`}>
                  {tokenMetrics.change24h >= 0 ? '+' : ''}{tokenMetrics.change24h.toFixed(1)}% (24h)
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 shadow-lg border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 text-sm font-medium">Market Cap</h3>
                  <ChartBarIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-white">${(tokenMetrics.marketCap / 1000).toFixed(0)}K</div>
                <div className="text-sm text-gray-500">Fully Diluted</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 shadow-lg border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 text-sm font-medium">Holders</h3>
                  <UsersIcon className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-white">{tokenMetrics.holders.toLocaleString()}</div>
                <div className="text-sm text-gray-300">+12% this week</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 shadow-lg border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 text-sm font-medium">24h Volume</h3>
                  <TrophyIcon className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-white">${(tokenMetrics.volume24h / 1000).toFixed(0)}K</div>
                <div className="text-sm text-gray-500">Trading Volume</div>
              </div>
            </div>
            
            {/* Token Chart Placeholder */}
            <div className="bg-white/5 rounded-xl p-6 shadow-lg border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Price Chart</h3>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 bg-white/10 text-red-500 rounded-lg text-sm font-medium">1H</button>
                  <button className="px-3 py-1 bg-white/5 text-gray-400 rounded-lg text-sm font-medium">24H</button>
                  <button className="px-3 py-1 bg-white/5 text-gray-400 rounded-lg text-sm font-medium">7D</button>
                  <button className="px-3 py-1 bg-white/5 text-gray-400 rounded-lg text-sm font-medium">30D</button>
                </div>
              </div>
              <div className="h-64 bg-transparent rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <ChartBarIcon className="w-12 h-12 mx-auto mb-2" />
                  <p>Live Price Chart</p>
                  <p className="text-sm">Real-time trading data</p>
                </div>
              </div>
            </div>
            
            {/* Token Utilities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl p-6">
                <GiftIcon className="w-8 h-8 mb-4" />
                <h3 className="text-lg font-bold mb-2">Exclusive Content</h3>
                <p className="text-gray-300 text-sm">Token holders get access to premium content and private shows</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-blue-600 text-white rounded-xl p-6">
                <CurrencyDollarIcon className="w-8 h-8 mb-4" />
                <h3 className="text-lg font-bold mb-2">Revenue Share</h3>
                <p className="text-white/10 text-sm">Earn passive income from Bella's content and affiliate sales</p>
              </div>
              <div className="bg-gradient-to-br from-white/50 to-red-600 text-white rounded-xl p-6">
                <ChatBubbleLeftRightIcon className="w-8 h-8 mb-4" />
                <h3 className="text-lg font-bold mb-2">Priority Chat</h3>
                <p className="text-gray-300 text-sm">Skip the queue and get priority responses in chat</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'social' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Follow Bella Everywhere</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Stay connected across all platforms for exclusive content and updates
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  className="bg-white/5 rounded-xl p-6 shadow-lg border border-white/10 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <social.icon className={`w-8 h-8 ${social.color}`} />
                    <div>
                      <h3 className="font-bold text-white">{social.name}</h3>
                      <p className="text-gray-400 text-sm">{social.followers} followers</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-red-600 to-red-700 text-white text-center py-2 rounded-lg font-medium text-sm">
                    Follow Now
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'affiliates' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Bella's Product Recommendations</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Shop Bella's favorite products and support her through affiliate partnerships
              </p>
            </div>
            
            {affiliateProducts.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white/5 rounded-xl p-6 shadow-lg border border-white/10">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <SparklesIcon className="w-6 h-6 text-red-500 mr-2" />
                  {category.category}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.products.map((product, productIndex) => (
                    <div key={productIndex} className="border border-white/10 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-1">{product.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span className="font-medium text-gray-300">{product.price}</span>
                            <span>Commission: {product.commission}</span>
                          </div>
                        </div>
                        <button className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium hover:scale-105 transition-transform">
                          Buy Now
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Sales:</span>
                          <span className="font-medium text-white ml-1">{product.sales.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Revenue:</span>
                          <span className="font-medium text-gray-300 ml-1">{product.revenue}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Total Revenue Summary */}
            <div className="bg-gradient-to-r from-white/50 to-red-600 text-white rounded-xl p-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">Total Affiliate Revenue</h3>
                <div className="text-4xl font-black mb-2">
                  ${affiliateProducts.reduce((total, category) => 
                    total + category.products.reduce((catTotal, product) => 
                      catTotal + parseInt(product.revenue.replace(/[$,]/g, '')), 0), 0
                  ).toLocaleString()}
                </div>
                <p className="text-green-100">This month's affiliate earnings</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/5 rounded-xl shadow-lg border border-white/10 overflow-hidden">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 bg-cover bg-center rounded-full border-2 border-white"
                    style={{ backgroundImage: `url('/npgx-images/characters/raven-shadowblade-1.jpg')` }}
                  />
                  <div>
                    <h3 className="font-bold">Bella BB</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Online now</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.sender === 'user' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-white/5 text-white'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender === 'user' ? 'text-red-200' : 'text-gray-500'
                      }`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Chat Input */}
              <div className="border-t border-white/10 p-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message to Bella..."
                    className="flex-1 px-4 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white"
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white p-2 rounded-lg hover:scale-105 transition-transform"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Chat Actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <button className="flex items-center space-x-1 hover:text-red-500">
                      <PhotoIcon className="w-4 h-4" />
                      <span>Photo</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-red-500">
                      <VideoCameraIcon className="w-4 h-4" />
                      <span>Video</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-red-500">
                      <GiftIcon className="w-4 h-4" />
                      <span>Gift</span>
                    </button>
                  </div>
                  <div className="text-xs text-gray-400">
                    Bella typically replies within 2-5 minutes
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
} 