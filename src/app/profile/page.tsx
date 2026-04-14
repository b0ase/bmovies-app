'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  UserIcon,
  PencilIcon,
  CameraIcon,
  HeartIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { userProfileService, UserProfile, FinalizedCharacter } from '@/lib/userProfiles'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [finalizedCharacters, setFinalizedCharacters] = useState<FinalizedCharacter[]>([])

  // Initialize user data
  useEffect(() => {
    if (session?.user?.email) {
      loadUserProfile()
      loadFinalizedCharacters()
    }
  }, [session])

  const loadUserProfile = async () => {
    if (!session?.user?.email) return
    
    setLoading(true)
    try {
      const profile = await userProfileService.getOrCreateUserProfile({
        userId: session.user.email, // Using email as user ID for now
        email: session.user.email,
        name: session.user.name || undefined,
        image: session.user.image || undefined
      })

      if (profile) {
        setUserProfile(profile)
        setDisplayName(profile.display_name)
        setUsername(profile.username)
      } else {
        // Fallback to session data
        setDisplayName(session.user.name || 'b0ase')
        setUsername('@b0ase')
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      // Fallback to session data
      setDisplayName(session.user.name || 'b0ase')
      setUsername('@b0ase')
    } finally {
      setLoading(false)
    }
  }

  const loadFinalizedCharacters = async () => {
    if (!session?.user?.email) return
    
    try {
      const characters = await userProfileService.getFinalizedCharacters(session.user.email)
      setFinalizedCharacters(characters)
    } catch (error) {
      console.error('Error loading finalized characters:', error)
    }
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  const handleSaveProfile = async () => {
    if (!session?.user?.email) return
    
    try {
      const updatedProfile = await userProfileService.updateUserProfile(session.user.email, {
        display_name: displayName,
        username: username.startsWith('@') ? username : `@${username}`
      })
      
      if (updatedProfile) {
        setUserProfile(updatedProfile)
        setIsEditingProfile(false)
        alert('Profile updated successfully!')
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    }
  }

  // Use actual profile data or fallback to session data
  const userData = {
    name: userProfile?.display_name || session?.user?.name || 'AI Creator',
    email: userProfile?.email || session?.user?.email || 'creator@example.com',
    avatar: userProfile?.avatar_url || session?.user?.image || '/npgx-images/characters/luna-cyberblade-1.jpg',
    memberSince: userProfile?.member_since ? new Date(userProfile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'January 2025',
    subscription: userProfile?.subscription_plan === 'pro' ? 'Pro Plan' : userProfile?.subscription_plan === 'premium' ? 'Premium Plan' : 'Free Plan',
    totalEarnings: userProfile?.total_earnings || 47230,
    monthlyRevenue: userProfile?.monthly_revenue || 12450,
    totalFollowers: userProfile?.total_followers || 284000,
          npgxCharacters: userProfile?.npgx_characters_count || 3,
    contentCreated: userProfile?.content_created_count || 156,
    platformsConnected: userProfile?.platforms_connected || 4
  }

      // User's NPGX Characters
  const myGirlfriends = [
    {
      id: 1,
      name: "Sophia",
      image: "/npgx-images/characters/luna-cyberblade-1.jpg",
      monthlyEarnings: 15230,
      followers: 94000,
      contentCount: 127,
      status: "active",
      platforms: ["OnlyFans", "Instagram", "TikTok"]
    },
    {
      id: 2,
      name: "Luna",
      image: "/npgx-images/characters/raven-shadowblade-1.jpg",
      monthlyEarnings: 18650,
      followers: 112000,
      contentCount: 203,
      status: "active",
      platforms: ["OnlyFans", "X.com", "Instagram"]
    },
    {
      id: 3,
      name: "Maya",
      image: "/npgx-images/characters/phoenix-darkfire-1.jpg",
      monthlyEarnings: 13350,
      followers: 78000,
      contentCount: 89,
      status: "active",
      platforms: ["OnlyFans", "TikTok"]
    }
  ]

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
          { id: 'girlfriends', name: 'NPGX Characters', icon: HeartIcon },
    { id: 'earnings', name: 'Earnings', icon: CurrencyDollarIcon },
    { id: 'settings', name: 'Settings', icon: CogIcon }
  ]

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-transparent pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-2xl shadow-xl p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="relative">
              <div 
                className="w-32 h-32 bg-cover bg-center rounded-full border-4 border-red-200 shadow-lg"
                style={{ backgroundImage: `url(${userData.avatar})` }}
              />
              <button className="absolute bottom-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors">
                <CameraIcon className="h-4 w-4" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{userData.name}</h1>
                  <p className="text-gray-400 text-lg">{userData.email}</p>
                  <p className="text-sm text-gray-500">Member since {userData.memberSince}</p>
                </div>
                <div className="mt-4 md:mt-0">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-300">${(userData.totalEarnings / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-gray-400">Total Earnings</div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                                  <div className="text-2xl font-bold text-red-400">{userData.npgxCharacters}</div>
                <div className="text-sm text-gray-400">NPGX Characters</div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-500">{(userData.totalFollowers / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-gray-400">Total Followers</div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-400">{userData.contentCreated}</div>
                  <div className="text-sm text-gray-400">Content Created</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="bg-white/5 rounded-xl shadow-lg mb-8">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-red-500 border-b-2 border-red-600 bg-white/5'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-transparent'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Recent Activity */}
              <div className="bg-white/5 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-transparent rounded-lg">
                    <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="font-medium">Earned $2,340 from Sophia</div>
                      <div className="text-sm text-gray-400">2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 bg-transparent rounded-lg">
                    <HeartIcon className="h-8 w-8 text-red-500" />
                    <div>
                      <div className="font-medium">Luna gained 1,200 new followers</div>
                      <div className="text-sm text-gray-400">5 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 bg-transparent rounded-lg">
                    <CameraIcon className="h-8 w-8 text-red-500" />
                    <div>
                      <div className="font-medium">Generated 12 new images for Maya</div>
                      <div className="text-sm text-gray-400">1 day ago</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/create" className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-xl hover:scale-105 transition-transform">
                  <HeartIcon className="h-8 w-8 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Create New Character</h3>
                  <p className="text-white/10">Start earning with a new AI companion</p>
                </Link>
                <Link href="/ninja-punk-girls#generator" className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-xl hover:scale-105 transition-transform">
                  <CameraIcon className="h-8 w-8 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Generate Content</h3>
                  <p className="text-blue-100">Create new photos and videos</p>
                </Link>
                <Link href="/expenses" className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-xl hover:scale-105 transition-transform">
                  <BanknotesIcon className="h-8 w-8 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">View Expenses</h3>
                  <p className="text-green-100">Track development costs</p>
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'girlfriends' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">Your NPGX Characters</h3>
                <div className="flex space-x-2">
                  <Link href="/gen">
                    <button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 shadow-lg">
                      <HeartIcon className="h-5 w-5" />
                      <span>Create NPGX Character</span>
                    </button>
                  </Link>
                  <Link href="/create">
                    <button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-blue-700 hover:to-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 shadow-lg">
                      <HeartIcon className="h-5 w-5" />
                      <span>Create Character</span>
                    </button>
                  </Link>
                </div>
              </div>
              
              {/* Finalized NPGX Characters */}
              {finalizedCharacters.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-white">Your NPGX Characters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {finalizedCharacters.map((character) => (
                      <div key={character.id} className="bg-white/5 rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                        <div 
                          className="w-full h-80 bg-cover"
                          style={{ 
                            backgroundImage: `url(${character.image_url || '/npgx-images/characters/luna-cyberblade-1.jpg'})`,
                            backgroundPosition: 'center 25%' 
                          }}
                        />
                        <div className="p-6">
                          <h4 className="text-2xl font-bold text-white mb-2">{character.name}</h4>
                          <p className="text-red-500 text-sm mb-3">"{character.codename}"</p>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-white font-medium">Monthly Earnings:</span>
                              <span className="font-bold text-gray-300">${character.monthly_earnings.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white font-medium">Followers:</span>
                              <span className="font-bold text-white">{(character.followers / 1000).toFixed(0)}K</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white font-medium">Content:</span>
                              <span className="font-bold text-white">{character.content_count} posts</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white font-medium">Platforms:</span>
                              <span className="font-bold text-white">{character.platforms.length}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2 mt-4">
                            <Link 
                              href={`/character/${character.slug}`}
                              className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors text-sm text-center font-medium"
                            >
                              View Character
                            </Link>
                            <Link 
                              href={`/video-prompts?character=${character.slug}`}
                              className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors text-sm text-center font-medium"
                            >
                              Video Prompts
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legacy NPGX Characters (fallback) */}
              {finalizedCharacters.length === 0 && (
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-white">Your NPGX Characters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {myGirlfriends.map((girlfriend) => (
                      <div key={girlfriend.id} className="bg-white/5 rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                        <div 
                          className="w-full h-80 bg-cover"
                          style={{ 
                            backgroundImage: `url(${girlfriend.image})`,
                            backgroundPosition: 'center 25%' 
                          }}
                        />
                        <div className="p-6">
                          <h4 className="text-2xl font-bold text-white mb-2">{girlfriend.name}</h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-white font-medium">Monthly Earnings:</span>
                              <span className="font-bold text-gray-300">${girlfriend.monthlyEarnings.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white font-medium">Followers:</span>
                              <span className="font-bold text-white">{(girlfriend.followers / 1000).toFixed(0)}K</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white font-medium">Content:</span>
                              <span className="font-bold text-white">{girlfriend.contentCount} posts</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white font-medium">Platforms:</span>
                              <span className="font-bold text-white">{girlfriend.platforms.length}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2 mt-4">
                            <Link 
                              href={`/girlfriend/${girlfriend.name.toLowerCase()}`}
                              className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors text-sm text-center font-medium"
                            >
                              Manage
                            </Link>
                            <button className="flex-1 bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium">
                              Analytics
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-6">Earnings Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-300">${userData.totalEarnings.toLocaleString()}</div>
                    <div className="text-gray-400">Total Earnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400">${userData.monthlyRevenue.toLocaleString()}</div>
                    <div className="text-gray-400">This Month</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-500">${Math.round(userData.monthlyRevenue / 30)}</div>
                    <div className="text-gray-400">Daily Average</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400">{userData.platformsConnected}</div>
                    <div className="text-gray-400">Platforms</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">Earnings by Character</h3>
                  <Link href="/invoices" className="text-red-500 hover:text-red-700">View Invoices →</Link>
                </div>
                <div className="space-y-4">
                  {myGirlfriends.map((girlfriend) => (
                    <div key={girlfriend.id} className="flex items-center justify-between p-4 bg-transparent rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-12 h-12 bg-cover bg-center rounded-full"
                          style={{ backgroundImage: `url(${girlfriend.image})` }}
                        />
                        <div>
                          <div className="font-medium">{girlfriend.name}</div>
                          <div className="text-sm text-gray-400">{(girlfriend.followers / 1000).toFixed(0)}K followers</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-300">${girlfriend.monthlyEarnings.toLocaleString()}</div>
                        <div className="text-sm text-gray-400">this month</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-6">Account Settings</h3>
                <div className="space-y-6">
                  <div className="p-4 border border-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <UserIcon className="h-6 w-6 text-gray-400" />
                        <div>
                          <div className="font-medium">Profile Information</div>
                          <div className="text-sm text-gray-400">Update your display name and username</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className="text-red-500 hover:text-red-700"
                      >
                        {isEditingProfile ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                    
                    {isEditingProfile ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 !text-white"
                            placeholder="Enter your display name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 !text-white"
                            placeholder="@yourusername"
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleSaveProfile}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setIsEditingProfile(false)}
                            className="bg-white/10 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Display Name:</span>
                          <span className="text-sm font-medium">{displayName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Username:</span>
                          <span className="text-sm font-medium">{username}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
                      <div>
                        <div className="font-medium">Security</div>
                        <div className="text-sm text-gray-400">Manage password and 2FA</div>
                      </div>
                    </div>
                    <button className="text-red-500 hover:text-red-700">Manage</button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <BellIcon className="h-6 w-6 text-gray-400" />
                      <div>
                        <div className="font-medium">Notifications</div>
                        <div className="text-sm text-gray-400">Configure email and push notifications</div>
                      </div>
                    </div>
                    <button className="text-red-500 hover:text-red-700">Configure</button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <KeyIcon className="h-6 w-6 text-gray-400" />
                      <div>
                        <div className="font-medium">API Keys</div>
                        <div className="text-sm text-gray-400">Manage Stability AI and other API keys</div>
                      </div>
                    </div>
                    <button className="text-red-500 hover:text-red-700">Manage</button>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-6">Subscription</h3>
                <div className="flex items-center justify-between p-6 bg-white/5 rounded-lg border-2 border-red-200">
                  <div>
                    <div className="font-bold text-red-950">Pro Plan</div>
                    <div className="text-red-700">$29.99/month • Unlimited NPGX Characters</div>
                    <div className="text-sm text-red-500 mt-1">Next billing: February 21, 2025</div>
                  </div>
                  <div className="flex space-x-3">
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
} 