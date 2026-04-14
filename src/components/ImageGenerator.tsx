'use client';

import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const punkStyles = [
    'cyberpunk ninja with neon tattoos',
    'street punk rebel with leather jacket',
    'gothic punk with dark makeup',
    'steampunk warrior with gears',
    'post-apocalyptic punk survivor',
    'anime punk with colorful hair'
  ]

  const punkTraits = [
    'rebellious attitude',
    'fierce expression',
    'confident stance',
    'dangerous aura',
    'underground vibes',
    'badass personality'
  ]

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your Ninja Punk Girl')
      return
    }

    setIsGenerating(true)
    setError(null)
    setImageUrl(null)

    try {
      const enhancedPrompt = `Ninja Punk Girl, ${prompt}, ultra-realistic, high quality, professional photography, dramatic lighting`
      
      const response = await fetch('/api/generate-image-npgx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: 'luna-cyberblade',
          additionalPrompt: enhancedPrompt,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to generate image')
      }

      const data = await response.json()
      setImageUrl(data.imageUrl)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleQuickPrompt = (style: string) => {
    setPrompt(`${style}, ${punkTraits[Math.floor(Math.random() * punkTraits.length)]}`)
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-red-900 rounded-2xl p-8 border border-red-500/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
          🔥 Ninja Punk Girl Generator 🔥
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Create ultra-badass Ninja Punk Girls with advanced AI. 
          Describe your vision and watch the rebellion come to life.
        </p>
      </motion.div>

      {/* Quick Style Buttons */}
      <div className="mb-6">
        <h3 className="text-red-400 font-semibold mb-3">Quick Punk Styles:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {punkStyles.map((style, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickPrompt(style)}
              className="px-3 py-2 bg-red-600/20 text-red-300 rounded-lg border border-red-500/30 hover:border-red-500/60 transition-all text-sm"
            >
              {style}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Input */}
      <div className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-red-400 font-semibold mb-2">
            Describe Your Ninja Punk Girl:
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., fierce warrior with purple hair, leather jacket, neon tattoos, standing in rain..."
            className="w-full p-4 bg-black/50 border border-red-500/30 rounded-lg text-white placeholder-gray-400 focus:border-red-500 focus:outline-none min-h-[100px] resize-none"
            disabled={isGenerating}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateImage}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
            isGenerating || !prompt.trim()
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-600 to-red-600 text-white hover:shadow-lg'
          }`}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Generating Rebel...</span>
            </div>
          ) : (
            '✨ Generate Ninja Punk Girl'
          )}
        </motion.button>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg"
        >
          <p className="text-red-300 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Generated Image */}
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8"
        >
          <h3 className="text-red-400 font-semibold mb-4 text-center">Your Ninja Punk Girl:</h3>
          <div className="relative group">
            <img
              src={imageUrl}
              alt="Generated Ninja Punk Girl"
              className="w-full rounded-lg shadow-2xl border border-red-500/30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white font-semibold text-sm">{prompt}</p>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4 mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const link = document.createElement('a')
                link.href = imageUrl
                link.download = 'ninja-punk-girl.png'
                link.click()
              }}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Download 📥
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setImageUrl(null)}
              className="flex-1 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Generate New 🔄
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Canvas for advanced editing (hidden for now) */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        width={512}
        height={512}
      />

      {/* Tips */}
      <div className="mt-8 p-4 bg-red-950/20 border border-red-500/30 rounded-lg">
        <h4 className="text-red-400 font-semibold mb-2">💡 Pro Tips for Better Results:</h4>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Include specific details: hair color, clothing, poses</li>
          <li>• Add punk elements: tattoos, piercings, leather, chains</li>
          <li>• Mention lighting: neon, dramatic, cyberpunk</li>
          <li>• Specify environment: city street, underground, rooftop</li>
        </ul>
      </div>
    </div>
  )
}

export default ImageGenerator 