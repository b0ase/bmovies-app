'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { 
  FaGoogle, 
  FaWallet, 
  FaTwitter, 
  FaDiscord,
  FaGithub
} from 'react-icons/fa'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleAuth = async (provider: string) => {
    setIsLoading(provider)
    try {
      await signIn(provider)
    } catch (error) {
      console.error('Auth error:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const authOptions = [
    {
      id: 'google',
      name: 'Continue with Google',
      icon: FaGoogle,
      color: 'bg-red-600 hover:bg-red-700',
      description: 'Sign in with your Google account'
    },
    {
      id: 'twitter',
      name: 'Continue with Twitter',
      icon: FaTwitter,
      color: 'bg-white/10 hover:bg-white/20',
      description: 'Sign in with your Twitter account'
    },
    {
      id: 'discord',
      name: 'Continue with Discord',
      icon: FaDiscord,
      color: 'bg-red-600 hover:bg-red-700',
      description: 'Sign in with your Discord account'
    },
    {
      id: 'github',
      name: 'Continue with GitHub',
      icon: FaGithub,
      color: 'bg-gray-800 hover:bg-gray-900',
      description: 'Sign in with your GitHub account'
    }
  ]

  const walletOptions = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: FaWallet,
      color: 'bg-red-600 hover:bg-red-600',
      description: 'Connect with MetaMask wallet'
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: FaWallet,
      color: 'bg-white/10 hover:bg-white/20',
      description: 'Connect with WalletConnect'
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: FaWallet,
      color: 'bg-white/10 hover:bg-white/20',
      description: 'Connect with Coinbase Wallet'
    }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-black/95 backdrop-blur-xl rounded-2xl border border-red-500/20 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-white">Sign In to NPGX</h2>
                  <p className="text-gray-400 text-sm mt-1">Choose your preferred method</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white p-2 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Social Auth Section */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <span>Social Login</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-red-500 to-transparent"></div>
                  </h3>
                  <div className="space-y-3">
                    {authOptions.map((option) => (
                      <motion.button
                        key={option.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAuth(option.id)}
                        disabled={isLoading === option.id}
                        className={`w-full ${option.color} text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isLoading === option.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <option.icon className="w-5 h-5" />
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-semibold">{option.name}</div>
                          <div className="text-xs opacity-80">{option.description}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-black text-gray-400">or connect wallet</span>
                  </div>
                </div>

                {/* Wallet Connection Section */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <FaWallet className="w-5 h-5 text-red-400" />
                    <span>Crypto Wallet</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-red-500 to-transparent"></div>
                  </h3>
                  <div className="space-y-3">
                    {walletOptions.map((wallet) => (
                      <motion.button
                        key={wallet.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAuth(wallet.id)}
                        disabled={isLoading === wallet.id}
                        className={`w-full ${wallet.color} text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isLoading === wallet.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <wallet.icon className="w-5 h-5" />
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-semibold">{wallet.name}</div>
                          <div className="text-xs opacity-80">{wallet.description}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-700">
                  By signing in, you agree to our{' '}
                  <a href="/terms" className="text-red-400 hover:text-red-300 underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-red-400 hover:text-red-300 underline">
                    Privacy Policy
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}