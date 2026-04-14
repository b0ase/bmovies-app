'use client'

import { useEffect, useState } from 'react'

const bgImages = [
  '/npgx-images/grok/03a5f41b-464a-4b7a-90b6-a43c75169e90.jpg',
  '/npgx-images/grok/060e384f-272f-4f71-8422-512eb808a4d8.jpg',
  '/npgx-images/grok/5ff0c647-62d9-4597-bc58-b60a3b3096df.jpg',
  '/npgx-images/grok/5e080ee6-40be-4b79-900d-9037df818cbd.jpg',
  '/npgx-images/grok/00f227e8-2b57-4b73-835a-85cf066e267d.jpg',
  '/npgx-images/grok/4b9d8040-cc32-411a-99e4-acf4022525bd.jpg',
  '/npgx-images/grok/54f46950-33b8-438d-be98-2de7ad08c665.jpg',
  '/npgx-images/grok/45625f8e-e459-49ef-9817-1c334bf464c5.jpg',
  '/npgx-images/grok/62535176-5b10-49bf-b12e-54ead6db94b9.jpg',
  '/npgx-images/grok/694826ed-9a2c-4d32-934a-580294027e0d.jpg',
  '/npgx-images/grok/24096e83-6ec2-4592-a804-c396f15206d3.jpg',
  '/npgx-images/grok/598b50c7-e8bf-4418-8ff1-4ccb1331aaac.jpg',
  '/npgx-images/grok/74433dae-0f12-4a99-b6a9-61464dd49df9.jpg',
  '/npgx-images/grok/0f72aa6e-8618-4266-9d90-ff0687264d9c.jpg',
  '/npgx-images/grok/1a336896-ee9c-4786-a1f2-7e996737c6d8.jpg',
  '/npgx-images/grok/77da7836-6a9a-481b-8342-051551609d00.jpg',
]

export function GlobalBackground() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    setCurrent(Math.floor(Math.random() * bgImages.length))
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % bgImages.length)
    }, 12000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {bgImages.map((src, idx) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[3000ms]"
          style={{
            backgroundImage: `url(${src})`,
            opacity: idx === current ? 0.25 : 0,
          }}
        />
      ))}
      {/* Dark overlay to keep text readable */}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  )
}
