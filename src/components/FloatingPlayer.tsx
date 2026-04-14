'use client';

import { useState, useRef, useEffect } from 'react';
import { useMusic } from '@/hooks/useMusic';
import { usePathname } from 'next/navigation';
import { FiPlay, FiPause, FiSkipForward, FiSkipBack, FiVolume2, FiVolumeX, FiChevronUp, FiChevronDown, FiShuffle, FiRepeat, FiMusic, FiDisc } from 'react-icons/fi';

// Pages that have their own music UI — don't show floating player
const SUPPRESS_ON = ['/mixer', '/music-mixer', '/watch', '/movie-editor'];

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function FloatingPlayer() {
  const pathname = usePathname();
  const {
    isPlaying, toggle, next, previous,
    currentTrackInfo, progress, duration, seekTo,
    volume, setVolume, isMuted, setMuted,
    shuffle, setShuffle, repeat, setRepeat,
    musicTracks, albums, playTrackByIndex, currentTrack,
  } = useMusic();

  const [expanded, setExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mouseIdle, setMouseIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const seekRef = useRef<HTMLInputElement>(null);

  // Show player after first user interaction (prevents autoplay issues)
  useEffect(() => {
    const show = () => { setVisible(true); };
    if (isPlaying) { setVisible(true); return; }
    window.addEventListener('click', show, { once: true });
    window.addEventListener('touchstart', show, { once: true });
    return () => {
      window.removeEventListener('click', show);
      window.removeEventListener('touchstart', show);
    };
  }, [isPlaying]);

  // Hide player bar when mouse is idle for 1s, show on move
  useEffect(() => {
    const show = () => {
      setMouseIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setMouseIdle(true), 1000);
    };
    window.addEventListener('mousemove', show);
    window.addEventListener('touchstart', show);
    return () => {
      window.removeEventListener('mousemove', show);
      window.removeEventListener('touchstart', show);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  // Don't render on pages with their own music controls
  if (SUPPRESS_ON.some(path => pathname.startsWith(path))) return null;
  if (!visible) return null;

  const track = currentTrackInfo;
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[200] pointer-events-none transition-opacity duration-500 ${mouseIdle ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`pointer-events-auto ${mouseIdle ? 'pointer-events-none' : ''}`}>
        {/* Expanded queue/album view */}
        {expanded && showQueue && (
          <div className="bg-black/95 backdrop-blur-xl border-t border-red-500/20 max-h-[50vh] overflow-y-auto">
            <div className="max-w-2xl mx-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Queue</span>
                <div className="flex gap-2">
                  {albums.map(a => (
                    <button key={a.id} onClick={() => {
                      const idx = musicTracks.findIndex(t => t.album === a.id);
                      if (idx >= 0) playTrackByIndex(idx);
                    }}
                      className="px-2 py-1 text-[10px] rounded bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/30 transition-colors">
                      {a.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-0.5">
                {musicTracks.map((t, i) => (
                  <button key={i} onClick={() => playTrackByIndex(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${i === currentTrack ? 'bg-red-500/15 text-red-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'}`}>
                    <span className="w-6 text-right text-[10px] font-mono text-zinc-600">{i + 1}</span>
                    {i === currentTrack && isPlaying ? (
                      <div className="w-4 flex items-end gap-px h-3">
                        <div className="w-1 bg-red-500 rounded-t animate-pulse" style={{ height: '60%' }} />
                        <div className="w-1 bg-red-500 rounded-t animate-pulse" style={{ height: '100%', animationDelay: '0.1s' }} />
                        <div className="w-1 bg-red-500 rounded-t animate-pulse" style={{ height: '40%', animationDelay: '0.2s' }} />
                      </div>
                    ) : (
                      <FiMusic size={12} className="text-zinc-600 w-4" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{t.romanji || t.title}</div>
                      <div className="text-[10px] text-zinc-600 truncate">{t.title !== t.romanji ? t.title : ''} {t.genre ? `· ${t.genre}` : ''}</div>
                    </div>
                    {t.side && <span className="text-[9px] text-zinc-600 font-mono">{t.side}</span>}
                    {t.bpm && <span className="text-[9px] text-zinc-600 font-mono">{t.bpm}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main player bar */}
        <div className="bg-black/90 backdrop-blur-xl border-t border-red-500/30 shadow-[0_-4px_30px_rgba(220,20,60,0.15)]">
          {/* Progress bar — thin red line at top */}
          <div className="h-0.5 bg-zinc-800 relative cursor-pointer group" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            seekTo(x * duration);
          }}>
            <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${pct}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(220,20,60,0.6)]" style={{ left: `${pct}%` }} />
          </div>

          <div className={`max-w-4xl mx-auto px-4 transition-all ${expanded ? 'py-3' : 'py-2'}`}>
            <div className="flex items-center gap-3">
              {/* Left: Disc + Track info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`relative flex-shrink-0 ${expanded ? 'w-14 h-14' : 'w-10 h-10'} transition-all`}>
                  <div className={`w-full h-full rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-red-500/20 flex items-center justify-center overflow-hidden ${isPlaying ? 'shadow-[0_0_15px_rgba(220,20,60,0.3)]' : ''}`}>
                    <FiDisc size={expanded ? 24 : 18} className={`text-red-500/60 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className={`font-bold truncate ${expanded ? 'text-sm' : 'text-xs'} text-white`}>
                    {track?.romanji || track?.title || 'No track'}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {track?.title !== track?.romanji ? track?.title : ''}
                    {track?.genre ? ` · ${track.genre}` : ''}
                    {track?.bpm ? ` · ${track.bpm} BPM` : ''}
                  </div>
                  {expanded && (
                    <div className="text-[10px] text-zinc-600 mt-0.5">
                      {formatTime(progress)} / {formatTime(duration)}
                    </div>
                  )}
                </div>
              </div>

              {/* Center: Playback controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {expanded && (
                  <button onClick={() => setShuffle(!shuffle)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${shuffle ? 'text-red-400 bg-red-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}>
                    <FiShuffle size={12} />
                  </button>
                )}
                <button onClick={previous} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                  <FiSkipBack size={14} />
                </button>
                <button onClick={toggle}
                  className="w-10 h-10 rounded-full bg-gradient-to-b from-red-500 to-red-700 flex items-center justify-center text-white shadow-[0_0_20px_rgba(220,20,60,0.4)] hover:shadow-[0_0_30px_rgba(220,20,60,0.6)] transition-shadow active:scale-95">
                  {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} className="ml-0.5" />}
                </button>
                <button onClick={next} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                  <FiSkipForward size={14} />
                </button>
                {expanded && (
                  <button onClick={() => setRepeat(!repeat)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${repeat ? 'text-red-400 bg-red-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}>
                    <FiRepeat size={12} />
                  </button>
                )}
              </div>

              {/* Right: Volume + Queue + Expand */}
              <div className="flex items-center gap-1.5 flex-1 justify-end">
                {expanded && (
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button onClick={() => setMuted(!isMuted)} className="text-zinc-500 hover:text-zinc-300">
                      {isMuted ? <FiVolumeX size={14} /> : <FiVolume2 size={14} />}
                    </button>
                    <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                      onChange={e => setVolume(parseFloat(e.target.value))}
                      className="w-16 accent-red-500 h-1" />
                  </div>
                )}
                <button onClick={() => { setShowQueue(!showQueue); if (!expanded) setExpanded(true); }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${showQueue && expanded ? 'text-red-400 bg-red-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}>
                  <FiMusic size={12} />
                </button>
                <button onClick={() => { setExpanded(!expanded); if (expanded) setShowQueue(false); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors">
                  {expanded ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
