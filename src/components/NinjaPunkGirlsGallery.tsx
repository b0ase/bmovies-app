'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { NPGX_ROSTER } from '@/lib/npgx-roster'

export function NinjaPunkGirlsGallery() {
  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-4xl font-black text-white mb-4 tracking-tight"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            26 CHARACTERS A-Z
          </motion.h2>
          <p className="text-base sm:text-xl text-gray-500 max-w-3xl mx-auto mb-4 sm:mb-6 px-4">
            AI-generated characters with their own tokens and content pipelines
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {NPGX_ROSTER.map((girl, index) => (
            <Link
              key={girl.slug}
              href={girl.site || `/xxx`}
              className="block group"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.5) }}
                className="bg-white/5 rounded-lg overflow-hidden transition-all duration-300 border border-white/10 hover:border-red-500/50 group-hover:scale-[1.03]"
              >
                <div className="relative aspect-[9/14]">
                  <img
                    src={girl.image}
                    alt={girl.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="bg-red-600/90 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                      {girl.letter}
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-3">
                    <h3 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase leading-tight">
                      {girl.name}
                    </h3>
                    <p className="text-red-400 text-[10px] font-mono mt-0.5">{girl.token}</p>
                    <p className="text-gray-500 text-[10px] line-clamp-1 mt-0.5">{girl.tagline}</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
