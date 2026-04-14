'use client'

import { useState } from 'react'
import { PlayIcon, ArrowDownTrayIcon, EyeIcon, HeartIcon, ShareIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { cdnUrl } from '@/lib/cdn'

interface VideoData {
  id: string
  title: string
  character: string
  type: string
  style: string
  duration: number
  prompt: string
  videoUrl: string
  thumbnail?: string
  views: number
  likes: number
  isLiked: boolean
}

const videoData: VideoData[] = [
  {
    id: 'grok-00f227e8',
    title: 'Luna Cyberblade - Digital Phantom Intro',
    character: 'Luna Cyberblade',
    type: 'Character Intro',
    style: 'Cinematic',
    duration: 6,
    prompt: 'Cyberpunk city background, neon lighting, dynamic camera movement',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-00f227e8-2b57-4b73-835a-85cf066e267d.mp4'),
    views: 1247,
    likes: 89,
    isLiked: false
  },
  {
    id: 'grok-060e384f',
    title: 'Nova Bloodmoon - Crimson Shadow',
    character: 'Nova Bloodmoon',
    type: 'Character Intro',
    style: 'Cinematic',
    duration: 6,
    prompt: 'Dark gothic atmosphere, dramatic red lighting, mysterious shadows',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-060e384f-272f-4f71-8422-512eb808a4d8.mp4'),
    views: 892,
    likes: 67,
    isLiked: true
  },
  {
    id: 'grok-86c6864b',
    title: 'Raven Shadowblade - Stealth Action',
    character: 'Raven Shadowblade',
    type: 'Action Sequence',
    style: 'Cinematic',
    duration: 6,
    prompt: 'Stealth action sequence, shadow manipulation, dramatic lighting',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-86c6864b-fdd4-4605-8e6e-579650e998e3.mp4'),
    views: 1534,
    likes: 112,
    isLiked: false
  },
  {
    id: 'grok-4b9d8040',
    title: 'Phoenix Darkfire - Phoenix Rising',
    character: 'Phoenix Darkfire',
    type: 'Dramatic Scene',
    style: 'Cinematic',
    duration: 6,
    prompt: 'Fire effects, dramatic flames, intense lighting, phoenix rising',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-4b9d8040-cc32-411a-99e4-acf4022525bd.mp4'),
    views: 2103,
    likes: 156,
    isLiked: true
  },
  {
    id: 'grok-54f46950',
    title: 'Storm Razorclaw - Electric Dance',
    character: 'Storm Razorclaw',
    type: 'Dance Performance',
    style: 'Music Video',
    duration: 6,
    prompt: 'Electric dance moves, lightning effects, dynamic camera work, music video style',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-54f46950-33b8-438d-be98-2de7ad08c665.mp4'),
    views: 3421,
    likes: 287,
    isLiked: false
  },
  {
    id: 'grok-87b6d7dc',
    title: 'Luna Cyberblade - Neon Alley',
    character: 'Luna Cyberblade',
    type: 'Lifestyle Scene',
    style: 'Photorealistic',
    duration: 6,
    prompt: 'Neon-lit alley, cyberpunk atmosphere, atmospheric fog, dramatic posing',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-87b6d7dc-529a-4337-892d-0212b6b77d52.mp4'),
    views: 756,
    likes: 45,
    isLiked: true
  },
  {
    id: 'grok-0f72aa6e',
    title: 'Hex Crimsonwire - Techno Ritual',
    character: 'Hex Crimsonwire',
    type: 'Dramatic Scene',
    style: 'Cinematic',
    duration: 6,
    prompt: 'Dark techno-witch ritual, glowing circuits, dramatic red lighting',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-0f72aa6e-8618-4266-9d90-ff0687264d9c.mp4'),
    views: 1189,
    likes: 78,
    isLiked: false
  },
  {
    id: 'grok-1a336896',
    title: 'Kira Bloodsteel - Ronin Walk',
    character: 'Kira Bloodsteel',
    type: 'Character Intro',
    style: 'Cinematic',
    duration: 6,
    prompt: 'Samurai ronin walking through rain, katana drawn, dramatic slow-motion',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-1a336896-ee9c-4786-a1f2-7e996737c6d8.mp4'),
    views: 2876,
    likes: 234,
    isLiked: true
  },
  {
    id: 'grok-3081b9ea',
    title: 'Dahlia Ironveil - Gothic Cathedral',
    character: 'Dahlia Ironveil',
    type: 'Dramatic Scene',
    style: 'Film Noir',
    duration: 6,
    prompt: 'Gothic cathedral interior, dramatic stained glass lighting, dark atmosphere',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-3081b9ea-0cf9-4af0-8528-ab839f3f4c92.mp4'),
    views: 1456,
    likes: 98,
    isLiked: false
  },
  {
    id: 'grok-2dff25b3',
    title: 'Echo Neonflare - DJ Set',
    character: 'Echo Neonflare',
    type: 'Dance Performance',
    style: 'Music Video',
    duration: 6,
    prompt: 'Underground rave, pulsing neon lights, DJ performance, crowd energy',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-2dff25b3-bcd8-4d80-ae39-9b82a91b7eb2.mp4'),
    views: 3102,
    likes: 267,
    isLiked: true
  },
  {
    id: 'grok-5c996b30',
    title: 'Fury Steelwing - Mecha Launch',
    character: 'Fury Steelwing',
    type: 'Action Sequence',
    style: 'Cinematic',
    duration: 6,
    prompt: 'Mecha suit activation, dramatic launch sequence, industrial setting',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-5c996b30-46af-4977-b928-8d74dab060eb.mp4'),
    views: 1823,
    likes: 145,
    isLiked: false
  },
  {
    id: 'grok-6309ecce',
    title: 'Ghost Razorthorn - Stealth Infiltration',
    character: 'Ghost Razorthorn',
    type: 'Action Sequence',
    style: 'Cinematic',
    duration: 6,
    prompt: 'Invisible predator, stealth infiltration, security laser field, dramatic reveal',
    videoUrl: cdnUrl('npgx-videos/grok/grok-video-6309ecce-71c8-40cc-a898-dad637e9bf59.mp4'),
    views: 2234,
    likes: 189,
    isLiked: true
  }
]

const videoTypes = ['All', 'Character Intro', 'Action Sequence', 'Dramatic Scene', 'Dance Performance', 'Lifestyle Scene', 'Conversation']
const videoStyles = ['All', 'Cinematic', 'Music Video', 'Photorealistic', 'Film Noir', 'Anime Style']
const characters = ['All', 'Luna Cyberblade', 'Nova Bloodmoon', 'Raven Shadowblade', 'Phoenix Darkfire', 'Storm Razorclaw', 'Hex Crimsonwire', 'Kira Bloodsteel', 'Dahlia Ironveil', 'Echo Neonflare', 'Fury Steelwing', 'Ghost Razorthorn']

export default function VideoGallery() {
  const [selectedType, setSelectedType] = useState('All')
  const [selectedStyle, setSelectedStyle] = useState('All')
  const [selectedCharacter, setSelectedCharacter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [videos, setVideos] = useState(videoData)

  const filteredVideos = videos.filter(video => {
    const matchesType = selectedType === 'All' || video.type === selectedType
    const matchesStyle = selectedStyle === 'All' || video.style === selectedStyle
    const matchesCharacter = selectedCharacter === 'All' || video.character === selectedCharacter
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.character.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesType && matchesStyle && matchesCharacter && matchesSearch
  })

  const toggleLike = (videoId: string) => {
    setVideos(videos.map(video => 
      video.id === videoId 
        ? { 
            ...video, 
            isLiked: !video.isLiked,
            likes: video.isLiked ? video.likes - 1 : video.likes + 1
          }
        : video
    ))
  }

  const totalViews = videos.reduce((sum, video) => sum + video.views, 0)
  const totalLikes = videos.reduce((sum, video) => sum + video.likes, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-black">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-950 to-red-900 py-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] text-white mb-4">
            🎬 NPGX Video Gallery
          </h1>
          <p className="text-xl text-gray-400 mb-6">
            Cinematic AI-Generated Videos of Your Ninja Punk Girls
          </p>
          <div className="flex justify-center space-x-8 text-sm text-red-200">
            <div className="flex items-center">
              <EyeIcon className="h-5 w-5 mr-2" />
              {totalViews.toLocaleString()} Total Views
            </div>
            <div className="flex items-center">
              <HeartIcon className="h-5 w-5 mr-2" />
              {totalLikes.toLocaleString()} Total Likes
            </div>
            <div className="flex items-center">
              <PlayIcon className="h-5 w-5 mr-2" />
              {videos.length} Videos
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-red-500/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search videos..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Character Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Character</label>
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {characters.map(char => (
                  <option key={char} value={char}>{char}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Video Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {videoTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Style Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {videoStyles.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            Showing {filteredVideos.length} of {videos.length} videos
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <div key={video.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-red-500/20 hover:border-white/20 transition-all duration-300 group">
              {/* Video Player */}
              <div className="aspect-video bg-gray-900 relative">
                <video
                  className="w-full h-full object-cover"
                  controls
                  poster={video.thumbnail}
                  preload="metadata"
                >
                  <source src={video.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Overlay Info */}
                <div className="absolute top-2 left-2">
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                    {video.duration}s
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {video.style}
                  </span>
                </div>
              </div>

              {/* Video Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                  {video.title}
                </h3>
                
                <div className="text-sm text-gray-400 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span>{video.character}</span>
                    <span>{video.type}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                  {video.prompt}
                </p>

                {/* Stats & Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center">
                      <EyeIcon className="h-4 w-4 mr-1" />
                      {video.views.toLocaleString()}
                    </div>
                    <div className="flex items-center">
                      {video.isLiked ? (
                        <HeartSolidIcon className="h-4 w-4 mr-1 text-red-500" />
                      ) : (
                        <HeartIcon className="h-4 w-4 mr-1" />
                      )}
                      {video.likes}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleLike(video.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        video.isLiked 
                          ? 'text-red-500 hover:text-red-400' 
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      {video.isLiked ? (
                        <HeartSolidIcon className="h-5 w-5" />
                      ) : (
                        <HeartIcon className="h-5 w-5" />
                      )}
                    </button>
                    
                    <a
                      href={video.videoUrl}
                      download={`${video.character}-${video.type}.mp4`}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </a>
                    
                    <button className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg">
                      <ShareIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold text-white mb-2">No videos found</h3>
            <p className="text-gray-400">Try adjusting your filters or search terms</p>
          </div>
        )}

        {/* Generation Stats */}
        <div className="mt-12 bg-gradient-to-r from-red-900/50 to-red-900/50 rounded-xl p-6 border border-red-500/20">
          <h3 className="text-xl font-semibold text-white mb-4">🎯 Generation Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-400">80+</div>
              <div className="text-sm text-gray-300">Videos Generated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">12</div>
              <div className="text-sm text-gray-300">Characters Featured</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">Grok</div>
              <div className="text-sm text-gray-300">AI Provider</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">6s</div>
              <div className="text-sm text-gray-300">Per Video</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}