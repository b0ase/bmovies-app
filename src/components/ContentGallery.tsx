'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

// NPG-X-10 batch — 69 editorial magazine-style images from Grok
const galleryImages = [
  '0787e269-cc55-4dca-86b2-3019778fb71d.jpg',
  '08a0da98-6cf9-4d84-86ea-7309e6ddd5d7.jpg',
  '0ad857c9-3e2c-431c-8a0f-ec8596f6a6b8.jpg',
  '0f472fe2-780a-4262-a244-991caa1507e3.jpg',
  '0f8b0eaf-bfd3-46cb-b7d0-30ddb0bb693c.jpg',
  '10fb4c73-a5cb-4ac4-9584-cb775835e25d.jpg',
  '14c025b9-45de-4504-b3c9-afbdd52a6f0e.jpg',
  '1adb41ba-09c9-40c9-9322-695a9e511143.jpg',
  '1ef5a2ff-6384-4ab9-b078-17a755e5ae29.jpg',
  '25496353-001a-42d4-bf5f-8e84eea7e2ef.jpg',
  '29eda411-087b-4d03-9a53-ec0f8961e0d6.jpg',
  '315e0fb2-3239-4f3d-a0a7-8f9df759205d.jpg',
  '34f2f413-9d8b-4048-9b8f-86db353e063f.jpg',
  '35d26ef8-235e-4202-b6d8-3792d71891e6.jpg',
  '37a59c43-8378-4aeb-ad25-8fcd1a91dfb7.jpg',
  '43493aaa-62af-41a1-a2b1-226c22fcf7a4.jpg',
  '43f9f9bc-3d83-4c18-842a-afe17534c7ed.jpg',
  '4c46274a-e2c0-4785-8a6b-b999ab74a426.jpg',
  '4d37295b-a417-4446-b7c2-87c2bb2dd1dd.jpg',
  '4e8ff8ad-f92b-4a87-a4c8-80ef578d49d7.jpg',
  '4f10b574-39d5-4386-8bed-fd7c45e3ee5a.jpg',
  '4f69f678-55f3-4b51-ab11-aadbf662c48e.jpg',
  '556538b9-a547-4b05-9ae8-41ada694e8af.jpg',
  '56da1765-bf00-42bc-83c7-c7e92ab158cc.jpg',
  '61aa6445-c6fd-4353-93dc-bacd8c6475eb.jpg',
  '62c6d28f-7400-4042-bc15-161176638392.jpg',
  '660c6b3d-d67c-4c9d-80ff-c81024efcf64.jpg',
  '681afdfc-024a-4766-b36c-7f25c70f01eb.jpg',
  '6d4e8fcd-4b68-4773-b05e-9f93898e46b1.jpg',
  '6f4619bd-1fb2-43d1-9b3d-c3762da42724.jpg',
  '70de0ca2-3273-4d3c-9418-2451bddbad1a.jpg',
  '75f4a59c-2bbf-46db-9704-903f53fdc0dd.jpg',
  '7993b201-7879-4f88-8922-2fe725bfb0b6.jpg',
  '79ec3b10-40b8-4304-81c2-facf266239b3.jpg',
  '7e18d8b0-adc7-4bc7-a54c-085ca64fb155.jpg',
  '7e9a0915-a58d-4251-b601-661c4e122009.jpg',
  '7f63be58-b688-4084-a01d-cd753f7ea491.jpg',
  '8341af55-68dc-4455-ba9c-d833bebe4928.jpg',
  '840965fb-7682-4f0c-a3df-86c14df40983.jpg',
  '865a055b-3292-4486-b11c-d856069e9262.jpg',
  '94d38684-ebdb-490a-b492-2450ec8f7537.jpg',
  '9a8a4420-a9fd-40c2-8e3c-aacaf8b1c129.jpg',
  'a4e7133a-ba6d-451f-8093-42d7b7264073.jpg',
  'a55e3c78-c5f8-4ba9-849c-90337a2dbb62.jpg',
  'a829f0c9-4f78-465d-a101-27fa7f737f0b.jpg',
  'aa40bab6-e8b6-4624-a6cf-b9720d23a420.jpg',
  'aa7ccce4-9230-4b4e-bfd6-b50632de1f3e.jpg',
  'ae048a64-7abe-485e-a762-ce9631cbbef3.jpg',
  'b4199422-4daf-4f04-be85-9aef69d48a7a.jpg',
  'b4b70ed6-023d-4575-8121-2ac28e7edc92.jpg',
  'b673d386-e68b-4f92-b359-a4aa695bc5ee.jpg',
  'c3ee0a4f-4e08-4e76-bcf9-ab94a237e70a.jpg',
  'c768ec7e-7116-4d88-8b41-74ef5afc718b.jpg',
  'd0e490ac-7f33-4896-ac2a-0174bc3c8ea7.jpg',
  'd93f0a0d-d9c2-442d-ac10-255f99b7f62a.jpg',
  'dac1f76f-0262-4529-a5a8-e26869e5b479.jpg',
  'db5d327c-3211-447f-86c7-d610258f4db2.jpg',
  'e60bf165-0555-4d80-8f19-316c79dec064.jpg',
  'e61093d5-3538-4000-aa99-e596739cde6f.jpg',
  'e88258b9-1f26-47de-b40f-5a4baf739218.jpg',
  'e98d6256-da35-4559-a65a-4d2329675848.jpg',
  'ec2119e4-009c-4f8a-a253-6a9a1064cc37.jpg',
  'edf43b70-be07-479f-a12c-a7cc0b574efd.jpg',
  'eecaf389-5b2b-42d7-bd12-141d051e716a.jpg',
  'f6a6f966-556b-4488-8864-bfdf4a2d4526.jpg',
  'f9136c6b-01fe-473e-9dd9-206cf15742d1.jpg',
  'f9de0680-55e1-4df1-a8b9-9d78c8c023bf.jpg',
  'fbe4a82c-1a98-42b9-a7a3-71f59f314c76.jpg',
].map(f => `/NPG-X-10/${f}`)

// NPG-X-10 videos — 45 animated clips
const allVideos = [
  'grok-video-0277ac3f-48e0-4862-b929-bf5d20aeebd5.mp4',
  'grok-video-0787e269-cc55-4dca-86b2-3019778fb71d.mp4',
  'grok-video-08a0da98-6cf9-4d84-86ea-7309e6ddd5d7.mp4',
  'grok-video-0ad857c9-3e2c-431c-8a0f-ec8596f6a6b8.mp4',
  'grok-video-0f472fe2-780a-4262-a244-991caa1507e3.mp4',
  'grok-video-0f8b0eaf-bfd3-46cb-b7d0-30ddb0bb693c.mp4',
  'grok-video-10fb4c73-a5cb-4ac4-9584-cb775835e25d.mp4',
  'grok-video-1adb41ba-09c9-40c9-9322-695a9e511143.mp4',
  'grok-video-1ef5a2ff-6384-4ab9-b078-17a755e5ae29.mp4',
  'grok-video-25496353-001a-42d4-bf5f-8e84eea7e2ef.mp4',
  'grok-video-35d26ef8-235e-4202-b6d8-3792d71891e6.mp4',
  'grok-video-37a59c43-8378-4aeb-ad25-8fcd1a91dfb7.mp4',
].map(f => `/NPG-X-10/${f}`)

export function ContentGallery() {
  const [lightbox, setLightbox] = useState<number | null>(null)

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-black/40 to-red-950/10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-3">
            EXCLUSIVE <span className="text-red-500">CONTENT</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {galleryImages.length} premium editorial images + {allVideos.length} animated clips
          </p>
        </motion.div>

        {/* Image Grid — masonry-style */}
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 mb-10">
          {galleryImages.map((src, idx) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.5) }}
              viewport={{ once: true }}
              className="break-inside-avoid mb-3 cursor-pointer group relative overflow-hidden rounded-lg"
              onClick={() => setLightbox(idx)}
            >
              <img
                src={src}
                alt={`NPG Content ${idx + 1}`}
                loading="lazy"
                className="w-full rounded-lg transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}
        </div>

        {/* Featured Videos */}
        <h3 className="text-2xl font-bold text-white mb-4 text-center">Animated Clips</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {allVideos.map((src, idx) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              viewport={{ once: true }}
              className="rounded-lg overflow-hidden border border-red-500/20 hover:border-red-500/50 transition bg-gray-900"
            >
              <video
                src={src}
                className="w-full aspect-[2/3] object-cover"
                preload="metadata"
                controls
                playsInline
                muted
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-red-600/50 transition"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <div className="absolute top-4 left-4 z-50 text-gray-400 text-sm font-mono">
            {lightbox + 1} / {galleryImages.length}
          </div>
          <button
            onClick={e => { e.stopPropagation(); setLightbox(lightbox > 0 ? lightbox - 1 : galleryImages.length - 1) }}
            className="absolute left-4 z-50 p-3 bg-black/50 rounded-full text-white hover:bg-red-600/50 transition"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <img
            src={galleryImages[lightbox]}
            alt={`NPG Content ${lightbox + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={e => { e.stopPropagation(); setLightbox(lightbox < galleryImages.length - 1 ? lightbox + 1 : 0) }}
            className="absolute right-4 z-50 p-3 bg-black/50 rounded-full text-white hover:bg-red-600/50 transition"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </motion.div>
      )}
    </section>
  )
}
