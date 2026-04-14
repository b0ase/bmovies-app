'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cdnUrl } from '@/lib/cdn'

const BG_CLIPS = [
  cdnUrl('landing-page-videos/spicy.mp4'),
  cdnUrl('adult-content/aria-kling-1.mp4'),
  cdnUrl('adult-content/aria-kling-2.mp4'),
  cdnUrl('adult-content/NPGX-Luna-Tsukino-Cyberblade-animated.mp4'),
  cdnUrl('adult-content/NPGX-Aria-Kurosawa-Voidstrike-animated.mp4'),
  cdnUrl('adult-content/mika-movie-1.mp4'),
  cdnUrl('adult-content/mika-movie-3.mp4'),
  cdnUrl('adult-content/NPGX-Blade-Kageyama-Nightshade-animated.mp4'),
];

interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [clipIdx, setClipIdx] = useState(0);
  const [crossfade, setCrossfade] = useState(false);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeSlot, setActiveSlot] = useState<'a' | 'b'>('a');

  // Shuffle clips on mount
  const [clips] = useState(() => {
    const arr = [...BG_CLIPS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  // Rotate clips with crossfade
  const nextClip = useCallback(() => {
    const nextIdx = (clipIdx + 1) % clips.length;
    const nextSlot = activeSlot === 'a' ? 'b' : 'a';
    const nextVideo = nextSlot === 'a' ? videoARef.current : videoBRef.current;

    if (nextVideo) {
      nextVideo.src = clips[nextIdx];
      nextVideo.load();
      nextVideo.play().catch(() => {});
    }

    setCrossfade(true);
    setTimeout(() => {
      setActiveSlot(nextSlot);
      setCrossfade(false);
      setClipIdx(nextIdx);
    }, 1200);
  }, [clipIdx, activeSlot, clips]);

  // Auto-rotate every 5s
  useEffect(() => {
    const timer = setInterval(nextClip, 5000);
    return () => clearInterval(timer);
  }, [nextClip]);

  // Start first video immediately
  useEffect(() => {
    if (videoARef.current) {
      videoARef.current.src = clips[0];
      videoARef.current.load();
      videoARef.current.play().catch(() => {});
    }
  }, [clips]);

  const handleEnter = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      onEnter();
    }, 600);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') handleEnter();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!visible) return null;

  return (
    <div className={`splash-screen ${fading ? 'fading' : ''}`} onClick={handleEnter}>
      {/* Dual video slots for crossfade */}
      <video
        ref={videoARef}
        className="splash-video"
        style={{
          opacity: activeSlot === 'a' ? (crossfade ? 0 : 1) : (crossfade ? 1 : 0),
          transition: 'opacity 1.2s ease',
        }}
        muted
        loop
        playsInline
      />
      <video
        ref={videoBRef}
        className="splash-video"
        style={{
          opacity: activeSlot === 'b' ? (crossfade ? 0 : 1) : (crossfade ? 1 : 0),
          transition: 'opacity 1.2s ease',
        }}
        muted
        loop
        playsInline
      />
      <div className="splash-overlay" />

      {/* Scanline effect */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      <div className="splash-content">
        <button className="splash-enter splash-title-btn" onClick={handleEnter} style={{ fontSize: 'clamp(120px, 20vw, 240px)' }}>
          $NPGX
        </button>
      </div>
      <div className="splash-footer">
        <span>Press Enter or click anywhere</span>
      </div>
    </div>
  );
}
