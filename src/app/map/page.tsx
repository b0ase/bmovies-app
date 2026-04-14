'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  MapIcon,
  UserIcon,
  PaintBrushIcon,
  VideoCameraIcon,
  FilmIcon,
  CurrencyDollarIcon,
  StarIcon,
  ArrowRightIcon,
  PlayIcon,
  DocumentTextIcon,
  MusicalNoteIcon,
  ShoppingCartIcon,
  TrophyIcon,
  SparklesIcon,
  RocketLaunchIcon,
  PencilIcon,
  ViewfinderCircleIcon,
  CogIcon,
  CheckCircleIcon,
  MegaphoneIcon,
  ChartBarIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

export default function CreativeJourneyMap() {
  const journeySteps = [
    {
      phase: "Discovery",
      title: "Explore & Understand",
      description: "Discover the NPGX universe and understand the creative potential",
      icon: SparklesIcon,
      color: "from-red-600 to-red-700",
      pages: [
        { name: "Home Page", path: "/", description: "Introduction to NPGX platform" },
        { name: "Character Gallery", path: "/npgx", description: "Explore existing characters" },
        { name: "Video Gallery", path: "/video-gallery", description: "See what's possible" }
      ],
      duration: "10-15 min",
      outcome: "Clear understanding of NPGX potential",
      priority: "essential"
    },
    {
      phase: "Character Creation",
      title: "Create Your Character",
      description: "Design and generate your unique NPGX character with AI assistance",
      icon: UserIcon,
      color: "from-red-600 to-red-700",
      pages: [
        { name: "Character Generator", path: "/character-gen", description: "AI-powered character creation" },
        { name: "Prompt Generator", path: "/prompt-gen", description: "Craft detailed character prompts" },
        { name: "Image Generator", path: "/image-gen", description: "Generate character visuals" }
      ],
      duration: "20-30 min",
      outcome: "Unique character with personality & visuals",
      priority: "essential"
    },
    {
      phase: "Character Refinement",
      title: "Perfect Your Character",
      description: "Refine character details, generate multiple variations, and build character depth",
      icon: PencilIcon,
      color: "from-white/10 to-white/5",
      pages: [
        { name: "Character Refinery", path: "/character-refinery", description: "Polish character details" },
        { name: "Variation Generator", path: "/variation-gen", description: "Create character variations" },
        { name: "Character Profile", path: "/character-profile", description: "Build comprehensive backstory" }
      ],
      duration: "15-25 min",
      outcome: "Polished character ready for production",
      priority: "important"
    },
    {
      phase: "Story Development",
      title: "Craft Your Story",
      description: "Develop compelling storylines and professional scripts for your character",
      icon: DocumentTextIcon,
      color: "from-white/10 to-white/5",
      pages: [
        { name: "Storyline Generator", path: "/storyline-gen", description: "AI-powered story creation" },
        { name: "Script Generator", path: "/script-gen", description: "Professional screenplay writing" },
        { name: "Storyboard Creator", path: "/storyboard-gen", description: "Visual story planning" }
      ],
      duration: "30-45 min",
      outcome: "Complete story with professional script",
      priority: "essential"
    },
    {
      phase: "Pre-Production",
      title: "Plan Your Production",
      description: "Create detailed production plans, storyboards, and technical specifications",
      icon: ViewfinderCircleIcon,
      color: "from-red-600 to-red-700",
      pages: [
        { name: "Production Planner", path: "/production-planner", description: "Plan your movie production" },
        { name: "Video Prompts", path: "/video-prompts", description: "Craft video generation prompts" },
        { name: "Scene Breakdown", path: "/scene-breakdown", description: "Detailed scene planning" }
      ],
      duration: "20-30 min",
      outcome: "Detailed production roadmap",
      priority: "important"
    },
    {
      phase: "Content Production",
      title: "Generate Content",
      description: "Create videos, music, and all media content for your movie",
      icon: VideoCameraIcon,
      color: "from-red-500 to-red-600",
      pages: [
        { name: "Video Generator", path: "/video-gen", description: "AI video generation" },
        { name: "Music Generator", path: "/music-gen", description: "AI soundtrack creation" },
        { name: "Content Library", path: "/content-library", description: "Manage all your content" }
      ],
      duration: "45-60 min",
      outcome: "Complete media library for your movie",
      priority: "essential"
    },
    {
      phase: "Movie Assembly",
      title: "Assemble Your Movie",
      description: "Combine all elements into a cohesive movie experience",
      icon: FilmIcon,
      color: "from-red-500 to-red-500",
      pages: [
        { name: "Movie Editor", path: "/movie-editor", description: "Assemble your complete movie" },
        { name: "Timeline Builder", path: "/timeline-builder", description: "Structure your movie flow" },
        { name: "Preview Studio", path: "/preview-studio", description: "Review before launch" }
      ],
      duration: "30-45 min",
      outcome: "Complete movie ready for segmentation",
      priority: "essential"
    },
    {
      phase: "Quality Assurance",
      title: "Review & Polish",
      description: "Test, review, and perfect your movie before NFT creation",
      icon: CheckCircleIcon,
      color: "from-white/10 to-white/5",
      pages: [
        { name: "Quality Checker", path: "/quality-checker", description: "Automated quality review" },
        { name: "Preview Theater", path: "/preview-theater", description: "Full movie preview" },
        { name: "Final Polish", path: "/final-polish", description: "Last-minute improvements" }
      ],
      duration: "15-20 min",
      outcome: "Polished movie ready for NFT minting",
      priority: "important"
    },
    {
      phase: "NFT Creation",
      title: "Create NFT Collection",
      description: "Segment your movie into NFTs and prepare for marketplace launch",
      icon: ShoppingCartIcon,
      color: "from-white to-transparent0",
      pages: [
        { name: "NFT Segmenter", path: "/nft-segmenter", description: "Split movie into NFT segments" },
        { name: "NFT Marketplace", path: "/nft-marketplace", description: "Mint and manage NFTs" },
        { name: "Collection Builder", path: "/collection-builder", description: "Create cohesive NFT collection" }
      ],
      duration: "20-30 min",
      outcome: "Complete NFT collection ready for sale",
      priority: "essential"
    },
    {
      phase: "Marketing Strategy",
      title: "Prepare for Launch",
      description: "Develop marketing strategy and build anticipation for your movie",
      icon: MegaphoneIcon,
      color: "from-red-600 to-red-700",
      pages: [
        { name: "Marketing Planner", path: "/marketing-planner", description: "Plan your launch strategy" },
        { name: "Social Media Kit", path: "/social-kit", description: "Generate marketing materials" },
        { name: "Community Builder", path: "/community-builder", description: "Build your audience" }
      ],
      duration: "15-25 min",
      outcome: "Marketing strategy ready for launch",
      priority: "important"
    },
    {
      phase: "Launch & Scale",
      title: "Launch Your Movie",
      description: "Go live with your movie and NFT collection, start earning revenue",
      icon: RocketLaunchIcon,
      color: "from-red-600 to-red-500",
      pages: [
        { name: "Launch Pad", path: "/launchpad", description: "One-click movie launch" },
        { name: "Marketplace", path: "/marketplace", description: "Sell your NFTs" },
        { name: "Revenue Dashboard", path: "/revenue-dashboard", description: "Track your earnings" }
      ],
      duration: "10-15 min",
      outcome: "Live movie generating revenue",
      priority: "essential"
    },
    {
      phase: "Success & Growth",
      title: "Optimize & Expand",
      description: "Monitor performance, optimize sales, and plan your next movie",
      icon: TrophyIcon,
      color: "from-yellow-500 to-amber-500",
      pages: [
        { name: "Analytics Dashboard", path: "/dashboard", description: "Track performance metrics" },
        { name: "Rankings", path: "/rankings", description: "See your success ranking" },
        { name: "Sequel Planner", path: "/sequel-planner", description: "Plan your next movie" }
      ],
      duration: "Ongoing",
      outcome: "Sustainable creative business empire",
      priority: "essential"
    }
  ]

  const essentialSteps = journeySteps.filter(step => step.priority === "essential")
  const totalEstimatedTime = "4-6 hours for first complete movie"
  const potentialEarnings = "$500-$50,000+ per movie"

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-black py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center space-x-3 mb-6">
            <MapIcon className="w-12 h-12 text-gray-400" />
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-wide font-[family-name:var(--font-brand)] bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent">
              CREATIVE JOURNEY MAP
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8">
            The complete roadmap from character concept to profitable movie NFT empire. Follow this proven path to creative and financial success.
          </p>
          
          {/* Journey Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-gray-400 mb-2">{journeySteps.length}</div>
              <div className="text-gray-300 text-sm">Total Phases</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-red-400 mb-2">{essentialSteps.length}</div>
              <div className="text-gray-300 text-sm">Essential Steps</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-red-400 mb-2">4-6h</div>
              <div className="text-gray-300 text-sm">First Movie</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-gray-400 mb-2">$50K+</div>
              <div className="text-gray-300 text-sm">Potential Revenue</div>
            </div>
          </div>

          {/* Priority Legend */}
          <div className="flex justify-center space-x-6 mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-300 text-sm">Essential Steps</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <span className="text-gray-300 text-sm">Important Steps</span>
            </div>
          </div>
        </motion.div>

        {/* Journey Flow */}
        <div className="space-y-8 mb-16">
          {journeySteps.map((step, index) => (
            <motion.div
              key={step.phase}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="relative"
            >
              {/* Connection Line */}
              {index < journeySteps.length - 1 && (
                <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-4 z-0">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 64 }}
                    transition={{ delay: 0.1 * index + 0.5, duration: 0.5 }}
                    className="w-1 bg-gradient-to-b from-red-600 to-red-700 rounded-full"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index + 0.8 }}
                    className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  >
                    <ArrowRightIcon className="w-6 h-6 text-red-400 rotate-90" />
                  </motion.div>
                </div>
              )}

              <div className={`bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 relative z-10 ${
                index % 2 === 0 ? 'lg:mr-12' : 'lg:ml-12'
              } ${step.priority === 'essential' ? 'ring-2 ring-red-500/30' : 'ring-2 ring-yellow-500/20'}`}>
                <div className="flex items-start space-x-6">
                  {/* Step Icon & Number */}
                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center mb-4 relative`}>
                      <step.icon className="w-8 h-8 text-white" />
                      {step.priority === 'essential' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <BoltIcon className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <span className="text-2xl font-bold text-white">{index + 1}</span>
                      <div className="text-xs text-gray-400 font-medium">{step.phase}</div>
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-white">{step.title}</h3>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          step.priority === 'essential' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-red-600/20 text-yellow-300'
                        }`}>
                          {step.priority}
                        </span>
                        <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm font-medium">
                          {step.duration}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 mb-6 text-lg">{step.description}</p>

                    {/* Pages in this step */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {step.pages.map((page, pageIndex) => (
                        <motion.div
                          key={page.path}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index + 0.1 * pageIndex }}
                        >
                          <Link 
                            href={page.path}
                            className="block p-4 rounded-xl bg-white/10 border border-white/20 hover:border-white/20/50 transition-all duration-300 hover:scale-105 group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-white group-hover:text-red-300 transition-colors text-sm">
                                {page.name}
                              </h4>
                              <PlayIcon className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-gray-400 text-xs">{page.description}</p>
                          </Link>
                        </motion.div>
                      ))}
                    </div>

                    {/* Outcome */}
                    <div className="flex items-center space-x-3 p-4 rounded-xl bg-red-600/10 border border-red-500/20">
                      <StarIcon className="w-5 h-5 text-red-400" />
                      <span className="text-red-300 font-medium">Outcome: {step.outcome}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Success Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-gradient-to-r from-red-600/10 to-red-800/10 backdrop-blur-xl rounded-3xl p-8 border border-red-500/30 mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center">
              <TrophyIcon className="w-8 h-8 mr-3 text-gray-400" />
              Success Potential
            </h2>
            <p className="text-gray-300 text-lg">What you can achieve following this complete journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-gray-400 mb-2">1st Movie</div>
              <div className="text-gray-300 mb-2">Complete in 4-6 hours</div>
              <div className="text-sm text-gray-400">From concept to NFT empire</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-red-400 mb-2">$500-$50K+</div>
              <div className="text-gray-300 mb-2">Per movie potential</div>
              <div className="text-sm text-gray-400">NFT sales + ongoing royalties</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-red-400 mb-2">100+ NFTs</div>
              <div className="text-gray-300 mb-2">Per movie</div>
              <div className="text-sm text-gray-400">Individual tradeable segments</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-gray-400 mb-2">Passive Income</div>
              <div className="text-gray-300 mb-2">Lifetime royalties</div>
              <div className="text-sm text-gray-400">From every NFT transaction</div>
            </div>
          </div>
        </motion.div>

        {/* Quick Start Options */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-white/50 to-red-600 rounded-3xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-4">Choose Your Starting Point</h2>
            <p className="text-blue-100 text-lg mb-8">
              Jump in at any phase or follow the complete journey from the beginning
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link 
                href="/npgx"
                className="inline-flex items-center justify-center px-6 py-4 bg-red-600/20 text-white font-bold rounded-2xl border border-blue-400/50 hover:bg-white/50/30 transition-all duration-300 hover:scale-105"
              >
                <SparklesIcon className="w-5 h-5 mr-2" />
                Explore First
              </Link>
              <Link 
                href="/character-gen"
                className="inline-flex items-center justify-center px-6 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-white/5 transition-all duration-300 hover:scale-105"
              >
                <UserIcon className="w-5 h-5 mr-2" />
                Start Creating
              </Link>
              <Link 
                href="/dashboard"
                className="inline-flex items-center justify-center px-6 py-4 bg-red-500/20 text-white font-bold rounded-2xl border border-white/20/50 hover:bg-red-500/30 transition-all duration-300 hover:scale-105"
              >
                <ChartBarIcon className="w-5 h-5 mr-2" />
                Track Progress
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
