'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  HeartIcon,
  CameraIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  PlayIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { userProfileService, FinalizedCharacter } from '@/lib/userProfiles'

export default function CharacterPage({ params }: { params: { slug: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [character, setCharacter] = useState<FinalizedCharacter | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (session?.user?.email && params.slug) {
      loadCharacter()
    }
  }, [session, params.slug])

  const loadCharacter = async () => {
    if (!session?.user?.email) return
    
    setLoading(true)
    try {
      const characterData = await userProfileService.getFinalizedCharacterBySlug(session.user.email, params.slug)
      if (characterData) {
        setCharacter(characterData)
      } else {
        // Character not found
        router.push('/profile?tab=girlfriends')
      }
    } catch (error) {
      console.error('Error loading character:', error)
      router.push('/profile?tab=girlfriends')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white/20"></div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Character Not Found</h1>
          <Link href="/profile?tab=girlfriends" className="text-red-400 hover:text-red-300">
            Back to Profile
          </Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: HeartIcon },
    { id: 'images', name: 'Images', icon: PhotoIcon },
    { id: 'videos', name: 'Videos', icon: VideoCameraIcon },
    { id: 'prompts', name: 'Prompts', icon: DocumentTextIcon }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-black pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/profile?tab=girlfriends"
            className="inline-flex items-center text-red-300 hover:text-red-200 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Profile
          </Link>
          
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Character Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-shrink-0"
            >
              <div className="relative">
                <div 
                  className="w-80 h-96 bg-cover bg-center rounded-2xl shadow-2xl"
                  style={{ backgroundImage: `url(${character.image_url || '/npgx-images/characters/luna-cyberblade-1.jpg'})` }}
                />
                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  ACTIVE
                </div>
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
                  <div className="text-sm opacity-80">Monthly Earnings</div>
                  <div className="text-xl font-bold text-red-400">${character.monthly_earnings.toLocaleString()}</div>
                </div>
              </div>
            </motion.div>

            {/* Character Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1"
            >
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-4xl sm:text-6xl font-bold text-white">{character.name}</h1>
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  NPGX
                </div>
              </div>
              
              <p className="text-2xl text-red-300 font-semibold mb-4">"{character.codename}"</p>
              <p className="text-white/90 text-lg mb-6 leading-relaxed">{character.attributes.personality}</p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{character.followers.toLocaleString()}</div>
                  <div className="text-white/70 text-sm">Followers</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">${character.monthly_earnings.toLocaleString()}</div>
                  <div className="text-white/70 text-sm">Monthly Revenue</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-400">{character.content_count}</div>
                  <div className="text-white/70 text-sm">Content</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{character.platforms.length}</div>
                  <div className="text-white/70 text-sm">Platforms</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link href={`/video-prompts?character=${character.slug}`}>
                  <button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-lg flex items-center space-x-2 transition-all duration-300">
                    <VideoCameraIcon className="h-5 w-5" />
                    <span>Generate Videos</span>
                  </button>
                </Link>
                <Link href="/image-gen">
                  <button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-blue-700 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center space-x-2 transition-all duration-300">
                    <CameraIcon className="h-5 w-5" />
                    <span>Generate Images</span>
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
          <div className="flex flex-wrap gap-4 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Character Details</h3>
                  <div className="space-y-3 text-white/90">
                    <div><span className="font-bold text-red-300">Eyes:</span> {character.attributes.eyes}</div>
                    <div><span className="font-bold text-red-300">Hair:</span> {character.attributes.hair}</div>
                    <div><span className="font-bold text-red-300">Height:</span> {character.attributes.height}</div>
                    <div><span className="font-bold text-red-300">Build:</span> {character.attributes.build}</div>
                    <div><span className="font-bold text-red-300">Style:</span> {character.attributes.clothingStyle}</div>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Personality</h3>
                  <div className="space-y-3 text-white/90">
                    <div><span className="font-bold text-red-300">Special Abilities:</span> {character.attributes.specialAbilities}</div>
                    <div><span className="font-bold text-red-300">Goals:</span> {character.attributes.goals}</div>
                    <div><span className="font-bold text-red-300">Fears:</span> {character.attributes.fears}</div>
                    <div><span className="font-bold text-red-300">Quirks:</span> {character.attributes.quirks}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Backstory</h3>
                <p className="text-white/90 leading-relaxed">{character.attributes.backstory}</p>
              </div>

              {character.development && (
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Character Development</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 text-white/90">
                      <div><span className="font-bold text-red-300">Relationships:</span> {character.development.relationships}</div>
                      <div><span className="font-bold text-red-300">Catchphrase:</span> {character.development.catchphrase}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Generated Images</h3>
              {character.generated_images && Object.keys(character.generated_images).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(character.generated_images).map(([style, imageUrl]) => (
                    <div key={style} className="bg-white/5 rounded-lg p-4">
                      <div className="aspect-square bg-gray-800 rounded-lg mb-3 overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt={`${character.name} - ${style}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-2 capitalize">{style}</h4>
                      <button
                        onClick={() => navigator.clipboard.writeText(character.generated_prompts?.[style] || '')}
                        className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors"
                      >
                        Copy Prompt
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-white/70 py-12">
                  <CameraIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No images generated yet. Create some images for your character!</p>
                  <Link href="/image-gen">
                    <button className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">
                      Generate Images
                    </button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Video Content</h3>
              <div className="text-center text-white/70 py-12">
                <VideoCameraIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No videos generated yet. Create video prompts for your character!</p>
                <Link href={`/video-prompts?character=${character.slug}`}>
                  <button className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">
                    Generate Video Prompts
                  </button>
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Generated Prompts</h3>
              {character.generated_prompts && Object.keys(character.generated_prompts).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(character.generated_prompts).map(([style, prompt]) => (
                    <div key={style} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-lg font-bold text-white capitalize">{style}</h4>
                        <button
                          onClick={() => navigator.clipboard.writeText(prompt)}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded text-white/90 text-sm font-mono">
                        {prompt}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-white/70 py-12">
                  <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No prompts generated yet. Create some prompts for your character!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 