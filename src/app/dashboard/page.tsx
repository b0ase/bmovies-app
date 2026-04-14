'use client'

import Link from 'next/link'
import { useState } from 'react'
import { 
  CameraIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  HeartIcon,
  Cog6ToothIcon,
  PlusIcon,
  TrophyIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')

  // Mock user data
  const userData = {
    name: "Alex Johnson",
    email: "alex@example.com",
    avatar: "/npgx-images/characters/luna-cyberblade-1.jpg",
    subscription: "Pro",
    totalEarnings: "$47,230",
    monthlyRevenue: "$12,450",
    totalFollowers: "284K",
    npgxCharacters: 3
  }

      // User's NPGX Characters
  const myGirlfriends = [
    {
      id: 1,
      name: "Sophia",
      image: "/npgx-images/characters/luna-cyberblade-1.jpg",
      token: "SOPHIA",
      tokenPrice: "$0.0234",
      monthlyEarnings: "$15,230",
      followers: "94K",
      contentCount: 127,
      status: "active"
    },
    {
      id: 2,
      name: "Luna",
      image: "/npgx-images/characters/raven-shadowblade-1.jpg",
      token: "LUNA",
      tokenPrice: "$0.0189",
      monthlyEarnings: "$18,650",
      followers: "112K",
      contentCount: 203,
      status: "active"
    },
    {
      id: 3,
      name: "Maya",
      image: "/npgx-images/characters/phoenix-darkfire-1.jpg",
      token: "MAYA",
      tokenPrice: "$0.0156",
      monthlyEarnings: "$13,350",
      followers: "78K",
      contentCount: 89,
      status: "active"
    }
  ]

  // Sponsorship deals
  const sponsorshipDeals = [
    {
      id: 1,
      brand: "NordVPN",
      category: "Tech/Security",
      deal: "$5,000/post",
      status: "active",
      girlfriend: "Sophia"
    },
    {
      id: 2,
      brand: "Blue Chew",
      category: "Health/ED",
      deal: "$8,500/post",
      status: "negotiating",
      girlfriend: "Luna"
    },
    {
      id: 3,
      brand: "Manscaped",
      category: "Grooming",
      deal: "$3,200/post",
      status: "active",
      girlfriend: "Maya"
    }
  ]

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'girlfriends', name: 'My NPGX Characters', icon: HeartIcon },
    { id: 'content', name: 'Content Studio', icon: CameraIcon },
    { id: 'sponsorships', name: 'Sponsorships', icon: TrophyIcon },
    { id: 'tokens', name: 'Token Portfolio', icon: BanknotesIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon }
  ]

  return (
    <div className="min-h-screen bg-transparent pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div 
                className="w-16 h-16 bg-cover bg-center rounded-full border-4 border-white shadow-lg"
                style={{ backgroundImage: `url(${userData.avatar})` }}
              />
              <div>
                <h1 className="text-3xl font-bold text-white">Welcome back, {userData.name}! 👋</h1>
                <p className="text-gray-400">Manage your NPGX empire</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-300">{userData.totalEarnings}</div>
              <div className="text-sm text-gray-400">Total Earnings</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{userData.monthlyRevenue}</div>
                <div className="text-sm text-gray-400">Monthly Revenue</div>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{userData.totalFollowers}</div>
                <div className="text-sm text-gray-400">Total Followers</div>
              </div>
              <UserGroupIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{userData.npgxCharacters}</div>
                <div className="text-sm text-gray-400">NPGX Characters</div>
              </div>
              <HeartIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{sponsorshipDeals.length}</div>
                <div className="text-sm text-gray-400">Active Deals</div>
              </div>
              <TrophyIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/5 rounded-xl shadow-lg mb-8">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-red-500 border-b-2 border-red-600'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* My NPGX Characters Overview */}
            <div className="bg-white/5 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">My NPGX Characters</h2>
                <Link
                  href="/create"
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:scale-105 transition-transform flex items-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Create New</span>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {myGirlfriends.map((gf) => (
                  <div key={gf.id} className="border border-white/10 rounded-xl p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-center space-x-4 mb-4">
                      <div 
                        className="w-12 h-12 bg-cover bg-center rounded-full"
                        style={{ backgroundImage: `url(${gf.image})` }}
                      />
                      <div>
                        <h3 className="font-bold text-white">{gf.name}</h3>
                        <div className="text-sm text-gray-300 font-semibold">{gf.monthlyEarnings}/mo</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Followers</div>
                        <div className="font-semibold">{gf.followers}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Content</div>
                        <div className="font-semibold">{gf.contentCount}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Token</div>
                        <div className="font-semibold">${gf.token}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Price</div>
                        <div className="font-semibold">{gf.tokenPrice}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 bg-white/10 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors">
                        Manage
                      </button>
                      <button className="flex-1 bg-red-600/20 text-red-300 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-600/30 transition-colors">
                        Analytics
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Sponsorships */}
            <div className="bg-white/5 rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-6">Active Sponsorship Deals</h2>
              <div className="space-y-4">
                {sponsorshipDeals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-white/50/20 text-yellow-300 rounded-lg">
                        <TrophyIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{deal.brand}</h3>
                        <div className="text-sm text-gray-400">{deal.category} • {deal.girlfriend}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-300">{deal.deal}</div>
                      <div className={`text-sm px-2 py-1 rounded-full ${
                        deal.status === 'active' ? 'bg-red-600/20 text-red-300' :
                        deal.status === 'negotiating' ? 'bg-white/50/20 text-yellow-300' :
                        'bg-white/5 text-gray-300'
                      }`}>
                        {deal.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-8">
            <div className="bg-white/5 rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-6">Content Creation Studio</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/ninja-punk-girls#generator" className="block p-6 border border-white/10 rounded-xl hover:shadow-lg transition-shadow">
                  <CameraIcon className="h-12 w-12 text-red-500 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Generate Photos</h3>
                  <p className="text-gray-400">Create stunning AI-generated photos with our advanced image generator</p>
                </Link>
                <div className="p-6 border border-white/10 rounded-xl opacity-50">
                  <VideoCameraIcon className="h-12 w-12 text-red-600 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Create Videos</h3>
                  <p className="text-gray-400">Generate 4K videos for social media platforms (Coming Soon)</p>
                </div>
                <div className="p-6 border border-white/10 rounded-xl opacity-50">
                  <DocumentTextIcon className="h-12 w-12 text-red-400 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Write Stories</h3>
                  <p className="text-gray-400">AI-powered story and caption generation (Coming Soon)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 