'use client'

import { useState } from 'react'
import { BookOpenIcon, SparklesIcon, FilmIcon, HeartIcon, PencilIcon, CheckCircleIcon, CurrencyDollarIcon, GiftIcon } from '@heroicons/react/24/outline'

interface StorylineTemplate {
  id: string
  title: string
  genre: string
  duration: number
  segments: number
  plotStructure: string
  themes: string[]
  targetAudience: string
  synopsis: string
  actBreakdown: {
    act: number
    title: string
    duration: number
    segments: number
    keyEvents: string[]
    characters: string[]
  }[]
  characterArcs: {
    character: string
    role: string
    arc: string
    keyMoments: string[]
  }[]
  estimatedRevenue: string
  mintingCost: string
  tokenSymbol: string
}

const genres = [
  'Cyberpunk Action', 'Gothic Romance', 'Ninja Adventure', 'Sci-Fi Thriller',
  'Dark Fantasy', 'Urban Fantasy', 'Steampunk', 'Post-Apocalyptic',
  'Supernatural Horror', 'Martial Arts Epic', 'Space Opera', 'Time Travel',
  'Noir Crime', 'Mecha Battle', 'Virtual Reality', 'Dystopian Drama'
]

const plotStructures = [
  'Three-Act Structure', 'Hero\'s Journey', 'Revenge Arc', 'Romance Arc',
  'Mystery Investigation', 'Heist Plot', 'Survival Story', 'Origin Story',
  'Redemption Arc', 'Tournament Arc', 'War Campaign', 'Coming of Age',
  'Time Loop', 'Parallel Worlds', 'Chosen One', 'Found Family'
]

const themes = [
  'Honor vs Duty', 'Love vs Power', 'Technology vs Humanity', 'Past vs Future',
  'Light vs Darkness', 'Freedom vs Control', 'Loyalty vs Betrayal', 'Justice vs Revenge',
  'Identity Crisis', 'Sacrifice & Loss', 'Redemption', 'Forbidden Love',
  'Corporate Conspiracy', 'Ancient Prophecy', 'Digital Consciousness', 'Time Paradox'
]

import { NPGX_ROSTER } from '@/lib/npgx-roster'

const npgxCharacters = NPGX_ROSTER.map(c => ({
  name: c.name,
  role: c.category.charAt(0).toUpperCase() + c.category.slice(1) + ' Fighter',
  specialty: c.specialties.slice(0, 2).join(' & '),
}))

export default function StorylineGenerator() {
  const [step, setStep] = useState<'configure' | 'edit' | 'mint'>('configure')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedStructure, setSelectedStructure] = useState('')
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
  const [movieTitle, setMovieTitle] = useState('')
  const [duration, setDuration] = useState(90)
  const [segments, setSegments] = useState(100)
  const [targetAudience, setTargetAudience] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [generatedStoryline, setGeneratedStoryline] = useState<StorylineTemplate | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [editedStoryline, setEditedStoryline] = useState<StorylineTemplate | null>(null)

  const handleThemeToggle = (theme: string) => {
    setSelectedThemes(prev => 
      prev.includes(theme) 
        ? prev.filter(t => t !== theme)
        : [...prev, theme]
    )
  }

  const handleCharacterToggle = (character: string) => {
    setSelectedCharacters(prev => 
      prev.includes(character) 
        ? prev.filter(c => c !== character)
        : [...prev, character]
    )
  }

  const generateStoryline = async () => {
    setIsGenerating(true)
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const tokenSymbol = `${movieTitle.replace(/\s+/g, '').toUpperCase().slice(0, 6)}` || `${selectedGenre.replace(/\s+/g, '').toUpperCase().slice(0, 6)}`
    
    const storyline: StorylineTemplate = {
      id: `story_${Date.now()}`,
      title: movieTitle || `${selectedGenre} Chronicles: Rise of the NPGX`,
      genre: selectedGenre,
      duration: duration,
      segments: segments,
      plotStructure: selectedStructure,
      themes: selectedThemes,
      targetAudience: targetAudience,
      synopsis: `In a world where ${selectedThemes[0]?.toLowerCase() || 'honor and duty'} clash, our heroes must navigate the treacherous landscape of ${selectedGenre.toLowerCase()}. When an ancient threat emerges, ${selectedCharacters.join(', ')} must unite their unique abilities to save both the digital and physical realms. This epic ${duration}-minute journey explores themes of ${selectedThemes.join(', ').toLowerCase()} through stunning visuals and heart-pounding action sequences.`,
      actBreakdown: [
        {
          act: 1,
          title: 'The Awakening',
          duration: Math.floor(duration * 0.25),
          segments: Math.floor(segments * 0.25),
          keyEvents: [
            'Introduction of main characters',
            'Establishment of the world and rules',
            'Inciting incident occurs',
            'Characters accept their destiny'
          ],
          characters: selectedCharacters.slice(0, 3)
        },
        {
          act: 2,
          title: 'The Trials',
          duration: Math.floor(duration * 0.5),
          segments: Math.floor(segments * 0.5),
          keyEvents: [
            'Characters face initial challenges',
            'Relationships and alliances form',
            'Major obstacles and setbacks',
            'Character development and growth',
            'Midpoint revelation or twist'
          ],
          characters: selectedCharacters
        },
        {
          act: 3,
          title: 'The Resolution',
          duration: Math.floor(duration * 0.25),
          segments: Math.floor(segments * 0.25),
          keyEvents: [
            'Final confrontation begins',
            'Characters use learned skills',
            'Climactic battle sequence',
            'Resolution and new equilibrium'
          ],
          characters: selectedCharacters
        }
      ],
      characterArcs: selectedCharacters.map(char => ({
        character: char,
        role: npgxCharacters.find(c => c.name === char)?.role || 'Hero',
        arc: 'Transforms from reluctant participant to confident leader',
        keyMoments: [
          'Initial reluctance and self-doubt',
          'First major challenge overcome',
          'Moment of greatest weakness',
          'Final triumph and growth'
        ]
      })),
      estimatedRevenue: `$${(Math.random() * 100000 + 50000).toFixed(0)}`,
      mintingCost: `${(segments * 0.1).toFixed(1)} ETH`,
      tokenSymbol: tokenSymbol
    }
    
    setGeneratedStoryline(storyline)
    setEditedStoryline(storyline)
    setIsGenerating(false)
    setStep('edit')
  }

  const updateStorylineField = (field: keyof StorylineTemplate, value: any) => {
    if (editedStoryline) {
      setEditedStoryline({
        ...editedStoryline,
        [field]: value
      })
    }
  }

  const proceedToMint = () => {
    setStep('mint')
  }

  const mintStoryline = async () => {
    // Simulate minting process
    await new Promise(resolve => setTimeout(resolve, 2000))
    alert(`🎉 Storyline "${editedStoryline?.title}" minted successfully!\n\nToken: ${editedStoryline?.tokenSymbol}\nSegments: ${editedStoryline?.segments}\nNow available on NPGX DEX!`)
  }

  if (step === 'mint') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-black">
        <div className="relative overflow-hidden bg-gradient-to-r from-white/5 to-white/10 py-16">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] text-white mb-4">
              🎬 Ready to Mint Your Storyline!
            </h1>
            <p className="text-xl text-green-100 mb-6">
              Launch Your Movie as NFT Segments with Trading Token
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-red-500/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">{editedStoryline?.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/5 rounded-lg p-4">
                  <CurrencyDollarIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">Token Symbol</div>
                  <div className="text-xl font-bold text-white">${editedStoryline?.tokenSymbol}</div>
                </div>
                <div className="bg-red-950/30 rounded-lg p-4">
                  <GiftIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">NFT Segments</div>
                  <div className="text-xl font-bold text-white">{editedStoryline?.segments}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <FilmIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">Estimated Revenue</div>
                  <div className="text-xl font-bold text-white">{editedStoryline?.estimatedRevenue}</div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Minting Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="text-gray-300">Minting Cost:</span>
                    <span className="text-white font-bold ml-2">{editedStoryline?.mintingCost}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Platform Fee:</span>
                    <span className="text-white font-bold ml-2">5% of revenue</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Your Share:</span>
                    <span className="text-red-400 font-bold ml-2">95% of revenue</span>
                  </div>
                  <div>
                    <span className="text-gray-300">DEX Listing:</span>
                    <span className="text-gray-400 font-bold ml-2">Automatic</span>
                  </div>
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
                  onClick={mintStoryline}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-green-700 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
                >
                  🚀 Mint Storyline NFT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'edit' && editedStoryline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-black">
        <div className="relative overflow-hidden bg-gradient-to-r from-white/5 to-white/10 py-16">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] text-white mb-4">
              ✏️ Edit Your Storyline
            </h1>
            <p className="text-xl text-blue-100 mb-6">
              Fine-tune your generated storyline before minting
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Edit Form */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">📝 Storyline Details</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Movie Title</label>
                  <input
                    type="text"
                    value={editedStoryline.title}
                    onChange={(e) => updateStorylineField('title', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Synopsis</label>
                  <textarea
                    value={editedStoryline.synopsis}
                    onChange={(e) => updateStorylineField('synopsis', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Duration (min)</label>
                    <input
                      type="number"
                      value={editedStoryline.duration}
                      onChange={(e) => updateStorylineField('duration', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">NFT Segments</label>
                    <input
                      type="number"
                      value={editedStoryline.segments}
                      onChange={(e) => updateStorylineField('segments', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Token Symbol</label>
                  <input
                    type="text"
                    value={editedStoryline.tokenSymbol}
                    onChange={(e) => updateStorylineField('tokenSymbol', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">👀 Storyline Preview</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">{editedStoryline.title}</h3>
                  <p className="text-gray-300 text-sm mb-4">{editedStoryline.synopsis}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-700/50 p-3 rounded">
                      <div className="text-xs text-gray-400">Genre</div>
                      <div className="text-white font-medium">{editedStoryline.genre}</div>
                    </div>
                    <div className="bg-gray-700/50 p-3 rounded">
                      <div className="text-xs text-gray-400">Structure</div>
                      <div className="text-white font-medium">{editedStoryline.plotStructure}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-bold text-white mb-3">Act Breakdown</h4>
                  {editedStoryline.actBreakdown.map((act, index) => (
                    <div key={index} className="bg-gray-700/30 p-3 rounded mb-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">Act {act.act}: {act.title}</span>
                        <span className="text-xs text-gray-400">{act.duration}min • {act.segments} segments</span>
                      </div>
                      <div className="text-xs text-gray-300">
                        {act.keyEvents.slice(0, 2).join(' • ')}...
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-md font-bold text-white mb-3">Characters</h4>
                  <div className="space-y-2">
                    {editedStoryline.characterArcs.map((char, index) => (
                      <div key={index} className="bg-gray-700/30 p-2 rounded">
                        <div className="text-white font-medium text-sm">{char.character}</div>
                        <div className="text-xs text-gray-400">{char.role}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
            📖 NPGX Storyline Generator
          </h1>
          <p className="text-xl text-white/10 mb-6">
            Create Epic Movie Storylines • Generate NFT Segments • Launch Trading Tokens
          </p>
          <div className="flex justify-center space-x-8 text-sm text-red-200">
            <div className="flex items-center">
              <FilmIcon className="h-5 w-5 mr-2" />
              Multi-Genre Support
            </div>
            <div className="flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2" />
              AI-Powered Narratives
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
          {/* Generator Form */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">🎬 Story Configuration</h2>
            
            {/* Movie Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Movie Title (Optional)</label>
              <input
                type="text"
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                placeholder="Leave blank for AI-generated title"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Genre Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Genre *</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Genre</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            {/* Plot Structure */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Plot Structure *</label>
              <select
                value={selectedStructure}
                onChange={(e) => setSelectedStructure(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Structure</option>
                {plotStructures.map(structure => (
                  <option key={structure} value={structure}>{structure}</option>
                ))}
              </select>
            </div>

            {/* NPGX Characters */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">NPGX Characters (select 2-5)</label>
              <div className="space-y-2">
                {npgxCharacters.map(char => (
                  <button
                    key={char.name}
                    onClick={() => handleCharacterToggle(char.name)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedCharacters.includes(char.name)
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{char.name}</div>
                    <div className="text-sm opacity-75">{char.role} • {char.specialty}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration and Segments */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min="30"
                  max="180"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">NFT Segments</label>
                <input
                  type="number"
                  value={segments}
                  onChange={(e) => setSegments(Number(e.target.value))}
                  min="50"
                  max="500"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Themes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Themes (select 2-4)</label>
              <div className="grid grid-cols-2 gap-2">
                {themes.map(theme => (
                  <button
                    key={theme}
                    onClick={() => handleThemeToggle(theme)}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      selectedThemes.includes(theme)
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Audience</option>
                <option value="Young Adult (18-25)">Young Adult (18-25)</option>
                <option value="Adult (26-40)">Adult (26-40)</option>
                <option value="Mature Adult (40+)">Mature Adult (40+)</option>
                <option value="All Ages">All Ages</option>
                <option value="Anime Fans">Anime Fans</option>
                <option value="Gaming Community">Gaming Community</option>
                <option value="NFT Collectors">NFT Collectors</option>
              </select>
            </div>

            {/* Custom Prompt */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Additional Creative Direction (Optional)</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add any specific plot points, character relationships, or creative elements you want included..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              onClick={generateStoryline}
              disabled={!selectedGenre || !selectedStructure || selectedCharacters.length < 2 || isGenerating}
              className="w-full bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <SparklesIcon className="h-5 w-5 mr-2 animate-spin" />
                  Generating Epic Storyline...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <BookOpenIcon className="h-5 w-5 mr-2" />
                  Generate Storyline
                </div>
              )}
            </button>
          </div>

          {/* Info Panel */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">🎯 How It Works</h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Configure Your Story</h3>
                  <p className="text-gray-300 text-sm">Select genre, characters, themes, and structure to define your movie's foundation.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <h3 className="text-white font-bold mb-1">AI Generates Storyline</h3>
                  <p className="text-gray-300 text-sm">Our AI creates a detailed storyline with act breakdowns, character arcs, and NFT segmentation.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Edit & Refine</h3>
                  <p className="text-gray-300 text-sm">Fine-tune the generated storyline to match your creative vision perfectly.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">4</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Mint & Launch</h3>
                  <p className="text-gray-300 text-sm">Mint your storyline as NFT segments with a trading token on NPGX DEX.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gradient-to-r from-red-950/50 to-red-950/50 rounded-lg border border-red-500/30">
              <h3 className="text-white font-bold mb-2">💡 Pro Tips</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Choose complementary characters for better story dynamics</li>
                <li>• Higher segment counts = more NFT trading opportunities</li>
                <li>• Popular genres tend to perform better on the DEX</li>
                <li>• Custom prompts help create unique storylines</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 