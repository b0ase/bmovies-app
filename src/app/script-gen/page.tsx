'use client'

import { useState } from 'react'
import { DocumentTextIcon, ChatBubbleLeftRightIcon, ClockIcon, FilmIcon, SparklesIcon, PencilIcon, CurrencyDollarIcon, PlayIcon } from '@heroicons/react/24/outline'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

interface ScriptTemplate {
  id: string
  title: string
  storylineId?: string
  genre: string
  duration: number
  segments: number
  format: 'Feature Film' | 'Short Film' | 'Series Episode' | 'Web Series'
  scenes: SceneData[]
  characters: CharacterData[]
  dialogueCount: number
  actionLines: number
  estimatedCost: string
  productionDays: number
  tokenSymbol: string
}

interface SceneData {
  sceneNumber: number
  location: string
  timeOfDay: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK'
  characters: string[]
  description: string
  dialogue: DialogueLine[]
  action: string[]
  duration: number
  segmentStart: number
  segmentEnd: number
  mood: string
  visualStyle: string
}

interface DialogueLine {
  character: string
  line: string
  direction?: string
  emotion?: string
}

interface CharacterData {
  name: string
  role: 'PROTAGONIST' | 'ANTAGONIST' | 'SUPPORTING' | 'MINOR'
  description: string
  voiceStyle: string
  keyTraits: string[]
  scenes: number[]
}

const scriptFormats = [
  'Feature Film', 'Short Film', 'Series Episode', 'Web Series'
]

const sceneLocations = [
  'Cyberpunk City Street', 'Neon-lit Alleyway', 'High-tech Laboratory', 'Underground Club',
  'Rooftop at Night', 'Corporate Headquarters', 'Virtual Reality Space', 'Abandoned Warehouse',
  'Futuristic Apartment', 'Dark Forest', 'Gothic Cathedral', 'Ancient Temple',
  'Space Station', 'Desert Wasteland', 'Underwater Base', 'Flying Vehicle'
]

const moods = [
  'Intense Action', 'Romantic Tension', 'Dark Mystery', 'Light Comedy',
  'Dramatic Confrontation', 'Peaceful Moment', 'Suspenseful Chase', 'Emotional Revelation'
]

const visualStyles = [
  'Cyberpunk Neon', 'Film Noir', 'Anime Style', 'Cinematic Epic',
  'Dark Gothic', 'Bright Futuristic', 'Gritty Realistic', 'Stylized Fantasy'
]

// Mock storylines (would come from storyline generator)
const mockStorylines = [
  {
    id: 'story_1',
    title: 'Cyberpunk Action Chronicles: Rise of the NPGX',
    genre: 'Cyberpunk Action',
    duration: 90,
    segments: 100,
    characters: ['Luna Cyberblade', 'Nova Bloodmoon', 'Raven Shadowblade']
  },
  {
    id: 'story_2', 
    title: 'Gothic Romance: Shadows of the Heart',
    genre: 'Gothic Romance',
    duration: 110,
    segments: 120,
    characters: ['Nova Bloodmoon', 'Phoenix Darkfire']
  }
]

export default function ScriptGenerator() {
  const [step, setStep] = useState<'configure' | 'edit' | 'produce'>('configure')
  const [selectedStoryline, setSelectedStoryline] = useState('')
  const [scriptFormat, setScriptFormat] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [targetDuration, setTargetDuration] = useState(90)
  const [segmentCount, setSegmentCount] = useState(100)
  const [sceneCount, setSceneCount] = useState(12)
  const [dialogueStyle, setDialogueStyle] = useState('')
  const [visualEmphasis, setVisualEmphasis] = useState('')
  const [customNotes, setCustomNotes] = useState('')
  const [generatedScript, setGeneratedScript] = useState<ScriptTemplate | null>(null)
  const [editedScript, setEditedScript] = useState<ScriptTemplate | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [aiScript, setAiScript] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // Auto-generate: fill all fields with random values and generate AI script
  const autoGenerate = async () => {
    // Pick 2-3 random characters
    const shuffled = [...NPGX_ROSTER].sort(() => Math.random() - 0.5)
    const charCount = 2 + Math.floor(Math.random() * 2)
    const chars = shuffled.slice(0, charCount)

    // Random config
    const formats = ['Short Film', 'Series Episode', 'Web Series']
    const format = formats[Math.floor(Math.random() * formats.length)]
    const genres = ['Cyberpunk Action', 'Neo-Noir Thriller', 'Punk Romance', 'Underground Crime', 'Sci-Fi Horror']
    const genre = genres[Math.floor(Math.random() * genres.length)]
    const dialogues = ['Action-packed', 'Character-driven', 'Witty', 'Dramatic', 'Realistic']
    const dialogue = dialogues[Math.floor(Math.random() * dialogues.length)]
    const visuals = ['Action sequences', 'Character moments', 'World building', 'Cinematography']
    const visual = visuals[Math.floor(Math.random() * visuals.length)]
    const dur = [10, 15, 20, 25][Math.floor(Math.random() * 4)]
    const scenes = Math.max(5, Math.floor(dur / 2))
    const titles = [
      `${chars[0].name}: Blood & Neon`,
      `The ${chars[0].name.split(' ')[1]} Protocol`,
      `Tokyo Underground: ${chars[0].token}`,
      `Neon Saints`,
      `${chars[0].name.split(' ')[0]} vs ${chars[1]?.name.split(' ')[0] || 'The System'}`,
      `Last Night at BED`,
      `Chrome & Silk`,
      `The Punk Manifesto`,
    ]
    const title = titles[Math.floor(Math.random() * titles.length)]

    // Fill the form
    setCustomTitle(title)
    setScriptFormat(format)
    setTargetDuration(dur)
    setSegmentCount(dur * 5)
    setSceneCount(scenes)
    setDialogueStyle(dialogue)
    setVisualEmphasis(visual)

    // Generate with AI
    setIsGenerating(true)
    setAiScript(null)
    setAiError(null)

    try {
      const res = await fetch('/api/generate-script/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          characters: chars.map(c => c.slug),
          format,
          genre,
          duration: dur,
          sceneCount: scenes,
          dialogueStyle: dialogue,
          visualEmphasis: visual,
        }),
      })
      const data = await res.json()
      if (data.success && data.script) {
        setAiScript(data.script)
      } else {
        setAiError(data.error || 'Generation failed')
      }
    } catch (err: any) {
      setAiError(err.message || 'Network error')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateScript = async () => {
    setIsGenerating(true)
    
    // Simulate AI script generation
    await new Promise(resolve => setTimeout(resolve, 4000))
    
    const storyline = mockStorylines.find(s => s.id === selectedStoryline)
    const title = customTitle || storyline?.title || 'Untitled Script'
    const tokenSymbol = title.replace(/\s+/g, '').toUpperCase().slice(0, 6)
    
    // Generate scenes
    const scenes: SceneData[] = []
    const segmentsPerScene = Math.floor(segmentCount / sceneCount)
    
    for (let i = 1; i <= sceneCount; i++) {
      const scene: SceneData = {
        sceneNumber: i,
        location: sceneLocations[Math.floor(Math.random() * sceneLocations.length)],
        timeOfDay: ['DAY', 'NIGHT', 'DAWN', 'DUSK'][Math.floor(Math.random() * 4)] as any,
        characters: storyline?.characters.slice(0, Math.floor(Math.random() * 3) + 1) || ['Luna Cyberblade'],
        description: `A pivotal scene where our heroes face new challenges and character development occurs. The atmosphere is tense as the plot advances toward its climax.`,
        dialogue: [
          {
            character: storyline?.characters[0] || 'Luna Cyberblade',
            line: "We can't let them get away with this. The fate of both worlds depends on our next move.",
            emotion: "Determined"
          },
          {
            character: storyline?.characters[1] || 'Nova Bloodmoon',
            line: "I've seen what happens when we hesitate. This time, we strike first.",
            emotion: "Fierce"
          }
        ],
        action: [
          "Camera pans across the neon-lit cityscape",
          "Characters move stealthily through shadows",
          "Sudden burst of action as conflict erupts"
        ],
        duration: Math.floor(targetDuration / sceneCount),
        segmentStart: (i - 1) * segmentsPerScene + 1,
        segmentEnd: i * segmentsPerScene,
        mood: moods[Math.floor(Math.random() * moods.length)],
        visualStyle: visualStyles[Math.floor(Math.random() * visualStyles.length)]
      }
      scenes.push(scene)
    }

    const script: ScriptTemplate = {
      id: `script_${Date.now()}`,
      title: title,
      storylineId: selectedStoryline,
      genre: storyline?.genre || 'Action',
      duration: targetDuration,
      segments: segmentCount,
      format: scriptFormat as any,
      scenes: scenes,
      characters: (storyline?.characters || ['Luna Cyberblade']).map(name => ({
        name,
        role: name === storyline?.characters[0] ? 'PROTAGONIST' : 'SUPPORTING' as any,
        description: `A complex character with deep motivations and compelling arc`,
        voiceStyle: `Confident and determined with moments of vulnerability`,
        keyTraits: ['Brave', 'Intelligent', 'Loyal'],
        scenes: scenes.filter(s => s.characters.includes(name)).map(s => s.sceneNumber)
      })),
      dialogueCount: scenes.reduce((total, scene) => total + scene.dialogue.length, 0),
      actionLines: scenes.reduce((total, scene) => total + scene.action.length, 0),
      estimatedCost: `$${(Math.random() * 500000 + 100000).toFixed(0)}`,
      productionDays: Math.floor(sceneCount * 2.5),
      tokenSymbol: tokenSymbol
    }
    
    setGeneratedScript(script)
    setEditedScript(script)
    setIsGenerating(false)
    setStep('edit')
  }

  const updateScriptField = (field: keyof ScriptTemplate, value: any) => {
    if (editedScript) {
      setEditedScript({
        ...editedScript,
        [field]: value
      })
    }
  }

  const updateScene = (sceneIndex: number, field: keyof SceneData, value: any) => {
    if (editedScript) {
      const updatedScenes = [...editedScript.scenes]
      updatedScenes[sceneIndex] = {
        ...updatedScenes[sceneIndex],
        [field]: value
      }
      setEditedScript({
        ...editedScript,
        scenes: updatedScenes
      })
    }
  }

  const proceedToProduction = () => {
    setStep('produce')
  }

  const startProduction = async () => {
    // Simulate production initiation
    await new Promise(resolve => setTimeout(resolve, 2000))
    alert(`🎬 Production started for "${editedScript?.title}"!\n\nEstimated Cost: ${editedScript?.estimatedCost}\nProduction Days: ${editedScript?.productionDays}\nNext: Generate storyboards and begin filming!`)
  }

  if (step === 'produce') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-black">
        <div className="relative overflow-hidden bg-gradient-to-r from-white/5 to-white/10 py-16">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] text-white mb-4">
              🎬 Ready for Production!
            </h1>
            <p className="text-xl text-green-100 mb-6">
              Launch Your Movie Production Pipeline
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-red-500/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">{editedScript?.title}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/5 rounded-lg p-4">
                  <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">Duration</div>
                  <div className="text-xl font-bold text-white">{editedScript?.duration} min</div>
                </div>
                <div className="bg-red-950/30 rounded-lg p-4">
                  <FilmIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">Scenes</div>
                  <div className="text-xl font-bold text-white">{editedScript?.scenes.length}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <CurrencyDollarIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">Estimated Cost</div>
                  <div className="text-xl font-bold text-white">{editedScript?.estimatedCost}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <DocumentTextIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-300">Production Days</div>
                  <div className="text-xl font-bold text-white">{editedScript?.productionDays}</div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Production Pipeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 text-xl font-bold">1</div>
                    <h4 className="text-white font-bold mb-1">Pre-Production</h4>
                    <p className="text-gray-300 text-sm">Storyboards, casting, location scouting</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 text-xl font-bold">2</div>
                    <h4 className="text-white font-bold mb-1">Production</h4>
                    <p className="text-gray-300 text-sm">Filming, motion capture, VFX creation</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 text-xl font-bold">3</div>
                    <h4 className="text-white font-bold mb-1">Post-Production</h4>
                    <p className="text-gray-300 text-sm">Editing, sound design, NFT segmentation</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Next Steps</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="flex items-center">
                    <PlayIcon className="h-5 w-5 text-red-400 mr-3" />
                    <span className="text-gray-300">Generate storyboards from script</span>
                  </div>
                  <div className="flex items-center">
                    <PlayIcon className="h-5 w-5 text-red-400 mr-3" />
                    <span className="text-gray-300">Create character models & animations</span>
                  </div>
                  <div className="flex items-center">
                    <PlayIcon className="h-5 w-5 text-red-400 mr-3" />
                    <span className="text-gray-300">Generate background music & sound effects</span>
                  </div>
                  <div className="flex items-center">
                    <PlayIcon className="h-5 w-5 text-red-400 mr-3" />
                    <span className="text-gray-300">Begin video generation for each scene</span>
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
                  onClick={startProduction}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-green-700 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
                >
                  🚀 Start Production
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'edit' && editedScript) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-black">
        <div className="relative overflow-hidden bg-gradient-to-r from-white/5 to-white/10 py-16">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold uppercase tracking-wide font-[family-name:var(--font-brand)] text-white mb-4">
              ✏️ Edit Your Script
            </h1>
            <p className="text-xl text-blue-100 mb-6">
              Fine-tune scenes, dialogue, and production details
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Script Overview */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">📋 Script Overview</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={editedScript.title}
                    onChange={(e) => updateScriptField('title', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                    <input
                      type="number"
                      value={editedScript.duration}
                      onChange={(e) => updateScriptField('duration', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Segments</label>
                    <input
                      type="number"
                      value={editedScript.segments}
                      onChange={(e) => updateScriptField('segments', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-white font-bold mb-2">Statistics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Scenes:</span>
                      <span className="text-white">{editedScript.scenes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Dialogue Lines:</span>
                      <span className="text-white">{editedScript.dialogueCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Action Lines:</span>
                      <span className="text-white">{editedScript.actionLines}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Est. Cost:</span>
                      <span className="text-red-400">{editedScript.estimatedCost}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2">Characters</h3>
                  <div className="space-y-2">
                    {editedScript.characters.map((char, index) => (
                      <div key={index} className="bg-gray-700/30 p-2 rounded">
                        <div className="text-white font-medium text-sm">{char.name}</div>
                        <div className="text-xs text-gray-400">{char.role} • {char.scenes.length} scenes</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Scene List */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">🎬 Scenes</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {editedScript.scenes.map((scene, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedScene(index)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedScene === index
                        ? 'bg-red-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">Scene {scene.sceneNumber}</span>
                      <span className="text-xs">{scene.timeOfDay}</span>
                    </div>
                    <div className="text-sm opacity-75">{scene.location}</div>
                    <div className="text-xs opacity-60 mt-1">{scene.mood} • {scene.duration}min</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scene Editor */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">
                {selectedScene !== null ? `✏️ Edit Scene ${selectedScene + 1}` : '👆 Select a Scene'}
              </h2>
              
              {selectedScene !== null && editedScript.scenes[selectedScene] && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                    <select
                      value={editedScript.scenes[selectedScene].location}
                      onChange={(e) => updateScene(selectedScene, 'location', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {sceneLocations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Time</label>
                      <select
                        value={editedScript.scenes[selectedScene].timeOfDay}
                        onChange={(e) => updateScene(selectedScene, 'timeOfDay', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="DAY">DAY</option>
                        <option value="NIGHT">NIGHT</option>
                        <option value="DAWN">DAWN</option>
                        <option value="DUSK">DUSK</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Duration (min)</label>
                      <input
                        type="number"
                        value={editedScript.scenes[selectedScene].duration}
                        onChange={(e) => updateScene(selectedScene, 'duration', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={editedScript.scenes[selectedScene].description}
                      onChange={(e) => updateScene(selectedScene, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Mood & Style</label>
                    <div className="grid grid-cols-1 gap-2">
                      <select
                        value={editedScript.scenes[selectedScene].mood}
                        onChange={(e) => updateScene(selectedScene, 'mood', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        {moods.map(mood => (
                          <option key={mood} value={mood}>{mood}</option>
                        ))}
                      </select>
                      <select
                        value={editedScript.scenes[selectedScene].visualStyle}
                        onChange={(e) => updateScene(selectedScene, 'visualStyle', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        {visualStyles.map(style => (
                          <option key={style} value={style}>{style}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-bold mb-2">Dialogue Preview</h4>
                    <div className="bg-gray-700/30 rounded p-3 text-sm">
                      {editedScript.scenes[selectedScene].dialogue.map((line, i) => (
                        <div key={i} className="mb-2">
                          <span className="text-gray-400 font-medium">{line.character}:</span>
                          <span className="text-gray-300 ml-2">"{line.line}"</span>
                          {line.emotion && <span className="text-gray-400 text-xs ml-2">({line.emotion})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
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
              onClick={proceedToProduction}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-blue-700 hover:to-red-700 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105"
            >
              Proceed to Production →
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
            📝 NPGX Script Generator
          </h1>
          <p className="text-xl text-white/10 mb-6">
            Transform Storylines into Professional Movie Scripts • Scene-by-Scene Breakdown • Production Ready
          </p>
          <div className="flex justify-center space-x-8 text-sm text-red-200">
            <div className="flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Professional Format
            </div>
            <div className="flex items-center">
              <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
              Dynamic Dialogue
            </div>
            <div className="flex items-center">
              <FilmIcon className="h-5 w-5 mr-2" />
              Production Ready
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Form */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">🎬 Script Configuration</h2>
            
            {/* Import Storyline */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Import Storyline</label>
              <select
                value={selectedStoryline}
                onChange={(e) => setSelectedStoryline(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Create new script or select existing storyline</option>
                {mockStorylines.map(story => (
                  <option key={story.id} value={story.id}>
                    {story.title} ({story.genre} • {story.duration}min)
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Custom Title (Optional)</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Override storyline title or create new"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Script Format */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Script Format *</label>
              <select
                value={scriptFormat}
                onChange={(e) => setScriptFormat(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Format</option>
                {scriptFormats.map(format => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </div>

            {/* Duration and Structure */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration (min)</label>
                <input
                  type="number"
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(Number(e.target.value))}
                  min="5"
                  max="300"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Segments</label>
                <input
                  type="number"
                  value={segmentCount}
                  onChange={(e) => setSegmentCount(Number(e.target.value))}
                  min="10"
                  max="500"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Scenes</label>
                <input
                  type="number"
                  value={sceneCount}
                  onChange={(e) => setSceneCount(Number(e.target.value))}
                  min="3"
                  max="50"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Dialogue Style */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Dialogue Style</label>
              <select
                value={dialogueStyle}
                onChange={(e) => setDialogueStyle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Style</option>
                <option value="Action-packed">Action-packed & Fast-paced</option>
                <option value="Character-driven">Character-driven & Emotional</option>
                <option value="Witty">Witty & Humorous</option>
                <option value="Dramatic">Dramatic & Intense</option>
                <option value="Philosophical">Philosophical & Deep</option>
                <option value="Realistic">Realistic & Natural</option>
              </select>
            </div>

            {/* Visual Emphasis */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Visual Emphasis</label>
              <select
                value={visualEmphasis}
                onChange={(e) => setVisualEmphasis(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Emphasis</option>
                <option value="Action sequences">Action sequences & Stunts</option>
                <option value="Character moments">Character moments & Emotions</option>
                <option value="World building">World building & Atmosphere</option>
                <option value="Visual effects">Visual effects & Spectacle</option>
                <option value="Cinematography">Cinematography & Artistry</option>
              </select>
            </div>

            {/* Custom Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Additional Notes (Optional)</label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Special requirements, character notes, or specific scenes you want included..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={autoGenerate}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-black py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 mr-2 animate-spin" />
                    Generating with AI...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Auto-Generate Everything
                  </div>
                )}
              </button>
              <p className="text-center text-gray-600 text-xs">Picks random characters, fills all fields, writes a full AI script</p>
            </div>
          </div>

          {/* AI Script Output or Info Panel */}
          {aiScript ? (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">{customTitle || 'Generated Script'}</h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiScript)
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition"
                >
                  Copy
                </button>
              </div>
              <div className="flex gap-3 mb-4 text-xs text-gray-500">
                <span>{scriptFormat}</span>
                <span>{targetDuration} min</span>
                <span>{sceneCount} scenes</span>
              </div>
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap max-h-[600px] overflow-y-auto bg-black/40 p-6 rounded-lg border border-white/5 leading-relaxed">
                {aiScript}
              </pre>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={autoGenerate}
                  disabled={isGenerating}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold py-2.5 px-4 rounded-lg transition text-sm uppercase tracking-wider"
                >
                  {isGenerating ? 'Generating...' : 'Generate Another'}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([aiScript], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${(customTitle || 'npgx-script').replace(/\s+/g, '-').toLowerCase()}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-lg transition text-sm"
                >
                  Download .txt
                </button>
              </div>
            </div>
          ) : aiError ? (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
              <h2 className="text-xl font-bold text-red-400 mb-3">Generation Failed</h2>
              <p className="text-gray-400 text-sm mb-4">{aiError}</p>
              <button
                onClick={autoGenerate}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
              >
                Try Again
              </button>
            </div>
          ) : (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">Script Generation</h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Configure Script Parameters</h3>
                  <p className="text-gray-300 text-sm">Set format, duration, scene count, and dialogue style preferences.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <h3 className="text-white font-bold mb-1">AI Generates Full Script</h3>
                  <p className="text-gray-300 text-sm">Creates professional screenplay with scenes, dialogue, action lines, and character development.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Edit & Refine Scenes</h3>
                  <p className="text-gray-300 text-sm">Modify dialogue, adjust pacing, update locations, and perfect character interactions.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">4</div>
                <div>
                  <h3 className="text-white font-bold mb-1">Launch Production</h3>
                  <p className="text-gray-300 text-sm">Move to pre-production, storyboard generation, and video creation pipeline.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gradient-to-r from-red-950/50 to-red-950/50 rounded-lg border border-red-500/30">
              <h3 className="text-white font-bold mb-2">📋 Script Features</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Professional screenplay formatting</li>
                <li>• Character-specific dialogue and voice</li>
                <li>• Detailed scene descriptions and action lines</li>
                <li>• NFT segment mapping for each scene</li>
                <li>• Production cost and timeline estimates</li>
                <li>• Export to industry-standard formats</li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/50 to-red-950/50 rounded-lg border border-white/10">
              <h3 className="text-white font-bold mb-2">🎬 Production Pipeline</h3>
              <p className="text-gray-300 text-sm">
                Generated scripts automatically integrate with our video generation, music creation, and NFT minting tools. 
                Each scene becomes a production unit that can be independently created and later assembled into the final movie.
              </p>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
