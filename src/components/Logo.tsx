import Link from 'next/link'
import { motion } from 'framer-motion'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }

  return (
    <Link 
      href="/" 
      className={`flex items-center space-x-2 ${className}`}
    >
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0"
      >
        <img 
          src="/ai-gilrfriends-logos/download-6.jpg" 
          alt="NPGX Logo"
          className={`rounded-full ${size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-8 h-8' : 'w-6 h-6'}`}
        />
      </motion.div>
      <span className={`font-black bg-gradient-to-r from-red-500 via-red-500 to-red-600 bg-clip-text text-transparent ${sizeClasses[size]}`}>
        $NPGX
      </span>
    </Link>
  )
} 