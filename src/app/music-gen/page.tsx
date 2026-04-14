'use client'

import { useState } from 'react'
import { MusicalNoteIcon, SpeakerWaveIcon, MicrophoneIcon, PlayIcon, PauseIcon, SparklesIcon, CurrencyDollarIcon, GiftIcon, ClockIcon } from '@heroicons/react/24/outline'

interface MusicTemplate {
  id: string
  title: string
  projectId?: string
  genre: string
  mood: string
  duration: number
  bpm: number
  key: string
  tracks: TrackData[]
  totalTracks: number
  estimatedCost: string
  tokenSymbol: string
  nftSegments: number
  royaltyRate: string
}

interface TrackData {
  id: string
  name: string
  type: 'Main Theme' | 'Action' | 'Ambient' | 'Character Theme' | 'Emotional' | 'Battle' | 'Transition'
  instrument: string
  duration: number
  volume: number
  isPlaying: boolean
  description: string
  mood: string
  segmentStart: number
  segmentEnd: number
}

const musicGenres = [
  'Epic Orchestral', 'Cyberpunk Electronic', 'Dark Ambient', 'Cinematic Rock',
  'Synthwave', 'Gothic Classical', 'Industrial Metal', 'Atmospheric Drone',
  'Heroic Fantasy', 'Noir Jazz', 'Futuristic Techno', 'Emotional Piano',
  'Battle Drums', 'Mystical Ethnic', 'Space Ambient', 'Hybrid Orchestral'
]

const musicMoods = [
  'Epic & Heroic', 'Dark & Mysterious', 'Romantic & Emotional', 'Intense & Aggressive',
  'Peaceful & Serene', 'Suspenseful & Tense', 'Energetic & Uplifting', 'Melancholic & Sad',
  'Triumphant & Victorious', 'Ominous & Foreboding', 'Playful & Light', 'Dramatic & Powerful'
]

const instruments = [
  'Full Orchestra', 'Electric Guitar', 'Synthesizer', 'Piano', 'Strings Section',
  'Brass Section', 'Electronic Drums', 'Acoustic Drums', 'Choir', 'Flute',
  'Violin Solo', 'Cello', 'Harp', 'Organ', 'Bass Guitar', 'Percussion'
]

const trackTypes = [
  'Main Theme', 'Action', 'Ambient', 'Character Theme', 'Emotional', 'Battle', 'Transition'
]

const musicalKeys = [
  'C Major', 'C Minor', 'D Major', 'D Minor', 'E Major', 'E Minor',
  'F Major', 'F Minor', 'G Major', 'G Minor', 'A Major', 'A Minor', 'B Major', 'B Minor'
]

// Mock projects (would come from script generator)
const mockProjects = [
  {
    id: 'script_1',
    title: 'Cyberpunk Action Chronicles: Rise of the NPGX',
    genre: 'Cyberpunk Action',
    duration: 90,
    scenes: 12
  },
  {
    id: 'script_2',
    title: 'Gothic Romance: Shadows of the Heart',
    genre: 'Gothic Romance',
    duration: 110,
    scenes: 15
  }
]

export default function MusicGenerator() {
  const [step, setStep] = useState<'configure' | 'edit' | 'mint'>('configure')
  const [selectedProject, setSelectedProject] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedMood, setSelectedMood] = useState('')
  const [duration, setDuration] = useState(90)
  const [bpm, setBpm] = useState(120)
  const [musicalKey, setMusicalKey] = useState('')
  const [trackCount, setTrackCount] = useState(8)
  const [primaryInstrument, setPrimaryInstrument] = useState('')
  const [creativeNotes, setCreativeNotes] = useState('')
  const [generatedMusic, setGeneratedMusic] = useState<MusicTemplate | null>(null)
  const [editedMusic, setEditedMusic] = useState<MusicTemplate | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const generateMusic = async () => {
    setIsGenerating(true)
    
    // Simulate AI music generation
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    const project = mockProjects.find(p => p.id === selectedProject)
    const title = customTitle || (project ? `${project.title} - Original Soundtrack` : 'Epic Soundtrack')
    const tokenSymbol = title.replace(/\s+/g, '').toUpperCase().slice(0, 6) + 'OST'
    
    // Generate tracks
    const tracks: TrackData[] = []
    const segmentsPerTrack = Math.floor(100 / trackCount)
    
    for (let i = 1; i <= trackCount; i++) {
      const trackType = trackTypes[Math.floor(Math.random() * trackTypes.length)]
      const instrument = i === 1 ? primaryInstrument : instruments[Math.floor(Math.random() * instruments.length)]
      
      const track: TrackData = {
        id: `track_${i}`,
        name: `${trackType} ${i}`,
        type: trackType as any,
        instrument: instrument,
        duration: Math.floor((duration * 60) / trackCount), // in seconds
        volume: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
        isPlaying: false,
        description: `A ${selectedMood.toLowerCase()} ${trackType.toLowerCase()} piece featuring ${instrument.toLowerCase()}, perfectly crafted for the ${selectedGenre.toLowerCase()} atmosphere.`,
        mood: selectedMood,
        segmentStart: (i - 1) * segmentsPerTrack + 1,
        segmentEnd: i * segmentsPerTrack
      }
      tracks.push(track)
    }

    const music: MusicTemplate = {
      id: `music_${Date.now()}`,
      title: title,
      projectId: selectedProject,
      genre: selectedGenre,
      mood: selectedMood,
      duration: duration,
      bpm: bpm,
      key: musicalKey,
      tracks: tracks,
      totalTracks: trackCount,
      estimatedCost: `$${(Math.random() * 50000 + 10000).toFixed(0)}`,
      tokenSymbol: tokenSymbol,
      nftSegments: 100,
      royaltyRate: '10%'
    }
    
    setGeneratedMusic(music)
    setEditedMusic(music)
    setIsGenerating(false)
    setStep('edit')
  }

  const updateMusicField = (field: keyof MusicTemplate, value: any) => {
    if (editedMusic) {
      setEditedMusic({
        ...editedMusic,
        [field]: value
      })
    }
  }

  const updateTrack = (trackId: string, field: keyof TrackData, value: any) => {
    if (editedMusic) {
      const updatedTracks = editedMusic.tracks.map(track =>
        track.id === trackId ? { ...track, [field]: value } : track
      )
      setEditedMusic({
        ...editedMusic,
        tracks: updatedTracks
      })
    }
  }

  const toggleTrackPlayback = (trackId: string) => {
    if (editedMusic) {
      const updatedTracks = editedMusic.tracks.map(track =>
        track.id === trackId 
          ? { ...track, isPlaying: !track.isPlaying }
          : { ...track, isPlaying: false } // Stop other tracks
      )
      setEditedMusic({
        ...editedMusic,
        tracks: updatedTracks
      })
      setSelectedTrack(trackId)
    }
  }

  const proceedToMint = () => {
    setStep('mint')
  }

  const mintSoundtrack = async () => {
    // Simulate minting process
    await new Promise(resolve => setTimeout(resolve, 2000))
    alert(`🎵 Soundtrack "${editedMusic?.title}" minted successfully!\n\nToken: ${editedMusic?.tokenSymbol}\nTracks: ${editedMusic?.totalTracks}\nRoyalty Rate: ${editedMusic?.royaltyRate}\nNow available on NPGX Music Marketplace!`)
  }

  if (step === 'mint') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-black">
        <div className="relative overflow-hidden bg-gradient-to-r from-white/5 to-white/10 py-16">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] text-white mb-4">
              🎵 Ready to Mint Your Soundtrack!
            </h1>
            <p className="text-xl text-green-100 mb-6">
              Launch Your Music as NFT Collection with Royalty Streams
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-red-500/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">{editedMusic?.title}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/5 rounded-lg p-4">
                  <MusicalNoteIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">Token Symbol</div>
                  <div className="text-xl font-bold text-white">${editedMusic?.tokenSymbol}</div>
                </div>
                <div className="bg-red-950/30 rounded-lg p-4">
                  <SpeakerWaveIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">Total Tracks</div>
                  <div className="text-xl font-bold text-white">{editedMusic?.totalTracks}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <CurrencyDollarIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">Royalty Rate</div>
                  <div className="text-xl font-bold text-white">{editedMusic?.royaltyRate}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <ClockIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">Duration</div>
                  <div className="text-xl font-bold text-white">{editedMusic?.duration} min</div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-white mb-4">NFT Collection Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="text-gray-300">Collection Size:</span>
                    <span className="text-white font-bold ml-2">{editedMusic?.nftSegments} NFTs</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Estimated Value:</span>
                    <span className="text-white font-bold ml-2">{editedMusic?.estimatedCost}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Creator Royalty:</span>
                    <span className="text-red-400 font-bold ml-2">{editedMusic?.royaltyRate} per sale</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Marketplace:</span>
                    <span className="text-gray-400 font-bold ml-2">NPGX Music Exchange</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Track Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editedMusic?.tracks.map((track, index) => (
                    <div key={index} className="bg-gray-600/30 p-3 rounded-lg text-left">
                      <div className="text-white font-medium text-sm">{track.name}</div>
                      <div className="text-xs text-gray-400">{track.type} • {track.instrument}</div>
                      <div className="text-xs text-red-400">Segments {track.segmentStart}-{track.segmentEnd}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep('edit')}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  ← Back to Edit
                </button>
                <button
                  onClick={mintSoundtrack}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-green-700 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
                >
                  🚀 Mint Music NFTs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'edit' && editedMusic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-black">
        <div className="relative overflow-hidden bg-gradient-to-r from-white/5 to-white/10 py-16">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] text-white mb-4">
              🎵 Edit Your Soundtrack
            </h1>
            <p className="text-xl text-blue-100 mb-6">
              Fine-tune tracks, adjust composition, and perfect your music
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Music Overview */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">🎼 Soundtrack Overview</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={editedMusic.title}
                    onChange={(e) => updateMusicField('title', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Duration (min)</label>
                    <input
                      type="number"
                      value={editedMusic.duration}
                      onChange={(e) => updateMusicField('duration', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">BPM</label>
                    <input
                      type="number"
                      value={editedMusic.bpm}
                      onChange={(e) => updateMusicField('bpm', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Musical Key</label>
                  <select
                    value={editedMusic.key}
                    onChange={(e) => updateMusicField('key', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {musicalKeys.map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-white font-bold mb-2">Composition Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Genre:</span>
                      <span className="text-white">{editedMusic.genre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Mood:</span>
                      <span className="text-white">{editedMusic.mood}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Tracks:</span>
                      <span className="text-white">{editedMusic.totalTracks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Token:</span>
                      <span className="text-red-400">${editedMusic.tokenSymbol}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-950/50 to-red-950/50 rounded-lg p-4 border border-red-500/30">
                  <h3 className="text-white font-bold mb-2">🎵 Music Player</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                    >
                      {isPlaying ? (
                        <PauseIcon className="h-5 w-5" />
                      ) : (
                        <PlayIcon className="h-5 w-5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">Full Soundtrack Preview</div>
                      <div className="text-gray-400 text-xs">Click tracks below to preview individual pieces</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Track List */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">🎶 Track List</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {editedMusic.tracks.map((track, index) => (
                  <div
                    key={track.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      selectedTrack === track.id
                        ? 'bg-red-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{track.name}</span>
                      <button
                        onClick={() => toggleTrackPlayback(track.id)}
                        className="p-1 rounded-full hover:bg-white/10 transition-colors"
                      >
                        {track.isPlaying ? (
                          <PauseIcon className="h-4 w-4" />
                        ) : (
                          <PlayIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="text-sm opacity-75 mb-1">{track.type} • {track.instrument}</div>
                    <div className="text-xs opacity-60">{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')} • Volume: {Math.floor(track.volume * 100)}%</div>
                    <div className="text-xs text-red-400 mt-1">NFT Segments {track.segmentStart}-{track.segmentEnd}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Track Editor */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">
                {selectedTrack ? `🎛️ Edit Track` : '👆 Select a Track'}
              </h2>
              
              {selectedTrack && editedMusic.tracks.find(t => t.id === selectedTrack) && (
                <div className="space-y-4">
                  {(() => {
                    const track = editedMusic.tracks.find(t => t.id === selectedTrack)!
                    return (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Track Name</label>
                          <input
                            type="text"
                            value={track.name}
                            onChange={(e) => updateTrack(selectedTrack, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                            <select
                              value={track.type}
                              onChange={(e) => updateTrack(selectedTrack, 'type', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              {trackTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Instrument</label>
                            <select
                              value={track.instrument}
                              onChange={(e) => updateTrack(selectedTrack, 'instrument', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              {instruments.map(instrument => (
                                <option key={instrument} value={instrument}>{instrument}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Volume: {Math.floor(track.volume * 100)}%</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={track.volume}
                            onChange={(e) => updateTrack(selectedTrack, 'volume', Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Duration (seconds)</label>
                          <input
                            type="number"
                            value={track.duration}
                            onChange={(e) => updateTrack(selectedTrack, 'duration', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                          <textarea
                            value={track.description}
                            onChange={(e) => updateTrack(selectedTrack, 'description', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>

                        <div className="bg-gray-700/30 rounded-lg p-4">
                          <h4 className="text-white font-bold mb-2">NFT Segmentation</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Start Segment</label>
                              <input
                                type="number"
                                value={track.segmentStart}
                                onChange={(e) => updateTrack(selectedTrack, 'segmentStart', Number(e.target.value))}
                                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">End Segment</label>
                              <input
                                type="number"
                                value={track.segmentEnd}
                                onChange={(e) => updateTrack(selectedTrack, 'segmentEnd', Number(e.target.value))}
                                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                              />
                            </div>
                          </div>
                          <div className="text-xs text-red-400 mt-2">
                            This track will be split into {track.segmentEnd - track.segmentStart + 1} NFT segments
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => setStep('configure')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              ← Start Over
            </button>
            <button
              onClick={proceedToMint}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-blue-700 hover:to-red-700 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105"
            >
              Proceed to Mint →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-black">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-950 to-red-900 py-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] text-white mb-4">
            🎵 NPGX Music Generator
          </h1>
          <p className="text-xl text-white/10 mb-6">
            Create Epic Soundtracks • AI-Composed Music • NFT-Ready Tracks • Royalty Streams
          </p>
          <div className="flex justify-center space-x-8 text-sm text-red-200">
            <div className="flex items-center">
              <MusicalNoteIcon className="h-5 w-5 mr-2" />
              Multi-Genre Support
            </div>
            <div className="flex items-center">
              <SpeakerWaveIcon className="h-5 w-5 mr-2" />
              Professional Quality
            </div>
            <div className="flex items-center">
              <GiftIcon className="h-5 w-5 mr-2" />
              NFT Ready
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Form */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">🎼 Music Configuration</h2>
            
            {/* Import Project */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Import Project (Optional)</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Create standalone soundtrack or select project</option>
                {mockProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title} ({project.genre} • {project.duration}min)
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Soundtrack Title (Optional)</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Leave blank for auto-generated title"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Genre and Mood */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Genre *</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select Genre</option>
                  {musicGenres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mood *</label>
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select Mood</option>
                  {musicMoods.map(mood => (
                    <option key={mood} value={mood}>{mood}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration and Composition */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min="1"
                  max="180"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">BPM</label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  min="60"
                  max="200"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tracks</label>
                <input
                  type="number"
                  value={trackCount}
                  onChange={(e) => setTrackCount(Number(e.target.value))}
                  min="3"
                  max="20"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Musical Key and Primary Instrument */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Musical Key</label>
                <select
                  value={musicalKey}
                  onChange={(e) => setMusicalKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Auto-select</option>
                  {musicalKeys.map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Primary Instrument</label>
                <select
                  value={primaryInstrument}
                  onChange={(e) => setPrimaryInstrument(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Auto-select</option>
                  {instruments.map(instrument => (
                    <option key={instrument} value={instrument}>{instrument}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Creative Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Creative Direction (Optional)</label>
              <textarea
                value={creativeNotes}
                onChange={(e) => setCreativeNotes(e.target.value)}
                placeholder="Describe specific musical elements, emotions, or references you want included..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              onClick={generateMusic}
              disabled={!selectedGenre || !selectedMood || isGenerating}
              className="w-full bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <SparklesIcon className="h-5 w-5 mr-2 animate-spin" />
                  Composing Epic Soundtrack...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <MusicalNoteIcon className="h-5 w-5 mr-2" />
                  Generate Soundtrack
                </div>
              )}
            </button>
          </div>

          {/* Info Panel */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">🎯 Music Generation Process</h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Configure Soundtrack</h3>
                  <p className="text-gray-300 text-sm">Set genre, mood, duration, and musical parameters for your epic soundtrack.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <h3 className="text-white font-bold mb-1">AI Composes Music</h3>
                  <p className="text-gray-300 text-sm">Advanced AI creates professional-quality tracks with proper composition and arrangement.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Edit & Perfect</h3>
                  <p className="text-gray-300 text-sm">Fine-tune individual tracks, adjust volumes, and customize the composition.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">4</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Mint & Monetize</h3>
                  <p className="text-gray-300 text-sm">Launch as NFT collection with royalty streams and trading capabilities.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gradient-to-r from-red-950/50 to-red-950/50 rounded-lg border border-red-500/30">
              <h3 className="text-white font-bold mb-2">🎵 Music Features</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Professional multi-track compositions</li>
                <li>• Dynamic instrument arrangements</li>
                <li>• Mood-based musical themes</li>
                <li>• NFT segmentation for each track</li>
                <li>• Royalty-earning potential</li>
                <li>• Integration with movie projects</li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-green-900/50 to-red-950/50 rounded-lg border border-red-500/20">
              <h3 className="text-white font-bold mb-2">💰 Monetization</h3>
              <p className="text-gray-300 text-sm">
                Each soundtrack becomes a tradeable NFT collection with built-in royalty streams. 
                Fans can purchase individual tracks or complete albums, with creators earning ongoing revenue from all secondary sales.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
